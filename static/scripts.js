const siswaBtn = document.getElementById('siswaBtn');
const popupForm = document.getElementById('popupForm');
const closePopup = document.getElementById('closePopup');
const lanjutBtn = document.getElementById('lanjutBtn');
const namaInput = document.getElementById('namaSiswa');
const kelasSelect = document.getElementById('kelasSiswa');
const alertBox = document.getElementById('alertBox');
const alertClose = document.getElementById('alertClose');
const alertRetry = document.getElementById('alertRetry');
const loadingOverlay = document.getElementById('loadingOverlay');
const welcomeContainer = document.querySelector('.welcome-container');

const showCustomAlert = (message, showRetry = false) => {
    alertBox.querySelector('p').textContent = message;
    alertBox.classList.add('show');
    alertBox.style.display = 'flex';
    alertRetry.style.display = showRetry ? 'inline-block' : 'none';
};

const togglePopup = (show) => {
    popupForm.style.display = show ? 'flex' : 'none';
    welcomeContainer.style.display = show ? 'none' : 'block';
};

const validateInput = (nama, kelas) => {
    if (!nama) return 'Mohon isi nama lengkap terlebih dahulu!';
    if (!kelas) return 'Mohon pilih kelas terlebih dahulu!';
    return null;
};

const saveSiswaData = async (nama, kelas) => {
    try {
        loadingOverlay.style.display = 'flex';
        const response = await fetch('http://localhost:5000/simpan_siswa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, kelas }),
            signal: AbortSignal.timeout(5000) // Timeout setelah 5 detik
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        loadingOverlay.style.display = 'none';

        if (data.status === 'sukses') {
            localStorage.setItem('namaSiswa', nama);
            localStorage.setItem('kelasSiswa', kelas);
            localStorage.setItem('idSiswa', data.id_siswa);
            window.location.href = '/quiz';
        } else {
            showCustomAlert(data.message || 'Gagal menyimpan data siswa.', true);
        }
    } catch (error) {
        loadingOverlay.style.display = 'none';
        console.error('Error saving data:', error);
        showCustomAlert(
            error.name === 'TimeoutError'
                ? 'Koneksi ke server terlalu lama.'
                : 'Terjadi kesalahan saat menyimpan data.',
            true
        );
    }
};

siswaBtn.addEventListener('click', () => togglePopup(true));

closePopup.addEventListener('click', () => {
    togglePopup(false);
    namaInput.value = '';
    kelasSelect.value = '';
});

alertClose.addEventListener('click', () => {
    alertBox.classList.remove('show');
    alertBox.style.display = 'none';
});

alertRetry.addEventListener('click', () => {
    alertBox.classList.remove('show');
    alertBox.style.display = 'none';
    togglePopup(true);
});

lanjutBtn.addEventListener('click', async () => {
    const nama = namaInput.value.trim();
    const kelas = kelasSelect.value;
    const errorMessage = validateInput(nama, kelas);

    if (errorMessage) {
        showCustomAlert(errorMessage);
        return;
    }

    await saveSiswaData(nama, kelas);
});

const updateDateTime = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateTimeBox').textContent = 
        `${now.toLocaleDateString('id-ID', options)} - ${now.toLocaleTimeString('id-ID')}`;
};

setInterval(updateDateTime, 1000);
updateDateTime();