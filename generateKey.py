import os
import base64

# Menghasilkan SECRET_KEY (32 byte dalam hex)
secret_key = os.urandom(32).hex()
print(f"SECRET_KEY: {secret_key}")

# Menghasilkan FERNET_KEY (32 byte dalam base64)
fernet_key = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8')
print(f"FERNET_KEY: {fernet_key}")