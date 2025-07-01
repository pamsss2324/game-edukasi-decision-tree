import os
import json

# Direktori tempat file JSON soal berada
folder_soal = 'soal'

# Pastikan folder ada
if not os.path.exists(folder_soal):
    print(f"Error: Folder '{folder_soal}' tidak ditemukan. Pastikan folder ada.")
    exit()

# Iterasi melalui semua file di folder soal
for filename in os.listdir(folder_soal):
    if filename.endswith('.json'):
        filepath = os.path.join(folder_soal, filename)
        try:
            # Baca file JSON
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # Perbarui ID untuk setiap soal
            for i, soal in enumerate(data, 1):
                kelas = filename.split('_')[1].split('kelas')[1][0]  # Ambil kelas dari nama file
                paket = filename.split('_')[2].split('.json')[0].split('paket')[1]  # Ambil paket dari nama file
                soal['id'] = f"{kelas}-{paket}-{i:02d}"  # Format ID: Kelas-Paket-Index (misalnya, 4-3-01)
            # Simpan ulang file dengan ID yang diperbarui
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Berhasil memperbarui ID di {filename}")
        except Exception as e:
            print(f"Error memproses {filename}: {e}")
            continue

print("Proses selesai! Semua ID soal telah diperbarui.")