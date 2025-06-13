import pymysql.cursors

class Config:
    DATABASE_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'kuis_sd',
        'port': 3306,
        'cursorclass': pymysql.cursors.DictCursor,
        'autocommit': True,
        'charset': 'utf8mb4'
    }
    DATA_PATHS = {
        'training_data_kesulitan': 'data/training_data_kesulitan.csv',
        'training_data_asal': 'data/training_data_asal.csv',
        'motivasi': 'static/motivasi.json',
        'rekomendasi': 'static/rekomendasi.json',
        'model_dir': 'models'
    }
    KELAS_MAP = {'3': 15, '4': 18, '5': 21}