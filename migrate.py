import os
import json
from database import get_db
import logging

logger = logging.getLogger(__name__)

def migrate_soal_status():
    status_file = os.path.join('soal', 'soal_status.json')
    if os.path.exists(status_file):
        with open(status_file, 'r', encoding='utf-8') as f:
            status_data = json.load(f)
        with get_db() as db:
            cursor = db.cursor()
            for filename, info in status_data.items():
                cursor.execute("""
                    INSERT IGNORE INTO soal_status (filename, status, terakhir_diarsip, terakhir_diaktif, diarsipkan_diaktifkan_oleh)
                    VALUES (%s, %s, %s, %s, %s)
                """, (filename, info.get('status', 'Aktif'), info.get('terakhir_diarsip'), info.get('tanggal_aktif'), info.get('diarsipkan_diaktifkan_oleh')))
            db.commit()
            logger.info("✅ Migrasi data dari soal_status.json ke database selesai.")
        os.remove(status_file)
        logger.info("✅ File soal_status.json telah dihapus setelah migrasi.")

if __name__ == '__main__':
    migrate_soal_status()