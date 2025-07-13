import pymysql

class Config:
    # Konfigurasi database (sesuaikan dengan kebutuhanmu)
    DATABASE_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'db': 'kuis_sd',
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor
    }

    # Pemetaan jumlah soal per kelas
    KELAS_MAP = {'3': 15, '4': 18, '5': 21}

    # Path data dan model
    DATA_PATHS = {
        'training_data_kesulitan': 'data/training_data_kesulitan.csv',
        'training_data_asal': 'data/training_data_asal.csv',
        'model_dir': 'models',
        'motivasi': 'data/motivasi.json',
        'rekomendasi': 'data/rekomendasi.json'
    }

    # Konfigurasi sesi Flask
    SESSION_CONFIG = {
        'SESSION_PERMANENT': False,
        'SESSION_TYPE': 'filesystem'
    }