import pymysql
from config import Config
import time
import logging

logger = logging.getLogger(__name__)

def get_db(max_retries=3, delay=2):
    """Membuat koneksi ke database MySQL dengan retry mechanism."""
    for attempt in range(max_retries):
        try:
            logger.info(f"Mencoba koneksi ke database (attempt {attempt + 1}/{max_retries}) dengan config: {Config.DATABASE_CONFIG}")
            return pymysql.connect(**Config.DATABASE_CONFIG)
        except pymysql.Error as e:
            logger.error(f"❌ Gagal koneksi database (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                raise

def save_siswa(nama, kelas):
    """Menyimpan data siswa ke database dan mengembalikan ID siswa."""
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT id FROM siswa WHERE nama = %s AND kelas = %s", (nama, kelas))
            existing_siswa = cursor.fetchone()
            if existing_siswa:
                logger.info(f"✅ Siswa {nama} - Kelas {kelas} sudah ada dengan ID {existing_siswa['id']}.")
                return existing_siswa['id']

            query = "INSERT INTO siswa (nama, kelas) VALUES (%s, %s)"
            cursor.execute(query, (nama, kelas))
            db.commit()
            id_baru = cursor.lastrowid
            logger.info("✅ Data siswa berhasil disimpan.")
            return id_baru
    except Exception as e:
        logger.error(f"❌ Error saat simpan siswa: {e}")
        raise

def save_hasil_kuis(id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, pelajaran_sulit):
    """Menyimpan hasil kuis ke database."""
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT id FROM siswa WHERE id = %s", (id_siswa,))
            if cursor.fetchone() is None:
                raise ValueError(f"ID siswa {id_siswa} tidak ditemukan di database.")

            query = """
                INSERT INTO hasil_kuis
                (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, pelajaran_sulit, tanggal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            cursor.execute(query, (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, pelajaran_sulit))
            db.commit()
            logger.info("✅ Hasil kuis berhasil disimpan.")
    except Exception as e:
        logger.error(f"❌ Error saat simpan hasil kuis: {e}")
        raise

def save_login_log(nama, status):
    """Menyimpan log aktivitas login."""
    try:
        with get_db() as db:
            cursor = db.cursor()
            query = "INSERT INTO login_log (nama, status, waktu) VALUES (%s, %s, NOW())"
            cursor.execute(query, (nama, status))
            db.commit()
            logger.info(f"✅ Log login untuk {nama} ({status}) disimpan.")
    except Exception as e:
        logger.error(f"❌ Error saat simpan log login: {e}")
        raise

def get_student_progress(page=1, limit=10, kelas_filter=None):
    """Mengambil data progres siswa dengan paginasi dan filter kelas."""
    try:
        with get_db() as db:
            cursor = db.cursor()
            offset = (page - 1) * limit
            query = """
                SELECT s.id, s.nama, s.kelas, h.jumlah_benar, h.jumlah_salah, h.tanggal
                FROM siswa s LEFT JOIN hasil_kuis h ON s.id = h.id_siswa
            """
            params = []
            if kelas_filter and kelas_filter in ['3', '4', '5']:
                query += " WHERE s.kelas = %s"
                params.append(kelas_filter)
            query += " ORDER BY h.tanggal DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cursor.execute(query, params)
            results = cursor.fetchall()
            total_query = "SELECT COUNT(DISTINCT s.id) as total FROM siswa s"
            if kelas_filter and kelas_filter in ['3', '4', '5']:
                total_query += " WHERE s.kelas = %s"
                cursor.execute(total_query, [kelas_filter])
            else:
                cursor.execute(total_query)
            total = cursor.fetchone()['total']
            return results, total
    except Exception as e:
        logger.error(f"❌ Error saat mengambil progres siswa: {e}")
        raise