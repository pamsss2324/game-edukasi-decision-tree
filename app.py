from flask import Flask, request, jsonify, send_from_directory, render_template
import pymysql
from flask_cors import CORS
import os
import traceback
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
import json

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

# Fungsi pelatihan model CART untuk kesulitan
def train_cart_kesulitan_model():
    data = pd.read_csv('data/training_data_kesulitan.csv')
    X = data[['jumlah_benar', 'jumlah_salah', 'waktu_rata2_per_soal', 'dideteksi_asal']]
    y = data['kesulitan_diduga']
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    model = DecisionTreeClassifier(criterion='gini', random_state=42)
    model.fit(X, y_encoded)
    return model, le

# Fungsi pelatihan model CART untuk deteksi asal
def train_cart_asal_model():
    data = pd.read_csv('data/training_data_asal.csv')
    X = data[['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah']]
    y = data['dideteksi_asal']
    model = DecisionTreeClassifier(criterion='gini', random_state=42)
    model.fit(X, y)
    return model

# Fungsi analisis kesulitan berdasarkan topik
def analyze_kesulitan(daftar_soal_dikerjakan, mapel, jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal):
    soal_list = json.loads(daftar_soal_dikerjakan)['soal']
    kesalahan_per_topik = {}
    for soal in soal_list:
        if not soal.get('benar', False):  # Jika salah
            topik = soal.get('topik', 'Tidak Diketahui')
            kesalahan_per_topik[topik] = kesalahan_per_topik.get(topik, 0) + 1
    
    if not kesalahan_per_topik:
        return "mudah", "Kerja bagus! Kamu tidak banyak salah."

    topik_kesulitan = max(kesalahan_per_topik, key=kesalahan_per_topik.get)
    jumlah_salah_topik = kesalahan_per_topik[topik_kesulitan]
    total_soal_topik = sum(1 for soal in soal_list if soal.get('topik') == topik_kesulitan)
    persentase_salah = (jumlah_salah_topik / total_soal_topik) * 100 if total_soal_topik > 0 else 0

# Prediksi kesulitan dengan CART
    input_data = pd.DataFrame([[jumlah_benar, jumlah_salah, waktu_rata2_per_soal, dideteksi_asal]],
                              columns=['jumlah_benar', 'jumlah_salah', 'waktu_rata2_per_soal', 'dideteksi_asal'])
    kesulitan_encoded = cart_kesulitan_model.predict(input_data)[0]
    kesulitan_diduga = label_encoder_kesulitan.inverse_transform([kesulitan_encoded])[0]

    rekomendasi_map = {
        "Perkalian": "Ayo belajar perkalian lagi, kamu pasti bisa!",
        "Pembagian": "Latihan lebih banyak soal pembagian ya!",
        "Satuan Waktu": "Coba ulang materi satuan waktu.",
        "Perhitungan Campuran": "Pahami lagi soal perhitungan campuran dengan sabar!",
        "Fotosintesis": "Pelajari lagi proses fotosintesis.",
        "Organ Tubuh": "Ayo ulang materi organ tubuh!",
        "Organ Pernapasan": "Latihan lagi tentang pernapasan.",
        "Kalimat Benar": "Coba perbaiki kalimatmu lagi!",
        "Kosa Kata": "Tambah kosakata dengan latihan lebih banyak!",
        "Antonim": "Pelajari lagi lawan kata.",
        "Kalimat Perintah": "Latihan lagi kalimat perintah.",
        "Tanda Baca": "Perhatikan lagi penggunaan tanda baca."
    }
    rekomendasi = rekomendasi_map.get(topik_kesulitan, "Terus berlatih ya!")

    return kesulitan_diduga, rekomendasi

# Fungsi hitung variansi
def calculate_variance(waktu_list):
    if len(waktu_list) < 2: return 0
    mean = sum(waktu_list) / len(waktu_list)
    square_diff = sum((x - mean) ** 2 for x in waktu_list) / len(waktu_list)
    return square_diff ** 0.5

# Inisialisasi model
cart_kesulitan_model, label_encoder_kesulitan = train_cart_kesulitan_model()
cart_asal_model = train_cart_asal_model()

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
        print('❌ Error saat simpan:', e)
        traceback.print_exc()
        return jsonify({'status': 'gagal', 'pesan': str(e)})
    
@app.route('/simpan_hasil', methods=['POST'])
def simpan_hasil():
    try:
        data = request.get_json()
        with get_db() as db:
            cursor = db.cursor()

            # Parse daftar_soal_dikerjakan untuk mendapatkan waktu per soal
            soal_list = json.loads(data['daftar_soal_dikerjakan'])['soal']
            waktu_list = [float(soal.get('waktu', 0)) for soal in soal_list]
            variansi_waktu = calculate_variance(waktu_list)
            total_soal = data['jumlah_benar'] + data['jumlah_salah']
            persentase_salah = (data['jumlah_salah'] / total_soal) * 100 if total_soal > 0 else 0

            # Prediksi dideteksi_asal dengan CART
            input_data_asal = pd.DataFrame([[data['waktu_rata2_per_soal'], data['jumlah_salah'], variansi_waktu, persentase_salah]],
                                          columns=['waktu_rata2_per_soal', 'jumlah_salah', 'variansi_waktu', 'persentase_salah'])
            dideteksi_asal = int(cart_asal_model.predict(input_data_asal)[0])

            # Analisis kesulitan
            kesulitan_diduga, rekomendasi = analyze_kesulitan(data['daftar_soal_dikerjakan'], data['mapel'],
                                                             data['jumlah_benar'], data['jumlah_salah'],
                                                             data['waktu_rata2_per_soal'], dideteksi_asal)
                                                             
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
            data['kesulitan_diduga'],
            dideteksi_asal,
            kesulitan_diduga
        ))
        db.commit()

        return jsonify({
            'status': 'sukses',
            'kesulitan_diduga': kesulitan_diduga,
            'rekomendasi': rekomendasi,
            'dideteksi_asal': dideteksi_asal
        })
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
    safe_filename = os.path.basename(filename)  # Hindari path traversal
    return send_from_directory('soal', safe_filename)

if __name__ == '__main__':
    print("✅ Memulai Flask App di localhost:5000 ...")
    app.run(debug=True, use_reloader=False)
