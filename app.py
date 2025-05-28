from flask import Flask, request, jsonify, send_from_directory, render_template
import pymysql
from flask_cors import CORS
import os
import traceback
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from collections import Counter
import json

app = Flask(__name__)
CORS(app)

def get_db():
    try:
        return pymysql.connect(
            host="localhost",
            user="root",
            password="",
            database="kuis_sd",
            port=3306,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
            charset='utf8mb4'
        )
    except pymysql.Error as e:
        print(f"❌ Koneksi database gagal: {e}")
        raise

def get_total_soal_by_kelas(kelas):
    kelas_map = {'3': 15, '4': 18, '5': 21}
    return kelas_map.get(kelas)

def calculate_asal_features(soal_list, total_soal):
    if not soal_list:
        return 0, 0, 0, 0, 0, 0, 0

    waktu_list = [float(soal.get('waktu', 0)) for soal in soal_list]
    waktu_rata2_per_soal = np.mean(waktu_list) if waktu_list else 0
    jumlah_salah = sum(1 for soal in soal_list if not soal.get('benar', False))
    variansi_waktu = np.var(waktu_list) if len(waktu_list) > 1 else 0
    persentase_salah = (jumlah_salah / total_soal) * 100 if total_soal > 0 else 0
    jawaban_list = [soal.get('jawaban', '') for soal in soal_list]
    frekuensi_jawaban_identik = max(Counter(jawaban_list).values()) if jawaban_list else 0
    total_waktu = sum(waktu_list)
    kategori_waktu = {}
    for soal in soal_list:
        kategori = soal.get('kategori', 'Tidak Diketahui')
        waktu = float(soal.get('waktu', 0))
        kategori_waktu[kategori] = kategori_waktu.get(kategori, []) + [waktu]
    konsistensi_kecepatan_per_kategori = np.mean([np.var(waktu_list) for waktu_list in kategori_waktu.values() if len(waktu_list) > 1]) if kategori_waktu else 0

    return waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah, frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori

def train_cart_kesulitan_model():
    try:
        data = pd.read_csv('data/training_data_kesulitan.csv')
        X = data[['jumlah_benar', 'jumlah_salah', 'waktu_rata2_per_soal', 'dideteksi_asal']]
        y = data['kesulitan_diduga']
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        model = DecisionTreeClassifier(criterion='gini', random_state=42)
        model.fit(X, y_encoded)
        return model, le
    except FileNotFoundError as e:
        print(f"❌ Error: {e}. File training_data_kesulitan.csv tidak ditemukan. Menggunakan model default.")
        raise
    except Exception as e:
        print(f"❌ Error saat melatih model kesulitan: {e}")
        raise

def train_cart_asal_model():
    try:
        data = pd.read_csv('data/training_data_asal.csv')
        X = data[['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah', 'frekuensi_jawaban_identik', 'total_waktu', 'konsistensi_kecepatan_per_kategori']]
        y = data['dideteksi_asal']
        model = DecisionTreeClassifier(criterion='gini', random_state=42)
        model.fit(X, y)
        return model
    except FileNotFoundError as e:
        print(f"❌ Error: {e}. File training_data_asal.csv tidak ditemukan.")
        raise
    except Exception as e:
        print(f"❌ Error saat melatih model asal: {e}")
        raise

def analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, total_soal):
    try:
        # Decode JSON dan ambil array 'soal' dengan get() untuk menghindari KeyError
        soal_data = json.loads(daftar_soal_dikerjakan)
        soal_list = soal_data.get('soal', []) if daftar_soal_dikerjakan else []
        
        kesalahan_per_kategori = {}
        total_soal_per_kategori = {}

        # Hitung kesalahan dan total soal per kategori
        for soal in soal_list:
            kategori = soal.get('kategori', 'Tidak Diketahui')
            topik = soal.get('topik', 'Tidak Diketahui')
            pelajaran = soal.get('pelajaran', 'Tidak Diketahui')

            if kategori not in kesalahan_per_kategori:
                kesalahan_per_kategori[kategori] = {'total': 0, 'topik': {}, 'pelajaran': pelajaran}
                total_soal_per_kategori[kategori] = 0
            
            total_soal_per_kategori[kategori] += 1
            if not soal.get('benar', False):
                kesalahan_per_kategori[kategori]['total'] += 1
                kesalahan_per_kategori[kategori]['topik'][topik] = kesalahan_per_kategori[kategori]['topik'].get(topik, 0) + 1

        if not kesalahan_per_kategori:
            kesulitan_diduga = "mudah"
            with open('static/motivasi.json', 'r', encoding='utf-8') as f:
                motivasi_map = json.load(f)
            motivasi = motivasi_map.get("tinggi", ["Kerja bagus!"])[np.random.randint(0, len(motivasi_map.get("tinggi", ["Kerja bagus!"])))]
            return kesulitan_diduga, f"{motivasi} Kamu tidak banyak salah."

        # Ambil 2 kategori dengan jumlah absolut kesalahan terbanyak
        sorted_kategori = sorted(kesalahan_per_kategori.items(), key=lambda x: x[1]['total'], reverse=True)[:2]
        rekomendasi_kategori = []
        with open('static/rekomendasi.json', 'r', encoding='utf-8') as f:
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
        with open('static/motivasi.json', 'r', encoding='utf-8') as f:
            motivasi_map = json.load(f)
        tingkat = "tinggi" if persentase_keberhasilan >= 70 else "sedang" if persentase_keberhasilan >= 40 else "rendah"
        motivasi = motivasi_map.get(tingkat, ["Terus berusaha ya!"])[np.random.randint(0, len(motivasi_map.get(tingkat, ["Terus berusaha ya!"])))]

        input_data = pd.DataFrame([[jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal]],
                                columns=['jumlah_benar', 'jumlah_salah', 'waktu_rata2_per_soal', 'dideteksi_asal'])
        kesulitan_encoded = cart_kesulitan_model.predict(input_data)[0]
        kesulitan_diduga = label_encoder_kesulitan.inverse_transform([kesulitan_encoded])[0]

        rekomendasi_text = f"{motivasi} {' '.join(rekomendasi_kategori)}" if rekomendasi_kategori else f"{motivasi} Kamu sudah bagus!"

        return kesulitan_diduga, rekomendasi_text
    except Exception as e:
        print(f"❌ Error dalam analyze_kesulitan: {e}")
        raise

