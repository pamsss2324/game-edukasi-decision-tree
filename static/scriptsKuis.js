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
    // Pilih paket secara acak (1-4)
    const paket = Math.floor(Math.random() * totalPaket) + 1;
    let fileSoal = '';

    // Tentukan file soal berdasarkan kelas dan paket yang diacak
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
    
    //let score = 0;

    mulaiBtn.addEventListener('click', () => {
        // Tutup pop-up instruksi, tampilkan konten kuis
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
                // Acak urutan soal
                soalData = shuffleArray([...soalData]);
                // Simpan daftar ID soal yang diacak dan informasi paket
                daftarSoalDikerjakan = {
                    paket: paket.toString(),
                    soal: soalData.map(soal => ({
                        id: soal.id.toString(),
                        topik: soal.topik,
                        benar: false,
                        waktu: 0
                    }))
                };
                tampilkanSoal();
            })
            .catch(err => {
                console.error('Gagal memuat soal:', err);
                quizContent.innerHTML = '<p>Gagal memuat soal. Silakan coba lagi.</p>';
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
            const mapel = soalData[0].topik || "Tidak Diketahui";

            // Hitung variansi waktu
            const variansiWaktu = calculateVariance(waktuPerSoalList);
            const dideteksiAsal = (waktuRata2 < 5 || jumlahBenar === 0 || variansiWaktu < 1) ? 1 : 0;

            // Kirim hasil ke backend
            fetch('http://localhost:5000/simpan_hasil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_siswa: parseInt(idSiswa),
                    mapel: mapel,
                    jumlah_benar: jumlahBenar,
                    jumlah_salah: jumlahSalah,
                    waktu_rata2_per_soal: parseFloat(waktuRata2.toFixed(2)),
                    dideteksi_asal: dideteksiAsal,
                    kesulitan_diduga: "-",
                    daftar_soal_dikerjakan: JSON.stringify(daftarSoalDikerjakan)
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log('✅ Hasil kuis disimpan:', data);
                localStorage.setItem('hasilKuis', JSON.stringify({
                    namaSiswa: namaSiswa,
                    jumlahBenar: jumlahBenar,
                    jumlahSalah: jumlahSalah,
                    totalSoal: soalData.length,
                    dideteksiAsal: data.dideteksi_asal,
                    kesulitanDiduga: data.kesulitan_diduga,
                    rekomendasi: data.rekomendasi
                }));
                window.location.href = '/hasil';
            })
            .catch(err => {
                console.error('❌ Gagal menyimpan hasil kuis:', err);
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


        waktuMulai = new Date(); // Catat waktu mulai
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
                    //score++;
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
                jumlahSalah++;
                daftarSoalDikerjakan.soal[currentIndex].benar = false;
                daftarSoalDikerjakan.soal[currentIndex].waktu = durasi;

                currentIndex++;
                tampilkanSoal();
            }
        }, 1000);
    }

    // Fungsi untuk mengacak array (Fisher-Yates shuffle)
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