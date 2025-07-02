import bcrypt
import pymysql

# Ganti dengan password yang diinginkan
password = "Admin1223"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# Koneksi ke database (sesuaikan dengan config kamu)
db = pymysql.connect(host='localhost', user='root', password='', database='kuis_sd')
cursor = db.cursor()
cursor.execute("INSERT INTO admin (username, password_hash) VALUES (%s, %s)", ("admin", hashed))
db.commit()
db.close()

print("Admin akun dibuat dengan password hash:", hashed.decode())