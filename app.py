from flask import Flask, request, jsonify, send_from_directory, render_template, session, redirect, url_for
from flask_cors import CORS
from flask_session import Session
import json
import os
import traceback
import pandas as pd
import joblib
from database import save_siswa, save_hasil_kuis, get_db, save_login_log
from models import calculate_asal_features, analyze_kesulitan
from config import Config
import logging
import hashlib
import bcrypt

# Konfigurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Konfigurasi Flask-Session
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

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

# Fungsi untuk validasi login guru
def validate_guru_login(nama, kode_akses):
    try:
        with get_db() as db:
            cursor = db.cursor()
            # Simulasi tabel guru (akan diperbarui di database.py nanti)
            cursor.execute("SELECT kode_akses FROM guru WHERE nama = %s AND kadaluarsa > NOW()", (nama,))
            result = cursor.fetchone()
            if result:
                stored_kode = result['kode_akses']
                # Hash kode akses input dengan salt sederhana (akan diganti bcrypt nanti)
                hashed_input = hashlib.sha256((kode_akses + "salt").encode()).hexdigest()
                return hashed_input == stored_kode
            return False
    except Exception as e:
        logger.error(f"❌ Error saat validasi login guru: {e}")
        return False

# Fungsi untuk validasi login admin (menggunakan bcrypt)
def validate_admin_login(username, password):
    # Simulasi kredensial admin (akan disimpan di database nanti)
    admin_username = "admin"
    admin_password_hash = b"$2b$12$jWuwbXTRDCG2H5R7bEw0TuQG1I7EtQDw2nr66L3W/S5p38l0te8SS"  # Ganti dengan hash bcrypt yang valid
    return username == admin_username and bcrypt.checkpw(password.encode(), admin_password_hash)

# Fungsi untuk mengambil data guru (untuk dashboard nanti)
def get_hasil_kuis_by_siswa(id_siswa):
    try:
        with get_db() as db:
            cursor = db.cursor()
            query = "SELECT * FROM hasil_kuis WHERE id_siswa = %s ORDER BY tanggal DESC"
            cursor.execute(query, (id_siswa,))
            results = cursor.fetchall()
            return results
    except Exception as e:
        logger.error(f"❌ Error saat mengambil hasil kuis: {e}")
        raise

