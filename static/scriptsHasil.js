document.addEventListener('DOMContentLoaded', () => {
    const hasilKuis = JSON.parse(localStorage.getItem('hasilKuis'));
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (!hasilKuis) {
        document.querySelector('.container-hasil').innerHTML = `
            <div class="card-hasil">
                <h2>Error</h2>
                <p>Data hasil kuis tidak ditemukan. Silakan coba kuis lagi.</p>
                <button onclick="ulangiKuis()" class="btn-kembali">Mulai Kuis</button>
            </div>
        `;
        return;
    }

    // Tampilkan data awal
    document.getElementById('namaSiswa').textContent = hasilKuis.nama || 'Tidak Diketahui';
    document.getElementById('kelasSiswa').textContent = hasilKuis.kelas || 'Tidak Diketahui';
    document.getElementById('ringkasanHasil').innerHTML = `Kamu menjawab benar <strong>${hasilKuis.jumlah_benar}</strong>, salah <strong>${hasilKuis.jumlah_salah}</strong> dari <strong>${hasilKuis.total_soal} soal</strong>! ${hasilKuis.jumlah_benar >= hasilKuis.total_soal * 0.7 ? 'Hebat! 🎉' : 'Ayo tingkatkan lagi! 💪'}`;
    document.getElementById('waktuRata2').textContent = `${hasilKuis.waktu_rata2_per_soal} detik`;

    if (!localStorage.getItem('hasilDisimpan')) {
        loadingOverlay.style.display = 'flex';
        simpanHasilKeDatabase(hasilKuis);
    } else {
        updateHasilDisplay(hasilKuis);
    }

    const btnKembali = document.getElementById('btnKembali');
    const btnUlangi = document.getElementById('btnUlangi');
    const popup = document.getElementById('konfirmasiPopup');

    if (hasilKuis.dideteksi_asal === 1) {
        btnKembali.style.display = 'none';
        btnUlangi.style.display = 'inline-block';
        popup.style.display = 'flex';

        document.getElementById('konfirmasiYa').addEventListener('click', () => {
            popup.style.display = 'none';
            btnKembali.style.display = 'inline-block';
            btnUlangi.style.display = 'inline-block';
        });

        document.getElementById('konfirmasiTidak').addEventListener('click', () => {
            popup.style.display = 'none';
            ulangiKuis();
        });
    } else {
        btnKembali.style.display = 'inline-block';
        btnUlangi.style.display = 'inline-block';
    }
});

function simpanHasilKeDatabase(hasilKuis) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    fetch('/simpan_hasil', {
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
        } else {
            showCustomAlert(data.pesan || 'Terjadi kesalahan saat menyimpan hasil.');
        }
    })
    .catch(error => {
        loadingOverlay.style.display = 'none';
        console.error('Error saat menyimpan hasil:', error);
        showCustomAlert('Terjadi kesalahan koneksi. Silakan coba lagi.');
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
    window.location.href = '/';
}

function ulangiKuis() {
    window.location.href = '/quiz';
}