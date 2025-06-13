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

def save_hasil_kuis(id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga):
    """Menyimpan hasil kuis ke database."""
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT id FROM siswa WHERE id = %s", (id_siswa,))
            if cursor.fetchone() is None:
                raise ValueError(f"ID siswa {id_siswa} tidak ditemukan di database.")

            query = """
                INSERT INTO hasil_kuis
                (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga, tanggal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            cursor.execute(query, (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga))
            db.commit()
            logger.info("✅ Hasil kuis berhasil disimpan.")
    except Exception as e:
        logger.error(f"❌ Error saat simpan hasil kuis: {e}")
        raise