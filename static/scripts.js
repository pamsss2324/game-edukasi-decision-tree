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

siswaBtn.addEventListener('click', () => {
    popupForm.style.display = 'flex';
});

closePopup.addEventListener('click', () => {
    popupForm.style.display = 'none';
});

function showCustomAlert(message, showRetry = false) {
    alertBox.querySelector('p').innerText = message;
    alertBox.classList.add('show');
    alertBox.style.display = 'flex';
    alertRetry.style.display = showRetry ? 'inline-block' : 'none';
}

alertClose.addEventListener('click', () => {
    alertBox.classList.remove('show');
    alertBox.style.display = 'none';
});

alertRetry.addEventListener('click', () => {
    alertBox.classList.remove('show');
    alertBox.style.display = 'none';
    lanjutBtn.click();
});

lanjutBtn.addEventListener('click', () => {
    const nama = namaInput.value.trim();
    const kelas = kelasSelect.value;

    if (nama === '') {
        showCustomAlert('Mohon isi nama lengkap terlebih dahulu!');
        return;
    }

    if (kelas === '') {
        showCustomAlert('Mohon pilih kelas terlebih dahulu!');
        return;
    }

    loadingOverlay.style.display = 'flex';
    fetch('http://localhost:5000/simpan_siswa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nama: nama, kelas: kelas })
    })
    .then(response => response.json())
    .then(data => {
        loadingOverlay.style.display = 'none';
        if (data.status === 'sukses') {
            localStorage.setItem('namaSiswa', nama);
            localStorage.setItem('kelasSiswa', kelas);
            localStorage.setItem('idSiswa', data.id_siswa);
            window.location.href = '/quiz';
        } else {
            showCustomAlert('Gagal menyimpan data siswa.', true);
        }
    })
    .catch(error => {
        loadingOverlay.style.display = 'none';
        console.error('Error:', error);
        showCustomAlert('Terjadi kesalahan koneksi.', true);
    });
});

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    const timeStr = now.toLocaleTimeString('id-ID');
    document.getElementById('dateTimeBox').textContent = `${dateStr} - ${timeStr}`;
}

setInterval(updateDateTime, 1000);
updateDateTime();