@app.route('/simpan_siswa', methods=['POST'])
def simpan_siswa():
    try:
        data = request.get_json()
        if 'nama' not in data or 'kelas' not in data:
            raise ValueError("Data 'nama' dan 'kelas' wajib diisi.")
        nama = data['nama']
        kelas = data['kelas']
        if kelas not in ['3', '4', '5']:
            raise ValueError("Kelas harus salah satu dari '3', '4', atau '5'.")
        id_siswa = save_siswa(nama, kelas)
        return jsonify({'status': 'sukses', 'id_siswa': id_siswa})
    except ValueError as ve:
        logger.error(f"❌ Error validasi: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except Exception as e:
        logger.error(f"❌ Error saat simpan siswa: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/simpan_hasil', methods=['POST'])
def simpan_hasil():
    try:
        data = request.get_json()
        if 'id_siswa' not in data or 'kelas' not in data or 'mapel' not in data or 'daftar_soal_dikerjakan' not in data or 'jumlah_benar' not in data or 'jumlah_salah' not in data or 'waktu_rata2_per_soal' not in data or 'total_soal' not in data:
            raise ValueError("Semua data wajib diisi: id_siswa, kelas, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, total_soal.")
        id_siswa = int(data['id_siswa'])
        kelas = data['kelas']
        if kelas not in ['3', '4', '5']:
            raise ValueError("Kelas harus salah satu dari '3', '4', atau '5'.")
        mapel = str(data['mapel'])
        daftar_soal_dikerjakan = str(data['daftar_soal_dikerjakan'])
        jumlah_benar = int(data['jumlah_benar'])
        jumlah_salah = int(data['jumlah_salah'])
        waktu_rata2_per_soal = float(data['waktu_rata2_per_soal'])
        total_soal = int(data['total_soal'])

        expected_total = Config.KELAS_MAP.get(kelas, 0)
        if total_soal != expected_total:
            raise ValueError(f"Total soal {total_soal} tidak sesuai dengan kelas {kelas} (harus {expected_total}).")

        try:
            soal_data = json.loads(daftar_soal_dikerjakan)
            soal_list = soal_data.get('soal', [])
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error: {e}. JSON tidak valid pada daftar_soal_dikerjakan.")
            return jsonify({'status': 'gagal', 'pesan': 'Data daftar_soal_dikerjakan tidak valid'}), 400

        # Mengambil semua nilai dari calculate_asal_features
        (waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah,
         frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori,
         pola_kesalahan, frekuensi_identik_berturut_turut) = calculate_asal_features(soal_list, total_soal)

        input_data_asal = pd.DataFrame([[waktu_rata2_per_soal, jumlah_salah, variansi_waktu, persentase_salah,
                                        frekuensi_jawaban_identik, total_waktu, konsistensi_kecepatan_per_kategori,
                                        pola_kesalahan, frekuensi_identik_berturut_turut]],
                                     columns=['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah',
                                              'frekuensi_jawaban_identik', 'total_waktu', 'konsistensi_kecepatan_per_kategori',
                                              'pola_kesalahan', 'frekuensi_identik_berturut_turut'])
        logger.info(f"Input data asal: {input_data_asal.to_dict()}")
        dideteksi_asal = int(cart_asal_model.predict(input_data_asal)[0])
        logger.info(f"Deteksi asal: {dideteksi_asal}")

        # Mengemas tiga nilai balik dari analyze_kesulitan
        kesulitan_diduga, rekomendasi, pelajaran_sulit = analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, total_soal, cart_kesulitan_model, label_encoder_kesulitan)

        # Konversi pelajaran_sulit ke string JSON sebelum menyimpan
        pelajaran_sulit_str = json.dumps(pelajaran_sulit) if pelajaran_sulit else '[]'

        # Simpan hasil ke database dengan pelajaran_sulit
        save_hasil_kuis(id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, pelajaran_sulit_str)

        return jsonify({
            'status': 'sukses',
            'kesulitan_diduga': kesulitan_diduga,
            'rekomendasi': rekomendasi,
            'pelajaran_sulit': pelajaran_sulit,  # Tetap kirim list asli ke frontend
            'dideteksi_asal': dideteksi_asal,
            'jumlah_benar': jumlah_benar,
            'jumlah_salah': jumlah_salah,
            'total_soal': total_soal,
            'waktu_rata2_per_soal': waktu_rata2_per_soal
        })
    except ValueError as ve:
        logger.error(f"❌ Error: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
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

@app.route('/get_soal', methods=['POST'])
def get_soal():
    try:
        data = request.get_json()
        if not data or 'kelas' not in data or 'paket' not in data:
            raise ValueError("Parameter 'kelas' dan 'paket' wajib diisi dalam JSON.")
        kelas = data['kelas']
        paket = data['paket']
        if kelas not in ['3', '4', '5']:
            raise ValueError("Kelas harus salah satu dari '3', '4', atau '5'.")
        if not isinstance(paket, (int, str)) or (isinstance(paket, str) and not paket.isdigit()) or (isinstance(paket, int) and paket < 1):
            raise ValueError("Paket harus bilangan bulat positif.")

        filename = f'soal_kelas{kelas}_paket{paket}.json'
        filepath = os.path.join('soal', filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File soal {filename} tidak ditemukan.")

        with open(filepath, 'r', encoding='utf-8') as f:
            soal_data = json.load(f)
        return jsonify({'status': 'sukses', 'soal': soal_data})
    except FileNotFoundError:
        logger.error(f"❌ File soal {filename} tidak ditemukan.")
        return jsonify({'status': 'gagal', 'pesan': 'File soal tidak ditemukan'}), 404
    except ValueError as ve:
        logger.error(f"❌ Error validasi: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except Exception as e:
        logger.error(f"❌ Error saat mengambil soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

if __name__ == '__main__':
    logger.info("✅ Memulai Flask App di localhost:5000 ...")
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        logger.error(f"❌ Gagal memulai aplikasi: {e}")

@app.route('/login/guru', methods=['POST'])
def login_guru():
    try:
        data = request.get_json()
        if 'nama' not in data or 'kode_akses' not in data:
            return jsonify({'status': 'gagal', 'pesan': 'Nama dan kode akses wajib diisi'}), 400
        nama = data['nama']
        kode_akses = data['kode_akses']
        if validate_guru_login(nama, kode_akses):
            session['user'] = {'role': 'guru', 'nama': nama}
            save_login_log(nama, 'sukses')
            return jsonify({'status': 'sukses', 'pesan': 'Login berhasil'})
        else:
            save_login_log(nama, 'gagal')
            return jsonify({'status': 'gagal', 'pesan': 'Nama atau kode akses salah'}), 401
    except Exception as e:
        logger.error(f"❌ Error saat login guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/login/admin', methods=['POST'])
def login_admin():
    try:
        data = request.get_json()
        if 'username' not in data or 'password' not in data:
            return jsonify({'status': 'gagal', 'pesan': 'Username dan password wajib diisi'}), 400
        username = data['username']
        password = data['password']
        if validate_admin_login(username, password):
            session['user'] = {'role': 'admin', 'username': username}
            save_login_log(username, 'sukses')
            return jsonify({'status': 'sukses', 'pesan': 'Login berhasil'})
        else:
            save_login_log(username, 'gagal')
            return jsonify({'status': 'gagal', 'pesan': 'Username atau password salah'}), 401
    except Exception as e:
        logger.error(f"❌ Error saat login admin: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/guru/dashboard')
def guru_dashboard():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return redirect(url_for('halaman_utama'))
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT DISTINCT id_siswa FROM hasil_kuis")
            siswa_ids = [row['id_siswa'] for row in cursor.fetchall()]
        hasil_siswa = {}
        for id_siswa in siswa_ids:
            hasil = get_hasil_kuis_by_siswa(id_siswa)
            hasil_siswa[id_siswa] = hasil
        return render_template('guru/dashboard.html', hasil_siswa=hasil_siswa)
    except Exception as e:
        logger.error(f"❌ Error saat menampilkan dashboard guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/admin/adminDashboard')
def admin_dashboard():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    return render_template('admin/adminDashboard.html')  # Placeholder untuk dashboard admin