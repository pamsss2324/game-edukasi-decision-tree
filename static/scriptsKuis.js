document.addEventListener('DOMContentLoaded', () => {
    const popupInstruksi = document.getElementById('popupInstruksi');
    const mulaiBtn = document.getElementById('mulaiBtn');
    const quizContent = document.getElementById('quizContent');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const pertanyaanEl = document.getElementById('pertanyaan');
    const pilihanContainer = document.getElementById('pilihanContainer');
    const timerEl = document.getElementById('timer');


    const idSiswa = localStorage.getItem('idSiswa');
    const namaSiswa = localStorage.getItem('namaSiswa');
    const kelasSiswa = localStorage.getItem('kelasSiswa');

    // Tampilkan pop-up instruksi saat halaman dimuat
    popupInstruksi.style.display = 'flex';

    let fileSoal = '';

    // Tentukan file soal berdasarkan kelas
    if (kelasSiswa === '3') {
        fileSoal = 'soal/soal_sd_kelas3.json';
    } else if (kelasSiswa === '4') {
        fileSoal = 'soal/soal_sd_kelas4.json';
    } else if (kelasSiswa === '5') {
        fileSoal = 'soal/soal_sd_kelas5.json';
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

    //let score = 0;

    mulaiBtn.addEventListener('click', () => {
        // Tutup pop-up instruksi, tampilkan konten kuis
        popupInstruksi.style.display = 'none';
        quizContent.style.display = 'block';
        fetchSoal();
    });

    function fetchSoal() {
        fetch(fileSoal)
            .then(res => res.json())
            .then(data => {
                soalData = data;
                tampilkanSoal();
            })
            .catch(err => {
                console.error('Gagal memuat soal:', err);
                quizContent.innerHTML = '<p>Gagal memuat soal. Silakan coba lagi.</p>';
            });
    }

    function tampilkanSoal() {
        if (currentIndex >= soalData.length) {
            quizContent.innerHTML = '<h2>Selamat, kamu telah menyelesaikan kuis!</h2>';
            clearInterval(timerInterval);
            const waktuRata2 = waktuTotal / soalData.length;

            quizContent.innerHTML = `
                <div class="card">
                    <h2>Selamat, ${namaSiswa}!</h2>
                    <p>Kamu telah menyelesaikan kuis.</p>
                </div>
            `;

            const mapel = soalData[0].topik || "Tidak Diketahui";

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
                    dideteksi_asal: 0,
                    kesulitan_diduga: "-"
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log('✅ Hasil kuis disimpan:', data);
            })
            .catch(err => {
                console.error('❌ Gagal menyimpan hasil kuis:', err);
            });
            //kirimHasil(score);
            return;
        }

        const soal = soalData[currentIndex];
        const progressPercent = Math.round(((currentIndex + 1) / soalData.length) * 100);

        progressText.textContent = `Soal ke-${currentIndex + 1} dari ${soalData.length}`;
        progressFill.style.width = `${progressPercent}%`;
        progressFill.textContent = `${progressPercent}%`;
        pertanyaanEl.textContent = soal.pertanyaan;

        let pilihanHTML = '';
        soal.pilihan.forEach((pil) => {
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
                waktuTotal += durasi;

                const jawaban = e.target.getAttribute('data-jawaban');
                if (jawaban === soal.jawabanBenar) {
                    e.target.classList.add('benar');
                    jumlahBenar++;
                    //score++;
                } else {
                    e.target.classList.add('salah');
                    jumlahSalah++;
                    document.querySelectorAll('.pilihanBox').forEach(box => {
                        if (box.getAttribute('data-jawaban') === soal.jawabanBenar) {
                            box.classList.add('benar');
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
                waktuTotal += durasi;
                jumlahSalah++;

                currentIndex++;
                tampilkanSoal();
            }
        }, 1000);
    }

    /*function kirimHasil(score) {
        fetch('http://localhost:5000/simpan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nama: namaSiswa,
                kelas: kelasSiswa,
                score: score
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log('Hasil disimpan:', data);
        })
        .catch(err => {
            console.error('Gagal mengirim hasil:', err);
        });
    }*/
});
