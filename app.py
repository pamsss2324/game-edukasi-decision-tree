from flask import Flask, request, jsonify, send_from_directory, render_template, session, redirect, url_for, Response
from flask_cors import CORS
from flask_session import Session
import json
import pymysql
import os
import traceback
import pandas as pd
import joblib
import re
import datetime
import time
import logging
import pdfkit
import base64
import io
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import bcrypt
from functools import wraps
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from database import save_siswa, save_hasil_kuis, get_db, save_login_log, save_soal_status, get_soal_status
from models import calculate_asal_features, analyze_kesulitan
from config import Config

# Konfigurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load konfigurasi sesi dari Config dan tambahkan pengaturan tambahan
app.config.update(Config.SESSION_CONFIG)
load_dotenv()
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
if not app.config['SECRET_KEY']:
    logger.warning("⚠️ SECRET_KEY tidak ditemukan di .env. Menggunakan kunci acak sementara.")
    app.config['SECRET_KEY'] = Fernet.generate_key().decode()
app.config['FERNET_KEY'] = os.getenv('FERNET_KEY')
if not app.config['FERNET_KEY']:
    logger.warning("⚠️ FERNET_KEY tidak ditemukan di .env. Menggunakan kunci acak sementara.")
    app.config['FERNET_KEY'] = Fernet.generate_key().decode()
fernet = Fernet(app.config['FERNET_KEY'].encode() if isinstance(app.config['FERNET_KEY'], str) else app.config['FERNET_KEY'].encode())

# Tambahkan pengaturan sesi tambahan untuk mendukung permintaan PDF
app.config.update({
    'SESSION_USE_SIGNER': True,
    'SESSION_COOKIE_SECURE': False,  # Ubah ke True jika menggunakan HTTPS
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SAMESITE': 'Lax',  # Sesuaikan dengan 'None' jika HTTPS
})
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
            cursor.execute("SELECT kode_akses, status, kadaluarsa FROM guru WHERE nama = %s", (nama,))
            result = cursor.fetchone()
            if result:
                if not result['status']:
                    logger.info(f"Login guru {nama} ditolak: akun nonaktif.")
                    return False
                if result['kadaluarsa'] and datetime.datetime.strptime(str(result['kadaluarsa']), '%Y-%m-%d') < datetime.datetime.now():
                    logger.info(f"Login guru {nama} ditolak: akun kadaluarsa.")
                    return False
                try:
                    stored_kode = fernet.decrypt(result['kode_akses'].encode()).decode()
                    return stored_kode == kode_akses
                except:
                    return False
            return False
    except Exception as e:
        logger.error(f"❌ Error saat validasi login guru: {e}")
        return False

# Fungsi untuk validasi login admin
def validate_admin_login(username, password):
    admin_username = "admin"
    admin_password_hash = b"$2b$12$jWuwbXTRDCG2H5R7bEw0TuQG1I7EtQDw2nr66L3W/S5p38l0te8SS"
    return username == admin_username and bcrypt.checkpw(password.encode(), admin_password_hash)

