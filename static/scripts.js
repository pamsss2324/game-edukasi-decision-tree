const siswaBtn = document.getElementById('siswaBtn');
const popupForm = document.getElementById('popupForm');
const closePopup = document.getElementById('closePopup');
const lanjutBtn = document.getElementById('lanjutBtn');
const namaInput = document.getElementById('namaSiswa');
const kelasSelect = document.getElementById('kelasSiswa');
const alertBox = document.getElementById('alertBox');
const alertClose = document.getElementById('alertClose');

siswaBtn.addEventListener('click', () => {
    popupForm.style.display = 'flex';
});

closePopup.addEventListener('click', () => {
    popupForm.style.display = 'none';
});

function showCustomAlert(message) {
    alertBox.querySelector('p').innerText = message;
    alertBox.classList.add('show');
    alertBox.style.display = 'flex';
}

alertClose.addEventListener('click', () => {
    alertBox.classList.remove('show');
    alertBox.style.display = 'none';
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

    // Kirim ke backend Flask
    fetch('http://localhost:5000/simpan_siswa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nama: nama, kelas: kelas })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sukses') {
            // Simpan juga ke localStorage untuk dipakai di quiz.html
            localStorage.setItem('namaSiswa', nama);
            localStorage.setItem('kelasSiswa', kelas);
            localStorage.setItem('idSiswa', data.id_siswa); // jika nanti dibutuhkan
            window.location.href = '/quiz';
        } else {
            showCustomAlert('Gagal menyimpan data siswa.');
        }
    })
    .catch(error => {
    console.error('Error:', error);
    showCustomAlert(data?.pesan || 'Terjadi kesalahan koneksi.');
    });
});

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    const timeStr = now.toLocaleTimeString('id-ID');
    document.getElementById('dateTimeBox').textContent = `${dateStr} - ${timeStr}`;
}

// Update setiap detik
setInterval(updateDateTime, 1000);
updateDateTime(); // panggil sekali di awal
