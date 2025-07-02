import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from collections import Counter
import json
from config import Config
import joblib
import os
import logging

# Konfigurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_asal_features(soal_list, total_soal):
    """Menghitung fitur untuk deteksi asal berdasarkan data kuis."""
    if not soal_list:
        return 0, 0, 0, 0, 0, 0, 0, 0, 0

    waktu_list = [float(soal.get('waktu', 0)) for soal in soal_list]
    waktu_rata2_per_soal = np.mean(waktu_list) if waktu_list else 0
    jumlah_salah = sum(1 for soal in soal_list if not soal.get('benar', False))
    variansi_waktu = np.var(waktu_list) if len(waktu_list) > 1 else 0
    persentase_salah = (jumlah_salah / total_soal) * 100 if total_soal > 0 else 0
    jawaban_list = [soal.get('jawaban', '') for soal in soal_list]
    frekuensi_jawaban_identik = max(Counter(jawaban_list).values()) if jawaban_list else 0
    total_waktu = sum(waktu_list)
    kategori_waktu = {}
    kesalahan_per_topik = Counter(soal.get('topik', 'Tidak Diketahui') for soal in soal_list if not soal.get('benar', False))

    for soal in soal_list:
        kategori = soal.get('kategori', 'Tidak Diketahui')
        waktu = float(soal.get('waktu', 0))
        kategori_waktu[kategori] = kategori_waktu.get(kategori, []) + [waktu]
    
    konsistensi_kecepatan_per_kategori = np.mean([np.var(waktu_list) for waktu_list in kategori_waktu.values() if len(waktu_list) > 1]) if kategori_waktu else 0
    pola_kesalahan = max(kesalahan_per_topik.values()) if kesalahan_per_topik else 0

    # Hitung frekuensi identik berturut-turut berdasarkan indeks_jawaban
    indeks_jawaban_list = [int(soal.get('indeks_jawaban', -1)) for soal in soal_list]
    frekuensi_identik_berturut_turut = 0
    max_streak = 0
    current_streak = 1
    for i in range(1, len(indeks_jawaban_list)):
        if indeks_jawaban_list[i] == indeks_jawaban_list[i-1] and indeks_jawaban_list[i] != -1:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1
    if max_streak > 0:
        frekuensi_identik_berturut_turut = (max_streak / total_soal) * 100

    return (waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah,
            frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori,
            pola_kesalahan, frekuensi_identik_berturut_turut)

def train_cart_kesulitan_model():
    """Melatih model CART untuk deteksi kesulitan belajar."""
    try:
        data = pd.read_csv(Config.DATA_PATHS['training_data_kesulitan'])
        X = data[['jumlah_benar', 'jumlah_salah', 'waktu_rata2_per_soal', 'dideteksi_asal']]
        y = data['kesulitan_diduga']
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        model = DecisionTreeClassifier(criterion='gini', random_state=42)
        model.fit(X, y_encoded)
        os.makedirs(Config.DATA_PATHS['model_dir'], exist_ok=True)
        joblib.dump(model, f"{Config.DATA_PATHS['model_dir']}/cart_kesulitan_model.pkl")
        joblib.dump(le, f"{Config.DATA_PATHS['model_dir']}/label_encoder_kesulitan.pkl")
        return model, le
    except FileNotFoundError as e:
        print(f"❌ Error: {e}. File training_data_kesulitan.csv tidak ditemukan.")
        raise
    except Exception as e:
        print(f"❌ Error saat melatih model kesulitan: {e}")
        raise

def train_cart_asal_model():
    """Melatih model CART untuk deteksi asal."""
    try:
        data = pd.read_csv(Config.DATA_PATHS['training_data_asal'])
        X = data[['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah',
                  'frekuensi_jawaban_identik', 'total_waktu', 'konsistensi_kecepatan_per_kategori',
                  'pola_kesalahan', 'frekuensi_identik_berturut_turut']]
        y = data['dideteksi_asal']
        model = DecisionTreeClassifier(criterion='gini', random_state=42)
        model.fit(X, y)
        os.makedirs(Config.DATA_PATHS['model_dir'], exist_ok=True)
        joblib.dump(model, f"{Config.DATA_PATHS['model_dir']}/cart_asal_model.pkl")
        return model
    except FileNotFoundError as e:
        print(f"❌ Error: {e}. File training_data_asal.csv tidak ditemukan.")
        raise
    except Exception as e:
        print(f"❌ Error saat melatih model asal: {e}")
        raise

def analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, total_soal, cart_kesulitan_model, label_encoder_kesulitan):
    """Menganalisis kesulitan belajar dan memberikan rekomendasi, termasuk per pelajaran."""
    try:
        soal_data = json.loads(daftar_soal_dikerjakan)
        soal_list = soal_data.get('soal', [])
        
        kesalahan_per_kategori = {}
        total_soal_per_kategori = {}
        bobot_kesulitan = {'mudah': 1, 'sedang': 2, 'sulit': 3}

        # Hitung kesulitan per pelajaran
        pelajaran_stats = {}
        for soal in soal_list:
            pelajaran = soal.get('pelajaran', 'Tidak Diketahui')
            if pelajaran not in pelajaran_stats:
                pelajaran_stats[pelajaran] = {'benar': 0, 'total': 0}
            pelajaran_stats[pelajaran]['total'] += 1
            if soal.get('benar', False):
                pelajaran_stats[pelajaran]['benar'] += 1
        logger.info(f"pelajaran_stats: {pelajaran_stats}")

        # Hitung persentase keberhasilan per pelajaran
        pelajaran_kesulitan = {}
        for pelajaran, stats in pelajaran_stats.items():
            persentase_keberhasilan = (stats['benar'] / stats['total'] * 100) if stats['total'] > 0 else 0
            if persentase_keberhasilan < 50:
                pelajaran_kesulitan[pelajaran] = 'sulit'
            elif persentase_keberhasilan <= 70:
                pelajaran_kesulitan[pelajaran] = 'sedang'
            else:
                pelajaran_kesulitan[pelajaran] = 'mudah'

        # Identifikasi pelajaran yang sulit
        pelajaran_sulit = [p for p, k in pelajaran_kesulitan.items() if k == 'sulit']
        logger.info(f"pelajaran_sulit sebelum return: {pelajaran_sulit}")

        for soal in soal_list:
            kategori = soal.get('kategori', 'Tidak Diketahui')
            topik = soal.get('topik', 'Tidak Diketahui')
            tingkat_kesulitan = soal.get('tingkat_kesulitan', 'sedang')
            bobot = bobot_kesulitan.get(tingkat_kesulitan, 2)

            if kategori not in kesalahan_per_kategori:
                kesalahan_per_kategori[kategori] = {'total': 0, 'topik': {}, 'pelajaran': soal.get('pelajaran', 'Tidak Diketahui'), 'bobot': 0}
                total_soal_per_kategori[kategori] = 0
            
            total_soal_per_kategori[kategori] += 1
            kesalahan_per_kategori[kategori]['bobot'] += bobot
            if not soal.get('benar', False):
                kesalahan_per_kategori[kategori]['total'] += 1
                kesalahan_per_kategori[kategori]['topik'][topik] = kesalahan_per_kategori[kategori]['topik'].get(topik, 0) + 1

        if not kesalahan_per_kategori:
            kesulitan_diduga = "mudah"
            with open(Config.DATA_PATHS['motivasi'], 'r', encoding='utf-8') as f:
                motivasi_map = json.load(f)
            motivasi = motivasi_map.get("tinggi", ["Kerja bagus!"])[np.random.randint(0, len(motivasi_map.get("tinggi", ["Kerja bagus!"])))]
            return kesulitan_diduga, f"{motivasi} Kamu tidak banyak salah.", pelajaran_sulit

        sorted_kategori = sorted(kesalahan_per_kategori.items(), key=lambda x: (x[1]['total'] * x[1]['bobot'], x[1]['total']), reverse=True)[:2]
        rekomendasi_kategori = []
        with open(Config.DATA_PATHS['rekomendasi'], 'r', encoding='utf-8') as f:
            rekomendasi_map = json.load(f)

        for kategori, data in sorted_kategori:
            if data['total'] > 0:
                pelajaran = data['pelajaran']
                topik_data = data['topik']
                total_soal_kategori = total_soal_per_kategori[kategori]

                soal_per_topik = {}
                for soal in soal_list:
                    if soal.get('kategori') == kategori:
                        topik = soal.get('topik', 'Tidak Diketahui')
                        soal_per_topik[topik] = soal_per_topik.get(topik, 0) + 1

                topik_rekomendasi = []
                for topik, jumlah_kesalahan in sorted(topik_data.items(), key=lambda x: x[1], reverse=True):
                    total_soal_topik = soal_per_topik.get(topik, 0)
                    if total_soal_topik >= 2 and (jumlah_kesalahan / total_soal_topik) > 0.5:
                        topik_rekomendasi.append(topik)

                if topik_rekomendasi:
                    topik_text = ", ".join(f"terutama di topik {t}" for t in topik_rekomendasi)
                    saran = rekomendasi_map.get(pelajaran, {}).get(kategori, {}).get(topik_rekomendasi[0], 
                            rekomendasi_map.get(pelajaran, {}).get(kategori, {}).get('default', 'Latihan lagi ya!'))
                    rekomendasi_kategori.append(f"{saran} {topik_text}")
                else:
                    saran = rekomendasi_map.get(pelajaran, {}).get(kategori, {}).get('default', 'Latihan lagi ya!')
                    rekomendasi_kategori.append(saran)

        persentase_keberhasilan = (jumlah_benar / total_soal * 100) if total_soal > 0 else 0
        with open(Config.DATA_PATHS['motivasi'], 'r', encoding='utf-8') as f:
            motivasi_map = json.load(f)
        tingkat = "tinggi" if persentase_keberhasilan >= 70 else "sedang" if persentase_keberhasilan >= 40 else "rendah"
        motivasi = motivasi_map.get(tingkat, ["Terus berusaha ya!"])[np.random.randint(0, len(motivasi_map.get(tingkat, ["Terus berusaha ya!"])))]


        input_data = pd.DataFrame([[jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal]],
                                columns=['jumlah_benar', 'jumlah_salah', 'waktu_rata2_per_soal', 'dideteksi_asal'])
        kesulitan_encoded = cart_kesulitan_model.predict(input_data)[0]
        kesulitan_diduga = label_encoder_kesulitan.inverse_transform([kesulitan_encoded])[0]

        rekomendasi_text = f"{motivasi} {' '.join(rekomendasi_kategori)}" if rekomendasi_kategori else f"{motivasi} Kamu sudah bagus!"
        return kesulitan_diduga, rekomendasi_text, pelajaran_sulit
    except Exception as e:
        logger.error(f"❌ Error dalam analyze_kesulitan: {e}")
        raise