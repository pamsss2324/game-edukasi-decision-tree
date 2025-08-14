let debounceTimeout;
let overviewChart = null;

function showErrorPopup(message) {
    const customAlert = document.getElementById('customAlert');
    if (customAlert) {
        document.getElementById('alertMessage').textContent = message || 'Data kuis siswa belum tersedia';
        customAlert.classList.remove('hidden');
        customAlert.classList.add('visible');
    } else {
        alert(message || 'Data kuis siswa belum tersedia');
    }
    console.log('Error Popup Shown:', message);
}

function showLoadingOverlay() {
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
}

function closePopup() {
    console.log('Closing Popup');
    document.querySelectorAll('.popup').forEach(popup => {
        if (popup.classList.contains('visible')) {
            popup.classList.remove('visible');
            popup.classList.add('hidden');
            console.log('Popup Closed, ID:', popup.id);
        }
    });
}

function loadInformasi(event) {
    console.log('Loading Informasi');
    if (event) event.preventDefault();
    showLoadingOverlay();
    try {
        const popup = document.getElementById('informasiPopup');
        if (popup) {
            popup.classList.add('visible');
            popup.classList.remove('hidden');
            console.log('Informasi Popup Shown, Class:', popup.className);
        } else {
            showErrorPopup('Popup informasi tidak ditemukan');
        }
    } catch (error) {
        showErrorPopup('Gagal memuat informasi akun');
    } finally {
        hideLoadingOverlay();
    }
}

function confirmLogout(event) {
    console.log('Confirming Logout');
    if (event) event.preventDefault();
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        logoutPopup.classList.add('visible');
        logoutPopup.classList.remove('hidden');
        console.log('Logout Popup Shown, Class:', logoutPopup.className);
    } else {
        showErrorPopup('Popup logout tidak ditemukan');
    }
}

function performLogout() {
    showLoadingOverlay();
    window.location.href = '/';
}

function setupDropdownToggle() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const dropbtn = dropdown.querySelector('.dropbtn');
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        dropbtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = dropdownContent.style.display === 'block';
            document.querySelectorAll('.dropdown-content').forEach(content => content.style.display = 'none');
            if (!isOpen) dropdownContent.style.display = 'block';
        });
    });

    document.addEventListener('click', (e) => {
        const isClickInside = e.target.closest('.dropdown');
        if (!isClickInside) document.querySelectorAll('.dropdown-content').forEach(content => content.style.display = 'none');
    });
}

async function loadSiswa(page = 1, limit = 6, kelasFilter = 'all', search = '') {
    if (!document.getElementById('siswaTable')) return; // Hentikan jika bukan halaman reports
    showLoadingOverlay();
    try {
        console.log(`Loading siswa: page=${page}, limit=${limit}, kelas=${kelasFilter}, search=${search}`);
        const response = await fetch(`/guru/get_siswa?page=${page}&limit=${limit}&kelas=${encodeURIComponent(kelasFilter)}&search=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (data.status === 'sukses') {
            const tbody = document.querySelector('#siswaTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                data.siswa.forEach(siswa => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${siswa.nama}</td>
                        <td>Kelas ${siswa.kelas}</td>
                        <td>${siswa.kesulitan_diduga || 'Belum ada data'}</td>
                        <td>${siswa.tanggal ? new Date(siswa.tanggal).toLocaleDateString('id-ID') : 'Belum ada data'}</td>
                        <td><button class="btn btn-primary btn-sm lihat-laporan" data-id="${siswa.id}">Lihat Laporan</button></td>
                    `;
                    tbody.appendChild(row);
                });
                // Pasang event listener untuk tombol "Lihat Laporan"
                document.querySelectorAll('.lihat-laporan').forEach(button => {
                    button.addEventListener('click', () => {
                        const id_siswa = button.getAttribute('data-id');
                        console.log(`Tombol Lihat Laporan diklik untuk id_siswa: ${id_siswa}`);
                        viewLaporanIndividu(id_siswa);
                    });
                });
                setupPagination(data.total, page, limit, kelasFilter, search);
            } else {
                console.warn('Elemen #siswaTable tbody tidak ditemukan');
            }
        } else {
            showErrorPopup(data.pesan || 'Data kuis siswa belum tersedia');
        }
    } catch (error) {
        console.error('Error saat memuat data siswa:', error);
        showErrorPopup('Terjadi kesalahan saat memuat data');
    } finally {
        hideLoadingOverlay();
    }
}

function setupPagination(totalItems, currentPage, limit = 6, kelasFilter, search) {
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / limit);

        if (totalPages > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.disabled = currentPage === 1;
            prevButton.onclick = () => loadSiswa(currentPage - 1, limit, kelasFilter, search);
            pagination.appendChild(prevButton);

            for (let i = 1; i <= totalPages; i++) {
                const pageButton = document.createElement('button');
                pageButton.textContent = i;
                pageButton.disabled = i === currentPage;
                pageButton.onclick = () => loadSiswa(i, limit, kelasFilter, search);
                if (i === currentPage) pageButton.classList.add('active');
                pagination.appendChild(pageButton);
            }

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.disabled = currentPage === totalPages;
            nextButton.onclick = () => loadSiswa(currentPage + 1, limit, kelasFilter, search);
            pagination.appendChild(nextButton);
        }
    } else {
        console.warn('Elemen #pagination tidak ditemukan');
    }
}

