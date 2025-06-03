from models import train_cart_kesulitan_model, train_cart_asal_model
import logging

# Konfigurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Memulai pelatihan model kesulitan...")
    train_cart_kesulitan_model()
    logger.info("Memulai pelatihan model deteksi asal...")
    train_cart_asal_model()
    logger.info("✅ Semua model telah dilatih dan disimpan.")