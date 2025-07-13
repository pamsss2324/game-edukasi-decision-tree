import os
import json
import re

# Direktori tempat file soal berada
SOAL_DIR = 'soal'

# Pola untuk nama file soal (contoh: soal_kelas3_paket1.json)
PATTERN = r'soal_kelas([3-5])_paket(\d+)\.json'

# Membuat atau memperbarui soal_status.json
def generate_soal_status():
    status_data = {}
    
    # Memindai semua file di direktori soal
    for filename in os.listdir(SOAL_DIR):
        if filename.endswith('.json'):
            match = re.match(PATTERN, filename)
            if match:
                kelas, paket = match.groups()
                status_data[filename] = {
                    'status': 'Aktif',
                    'terakhir_diarsip': None,
                    'diarsipkan_oleh': None
                }
                print(f"Menambahkan {filename} ke soal_status.json dengan status 'Aktif'.")
    
    # Menyimpan ke file soal_status.json
    output_path = os.path.join(SOAL_DIR, 'soal_status.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(status_data, f, ensure_ascii=False, indent=2)
    print(f"File {output_path} berhasil dibuat atau diperbarui dengan {len(status_data)} entri.")

if __name__ == "__main__":
    generate_soal_status()