def require_login_guru(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.info(f"Sesi guru: {session.get('user')}")
        if not session.get('user') or session.get('user').get('role') != 'guru':
            logger.info(f"Akses ditolak: Sesi tidak valid atau bukan guru.")
            return redirect(url_for('halaman_utama'))
        return f(*args, **kwargs)
    return decorated_function

# Fungsi untuk mengambil data guru
def get_hasil_kuis_by_siswa(id_siswa):
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM hasil_kuis WHERE id_siswa = %s ORDER BY tanggal DESC", (id_siswa,))
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

        kesulitan_diduga, rekomendasi, pelajaran_sulit = analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, total_soal, cart_kesulitan_model, label_encoder_kesulitan)

        pelajaran_sulit_str = json.dumps(pelajaran_sulit) if pelajaran_sulit else '[]'

        save_hasil_kuis(id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, pelajaran_sulit_str)

        return jsonify({
            'status': 'sukses',
            'kesulitan_diduga': kesulitan_diduga,
            'rekomendasi': rekomendasi,
            'pelajaran_sulit': pelajaran_sulit,
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

        # Periksa status paket dari database
        with get_db() as db:
            status_data = get_soal_status(filename, db)
            if status_data and status_data['status'] != 'Aktif':
                raise ValueError(f"Paket soal {filename} telah diarsipkan pada {status_data.get('terakhir_diarsip', 'Tidak Diketahui')} oleh {status_data.get('diarsipkan_diaktifkan_oleh', 'Tidak Diketahui')}.")

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

@app.route('/login/guru', methods=['POST'])
def login_guru():
    try:
        data = request.get_json()
        if not data or 'nama' not in data or 'kode_akses' not in data:
            return jsonify({'status': 'gagal', 'pesan': 'Nama dan kode akses wajib diisi'}), 400
        nama = data['nama']
        kode_akses = data['kode_akses']
        if validate_guru_login(nama, kode_akses):
            with get_db() as db:
                cursor = db.cursor()
                cursor.execute("SELECT * FROM guru WHERE nama = %s", (nama,))
                guru = cursor.fetchone()
                session['user'] = {'role': 'guru', 'nama': guru['nama'], 'kode_akses': guru['kode_akses'], 'kadaluarsa': guru['kadaluarsa']}
                logger.info(f"✅ Log login untuk {nama} (sukses) disimpan.")
                return jsonify({'status': 'sukses', 'pesan': 'Login berhasil'})
        else:
            logger.warning(f"❌ Login gagal untuk {nama}")
            return jsonify({'status': 'gagal', 'pesan': 'Nama atau kode akses salah'}), 401
    except Exception as e:
        logger.error(f"❌ Error saat login guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/login/admin', methods=['POST'])
def login_admin():
    logger.info("Rute /login/admin dipanggil")
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
@require_login_guru
def guru_dashboard():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 6, type=int)
        kelas_filter = request.args.get('kelas', 'all', type=str)
        offset = (page - 1) * limit
        
        user_data = session['user']
        nama_guru = user_data['nama']
        kode_akses_encrypted = user_data.get('kode_akses', '********')
        
        try:
            kode_akses = fernet.decrypt(kode_akses_encrypted.encode()).decode() if kode_akses_encrypted != '********' else '********'
        except Exception as e:
            logger.warning(f"❌ Gagal dekripsi kode akses untuk {nama_guru}: {e}. Menggunakan placeholder.")
            kode_akses = '********'
        
        kode_akses_initial = kode_akses[:2] + '*' * (len(kode_akses) - 2) if kode_akses != '********' and len(kode_akses) > 2 else kode_akses
        kadaluarsa_date = user_data.get('kadaluarsa', '')

        with get_db() as db:
            cursor = db.cursor()
            query = """
                SELECT DISTINCT s.id, s.nama, s.kelas, h.kesulitan_diduga, h.tanggal
                FROM siswa s
                LEFT JOIN hasil_kuis h ON s.id = h.id_siswa
                WHERE 1=1
            """
            count_query = "SELECT COUNT(DISTINCT s.id) as total FROM siswa s LEFT JOIN hasil_kuis h ON s.id = h.id_siswa WHERE 1=1"
            params = []

            if kelas_filter != 'all' and kelas_filter in ['3', '4', '5']:
                query += " AND s.kelas = %s"
                count_query += " AND s.kelas = %s"
                params.append(kelas_filter)

            query += " GROUP BY s.id, s.nama, s.kelas, h.kesulitan_diduga, h.tanggal LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(count_query, params[:-2] if kelas_filter != 'all' else [])
            total = cursor.fetchone()['total']

            cursor.execute(query, params)
            siswa_list = cursor.fetchall()

        return render_template(
            'guru/dashboard.html',
            nama_guru=nama_guru,
            kode_akses=kode_akses,
            kode_akses_initial=kode_akses_initial,
            kadaluarsa_date=kadaluarsa_date,
            siswa_list=[{'id': s['id'], 'nama': s['nama'], 'kelas': s['kelas'], 'kesulitan_diduga': s['kesulitan_diduga'] or 'Belum ada data', 'tanggal': s['tanggal']} for s in siswa_list],
            total=total,
            page=page,
            limit=limit,
            kelas_filter=kelas_filter
        )
    except Exception as e:
        logger.error(f"❌ Error saat menampilkan dashboard guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/kelola-soal')
@require_login_guru
def kelola_soal():
    try:
        user_data = session['user']
        nama_guru = user_data['nama']
        kode_akses_encrypted = user_data.get('kode_akses', '********')
        try:
            kode_akses = fernet.decrypt(kode_akses_encrypted.encode()).decode() if kode_akses_encrypted != '********' else '********'
        except Exception as e:
            logger.warning(f"❌ Gagal dekripsi kode akses untuk {nama_guru}: {e}. Menggunakan placeholder.")
            kode_akses = '********'
        kode_akses_initial = kode_akses[:2] + '*' * (len(kode_akses) - 2) if kode_akses != '********' and len(kode_akses) > 2 else kode_akses
        kadaluarsa_date = user_data.get('kadaluarsa', '')
        return render_template(
            'guru/kelolaSoal.html',
            nama_guru=nama_guru,
            kode_akses=kode_akses,
            kode_akses_initial=kode_akses_initial,
            kadaluarsa_date=kadaluarsa_date,
            timestamp=int(time.time())
        )
    except Exception as e:
        logger.error(f"❌ Error saat menampilkan halaman kelola soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/guru/archive_soal', methods=['POST'])
def archive_soal():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        data = request.get_json()
        if 'filename' not in data:
            raise ValueError("Parameter 'filename' wajib diisi.")
        filename = data['filename']
        filepath = os.path.join('soal', filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File soal {filename} tidak ditemukan.")

        nama_guru = session['user']['nama']
        current_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Toggle status di database dan simpan riwayat
        with get_db() as db:
            current_status = get_soal_status(filename, db)
            new_status = 'Aktif' if current_status and current_status.get('status') == 'Diarsip' else 'Diarsip'
            save_soal_status(filename, new_status, nama_guru, current_time, db)
            logger.info(f"✅ Paket soal {filename} {new_status.lower()} oleh {nama_guru} pada {current_time}.")
            return jsonify({'status': 'sukses', 'pesan': f'Paket soal {filename} berhasil {new_status.lower()}'})
    except FileNotFoundError:
        logger.error(f"❌ File soal {filename} tidak ditemukan.")
        return jsonify({'status': 'gagal', 'pesan': 'File soal tidak ditemukan'}), 404
    except ValueError as ve:
        logger.error(f"❌ Error validasi: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except Exception as e:
        logger.error(f"❌ Error saat mengarsip soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500
    
@app.route('/guru/get_last_paket', methods=['GET'])
def get_last_paket():
    kelas = request.args.get('kelas')
    if kelas not in ['3', '4', '5']:
        return jsonify({'status': 'gagal', 'pesan': 'Kelas tidak valid'}), 400
    folder = 'soal'
    last_paket = 0
    for file in os.listdir(folder):
        if file.startswith(f'soal_kelas{kelas}_paket') and file.endswith('.json'):
            paket = int(file.split('_paket')[1].split('.json')[0])
            last_paket = max(last_paket, paket)
    return jsonify({'status': 'sukses', 'last_paket': last_paket})

@app.route('/soal', methods=['GET'])
def list_soal():
    if request.args.get('list') == 'true':
        folder = 'soal'
        files = [f for f in os.listdir(folder) if f.endswith('.json')]
        return jsonify({'status': 'sukses', 'files': files})
    return jsonify({'status': 'gagal', 'pesan': 'Metode tidak didukung'}), 400

@app.route('/soal/<path:filename>', methods=['POST'])
def save_soal(filename):
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        data = request.get_json()
        if not data or 'soal' not in data:
            raise ValueError("Data 'soal' wajib diisi.")
        filepath = os.path.join('soal', filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data['soal'], f, ensure_ascii=False, indent=2)
        # Tambahkan status awal 'Aktif' ke database saat soal baru disimpan
        with get_db() as db:
            save_soal_status(filename, 'Aktif', session['user']['nama'], datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), db)
        return jsonify({'status': 'sukses', 'pesan': f'File {filename} berhasil disimpan'})
    except ValueError as ve:
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except Exception as e:
        logger.error(f"❌ Error saat menyimpan soal: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/guru/get_arsip_data', methods=['GET'])
def get_arsip_data():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        offset = (page - 1) * limit
        filter_status = request.args.get('status', 'all')
        search = request.args.get('search', '')

        with get_db() as db:
            cursor = db.cursor()
            query = """
                SELECT filename, status, terakhir_diarsip, terakhir_diaktif, diarsipkan_diaktifkan_oleh
                FROM soal_status
                WHERE 1=1
            """
            count_query = "SELECT COUNT(*) as total FROM soal_status WHERE 1=1"
            params = []

            if filter_status != 'all':
                query += " AND status = %s"
                count_query += " AND status = %s"
                params.append('Aktif' if filter_status == 'active' else 'Diarsip')

            if search:
                query += " AND LOWER(filename) LIKE %s"
                count_query += " AND LOWER(filename) LIKE %s"
                params.append(f"%{search.lower()}%")

            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(count_query, params[:-2] if search or filter_status != 'all' else [])
            total = cursor.fetchone()['total']

            cursor.execute(query, params)
            packages = [{
                'filename': row['filename'],
                'status': row['status'],
                'terakhir_diarsip': row['terakhir_diarsip'] or '-',
                'terakhir_diaktif': row['terakhir_diaktif'] or '-',
                'diarsipkan_diaktifkan_oleh': row['diarsipkan_diaktifkan_oleh'] or '-'
            } for row in cursor.fetchall()]

        return jsonify({'status': 'sukses', 'packages': packages, 'total': total})
    except Exception as e:
        logger.error(f"❌ Error saat mengambil data arsip: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/guru/get_history', methods=['GET'])
def get_history():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        filename = request.args.get('filename')
        search = request.args.get('search', '')
        status = request.args.get('status', 'all')
        date = request.args.get('date', '')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))

        if not filename:
            raise ValueError("Parameter 'filename' wajib diisi.")

        status_mapping = {'all': None, 'active': 'Aktif', 'archived': 'Diarsip'}

        with get_db() as db:
            cursor = db.cursor(pymysql.cursors.DictCursor)
            query = """
                SELECT status, tanggal, diarsipkan_diaktifkan_oleh 
                FROM history 
                WHERE filename = %s
            """
            count_query = "SELECT COUNT(*) as total FROM history WHERE filename = %s"
            params = [filename]

            if search:
                query += " AND LOWER(diarsipkan_diaktifkan_oleh) LIKE %s"
                count_query += " AND LOWER(diarsipkan_diaktifkan_oleh) LIKE %s"
                params.append(f"%{search.lower()}%")
            if status_mapping.get(status):
                query += " AND status = %s"
                count_query += " AND status = %s"
                params.append(status_mapping[status])
            if date:
                query += " AND DATE(tanggal) = %s"
                count_query += " AND DATE(tanggal) = %s"
                params.append(date)

            query += " ORDER BY tanggal DESC"
            offset = (page - 1) * limit
            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(count_query, params[:-2])
            total = cursor.fetchone()
            if total is None:
                logger.warning(f"Tidak ada data untuk filename: {filename}")
                return jsonify({'status': 'sukses', 'history': [], 'total': 0})

            cursor.execute(query, params)
            history = [dict(row) for row in cursor.fetchall()]

            logger.debug(f"Query executed: {query}, Params: {params}, Results: {history}")
            if not history:
                logger.warning(f"Tidak ada riwayat ditemukan untuk filename: {filename} dengan status: {status}")
                return jsonify({'status': 'sukses', 'history': [], 'total': total['total']})

        return jsonify({
            'status': 'sukses',
            'history': history,
            'total': total['total']
        })
    except ValueError as ve:
        logger.error(f"❌ Error validasi: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except pymysql.Error as e:
        logger.error(f"❌ Error database: {str(e)} - Query: {query}, Params: {params}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan pada database'}), 500
    except Exception as e:
        logger.error(f"❌ Error tak terduga: {str(e)} - Query: {query}, Params: {params}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/guru/get_siswa', methods=['GET'])
def get_siswa():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 6, type=int)  # Diubah ke 6
        offset = (page - 1) * limit
        kelas_filter = request.args.get('kelas', 'all', type=str)
        search = request.args.get('search', '', type=str)

        with get_db() as db:
            cursor = db.cursor()
            query = """
                SELECT DISTINCT s.id, s.nama, s.kelas, h.kesulitan_diduga, h.tanggal
                FROM siswa s
                LEFT JOIN hasil_kuis h ON s.id = h.id_siswa
                WHERE 1=1
            """
            count_query = "SELECT COUNT(DISTINCT s.id) as total FROM siswa s LEFT JOIN hasil_kuis h ON s.id = h.id_siswa WHERE 1=1"
            params = []

            if kelas_filter != 'all' and kelas_filter in ['3', '4', '5']:
                query += " AND s.kelas = %s"
                count_query += " AND s.kelas = %s"
                params.append(kelas_filter)

            if search:
                query += " AND LOWER(s.nama) LIKE %s"
                count_query += " AND LOWER(s.nama) LIKE %s"
                params.append(f"%{search.lower()}%")

            query += " GROUP BY s.id, s.nama, s.kelas, h.kesulitan_diduga, h.tanggal LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(count_query, params[:-2] if search or kelas_filter != 'all' else [])
            total = cursor.fetchone()['total']

            cursor.execute(query, params)
            siswa_list = cursor.fetchall()

        return jsonify({
            'status': 'sukses',
            'siswa': [{'id': s['id'], 'nama': s['nama'], 'kelas': s['kelas'], 'kesulitan_diduga': s['kesulitan_diduga'] or 'Belum ada data', 'tanggal': s['tanggal']} for s in siswa_list],
            'total': total,
            'page': page,
            'limit': limit
        })
    except Exception as e:
        logger.error(f"❌ Error saat mengambil daftar siswa: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/guru/get_detail_siswa', methods=['GET'])
def get_detail_siswa():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        id_siswa = request.args.get('id_siswa', type=int)
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, pelajaran_sulit
                FROM hasil_kuis
                WHERE id_siswa = %s
                ORDER BY tanggal DESC
                LIMIT 1
            """, (id_siswa,))
            result = cursor.fetchone()
            if result:
                return jsonify({
                    'status': 'sukses',
                    'jumlah_benar': result['jumlah_benar'],
                    'jumlah_salah': result['jumlah_salah'],
                    'waktu_rata2_per_soal': result['waktu_rata2_per_soal'],
                    'dideteksi_asal': bool(result['dideteksi_asal']),
                    'kesulitan_diduga': result['kesulitan_diduga'],
                    'pelajaran_sulit': result['pelajaran_sulit'] or '[]'
                })
            else:
                return jsonify({'status': 'gagal', 'pesan': 'Data kuis siswa belum tersedia'}), 404
    except Exception as e:
        logger.error(f"❌ Error saat mengambil detail siswa: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

# Rute untuk halaman utama laporan (tambahkan baru)
@app.route('/guru/reports')
@require_login_guru
def reports():
    try:
        user_data = session['user']
        nama_guru = user_data['nama']
        kode_akses_encrypted = user_data.get('kode_akses', '********')
        try:
            kode_akses = fernet.decrypt(kode_akses_encrypted.encode()).decode() if kode_akses_encrypted != '********' else '********'
        except Exception as e:
            logger.warning(f"Gagal dekripsi kode akses untuk {nama_guru}: {e}. Menggunakan placeholder.")
            kode_akses = '********'
        kode_akses_initial = kode_akses[:2] + '*' * (len(kode_akses) - 2) if kode_akses != '********' and len(kode_akses) > 2 else kode_akses
        kadaluarsa_date = user_data.get('kadaluarsa', '')
        return render_template(
            'guru/reports.html',
            nama_guru=nama_guru,
            kode_akses=kode_akses,
            kode_akses_initial=kode_akses_initial,
            kadaluarsa_date=kadaluarsa_date,
            timestamp=int(time.time())
        )
    except Exception as e:
        logger.error(f"Error saat menampilkan halaman laporan: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

# Rute untuk mengambil daftar paket (tambahkan baru)
@app.route('/guru/get_paket', methods=['GET'])
def get_paket():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        kelas = request.args.get('kelas', '3')
        if kelas not in ['3', '4', '5']:
            return jsonify({'status': 'gagal', 'pesan': 'Kelas tidak valid'}), 400
        folder = 'soal'
        paket_list = []
        for file in os.listdir(folder):
            if file.startswith(f'soal_kelas{kelas}_paket') and file.endswith('.json'):
                paket = int(file.split('_paket')[1].split('.json')[0])
                if paket not in paket_list:  # Hindari duplikat
                    paket_list.append(paket)
        return jsonify({'status': 'sukses', 'paket': sorted(paket_list)})
    except Exception as e:
        logger.error(f"Error saat mengambil daftar paket: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

# Rute untuk laporan individu (perbarui dari /generate_report/individu)
@app.route('/guru/report/individu/<int:id_siswa>')
@require_login_guru
def laporan_individu(id_siswa):
    logger.info(f"Menampilkan laporan individu untuk id_siswa: {id_siswa}, guru: {session['user']['nama']}")
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT h.*, s.nama, s.kelas 
                FROM hasil_kuis h 
                JOIN siswa s ON h.id_siswa = s.id 
                WHERE h.id_siswa = %s 
                ORDER BY h.tanggal DESC 
                LIMIT 1
            """, (id_siswa,))
            result = cursor.fetchone()
            if not result:
                logger.warning(f"Data kuis tidak ditemukan untuk id_siswa: {id_siswa}")
                return jsonify({'status': 'gagal', 'pesan': 'Data kuis siswa tidak ditemukan'}), 404

            data = {
                'nama': result['nama'],
                'kelas': result['kelas'],
                'mapel': result['mapel'],
                'jumlah_benar': result['jumlah_benar'],
                'jumlah_salah': result['jumlah_salah'],
                'total_soal': result['jumlah_benar'] + result['jumlah_salah'],
                'waktu_rata2_per_soal': result['waktu_rata2_per_soal'],
                'kesulitan_diduga': result['kesulitan_diduga'],
                'tanggal': result['tanggal'].strftime('%d-%m-%Y'),
                'pelajaran_stats': {},
                'topik_stats': {}
            }

            try:
                soal_data = json.loads(result['daftar_soal_dikerjakan'])
                soal_list = soal_data.get('soal', [])
            except json.JSONDecodeError:
                logger.error(f"Data soal tidak valid untuk id_siswa: {id_siswa}")
                return jsonify({'status': 'gagal', 'pesan': 'Data soal tidak valid'}), 400

            for soal in soal_list:
                pelajaran = soal.get('pelajaran', 'Tidak Diketahui')
                topik = soal.get('topik', 'Tidak Diketahui')
                benar = soal.get('benar', False)

                if pelajaran not in data['pelajaran_stats']:
                    data['pelajaran_stats'][pelajaran] = {'benar': 0, 'salah': 0}
                if benar:
                    data['pelajaran_stats'][pelajaran]['benar'] += 1
                else:
                    data['pelajaran_stats'][pelajaran]['salah'] += 1

                if pelajaran not in data['topik_stats']:
                    data['topik_stats'][pelajaran] = {}
                if topik not in data['topik_stats'][pelajaran]:
                    data['topik_stats'][pelajaran][topik] = {'benar': 0, 'total': 0}
                data['topik_stats'][pelajaran][topik]['total'] += 1
                if benar:
                    data['topik_stats'][pelajaran][topik]['benar'] += 1
                data['topik_stats'][pelajaran][topik]['persentase'] = (
                    data['topik_stats'][pelajaran][topik]['benar'] / data['topik_stats'][pelajaran][topik]['total'] * 100
                )

            logger.info(f"Data laporan individu untuk id_siswa {id_siswa}: {data}")
            # Cek apakah ini permintaan AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(data)
            return render_template('guru/laporanIndividu.html', data=data, nama_guru=session['user']['nama'], 
                                 kode_akses_initial=session['user']['kode_akses'][:2] + '*' * (len(session['user']['kode_akses']) - 2), 
                                 kode_akses=session['user']['kode_akses'], kadaluarsa_date=session['user'].get('kadaluarsa', 'N/A'), 
                                 timestamp=int(time.time()))
    except Exception as e:
        logger.error(f"Error saat membuat laporan individu untuk id_siswa {id_siswa}: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500
    
# Rute untuk laporan kesalahan umum (pratinjau)
@app.route('/guru/report/kesalahan_kelas', methods=['GET'])
@require_login_guru
def laporan_kesalahan_kelas():
    try:
        kelas = request.args.get('kelas', '3')
        paket = request.args.get('paket', 'all')
        if kelas not in ['3', '4', '5']:
            return jsonify({'status': 'gagal', 'pesan': 'Kelas tidak valid'}), 400

        with get_db() as db:
            cursor = db.cursor()
            query = """
                SELECT h.daftar_soal_dikerjakan, h.jumlah_benar, h.jumlah_salah
                FROM hasil_kuis h JOIN siswa s ON h.id_siswa = s.id
                WHERE s.kelas = %s
            """
            params = [kelas]
            if paket != 'all':
                query += " AND JSON_EXTRACT(h.daftar_soal_dikerjakan, '$.paket') = %s"
                params.append(paket)
            cursor.execute(query, params)
            results = cursor.fetchall()

            topik_stats = {}
            if results:
                for result in results:
                    try:
                        soal_data = json.loads(result['daftar_soal_dikerjakan'])
                        for soal in soal_data.get('soal', []):
                            topik = soal.get('topik', 'Tidak Diketahui')
                            if topik not in topik_stats:
                                topik_stats[topik] = {'benar': 0, 'total': 0}
                            topik_stats[topik]['total'] += 1
                            if soal.get('benar', False):
                                topik_stats[topik]['benar'] += 1
                    except json.JSONDecodeError:
                        logger.warning(f"Data JSON tidak valid untuk hasil kuis: {result}")
                        continue

            data = {
                'kelas': kelas,
                'paket': paket,
                'topik_stats': {k: {'benar': v['benar'], 'total': v['total'], 'persentase_salah': ((v['total'] - v['benar']) / v['total'] * 100) if v['total'] > 0 else 0} for k, v in topik_stats.items()} if topik_stats else {}
            }

            logger.info(f"Data laporan kesalahan umum: {data}")

            user_data = session['user']
            nama_guru = user_data['nama']
            kode_akses_encrypted = user_data.get('kode_akses', '********')
            try:
                kode_akses = fernet.decrypt(kode_akses_encrypted.encode()).decode() if kode_akses_encrypted != '********' else '********'
            except Exception as e:
                logger.warning(f"Gagal dekripsi kode akses untuk {nama_guru}: {e}. Menggunakan placeholder.")
                kode_akses = '********'
            kode_akses_initial = kode_akses[:2] + '*' * (len(kode_akses) - 2) if kode_akses != '********' and len(kode_akses) > 2 else kode_akses
            kadaluarsa_date = user_data.get('kadaluarsa', '')

            return render_template(
                'guru/laporanKesalahanUmum.html',
                nama_guru=nama_guru,
                kode_akses=kode_akses,
                kode_akses_initial=kode_akses_initial,
                kadaluarsa_date=kadaluarsa_date,
                data=data,
                timestamp=int(time.time())
            )
    except Exception as e:
        logger.error(f"Error saat membuat laporan kesalahan kelas: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500
    
# Rute untuk laporan perbandingan (pratinjau dengan pagination)
@app.route('/guru/report/perbandingan')
@require_login_guru
def laporan_perbandingan():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        kelas = request.args.get('kelas', '3')
        paket = request.args.get('paket', 'all')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)  # Default 10 siswa
        offset = (page - 1) * limit
        if kelas not in ['3', '4', '5']:
            return jsonify({'status': 'gagal', 'pesan': 'Kelas tidak valid'}), 400

        with get_db() as db:
            cursor = db.cursor()
            query = """
                SELECT s.id, s.nama, h.jumlah_benar, h.jumlah_salah, h.waktu_rata2_per_soal, h.kesulitan_diduga,
                       h.daftar_soal_dikerjakan
                FROM hasil_kuis h JOIN siswa s ON h.id_siswa = s.id
                WHERE s.kelas = %s
            """
            count_query = """
                SELECT COUNT(DISTINCT s.id) as total
                FROM hasil_kuis h JOIN siswa s ON h.id_siswa = s.id
                WHERE s.kelas = %s
            """
            params = [kelas]
            if paket != 'all':
                query += " AND JSON_EXTRACT(h.daftar_soal_dikerjakan, '$.paket') = %s"
                count_query += " AND JSON_EXTRACT(h.daftar_soal_dikerjakan, '$.paket') = %s"
                params.append(paket)
            query += " ORDER BY h.jumlah_benar DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cursor.execute(count_query, params[:-2] if paket != 'all' else params[:-2])
            total = cursor.fetchone()['total']

            cursor.execute(query, params)
            results = cursor.fetchall()
            if not results:
                return jsonify({'status': 'gagal', 'pesan': 'Data tidak ditemukan'}), 404

            siswa_data = []
            for result in results:
                soal_data = json.loads(result['daftar_soal_dikerjakan'])
                topik_stats = {}
                for soal in soal_data.get('soal', []):
                    topik = soal.get('topik', 'Tidak Diketahui')
                    if topik not in topik_stats:
                        topik_stats[topik] = {'benar': 0, 'total': 0}
                    topik_stats[topik]['total'] += 1
                    if soal.get('benar', False):
                        topik_stats[topik]['benar'] += 1
                persentase = (result['jumlah_benar'] / (result['jumlah_benar'] + result['jumlah_salah']) * 100) if (result['jumlah_benar'] + result['jumlah_salah']) > 0 else 0
                siswa_data.append({
                    'id': result['id'],
                    'nama': result['nama'],
                    'jumlah_benar': result['jumlah_benar'],
                    'jumlah_salah': result['jumlah_salah'],
                    'persentase': persentase,
                    'waktu_rata2': result['waktu_rata2_per_soal'],
                    'kesulitan_diduga': result['kesulitan_diduga'],
                    'topik_stats': {k: {'benar': v['benar'], 'total': v['total'], 'persentase': (v['benar'] / v['total'] * 100) if v['total'] > 0 else 0} for k, v in topik_stats.items()}
                })

            return jsonify({
                'status': 'sukses',
                'data': {
                    'kelas': kelas,
                    'paket': paket,
                    'siswa': siswa_data,
                    'total': total,
                    'page': page,
                    'limit': limit
                }
            })
    except Exception as e:
        logger.error(f"Error saat membuat laporan perbandingan: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

# Rute untuk membuat PDF laporan individu (disebut dari pratinjau)
@app.route('/guru/report/individu/pdf/<int:id_siswa>')
@require_login_guru
def laporan_individu_pdf(id_siswa):
    logger.info(f"Memeriksa sesi untuk PDF: {session.get('user', 'Tidak ada sesi')}")
    if not session.get('user') or session.get('user').get('role') != 'guru':
        logger.info(f"Akses ditolak untuk PDF id_siswa {id_siswa}: Tidak ada sesi guru.")
        return redirect(url_for('halaman_utama'))
    logger.info(f"Menghasilkan PDF untuk id_siswa: {id_siswa}, guru: {session['user']['nama']}")
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT h.*, s.nama, s.kelas 
                FROM hasil_kuis h 
                JOIN siswa s ON h.id_siswa = s.id 
                WHERE h.id_siswa = %s 
                ORDER BY h.tanggal DESC 
                LIMIT 1
            """, (id_siswa,))
            result = cursor.fetchone()
            if not result:
                logger.warning(f"Data kuis tidak ditemukan untuk id_siswa: {id_siswa}")
                return jsonify({'status': 'gagal', 'pesan': 'Data kuis siswa tidak ditemukan'}), 404

            data = {
                'nama': result['nama'],
                'kelas': result['kelas'],
                'mapel': result['mapel'],
                'jumlah_benar': result['jumlah_benar'],
                'jumlah_salah': result['jumlah_salah'],
                'total_soal': result['jumlah_benar'] + result['jumlah_salah'],
                'waktu_rata2_per_soal': result['waktu_rata2_per_soal'],
                'kesulitan_diduga': result['kesulitan_diduga'],
                'tanggal': result['tanggal'].strftime('%d-%m-%Y'),
                'pelajaran_stats': {},
                'topik_stats': {}
            }

            try:
                soal_data = json.loads(result['daftar_soal_dikerjakan'])
                soal_list = soal_data.get('soal', [])
            except json.JSONDecodeError:
                logger.error(f"Data soal tidak valid untuk id_siswa: {id_siswa}")
                return jsonify({'status': 'gagal', 'pesan': 'Data soal tidak valid'}), 400

            for soal in soal_list:
                pelajaran = soal.get('pelajaran', 'Tidak Diketahui')
                topik = soal.get('topik', 'Tidak Diketahui')
                benar = soal.get('benar', False)

                if pelajaran not in data['pelajaran_stats']:
                    data['pelajaran_stats'][pelajaran] = {'benar': 0, 'salah': 0}
                if benar:
                    data['pelajaran_stats'][pelajaran]['benar'] += 1
                else:
                    data['pelajaran_stats'][pelajaran]['salah'] += 1

                if pelajaran not in data['topik_stats']:
                    data['topik_stats'][pelajaran] = {}
                if topik not in data['topik_stats'][pelajaran]:
                    data['topik_stats'][pelajaran][topik] = {'benar': 0, 'total': 0}
                data['topik_stats'][pelajaran][topik]['total'] += 1
                if benar:
                    data['topik_stats'][pelajaran][topik]['benar'] += 1
                data['topik_stats'][pelajaran][topik]['persentase'] = (
                    data['topik_stats'][pelajaran][topik]['benar'] / data['topik_stats'][pelajaran][topik]['total'] * 100
                )

            # Generate image grafik menggunakan matplotlib (warna penuh)
            fig, ax = plt.subplots(figsize=(8, 6))
            labels = list(data['pelajaran_stats'].keys())
            benar = [v['benar'] for v in data['pelajaran_stats'].values()]
            salah = [v['salah'] for v in data['pelajaran_stats'].values()]

            x = range(len(labels))
            ax.bar(x, benar, width=0.4, label='Benar', color='#4CAF50')
            ax.bar([p + 0.4 for p in x], salah, width=0.4, label='Salah', color='#d32f2f')

            ax.set_xlabel('Pelajaran')
            ax.set_ylabel('Jumlah Soal')
            ax.set_title('Performa per Pelajaran')
            ax.set_xticks([p + 0.2 for p in x])
            ax.set_xticklabels(labels)
            ax.legend()

            buf = io.BytesIO()
            fig.savefig(buf, format='png')
            buf.seek(0)
            grafik_image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close(fig)

            logger.info(f"Data PDF untuk id_siswa {id_siswa}: {data}")
            rendered = render_template('laporanIndividuPDF.html', data=data, grafik_image_base64=grafik_image_base64, nama_guru=session['user']['nama'],
                                     kode_akses_initial=session['user']['kode_akses'][:2] + '*' * (len(session['user']['kode_akses']) - 2),
                                     kode_akses=session['user']['kode_akses'], kadaluarsa_date=session['user'].get('kadaluarsa', 'N/A'))

            pdf = pdfkit.from_string(rendered, False, options={'enable-local-file-access': '', 'javascript-delay': 1000})
            return Response(pdf, mimetype='application/pdf',
                           headers={'Content-Disposition': f'attachment;filename=laporan_individu_{id_siswa}.pdf'})
    except Exception as e:
        logger.error(f"Error saat membuat PDF laporan individu untuk id_siswa {id_siswa}: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

# Rute serupa untuk laporan kesalahan umum PDF
@app.route('/guru/report/kesalahan_kelas/pdf')
@require_login_guru
def laporan_kesalahan_kelas_pdf():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        kelas = request.args.get('kelas', '3')
        paket = request.args.get('paket', 'all')
        if kelas not in ['3', '4', '5']:
            return jsonify({'status': 'gagal', 'pesan': 'Kelas tidak valid'}), 400

        with get_db() as db:
            cursor = db.cursor()
            query = """
                SELECT h.daftar_soal_dikerjakan, h.jumlah_benar, h.jumlah_salah, s.kelas
                FROM hasil_kuis h JOIN siswa s ON h.id_siswa = s.id
                WHERE s.kelas = %s
            """
            params = [kelas]
            if paket != 'all':
                query += " AND JSON_EXTRACT(h.daftar_soal_dikerjakan, '$.paket') = %s"
                params.append(paket)
            cursor.execute(query, params)
            results = cursor.fetchall()

            if not results:
                return jsonify({'status': 'gagal', 'pesan': 'Data tidak ditemukan'}), 404

            # Hitung jumlah siswa unik
            cursor.execute("SELECT COUNT(DISTINCT id) as jumlah_siswa FROM siswa WHERE kelas = %s", (kelas,))
            jumlah_siswa = cursor.fetchone()['jumlah_siswa']

            pelajaran_stats = {}
            topik_stats = {}
            for result in results:
                soal_data = json.loads(result['daftar_soal_dikerjakan'])
                for soal in soal_data.get('soal', []):
                    pelajaran = soal.get('pelajaran', 'Tidak Diketahui')
                    topik = soal.get('topik', 'Tidak Diketahui')
                    if pelajaran not in pelajaran_stats:
                        pelajaran_stats[pelajaran] = {'salah': 0, 'total': 0}
                    pelajaran_stats[pelajaran]['total'] += 1
                    if not soal.get('benar', False):
                        pelajaran_stats[pelajaran]['salah'] += 1

                    if pelajaran not in topik_stats:
                        topik_stats[pelajaran] = {}
                    if topik not in topik_stats[pelajaran]:
                        topik_stats[pelajaran][topik] = {'benar': 0, 'total': 0}
                    topik_stats[pelajaran][topik]['total'] += 1
                    if soal.get('benar', False):
                        topik_stats[pelajaran][topik]['benar'] += 1

            # Ambil 3 pelajaran dengan kesalahan tertinggi untuk grafik pie
            pie_data = {k: v['salah'] / v['total'] * 100 for k, v in pelajaran_stats.items() if v['total'] > 0}
            pie_data = dict(sorted(pie_data.items(), key=lambda x: x[1], reverse=True)[:3])
            labels = list(pie_data.keys())
            sizes = list(pie_data.values())

            # Generate grafik pie dengan matplotlib
            fig, ax = plt.subplots(figsize=(7.8, 7.8))
            ax.pie(sizes, labels=labels, autopct='%1.1f%%', colors=['#FF9999', '#66B2FF', '#99FF99'], startangle=90, textprops={'fontsize': 13}) 
            ax.axis('equal')

            # Atur padding agar grafik tidak terpotong
            plt.tight_layout()

            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=150)
            buf.seek(0)
            grafik_pie_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close(fig)

            # Format timestamp di Python
            from datetime import datetime
            tanggal_str = datetime.fromtimestamp(int(time.time())).strftime('%d/%m/%Y')

            # Pastikan topik_stats hanya menyertakan data dengan total > 0 dan hitung persentase_salah
            cleaned_topik_stats = {}
            for pelajaran, topiks in topik_stats.items():
                cleaned_topiks = {}
                for topik, stats in topiks.items():
                    if stats['total'] > 0:
                        cleaned_stats = stats.copy()
                        cleaned_stats['persentase_salah'] = ((stats['total'] - stats['benar']) / stats['total'] * 100) if stats['total'] > 0 else 0
                        cleaned_topiks[topik] = cleaned_stats
                if cleaned_topiks:
                    cleaned_topik_stats[pelajaran] = cleaned_topiks

            print("Debug topik_stats:", cleaned_topik_stats)

            data = {
                'kelas': kelas,
                'paket': paket,
                'jumlah_siswa': jumlah_siswa,
                'grafik_pie_base64': grafik_pie_base64,
                'topik_stats': cleaned_topik_stats,
                'tanggal': tanggal_str
            }

            rendered = render_template('laporanKesalahanUmumPDF.html', **data)
            config = pdfkit.configuration(wkhtmltopdf='C:\\Program Files (x86)\\wkhtmltopdf\\bin\\wkhtmltopdf.exe')
            options = {
                'enable-local-file-access': '',
                'quiet': ''
            }
            pdf = pdfkit.from_string(rendered, False, configuration=config, options=options)
            if not pdf:
                raise Exception("Gagal menghasilkan PDF")
            return Response(pdf, mimetype='application/pdf', headers={'Content-Disposition': f'attachment; filename=laporan_kesalahan_kelas_{kelas}_{paket}.pdf'})
    except Exception as e:
        logger.error(f"Error saat membuat PDF laporan kesalahan kelas: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

# Rute serupa untuk laporan perbandingan PDF
@app.route('/guru/report/perbandingan/pdf')
@require_login_guru
def laporan_perbandingan_pdf():
    if not session.get('user') or session.get('user').get('role') != 'guru':
        return jsonify({'status': 'gagal', 'pesan': 'Akses ditolak'}), 403
    try:
        kelas = request.args.get('kelas', '3')
        paket = request.args.get('paket', 'all')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        response = laporan_perbandingan()
        data = response.json['data'] if 'data' in response.json else {}
        rendered = render_template('laporanPerbandingan.html', **data)

        config = pdfkit.configuration(wkhtmltopdf='/usr/bin/wkhtmltopdf')
        pdf = pdfkit.from_string(rendered, False, configuration=config)

        return Response(pdf, mimetype='application/pdf', headers={'Content-Disposition': f'attachment; filename=laporan_perbandingan_{kelas}.pdf'})
    except Exception as e:
        logger.error(f"Error saat membuat PDF laporan perbandingan: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500
    
@app.route('/admin/adminDashboard')
def admin_dashboard():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("UPDATE guru SET status = 0 WHERE kadaluarsa IS NOT NULL AND kadaluarsa < CURDATE()")
            db.commit()
            cursor.execute("SELECT nama, kode_akses, kadaluarsa, status FROM guru LIMIT 8")
            guru_list = cursor.fetchall()
            decrypted_guru_list = []
            for guru in guru_list:
                try:
                    kode_akses = fernet.decrypt(guru['kode_akses'].encode()).decode()
                except:
                    kode_akses = guru['kode_akses'][:2] + '*' * 6
                decrypted_guru_list.append({
                    'nama': guru['nama'],
                    'kode_akses': kode_akses,
                    'kadaluarsa': guru['kadaluarsa'].strftime('%Y-%m-%d') if guru['kadaluarsa'] else None,
                    'status': guru['status']
                })
        return render_template('admin/adminDashboard.html', initial_guru=decrypted_guru_list)
    except Exception as e:
        logger.error(f"Error loading admin dashboard: {e}")
        return render_template('admin/adminDashboard.html', initial_guru=[])

@app.route('/admin/atur-kode-akses', endpoint='admin_atur_kode_akses')
def atur_kode_akses():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("UPDATE guru SET status = 0 WHERE kadaluarsa IS NOT NULL AND kadaluarsa < CURDATE()")
            db.commit()
            cursor.execute("SELECT nama, kode_akses, kadaluarsa, status, terakhir_diperbarui FROM guru LIMIT 10")
            guru_list = cursor.fetchall()
            decrypted_guru_list = []
            for guru in guru_list:
                try:
                    kode_akses = fernet.decrypt(guru['kode_akses'].encode()).decode()
                except:
                    kode_akses = guru['kode_akses'][:2] + '*' * 6
                decrypted_guru_list.append({
                    'nama': guru['nama'],
                    'kode_akses': kode_akses,
                    'kadaluarsa': guru['kadaluarsa'].strftime('%Y-%m-%d') if guru['kadaluarsa'] else None,
                    'status': guru['status'],
                    'terakhir_diperbarui': guru['terakhir_diperbarui']
                })
        return render_template('admin/aturKodeAkses.html', initial_guru=decrypted_guru_list)
    except Exception as e:
        logger.error(f"Error loading atur kode akses: {e}")
        return render_template('admin/aturKodeAkses.html', initial_guru=[])

@app.route('/admin/get_guru', methods=['GET'])
def get_guru():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 8, type=int)
        offset = (page - 1) * limit
        status_filter = request.args.get('status', 'all', type=str)
        search = request.args.get('search', '', type=str)
        logger.info(f"Received get_guru request: page={page}, limit={limit}, status={status_filter}, search={search}")

        with get_db() as db:
            cursor = db.cursor()
            # Update status untuk akun kadaluarsa
            cursor.execute("UPDATE guru SET status = 0 WHERE kadaluarsa IS NOT NULL AND kadaluarsa < CURDATE()")
            db.commit()
            
            query = """
                SELECT nama, kode_akses, kadaluarsa, status, terakhir_diperbarui 
                FROM guru
                WHERE 1=1
            """
            count_query = "SELECT COUNT(*) as total FROM guru WHERE 1=1"
            params = []

            if status_filter in ['active', 'inactive']:
                query += " AND status = %s"
                count_query += " AND status = %s"
                params.append(1 if status_filter == 'active' else 0)

            if search:
                query += " AND LOWER(nama) LIKE %s"
                count_query += " AND LOWER(nama) LIKE %s"
                params.append(f"%{search.lower()}%")

            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            logger.info(f"Executing count query: {count_query} with params: {params[:-2]}")
            cursor.execute(count_query, params[:-2] if search or status_filter in ['active', 'inactive'] else [])
            total = cursor.fetchone()['total'] if cursor.rowcount > 0 else 0

            logger.info(f"Executing query: {query} with params: {params}")
            cursor.execute(query, params)
            guru_list = []
            for row in cursor.fetchall():
                try:
                    kode_akses = fernet.decrypt(row['kode_akses'].encode()).decode()
                except:
                    kode_akses = row['kode_akses'][:2] + '*' * 6
                guru_list.append({
                    'nama': row['nama'],
                    'kode_akses': kode_akses,
                    'kadaluarsa': row['kadaluarsa'].strftime('%Y-%m-%d') if row['kadaluarsa'] else None,
                    'status': row['status'],
                    'terakhir_diperbarui': row['terakhir_diperbarui']
                })
            logger.info(f"Returning guru_list: {guru_list}")

        return jsonify({
            'status': 'sukses',
            'guru': guru_list,
            'total': total,
            'page': page,
            'limit': limit
        })
    except pymysql.Error as db_error:
        logger.error(f"❌ Database error: {db_error}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan database'}), 500
    except Exception as e:
        logger.error(f"❌ Error saat mengambil daftar guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/admin/buat-akun-guru', methods=['GET'], endpoint='admin_buat_akun_guru')
def buat_akun_guru():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    return render_template('admin/buatAkunGuru.html')

@app.route('/admin/add_guru', methods=['POST'], endpoint='admin_buat_akun_guru_submit')
def add_guru():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    try:
        data = request.get_json()
        if 'nama' not in data or 'kode_akses' not in data or 'kadaluarsa' not in data:
            return jsonify({'status': 'gagal', 'pesan': 'Nama, kode akses, dan kadaluarsa wajib diisi'}), 400
        nama = data['nama']
        kode_akses = data['kode_akses']
        kadaluarsa = data['kadaluarsa']

        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT nama FROM guru WHERE nama = %s", (nama,))
            if cursor.fetchone():
                return jsonify({'status': 'gagal', 'pesan': 'Nama guru sudah ada'}), 400

        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$', kode_akses):
            return jsonify({'status': 'gagal', 'pesan': 'Kode akses minimal 8 karakter dan harus berisi huruf serta angka'}), 400
        if datetime.datetime.strptime(kadaluarsa, '%Y-%m-%d') <= datetime.datetime.now():
            return jsonify({'status': 'gagal', 'pesan': 'Kadaluarsa harus di masa depan'}), 400

        encrypted_kode = fernet.encrypt(kode_akses.encode()).decode()
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("INSERT INTO guru (nama, kode_akses, kadaluarsa, status) VALUES (%s, %s, %s, %s)",
                          (nama, encrypted_kode, kadaluarsa, 1))
            db.commit()
        logger.info(f"✅ Akun guru {nama} ditambahkan.")
        return jsonify({'status': 'sukses', 'pesan': 'Akun guru berhasil ditambahkan'})
    except ValueError as ve:
        logger.error(f"❌ Error validasi: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except Exception as e:
        logger.error(f"❌ Error saat menambah guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/admin/update_guru', methods=['POST'])
def update_guru():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    try:
        data = request.get_json()
        nama = data['nama']
        kode_akses = data['kode_akses']
        kadaluarsa = data['kadaluarsa']

        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$', kode_akses):
            return jsonify({'status': 'gagal', 'pesan': 'Kode akses minimal 8 karakter dan harus berisi huruf serta angka'}), 400
        status = 1
        if kadaluarsa and datetime.datetime.strptime(kadaluarsa, '%Y-%m-%d') <= datetime.datetime.now():
            status = 0

        encrypted_kode = fernet.encrypt(kode_akses.encode()).decode()
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("UPDATE guru SET kode_akses = %s, kadaluarsa = %s, status = %s WHERE nama = %s",
                          (encrypted_kode, kadaluarsa, status, nama))
            db.commit()
        logger.info(f"✅ Akun guru {nama} diperbarui.")
        return jsonify({'status': 'sukses', 'pesan': 'Akun guru berhasil diperbarui'})
    except ValueError as ve:
        logger.error(f"❌ Error validasi: {ve}")
        return jsonify({'status': 'gagal', 'pesan': str(ve)}), 400
    except Exception as e:
        logger.error(f"❌ Error saat memperbarui guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/admin/toggle_guru_status', methods=['POST'])
def toggle_guru_status():
    if not session.get('user') or session.get('user').get('role') != 'admin':
        return redirect(url_for('halaman_utama'))
    try:
        data = request.get_json()
        nama = data['nama']
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT status FROM guru WHERE nama = %s", (nama,))
            result = cursor.fetchone()
            if not result:
                return jsonify({'status': 'gagal', 'pesan': 'Guru tidak ditemukan'}), 404
            new_status = 0 if result['status'] else 1
            cursor.execute("UPDATE guru SET status = %s WHERE nama = %s",
                          (new_status, nama))
            db.commit()
        logger.info(f"✅ Status guru {nama} diubah ke {new_status}.")
        return jsonify({'status': 'sukses', 'pesan': 'Status guru berhasil diubah'})
    except Exception as e:
        logger.error(f"❌ Error saat mengedit status guru: {e}")
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

@app.route('/admin/logout')
def admin_logout():
    try:
        session.pop('user', None)
        return redirect(url_for('halaman_utama'))
    except Exception as e:
        logger.error(f"Error saat logout: {e}")
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': 'Terjadi kesalahan server'}), 500

if __name__ == '__main__':
    app.run(debug=True)