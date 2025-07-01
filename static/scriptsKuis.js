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

    if (!idSiswa || !namaSiswa || !kelasSiswa) {
        alert('Data siswa tidak ditemukan. Silakan daftar ulang.');
        window.location.href = '/';
        return;
    }

    popupInstruksi.style.display = 'flex';

    const totalPaket = 4;
    const paket = Math.floor(Math.random() * totalPaket) + 1;
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

    const savedQuizState = JSON.parse(localStorage.getItem('quizState'));
    if (savedQuizState && savedQuizState.idSiswa === idSiswa) {
        if (confirm('Kamu memiliki kuis yang belum selesai. Lanjutkan?')) {
            soalData = savedQuizState.soalData;
            currentIndex = savedQuizState.currentIndex;
            jumlahBenar = savedQuizState.jumlahBenar;
            jumlahSalah = savedQuizState.jumlahSalah;
            waktuTotal = savedQuizState.waktuTotal;
            waktuPerSoalList = savedQuizState.waktuPerSoalList;
            daftarSoalDikerjakan = savedQuizState.daftarSoalDikerjakan;
            popupInstruksi.style.display = 'none';
            quizContent.style.display = 'block';
            tampilkanSoal();
            return;
        } else {
            localStorage.removeItem('quizState');
        }
    }

    mulaiBtn.addEventListener('click', () => {
        popupInstruksi.style.display = 'none';
        quizContent.style.display = 'block';
        fetchSoal();
    });

    function fetchSoal() {
        fetch('http://localhost:5000/get_soal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                kelas: kelasSiswa,
                paket: paket
            })
        })
        .then(res => {
            if (!res.ok) {
                throw new Error('File soal tidak ditemukan');
            }
            return res.json();
        })
        .then(data => {
            if (data.status !== 'sukses') {
                throw new Error(data.pesan || 'Gagal mengambil soal');
            }
            soalData = data.soal;
            const expectedTotal = { '3': 15, '4': 18, '5': 21 }[kelasSiswa];
            if (soalData.length === 0) {
                throw new Error('Tidak ada soal yang tersedia');
            }
            soalData = shuffleArray([...soalData]);
            daftarSoalDikerjakan = {
                paket: paket.toString(),
                soal: soalData.map(soal => ({
                    id: soal.id.toString(),
                    pelajaran: soal.pelajaran,
                    kategori: soal.kategori,
                    topik: soal.topik,
                    tingkat_kesulitan: soal.tingkat_kesulitan,
                    benar: null,
                    waktu: 0,
                    jawaban: null,
                    indeks_jawaban: null
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
            const mapel = 'Semua';

            daftarSoalDikerjakan.soal.forEach((soal, index) => {
                if (soal.benar === null) {
                    soal.benar = false;
                    jumlahSalah++;
                }
            });

            const hasilKuis = {
                id_siswa: parseInt(idSiswa),
                mapel: mapel,
                jumlah_benar: jumlahBenar,
                jumlah_salah: jumlahSalah,
                waktu_rata2_per_soal: parseFloat(waktuRata2.toFixed(2)),
                daftar_soal_dikerjakan: JSON.stringify(daftarSoalDikerjakan),
                total_soal: soalData.length,
                nama: namaSiswa,
                kelas: kelasSiswa
            };

            localStorage.setItem('hasilKuis', JSON.stringify(hasilKuis));
            localStorage.removeItem('hasilDisimpan');
            localStorage.removeItem('quizState');
            window.location.href = '/hasil';
            return;
        }

        const soal = soalData[currentIndex];
        const progressPercent = Math.round(((currentIndex + 1) / soalData.length) * 100);
        progressFill.style.width = `${progressPercent}%`;
        progressFill.textContent = `${progressPercent}%`;

        pertanyaanEl.textContent = soal.pertanyaan;
        pertanyaanEl.classList.add('fade-in');

        let pilihanHTML = '';
        const pilihanAcak = shuffleArray([...soal.pilihan]);
        pilihanAcak.forEach(pil => {
            pilihanHTML += `<div class="pilihanBox" data-jawaban="${pil}">${pil}</div>`;
        });
        pilihanContainer.innerHTML = pilihanHTML;
        pilihanContainer.classList.add('fade-in');

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
                daftarSoalDikerjakan.soal[currentIndex].jawaban = e.target.getAttribute('data-jawaban');
                daftarSoalDikerjakan.soal[currentIndex].indeks_jawaban = pilihanAcak.indexOf(e.target.getAttribute('data-jawaban'));

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

                localStorage.setItem('quizState', JSON.stringify({
                    idSiswa: idSiswa,
                    soalData: soalData,
                    currentIndex: currentIndex + 1,
                    jumlahBenar: jumlahBenar,
                    jumlahSalah: jumlahSalah,
                    waktuTotal: waktuTotal,
                    waktuPerSoalList: waktuPerSoalList,
                    daftarSoalDikerjakan: daftarSoalDikerjakan
                }));

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

                localStorage.setItem('quizState', JSON.stringify({
                    idSiswa: idSiswa,
                    soalData: soalData,
                    currentIndex: currentIndex + 1,
                    jumlahBenar: jumlahBenar,
                    jumlahSalah: jumlahSalah,
                    waktuTotal: waktuTotal,
                    waktuPerSoalList: waktuPerSoalList,
                    daftarSoalDikerjakan: daftarSoalDikerjakan
                }));

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
});