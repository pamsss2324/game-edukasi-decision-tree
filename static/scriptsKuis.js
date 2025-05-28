document.addEventListener('DOMContentLoaded', () => {
    const popupInstruksi = document.getElementById('popupInstruksi');
    const mulaiBtn = document.getElementById('mulaiBtn');
    const quizContent = document.getElementById('quizContent');
    const progressFill = document.getElementById('progressFill');
    const pertanyaanEl = document.getElementById('pertanyaan');
    const pilihanContainer = document.getElementById('pilihanContainer');
    const timerEl = document.getElementById('timer');

    const idSiswa = localStorage.getItem('idSiswa');
    const namaSiswa = localStorage.getItem('namaSiswa');
    const kelasSiswa = localStorage.getItem('kelasSiswa');

    // Tampilkan pop-up instruksi saat halaman dimuat
    popupInstruksi.style.display = 'flex';

    // Tentukan daftar paket yang tersedia (1-4)
    const totalPaket = 4;
    const paket = Math.floor(Math.random() * totalPaket) + 1;
    let fileSoal = '';

    // Tentukan file soal berdasarkan kelas dan paket
    if (kelasSiswa === '3') {
        fileSoal = `soal/soal_kelas3_paket${paket}.json`;
    } else if (kelasSiswa === '4') {
        fileSoal = `soal/soal_kelas4_paket${paket}.json`;
    } else if (kelasSiswa === '5') {
        fileSoal = `soal/soal_kelas5_paket${paket}.json`;
    } else {
        alert('Kelas tidak dikenal!');
        return;
    }

    let soalData = [];
    let currentIndex = 0;
    let timerInterval;
    let waktuPerSoal = 30;
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let waktuTotal = 0;
    let waktuMulai = null;
    let waktuPerSoalList = [];
    let daftarSoalDikerjakan = [];

    mulaiBtn.addEventListener('click', () => {
        popupInstruksi.style.display = 'none';
        quizContent.style.display = 'block';
        fetchSoal();
    });

    function fetchSoal() {
        fetch(fileSoal)
            .then(res => {
                if (!res.ok) {
                    throw new Error('File soal tidak ditemukan');
                }
                return res.json();
            })
            .then(data => {
                soalData = data;
                // Validasi total soal berdasarkan kelas
                const expectedTotal = { '3': 15, '4': 18, '5': 21 }[kelasSiswa];
                if (soalData.length !== expectedTotal) {
                    throw new Error(`Jumlah soal (${soalData.length}) tidak sesuai dengan kelas ${kelasSiswa} (harus ${expectedTotal})`);
                }
                soalData = shuffleArray([...soalData]);
                daftarSoalDikerjakan = {
                    paket: paket.toString(),
                    soal: soalData.map(soal => ({
                        id: soal.id.toString(),
                        pelajaran: soal.pelajaran,
                        kategori: soal.kategori,
                        topik: soal.topik,
                        benar: null, // Awalnya null, akan diatur true/false
                        waktu: 0
                    }))
                };
                tampilkanSoal();
            })
            .catch(err => {
                console.error('Gagal memuat soal:', err);
                quizContent.innerHTML = `<p>${err.message}. Silakan coba lagi.</p>`;
            });
    }

    function tampilkanSoal() {
        if (currentIndex >= soalData.length) {
            quizContent.innerHTML = `
                <div class="card">
                    <h2>Selamat, ${namaSiswa}!</h2>
                    <p>Kamu telah menyelesaikan kuis.</p>
                </div>
            `;
            clearInterval(timerInterval);
            const waktuRata2 = waktuTotal / soalData.length;
            const mapel = soalData[0].pelajaran || "Tidak Diketahui";
            const variansiWaktu = calculateVariance(waktuPerSoalList);

            // Pastikan semua soal memiliki status
            daftarSoalDikerjakan.soal.forEach((soal, index) => {
                if (soal.benar === null) {
                    soal.benar = false;
                    jumlahSalah++;
                }
            });

            fetch('http://localhost:5000/simpan_hasil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_siswa: parseInt(idSiswa),
                    mapel: mapel,
                    jumlah_benar: jumlahBenar,
                    jumlah_salah: jumlahSalah,
                    waktu_rata2_per_soal: parseFloat(waktuRata2.toFixed(2)),
                    daftar_soal_dikerjakan: JSON.stringify(daftarSoalDikerjakan),
                    total_soal: soalData.length // Tambahkan total_soal
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'gagal') {
                    alert(data.pesan); // Tampilkan alert jika gagal
                    return;
                }
                console.log('✅ Hasil kuis disimpan:', data);
                localStorage.setItem('hasilKuis', JSON.stringify({
                    nama: namaSiswa,
                    kelas: kelasSiswa,
                    mapel: mapel,
                    jumlah_benar: jumlahBenar,
                    jumlah_salah: jumlahSalah,
                    total_soal: soalData.length,
                    waktu_rata2_per_soal: parseFloat(waktuRata2.toFixed(2)),
                    dideteksi_asal: data.dideteksi_asal, // Gunakan dari backend
                    kesulitan_diduga: data.kesulitan_diduga,
                    rekomendasi: data.rekomendasi
                }));
                window.location.href = '/hasil';
            })
            .catch(err => {
                console.error('❌ Gagal menyimpan hasil kuis:', err);
                alert('Terjadi kesalahan saat menyimpan hasil. Silakan coba lagi.');
            });
            return;
        }

        const soal = soalData[currentIndex];
        const progressPercent = Math.round(((currentIndex + 1) / soalData.length) * 100);
        progressFill.style.width = `${progressPercent}%`;
        progressFill.textContent = `${progressPercent}%`;
        pertanyaanEl.textContent = soal.pertanyaan;

        let pilihanHTML = '';
        const pilihanAcak = shuffleArray([...soal.pilihan]);
        pilihanAcak.forEach(pil => {
            pilihanHTML += `<div class="pilihanBox" data-jawaban="${pil}">${pil}</div>`;
        });
        pilihanContainer.innerHTML = pilihanHTML;

        waktuMulai = new Date();
        startTimer();

        document.querySelectorAll('.pilihanBox').forEach(box => {
            box.addEventListener('click', (e) => {
                clearInterval(timerInterval);
                const waktuSelesai = new Date();
                const durasi = (waktuSelesai - waktuMulai) / 1000;
                waktuPerSoalList.push(durasi);
                waktuTotal += durasi;
                daftarSoalDikerjakan.soal[currentIndex].waktu = durasi;

                const jawaban = e.target.getAttribute('data-jawaban');
                if (jawaban === soal.jawaban) {
                    e.target.classList.add('benar');
                    jumlahBenar++;
                    daftarSoalDikerjakan.soal[currentIndex].benar = true;
                } else {
                    e.target.classList.add('salah');
                    jumlahSalah++;
                    daftarSoalDikerjakan.soal[currentIndex].benar = false;
                    document.querySelectorAll('.pilihanBox').forEach(b => {
                        if (b.getAttribute('data-jawaban') === soal.jawaban) {
                            b.classList.add('benar');
                        }
                    });
                }
                setTimeout(() => {
                    currentIndex++;
                    tampilkanSoal();
                }, 1500);
            });
        });
    }

    function startTimer() {
        let waktu = waktuPerSoal;
        timerEl.textContent = `Waktu tersisa: ${waktu} detik`;

        timerInterval = setInterval(() => {
            waktu--;
            timerEl.textContent = `Waktu tersisa: ${waktu} detik`;

            if (waktu <= 0) {
                clearInterval(timerInterval);
                const waktuSelesai = new Date();
                const durasi = (waktuSelesai - waktuMulai) / 1000;
                waktuPerSoalList.push(durasi);
                waktuTotal += durasi;
                daftarSoalDikerjakan.soal[currentIndex].waktu = durasi;
                daftarSoalDikerjakan.soal[currentIndex].benar = false;
                jumlahSalah++;

                currentIndex++;
                tampilkanSoal();
            }
        }, 1000);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function calculateVariance(arr) {
        if (arr.length < 2) return 0;
        const mean = arr.reduce((a, b) => a + b) / arr.length;
        const squareDiffs = arr.map(value => {
            const diff = value - mean;
            return diff * diff;
        });
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / arr.length;
        return Math.sqrt(avgSquareDiff).toFixed(2);
    }
});