try:
    cart_kesulitan_model, label_encoder_kesulitan = train_cart_kesulitan_model()
    cart_asal_model = train_cart_asal_model()
except Exception as e:
    print(f"❌ Error fatal saat inisialisasi model: {e}")
    raise

@app.route('/simpan_siswa', methods=['POST'])
def simpan_siswa():
    try:
        data = request.get_json()
        nama = data['nama']
        kelas = data['kelas']

        print(f"📥 Data diterima: {nama} - Kelas {kelas}")

        with get_db() as db:
            cursor = db.cursor()
            query = "INSERT INTO siswa (nama, kelas) VALUES (%s, %s)"
            cursor.execute(query, (nama, kelas))
            db.commit()
            print("✅ Data siswa berhasil disimpan ke database.")
            id_baru = cursor.lastrowid

        return jsonify({'status': 'sukses', 'id_siswa': id_baru})
    except Exception as e:
        print(f"❌ Error saat simpan siswa: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': f'Terjadi kesalahan: {str(e)}'}), 500

@app.route('/simpan_hasil', methods=['POST'])
def simpan_hasil():
    try:
        data = request.get_json()
        id_siswa = int(data.get('id_siswa', 0))
        mapel = str(data.get('mapel', 'Tidak Diketahui'))
        daftar_soal_dikerjakan = str(data.get('daftar_soal_dikerjakan', '{}'))
        jumlah_benar = int(data.get('jumlah_benar', 0))
        jumlah_salah = int(data.get('jumlah_salah', 0))
        waktu_rata2_per_soal = float(data.get('waktu_rata2_per_soal', 0.0))
        total_soal = int(data.get('total_soal', 0))  # Ambil dari frontend

        # Validasi total_soal
        if total_soal not in [15, 18, 21]:
            raise ValueError("Total soal tidak valid. Harus 15, 18, atau 21.")

        # Validasi dan decode JSON
        try:
            soal_data = json.loads(daftar_soal_dikerjakan)
            soal_list = soal_data.get('soal', [])  # Ambil array 'soal' dengan get() untuk menghindari KeyError
        except json.JSONDecodeError as e:
            print(f"❌ Error: {e}. JSON tidak valid pada daftar_soal_dikerjakan.")
            return jsonify({'status': 'gagal', 'pesan': 'Data daftar_soal_dikerjakan tidak valid'}), 400

        # Hitung semua fitur untuk deteksi asal
        waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah, frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori = calculate_asal_features(soal_list, total_soal)

        # Prediksi deteksi asal
        input_data_asal = pd.DataFrame([[waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah, frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori]],
                                     columns=['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah', 'frekuensi_jawaban_identik', 'total_waktu', 'konsistensi_kecepatan_per_kategori'])
        dideteksi_asal = int(cart_asal_model.predict(input_data_asal)[0])

        # Analisis kesulitan dan rekomendasi
        kesulitan_diduga, rekomendasi = analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, total_soal)

        # Simpan ke database
        with get_db() as db:
            cursor = db.cursor()
            query = """
                INSERT INTO hasil_kuis
                (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, tanggal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            cursor.execute(query, (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga))
            db.commit()
            print("✅ Hasil kuis berhasil disimpan ke database.")

        return jsonify({
            'status': 'sukses',
            'kesulitan_diduga': kesulitan_diduga,
            'rekomendasi': rekomendasi,
            'dideteksi_asal': dideteksi_asal,
            'jumlah_benar': jumlah_benar,
            'jumlah_salah': jumlah_salah,
            'total_soal': total_soal,
            'waktu_rata2_per_soal': waktu_rata2_per_soal
        })
    except ValueError as ve:
        print(f"❌ Error: {ve}")
        return jsonify({'status': 'gagal', 'pesan': f'Terjadi kesalahan: {str(ve)}'}), 400
    except Exception as e:
        print(f"❌ Gagal simpan hasil kuis: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': f'Terjadi kesalahan tak terduga: {str(e)}'}), 500

@app.route('/')
def halaman_utama():
    return render_template('index.html')

@app.route('/quiz')
def halaman_kuis():
    return render_template('quiz.html')

@app.route('/hasil')
def halaman_hasil():
    return render_template('hasil.html')

@app.route('/soal/<path:filename>')
def serve_soal(filename):
    try:
        safe_filename = os.path.basename(filename)
        return send_from_directory('soal', safe_filename)
    except Exception as e:
        print(f"❌ Error saat menyajikan soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'File soal tidak ditemukan'}), 404

if __name__ == '__main__':
    print("✅ Memulai Flask App di localhost:5000 ...")
    try:
        app.run(debug=True, use_reloader=False)
    except Exception as e:
        print(f"❌ Gagal memulai aplikasi: {e}")