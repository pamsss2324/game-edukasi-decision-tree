from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import json
import os
import traceback
import pandas as pd
import joblib
from database import save_siswa, save_hasil_kuis
from models import calculate_asal_features, analyze_kesulitan
from config import Config
import logging

# Konfigurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Muat model yang telah disimpan
try:
    cart_kesulitan_model = joblib.load('models/cart_kesulitan_model.pkl')
    label_encoder_kesulitan = joblib.load('models/label_encoder_kesulitan.pkl')
    cart_asal_model = joblib.load('models/cart_asal_model.pkl')
    logger.info("✅ Model dimuat dari file.")
except FileNotFoundError:
    logger.error("❌ Model tidak ditemukan. Pastikan model telah dilatih dan disimpan.")
    raise
except Exception as e:
    logger.error(f"❌ Error saat muat model: {e}")
    raise

@app.route('/simpan_siswa', methods=['POST'])
def simpan_siswa():
    try:
        data = request.get_json()
        nama = data['nama']
        kelas = data['kelas']
        id_siswa = save_siswa(nama, kelas)
        return jsonify({'status': 'sukses', 'id_siswa': id_siswa})
    except Exception as e:
        logger.error(f"❌ Error saat simpan siswa: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

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
        total_soal = int(data.get('total_soal', 0))

        expected_total = Config.KELAS_MAP.get(str(kelas), 0) if 'kelas' in data else 0
        if total_soal != expected_total:
            raise ValueError(f"Total soal {total_soal} tidak sesuai dengan kelas {kelas} (harus {expected_total}).")

        try:
            soal_data = json.loads(daftar_soal_dikerjakan)
            soal_list = soal_data.get('soal', [])
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error: {e}. JSON tidak valid pada daftar_soal_dikerjakan.")
            return jsonify({'status': 'gagal', 'pesan': 'Data daftar_soal_dikerjakan tidak valid'}), 400

        waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah, frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori = calculate_asal_features(soal_list, total_soal)

        input_data_asal = pd.DataFrame([[waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah, frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori]],
                                     columns=['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah', 'frekuensi_jawaban_identik', 'total_waktu', 'konsistensi_kecepatan_per_kategori'])
        dideteksi_asal = int(cart_asal_model.predict(input_data_asal)[0])

        kesulitan_diduga, rekomendasi = analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, total_soal, cart_kesulitan_model, label_encoder_kesulitan)

        save_hasil_kuis(id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga)

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
        logger.error(f"❌ Error: {ve}")
        return jsonify({'status': 'gagal', 'pesan': f'Terjadi kesalahan: {str(ve)}'}), 400
    except Exception as e:
        logger.error(f"❌ Gagal simpan hasil kuis: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

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
        logger.error(f"❌ Error saat menyajikan soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'File soal tidak ditemukan'}), 404

@app.route('/get_soal/<kelas>/<paket>', methods=['GET'])
def get_soal(kelas, paket):
    try:
        filename = f'soal_kelas{kelas}_paket{paket}.json'
        with open(os.path.join('soal', filename), 'r', encoding='utf-8') as f:
            soal_data = json.load(f)
        return jsonify({'status': 'sukses', 'soal': soal_data})
    except FileNotFoundError:
        logger.error(f"❌ File soal {filename} tidak ditemukan.")
        return jsonify({'status': 'gagal', 'pesan': 'File soal tidak ditemukan'}), 404
    except Exception as e:
        logger.error(f"❌ Error saat mengambil soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

if __name__ == '__main__':
    logger.info("✅ Memulai Flask App di localhost:5000 ...")
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        logger.error(f"❌ Gagal memulai aplikasi: {e}")