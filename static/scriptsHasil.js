document.addEventListener('DOMContentLoaded', () => {
    const hasilKuis = JSON.parse(localStorage.getItem('hasilKuis'));
    const loadingOverlay = document.getElementById('loadingOverlay');
    const btnKembali = document.getElementById('btnKembali');
    const popup = document.getElementById('konfirmasiPopup');
    console.log(popup); // Debugging: Periksa apakah elemen popup terdeteksi
    const btnKonfirmasiYa = document.getElementById('konfirmasiYa');
    const btnKonfirmasiTidak = document.getElementById('konfirmasiTidak');

    if (!hasilKuis) {
        document.querySelector('.container-hasil').innerHTML = `
            <div class="card-hasil">
                <h2>Error</h2>
                <p>Data hasil kuis tidak ditemukan. Silakan coba kuis lagi.</p>
                <button onclick="kembaliKeBeranda()" class="btn-kembali">Kembali</button>
            </div>
        `;
        return;
    }

    document.getElementById('namaSiswa').textContent = hasilKuis.nama || 'Tidak Diketahui';
    document.getElementById('kelasSiswa').textContent = hasilKuis.kelas || 'Tidak Diketahui';
    document.getElementById('ringkasanHasil').innerHTML = `Kamu menjawab benar <strong>${hasilKuis.jumlah_benar}</strong>, salah <strong>${hasilKuis.jumlah_salah}</strong> dari <strong>${hasilKuis.total_soal} soal</strong>! ${hasilKuis.jumlah_benar >= hasilKuis.total_soal * 0.7 ? 'Hebat! 🎉' : 'Ayo tingkatkan lagi! 💪'}`;
    document.getElementById('waktuRata2').textContent = `${hasilKuis.waktu_rata2_per_soal} detik`;

    if (!localStorage.getItem('hasilDisimpan')) {
        loadingOverlay.style.display = 'flex';
        simpanHasilKeDatabase(hasilKuis).then(() => {
            checkAndShowPopup(); // Panggil fungsi pop-up setelah data disimpan
        });
    } else {
        updateHasilDisplay(hasilKuis);
        checkAndShowPopup(); // Panggil fungsi pop-up untuk data yang sudah disimpan
    }

    btnKembali.style.display = 'inline-block';
});

function simpanHasilKeDatabase(hasilKuis) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    return fetch('/simpan_hasil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasilKuis),
    })
    .then(response => response.json())
    .then(data => {
        loadingOverlay.style.display = 'none';
        if (data.status === 'sukses') {
            localStorage.setItem('hasilDisimpan', 'true');
            hasilKuis.kesulitan_diduga = data.kesulitan_diduga;
            hasilKuis.rekomendasi = data.rekomendasi;
            hasilKuis.dideteksi_asal = data.dideteksi_asal;
            localStorage.setItem('hasilKuis', JSON.stringify(hasilKuis));
            updateHasilDisplay(hasilKuis);
            return Promise.resolve(); // Pastikan promise selesai
        } else {
            showCustomAlert(data.pesan || 'Terjadi kesalahan saat menyimpan hasil.');
            return Promise.reject(); // Hentikan jika gagal
        }
    })
    .catch(error => {
        loadingOverlay.style.display = 'none';
        console.error('Error saat menyimpan hasil:', error);
        showCustomAlert('Terjadi kesalahan koneksi. Silakan coba lagi.');
        return Promise.reject();
    });
}

function updateHasilDisplay(hasilKuis) {
    document.getElementById('kesulitanDiduga').textContent = hasilKuis.kesulitan_diduga || 'Tidak Tersedia';
    const motivasiDanRekomendasi = (hasilKuis.rekomendasi || 'Terus berusaha ya!').split('! ');
    const motivasi = motivasiDanRekomendasi[0] + '!';
    const rekomendasiList = motivasiDanRekomendasi.slice(1).filter(item => item.trim() !== '');

    document.getElementById('motivasiText').textContent = motivasi;
    const rekomendasiUl = document.getElementById('rekomendasiList');
    rekomendasiUl.innerHTML = '';
    rekomendasiList.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        rekomendasiUl.appendChild(li);
    });
}

function checkAndShowPopup() {
    const hasilKuis = JSON.parse(localStorage.getItem('hasilKuis'));
    const popup = document.getElementById('konfirmasiPopup');
    const btnKonfirmasiYa = document.getElementById('konfirmasiYa');
    const btnKonfirmasiTidak = document.getElementById('konfirmasiTidak');

    if (hasilKuis && hasilKuis.dideteksi_asal === 1) {
        popup.style.display = 'flex';

        btnKonfirmasiYa.addEventListener('click', () => {
            popup.style.display = 'none';
            localStorage.removeItem('hasilKuis');
        });

        btnKonfirmasiTidak.addEventListener('click', () => {
            popup.style.display = 'none';
            localStorage.removeItem('hasilKuis');
            ulangiKuis();
        });
    }
}

function showCustomAlert(message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert';
    alertBox.innerHTML = `
        <p>${message}</p>
        <button onclick="this.parentElement.remove()">Tutup</button>
    `;
    document.body.appendChild(alertBox);
    alertBox.classList.add('show');
    alertBox.style.display = 'flex';
    setTimeout(() => {
        alertBox.classList.remove('show');
        alertBox.remove();
    }, 5000);
}

function kembaliKeBeranda() {
    localStorage.removeItem('hasilKuis');
    window.location.href = '/';
}

function ulangiKuis() {
    window.location.href = '/quiz';
}