async function loadPaket(kelasSelectId, paketSelectId) {
    const kelas = document.getElementById(kelasSelectId).value;
    const paketSelect = document.getElementById(paketSelectId);
    if (paketSelect) {
        try {
            const response = await fetch(`/guru/get_paket?kelas=${kelas}`);
            const data = await response.json();
            if (data.status === 'sukses') {
                paketSelect.innerHTML = '<option value="all">Semua Paket</option>';
                data.paket.forEach(paket => {
                    const option = document.createElement('option');
                    option.value = paket;
                    option.textContent = `Paket ${paket}`;
                    paketSelect.appendChild(option);
                });
            } else {
                showErrorPopup(data.pesan || 'Gagal memuat daftar paket');
            }
        } catch (error) {
            showErrorPopup('Terjadi kesalahan saat memuat daftar paket');
        }
    } else {
        console.warn(`Elemen #${paketSelectId} tidak ditemukan`);
    }
}

function viewLaporanIndividu(id_siswa) {
    console.log(`Mengalihkan ke laporan individu untuk id_siswa: ${id_siswa}`);
    window.location.href = `/guru/report/individu/${id_siswa}`;
}

async function fetchLaporanIndividu(id_siswa) {
    if (!document.getElementById('nama-siswa')) return; // Hentikan jika bukan halaman laporan individu
    showLoadingOverlay();
    try {
        console.log(`Fetching laporan individu untuk id_siswa: ${id_siswa}`);
        const response = await fetch(`/guru/report/individu/${id_siswa}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Data laporan individu diterima:', data);
        if (data) {
            const namaElem = document.getElementById('nama-siswa');
            const kelasElem = document.getElementById('kelas-siswa');
            const mapelElem = document.getElementById('mapel-siswa');
            const benarElem = document.getElementById('benar-siswa');
            const salahElem = document.getElementById('salah-siswa');
            const totalElem = document.getElementById('total-siswa');
            const waktuElem = document.getElementById('waktu-siswa');
            const kesulitanElem = document.getElementById('kesulitan-siswa');
            const tanggalElem = document.getElementById('tanggal-siswa');

            if (namaElem) namaElem.textContent = data.nama || '';
            if (kelasElem) kelasElem.textContent = data.kelas || '';
            if (mapelElem) mapelElem.textContent = data.mapel || '';
            if (benarElem) benarElem.textContent = data.jumlah_benar || '0';
            if (salahElem) salahElem.textContent = data.jumlah_salah || '0';
            if (totalElem) totalElem.textContent = data.total_soal || '0';
            if (waktuElem) waktuElem.textContent = `${(data.waktu_rata2_per_soal || 0).toFixed(2)} detik`;
            if (kesulitanElem) kesulitanElem.textContent = data.kesulitan_diduga || '';
            if (tanggalElem) tanggalElem.textContent = data.tanggal || '';

            renderChart(data.pelajaran_stats);
            renderAccordion(data.topik_stats, 'all');
            setupPelajaranFilter(data.topik_stats);
        } else {
            showErrorPopup('Data laporan tidak ditemukan');
        }
    } catch (error) {
        console.error('Error saat memuat laporan individu:', error);
        showErrorPopup('Terjadi kesalahan saat memuat data');
    } finally {
        hideLoadingOverlay();
    }
}

function renderChart(pelajaran_stats) {
    const ctx = document.getElementById('overviewChart')?.getContext('2d');
    if (!ctx) {
        console.warn('Canvas overviewChart tidak ditemukan');
        return;
    }
    // Hancurkan instance chart lama jika ada
    if (overviewChart) {
        console.log('Menghancurkan instance chart lama');
        overviewChart.destroy();
        overviewChart = null;
    }
    // Buat instance chart baru
    console.log('Merender chart baru dengan data:', pelajaran_stats);
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(pelajaran_stats),
            datasets: [
                {
                    label: 'Benar',
                    data: Object.values(pelajaran_stats).map(s => s.benar),
                    backgroundColor: '#4CAF50',
                },
                {
                    label: 'Salah',
                    data: Object.values(pelajaran_stats).map(s => s.salah),
                    backgroundColor: '#d32f2f',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: Math.max(...Object.values(pelajaran_stats).map(s => s.benar + s.salah)) + 2, // Batasi tinggi berdasarkan data
                    title: { display: true, text: 'Jumlah Soal' }
                },
                x: { title: { display: true, text: 'Pelajaran' } }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function renderAccordion(topik_stats, pelajaran_filter) {
    const accordion = document.getElementById('topikAccordion');
    if (!accordion) {
        console.warn('Accordion topikAccordion tidak ditemukan');
        return;
    }
    accordion.innerHTML = '';
    Object.entries(topik_stats).forEach(([pelajaran, topiks], index) => {
        if (pelajaran_filter !== 'all' && pelajaran !== pelajaran_filter) return;
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        accordionItem.innerHTML = `
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                    ${pelajaran}
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#topikAccordion">
                <div class="accordion-body">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Topik</th>
                                <th>Benar</th>
                                <th>Total</th>
                                <th>Persentase Benar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(topiks).map(([topik, stats]) => `
                                <tr>
                                    <td>${topik}</td>
                                    <td>${stats.benar}</td>
                                    <td>${stats.total}</td>
                                    <td>${stats.persentase.toFixed(2)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        accordion.appendChild(accordionItem);
    });
}

function setupPelajaranFilter(topik_stats) {
    const pelajaranFilter = document.getElementById('pelajaranFilter');
    if (!pelajaranFilter) {
        console.warn('Pelajaran filter tidak ditemukan');
        return;
    }
    pelajaranFilter.addEventListener('change', () => {
        console.log(`Filter pelajaran diubah ke: ${pelajaranFilter.value}`);
        renderAccordion(topik_stats, pelajaranFilter.value);
    });
}

function downloadPDF() {
    showLoadingOverlay();
    const id_siswa = window.location.pathname.split('/').pop();
    console.log(`Mengunduh PDF untuk id_siswa: ${id_siswa}`);
    fetch(`/guru/report/individu/pdf/${id_siswa}`, {
        method: 'GET',
        credentials: 'include', // Pastikan cookie sesi dikirim
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_individu_${id_siswa}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        hideLoadingOverlay();
    })
    .catch(error => {
        console.error('Error saat mengunduh PDF:', error);
        showErrorPopup('Terjadi kesalahan saat mengunduh PDF');
        hideLoadingOverlay();
    });
}

function setupTabInteractions() {
    const kelasKesalahan = document.getElementById('kelasKesalahan');
    const kelasPerbandingan = document.getElementById('kelasPerbandingan');
    const lihatKesalahan = document.getElementById('lihatKesalahan');
    const lihatPerbandingan = document.getElementById('lihatPerbandingan');

    if (kelasKesalahan) {
        kelasKesalahan.addEventListener('change', () => loadPaket('kelasKesalahan', 'paketKesalahan'));
    }
    if (kelasPerbandingan) {
        kelasPerbandingan.addEventListener('change', () => loadPaket('kelasPerbandingan', 'paketPerbandingan'));
    }
    if (lihatKesalahan) {
        lihatKesalahan.addEventListener('click', viewLaporanKesalahan);
    }
    if (lihatPerbandingan) {
        lihatPerbandingan.addEventListener('click', viewLaporanPerbandingan);
    }
}

function viewLaporanKesalahan() {
    const kelas = document.getElementById('kelasKesalahan').value;
    const paket = document.getElementById('paketKesalahan').value;
    console.log(`Mengalihkan ke laporan kesalahan: kelas=${kelas}, paket=${paket}`);
    window.location.href = `/guru/report/kesalahan_kelas?kelas=${kelas}&paket=${paket}`;
}

function viewLaporanPerbandingan() {
    const kelas = document.getElementById('kelasPerbandingan').value;
    const paket = document.getElementById('paketPerbandingan').value;
    console.log(`Mengalihkan ke laporan perbandingan: kelas=${kelas}, paket=${paket}`);
    window.location.href = `/guru/report/perbandingan?kelas=${kelas}&paket=${paket}`;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Memuat halaman laporan');
    if (document.getElementById('siswaTable')) {
        loadSiswa(1, 6, 'all', '');
        setupSearchAndFilter();
    }
    setupDropdownToggle();
    setupTabInteractions();

    const logoutLinks = document.querySelectorAll('.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Logout link diklik');
            confirmLogout(e);
        });
    });

    const infoLinks = document.querySelectorAll('.info-link');
    infoLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Info link diklik');
            loadInformasi(e);
        });
    });

    const togglePassword = document.getElementById('togglePassword');
    const popupKodeAkses = document.getElementById('popupKodeAkses');
    if (togglePassword && popupKodeAkses) {
        let isVisible = false;
        const originalCode = popupKodeAkses.dataset.fullCode || popupKodeAkses.value;
        togglePassword.addEventListener('click', () => {
            isVisible = !isVisible;
            if (isVisible && originalCode) {
                popupKodeAkses.value = originalCode;
            } else if (originalCode) {
                popupKodeAkses.value = originalCode.substring(0, 2) + '*'.repeat(Math.max(0, originalCode.length - 2));
            }
            togglePassword.textContent = isVisible ? '🙈' : '👁️';
        });
    }

    if (document.getElementById('kelasKesalahan')) {
        loadPaket('kelasKesalahan', 'paketKesalahan');
    }
    if (document.getElementById('kelasPerbandingan')) {
        loadPaket('kelasPerbandingan', 'paketPerbandingan');
    }

    const id_siswa = window.location.pathname.match(/\/guru\/report\/individu\/(\d+)/)?.[1];
    if (id_siswa) {
        console.log(`Inisialisasi laporan individu untuk id_siswa: ${id_siswa}`);
        fetchLaporanIndividu(id_siswa);
    }
});