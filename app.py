from flask import Flask, request, jsonify, send_from_directory, render_template
import pymysql
from flask_cors import CORS
import os
import traceback

app = Flask(__name__)
CORS(app)  # agar frontend bisa akses dari domain berbeda (misal dari file HTML lokal)

# Koneksi dibuat di dalam fungsi
def get_db():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="kuis_sd",
        port=3306,
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/simpan_siswa', methods=['POST'])
def simpan_siswa():
    try:
        data = request.get_json()
        nama = data['nama']
        kelas = data['kelas']

        print(f"📥 Data diterima: {nama} - Kelas {kelas}")

        db = get_db()
        cursor = db.cursor()

        query = "INSERT INTO siswa (nama, kelas) VALUES (%s, %s)"
        cursor.execute(query, (nama, kelas))
        db.commit()
        print("✅ Data siswa berhasil disimpan ke database.")


        id_baru = cursor.lastrowid  # ID siswa baru
        cursor.close()
        db.close()

        return jsonify({'status': 'sukses', 'id_siswa': id_baru})
    except Exception as e:
        print('❌ Error saat simpan:', e)
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': str(e)})
    
@app.route('/simpan_hasil', methods=['POST'])
def simpan_hasil():
    try:
        data = request.get_json()
        db = get_db()
        cursor = db.cursor()

        query = """
            INSERT INTO hasil_kuis
            (id_siswa, mapel, daftar_soal_dikerjakan, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal, kesulitan_diduga)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(query, (
            data['id_siswa'],
            data['mapel'],
            data['daftar_soal_dikerjakan'],
            data['jumlah_benar'],
            data['jumlah_salah'],
            data['waktu_rata2_per_soal'],
            data['dideteksi_asal'],
            data['kesulitan_diduga']
        ))
        db.commit()
        cursor.close()
        db.close()
        print("✅ Hasil kuis berhasil disimpan ke database.")
        return jsonify({'status': 'sukses'})
    except Exception as e:
        print('❌ Gagal simpan hasil kuis:', e)
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': str(e)})

# 🔹 Route halaman index
@app.route('/')
def halaman_utama():
    return render_template('index.html')

# 🔹 Route halaman kuis
@app.route('/quiz')
def halaman_kuis():
    return render_template('quiz.html')

@app.route('/soal/<path:filename>')
def serve_soal(filename):
    return send_from_directory('soal', filename)

if __name__ == '__main__':
    print("✅ Memulai Flask App di localhost:5000 ...")
    app.run(debug=True, use_reloader=False)
