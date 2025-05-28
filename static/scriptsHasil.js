document.addEventListener('DOMContentLoaded', () => {
    // Ambil data hasil kuis dari localStorage
    const hasilKuis = JSON.parse(localStorage.getItem('hasilKuis'));

    // Jika data tidak ada, tampilkan pesan error
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

    // Tampilkan data ringkasan
    document.getElementById('namaSiswa').textContent = hasilKuis.nama || 'Tidak Diketahui';
    document.getElementById('kelasSiswa').textContent = hasilKuis.kelas || 'Tidak Diketahui';
    document.getElementById('mapel').textContent = hasilKuis.mapel;
    document.getElementById('ringkasanHasil').innerHTML = `Kamu menjawab benar <strong>${hasilKuis.jumlah_benar}</strong>, salah <strong>${hasilKuis.jumlah_salah}</strong> dari <strong>${hasilKuis.total_soal} soal</strong>! ${hasilKuis.jumlah_benar >= hasilKuis.total_soal * 0.7 ? 'Hebat! 🎉' : 'Ayo tingkatkan lagi! 💪'}`;
    document.getElementById('kesulitanDiduga').textContent = hasilKuis.kesulitan_diduga;

    // Tambahkan waktu rata-rata
    const waktuRata2El = document.createElement('p');
    waktuRata2El.innerHTML = `<strong>Waktu Rata-rata per Soal:</strong> <span>${hasilKuis.waktu_rata2_per_soal} detik</span>`;
    document.querySelector('.card-hasil').appendChild(waktuRata2El);

    // Format teks motivasi dan rekomendasi
    const motivasiDanRekomendasi = hasilKuis.rekomendasi.split('! ');
    const motivasi = motivasiDanRekomendasi[0] + '!';
    const rekomendasiList = motivasiDanRekomendasi.slice(1).filter(item => item.trim() !== '');
    const rekomendasiHtml = rekomendasiList.length > 0 
        ? `<ul><li>${rekomendasiList.join('</li><li>')}</li></ul>`
        : '';

    document.getElementById('motivasiTeks').innerHTML = `${motivasi} <strong>${hasilKuis.mapel}:</strong> ${rekomendasiHtml}`;

    // Kontrol tombol dan popup berdasarkan dideteksi_asal
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
            simpanHasilKeDatabase(hasilKuis);
        });

        document.getElementById('konfirmasiTidak').addEventListener('click', () => {
            popup.style.display = 'none';
            ulangiKuis();
        });
    } else {
        btnKembali.style.display = 'inline-block';
        btnUlangi.style.display = 'inline-block';
        simpanHasilKeDatabase(hasilKuis);
    }
});

function simpanHasilKeDatabase(hasilKuis) {
    // Cek apakah sudah disimpan (misalnya dengan flag)
    if (localStorage.getItem('hasilDisimpan')) return;

    fetch('/simpan_hasil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasilKuis),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sukses') {
            localStorage.setItem('hasilDisimpan', 'true'); // Tandai sebagai disimpan
        } else {
            console.error('Gagal menyimpan hasil:', data.pesan);
            showCustomAlert(data.pesan || 'Terjadi kesalahan saat menyimpan hasil.');
        }
    })
    .catch(error => {
        console.error('Error saat menyimpan hasil:', error);
        showCustomAlert('Terjadi kesalahan koneksi. Silakan coba lagi.');
    });
}

// Fungsi showCustomAlert dari scripts.js
function showCustomAlert(message) {
    const alertBox = document.getElementById('alertBox');
    alertBox.querySelector('p').innerText = message;
    alertBox.classList.add('show');
    alertBox.style.display = 'flex';
    setTimeout(() => {
        alertBox.classList.remove('show');
        alertBox.style.display = 'none';
    }, 5000); // Sembunyikan setelah 5 detik
}

function kembaliKeBeranda() {
    window.location.href = '/';
}

function ulangiKuis() {
    window.location.href = '/quiz';
}