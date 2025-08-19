let debounceTimeout;
let overviewChart = null;
let pieChart = null;
let comparisonChart = null;

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
    if (!document.getElementById('siswaTable')) return;
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
                document.querySelectorAll('.lihat-laporan').forEach(button => {
                    button.addEventListener('click', () => {
                        const id_siswa = button.getAttribute('data-id');
                        console.log(`Tombol Lihat Laporan diklik untuk id_siswa: ${id_siswa}`);
                        viewLaporanIndividu(id_siswa);
                    });
                });
                setupPagination(data.total, page, limit, kelasFilter, search);
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
    }
}

async function loadPaket(kelasSelectId, paketSelectId) {
    const kelas = document.getElementById(kelasSelectId)?.value;
    const paketSelect = document.getElementById(paketSelectId);
    if (!kelas || !paketSelect) {
        console.warn(`Elemen ${kelasSelectId} atau ${paketSelectId} tidak ditemukan`);
        return;
    }
    try {
        console.log(`Memuat paket untuk kelas: ${kelas}`);
        const response = await fetch(`/guru/get_paket?kelas=${kelas}`);
        const data = await response.json();
        console.log('Respons dari server:', data);
        if (data.status === 'sukses') {
            paketSelect.innerHTML = '<option value="all">Semua Paket</option>';
            if (Array.isArray(data.paket) && data.paket.length > 0) {
                data.paket.forEach(paket => {
                    const option = document.createElement('option');
                    option.value = paket;
                    option.textContent = `Paket ${paket}`;
                    paketSelect.appendChild(option);
                });
                console.log(`Paket dimuat: ${data.paket.join(', ')}`);
            } else {
                console.warn('Tidak ada paket yang dikembalikan dari server untuk kelas', kelas);
            }
        } else {
            showErrorPopup(data.pesan || 'Gagal memuat daftar paket');
        }
    } catch (error) {
        console.error('Error saat memuat paket:', error);
        showErrorPopup('Terjadi kesalahan saat memuat daftar paket');
    }
}

function viewLaporanIndividu(id_siswa) {
    console.log(`Mengalihkan ke laporan individu untuk id_siswa: ${id_siswa}`);
    window.location.href = `/guru/report/individu/${id_siswa}`;
}

async function fetchLaporanIndividu(id_siswa) {
    if (!document.getElementById('nama-siswa')) return;
    showLoadingOverlay();
    try {
        console.log(`Fetching laporan individu untuk id_siswa: ${id_siswa}`);
        const response = await fetch(`/guru/report/individu/${id_siswa}`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
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
    if (overviewChart) {
        console.log('Menghancurkan instance chart lama');
        overviewChart.destroy();
        overviewChart = null;
    }
    console.log('Merender chart baru dengan data:', pelajaran_stats);
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(pelajaran_stats),
            datasets: [
                { label: 'Benar', data: Object.values(pelajaran_stats).map(s => s.benar), backgroundColor: '#4CAF50' },
                { label: 'Salah', data: Object.values(pelajaran_stats).map(s => s.salah), backgroundColor: '#d32f2f' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, suggestedMax: Math.max(...Object.values(pelajaran_stats).map(s => s.benar + s.salah)) + 2, title: { display: true, text: 'Jumlah Soal' } }, x: { title: { display: true, text: 'Pelajaran' } } },
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
                        <thead><tr><th>Topik</th><th>Benar</th><th>Total</th><th>Persentase Benar</th></tr></thead>
                        <tbody>${Object.entries(topiks).map(([topik, stats]) => `
                            <tr><td>${topik}</td><td>${stats.benar}</td><td>${stats.total}</td><td>${stats.persentase.toFixed(2)}%</td></tr>
                        `).join('')}</tbody>
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

    // Jika sedang di laporan individu
    const id_siswa = window.location.pathname.match(/\/guru\/report\/individu\/(\d+)/)?.[1];
    if (id_siswa) {
        console.log(`Mengunduh PDF untuk id_siswa: ${id_siswa}`);
        fetch(`/guru/report/individu/pdf/${id_siswa}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        return;
    }

    // Ambil filter saat ini dari URL halaman perbandingan
    const params   = new URLSearchParams(window.location.search);
    const kelas    = params.get('kelas') || '3';
    const paket    = params.get('paket') || 'all';
    const page     = params.get('page')  || '1';
    const limit    = params.get('limit') || '10';
    const pelajaran= params.get('pelajaran') || 'all';

    // Laporan perbandingan
    if (window.location.pathname.includes('/guru/report/perbandingan')) {
        console.log(`Mengunduh PDF untuk kelas=${kelas}, paket=${paket}, pelajaran=${pelajaran}, page=${page}, limit=${limit}`);
        fetch(`/guru/report/perbandingan/pdf?kelas=${kelas}&paket=${paket}&page=${page}&limit=${limit}&pelajaran=${pelajaran}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = `laporan_perbandingan_${kelas}_page_${page}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error saat mengunduh PDF:', error);
            showErrorPopup('Terjadi kesalahan saat mengunduh PDF');
        })
        .finally(() => hideLoadingOverlay());
    }
    // Laporan kesalahan kelas
    else {
        console.log(`Mengunduh PDF untuk kelas=${kelas}, paket=${paket}`);
        fetch(`/guru/report/kesalahan_kelas/pdf?kelas=${kelas}&paket=${paket}`, { credentials: 'include' })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = `laporan_kesalahan_kelas_${kelas}_${paket}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error saat mengunduh PDF:', error);
            showErrorPopup('Terjadi kesalahan saat mengunduh PDF');
        })
        .finally(() => hideLoadingOverlay());
    }
}


function setupSearchAndFilter() {
    const searchInput = document.getElementById('siswaSearch');
    const kelasFilter = document.getElementById('kelasFilter');
    if (searchInput && kelasFilter) {
        searchInput.addEventListener('input', () => loadSiswa(1, 6, kelasFilter.value, searchInput.value));
        kelasFilter.addEventListener('change', () => loadSiswa(1, 6, kelasFilter.value, searchInput.value));
    }
}

function setupTabInteractions() {
    const kelasKesalahan = document.getElementById('kelasKesalahan');
    const kelasPerbandingan = document.getElementById('kelasPerbandingan');

    if (kelasKesalahan) {
        kelasKesalahan.addEventListener('change', () => loadPaket('kelasKesalahan', 'paketKesalahan'));
    }
    if (kelasPerbandingan) {
        kelasPerbandingan.addEventListener('change', () => loadPaket('kelasPerbandingan', 'paketPerbandingan'));
    }

    document.addEventListener('click', (e) => {
        const tabContent = document.querySelector('.tab-pane.active');
        if (tabContent && tabContent.id === 'kesalahan' && e.target.id === 'lihatKesalahan') {
            console.log('Button lihatKesalahan diklik');
            const kelas = document.getElementById('kelasKesalahan').value;
            const paket = document.getElementById('paketKesalahan').value;
            console.log(`Mengalihkan ke laporan kesalahan: kelas=${kelas}, paket=${paket}`);
            if (kelas && (paket || paket === 'all')) {
                window.location.href = `/guru/report/kesalahan_kelas?kelas=${kelas}&paket=${paket}`;
            } else {
                console.warn('Parameter kelas atau paket tidak valid');
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.id === 'lihatPerbandingan') {
            viewLaporanPerbandingan();
        }
    });
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

async function fetchLaporanKesalahan(kelas, paket) {
    showLoadingOverlay();
    try {
        const response = await fetch(`/guru/report/kesalahan_kelas?kelas=${kelas}&paket=${paket}`);
        const data = await response.json();
        if (data.status === 'sukses') {
            renderPieChart(data.data.topik_stats);
        } else {
            showErrorPopup(data.pesan || 'Data laporan tidak ditemukan');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat data');
    } finally {
        hideLoadingOverlay();
    }
}

function renderPieChart(topik_stats) {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) {
        console.warn('Canvas pieChart tidak ditemukan');
        return;
    }
    if (pieChart) pieChart.destroy();

    // Kelompokkan topik ke pelajaran berdasarkan kata kunci
    const pelajaran_stats = {};
    const pelajaran_map = {
        'Matematika': ['Penjumlahan', 'Pengurangan', 'Perkalian', 'Bangun Datar', 'Satuan Waktu'],
        'Bahasa': ['Jenis Kata', 'Penulisan Kalimat', 'Jenis Kalimat', 'Tanda Baca', 'Sinonim/Antonim', 'Kosa Kata', 'Kalimat Perintah', 'Kalimat Benar'],
        'IPA': ['Bagian Tumbuhan', 'Indera Manusia', 'Kebutuhan Tumbuhan', 'Organ Tubuh', 'Organ Pernapasan', 'Perubahan Wujud Benda', 'Proses Alam', 'Sifat Benda']
    };

    for (const topik in topik_stats) {
        const stats = topik_stats[topik];
        let pelajaran = 'Lain-lain';
        for (const [subj, topics] of Object.entries(pelajaran_map)) {
            if (topics.includes(topik)) {
                pelajaran = subj;
                break;
            }
        }
        if (!pelajaran_stats[pelajaran]) {
            pelajaran_stats[pelajaran] = { total: 0, benar: 0 };
        }
        pelajaran_stats[pelajaran].total += stats.total;
        pelajaran_stats[pelajaran].benar += stats.benar;
    }

    const pelajaran_data = {};
    for (const pelajaran in pelajaran_stats) {
        const stats = pelajaran_stats[pelajaran];
        pelajaran_data[pelajaran] = ((stats.total - stats.benar) / stats.total * 100) || 0;
    }

    const sorted_data = Object.entries(pelajaran_data).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const labels = sorted_data.map(item => item[0]);
    const data = sorted_data.map(item => item[1]);

    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: ['#FF9999', '#66B2FF', '#99FF99'] }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw.toFixed(2)}%` } }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const selected = labels[index];
                    // Filter topik_stats berdasarkan pelajaran yang dipilih
                    const filtered_stats = {};
                    for (const topik in topik_stats) {
                        if (Object.values(pelajaran_map).some(topics => topics.includes(topik) && pelajaran_map[selected] && pelajaran_map[selected].includes(topik))) {
                            filtered_stats[topik] = topik_stats[topik];
                        }
                    }
                    updateDetailTable(filtered_stats);
                    document.getElementById('selectedPelajaran').textContent = selected;
                    document.getElementById('detailSection').style.display = 'block';
                }
            }
        }
    });
}

function updateDetailTable(stats) {
    const tbody = document.querySelector('#topikTable tbody');
    if (tbody) {
        tbody.innerHTML = '';
        const top10 = Object.entries(stats).sort((a, b) => (b[1].total - b[1].benar) / b[1].total - (a[1].total - a[1].benar) / a[1].total).slice(0, 10);
        top10.forEach(([topik, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${topik}</td>
                <td>${data.total}</td>
                <td>${data.total - data.benar}</td>
                <td>${((data.total - data.benar) / data.total * 100).toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function setupSearchAndFilter() {
    const searchInput = document.getElementById('siswaSearch');
    const kelasFilter = document.getElementById('kelasFilter');
    if (searchInput && kelasFilter) {
        searchInput.addEventListener('input', () => loadSiswa(1, 6, kelasFilter.value, searchInput.value));
        kelasFilter.addEventListener('change', () => loadSiswa(1, 6, kelasFilter.value, searchInput.value));
    }
}

async function loadPerbandingan() {
    console.log("Memuat halaman laporan");

    const kelas     = document.getElementById('kelas')?.value || '3';
    const paket     = document.getElementById('paket')?.value || 'all';
    const pelajaran = document.getElementById('pelajaran')?.value || 'all';
    const page      = parseInt(document.getElementById('page')?.value) || 1;
    const limit     = parseInt(document.getElementById('limit')?.value) || 10;

    showLoadingOverlay();
    try {
        const resp = await fetch(`/guru/report/perbandingan?kelas=${kelas}&paket=${paket}&page=${page}&limit=${limit}&pelajaran=${pelajaran}&format=json`);
        const data = await resp.json();
        console.log("Data diterima dari server:", data);

        if (data.status === 'sukses') {
            const rows = data.data.siswa || [];
            if (rows.length > 0) {
                // Update table
                updatePerbandinganTable(rows, pelajaran);
                // Update chart
                updateComparisonChart(rows, pelajaran);
                // Update judul grafik
                document.getElementById('chartPelajaran').textContent = (pelajaran === 'all' ? 'Semua Pelajaran' : pelajaran);
            } else {
                showErrorPopup('Tidak ada data untuk filter ini');
                document.getElementById('studentTable').innerHTML = '<tr><td colspan="7">Tidak ada data</td></tr>';
                if (comparisonChart) comparisonChart.destroy();
            }
        } else {
            showErrorPopup(data.pesan || 'Gagal memuat data');
            document.getElementById('studentTable').innerHTML = '<tr><td colspan="7">Gagal memuat data</td></tr>';
            if (comparisonChart) comparisonChart.destroy();
        }

        const newUrl = `/guru/report/perbandingan?kelas=${kelas}&paket=${paket}&pelajaran=${pelajaran}&page=${page}&limit=${limit}`;
        window.history.replaceState(null, '', newUrl);
        
    } catch (err) {
        console.error('Error saat memuat perbandingan:', err);
        showErrorPopup('Terjadi kesalahan saat memuat data');
        document.getElementById('studentTable').innerHTML = '<tr><td colspan="7">Error</td></tr>';
        if (comparisonChart) comparisonChart.destroy();
    } finally {
        hideLoadingOverlay();
    }
}

// table menampilkan persentase semua pelajaran apabila pelajaran==all
function updatePerbandinganTable(data, pelajaran) {
    const tbody = document.getElementById('studentTable');
    tbody.innerHTML = '';

    data.forEach(s => {
        // Jika all -> tampilkan seluruh pel_stats, jika spesifik -> hanya pelajaran tsb
        let perfText = '';
        if(pelajaran === 'all') {
            perfText = Object.entries(s.topik_stats || {})
                            .map(([nm,v]) => `${nm}: ${(v.persentase||0).toFixed(2)}%`)
                            .join(', ');
        } else {
            const v = s.topik_stats?.[pelajaran]?.persentase ?? 0;
            perfText = `${pelajaran}: ${v.toFixed(2)}%`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.nama}</td>
            <td>${s.jumlah_benar ?? 0}</td>
            <td>${s.jumlah_salah ?? 0}</td>
            <td>${(s.persentase ?? 0).toFixed(2)}%</td>
            <td>${(s.waktu_rata2 ?? 0).toFixed(2)} detik</td>
            <td>${s.kesulitan_diduga ?? '-'}</td>
            <td>${perfText || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}


function updatePerbandinganTable(data) {
    const tbody = document.getElementById('studentTable');
    if (tbody) {
        tbody.innerHTML = '';
        data.forEach(siswa => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${siswa.nama || 'N/A'}</td>
                <td>${siswa.jumlah_benar || 0}</td>
                <td>${siswa.jumlah_salah || 0}</td>
                <td>${(siswa.persentase || 0).toFixed(2)}%</td>
                <td>${(siswa.waktu_rata2 || 0).toFixed(2)} detik</td>
                <td>${siswa.kesulitan_diduga || 'Belum ada data'}</td>
                <td>${Object.entries(siswa.topik_stats || {}).map(([topik, stats]) => `${topik}: ${(stats.persentase || 0).toFixed(2)}%`).join(', ') || 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function updateComparisonChart(data, pelajaran) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    if (comparisonChart) comparisonChart.destroy();

    const labels = data.map(s => s.nama);
    let values   = [];

    if (pelajaran === 'all') {
        // rata2 dari persentase tiap pelajaran
        values = data.map(s => {
            const list = Object.values(s.topik_stats || {});
            if (list.length === 0) return 0;
            const total = list.reduce((acc,st) => acc + (st.persentase||0), 0);
            return total / list.length;
        });
    } else {
        // ambil persentase per pel
        values = data.map(s => (s.topik_stats?.[pelajaran]?.persentase) || 0);
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Persentase Keberhasilan - ${pelajaran === 'all' ? 'Semua Pelajaran' : pelajaran}`,
                data:  values,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor:     'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins:{ legend:{ display:false } }
        }
    });
}

function setupPerbandinganFilters() {
    document.getElementById('kelas').addEventListener('change', loadPerbandingan);
    document.getElementById('paket').addEventListener('change', loadPerbandingan);
    document.getElementById('pelajaran').addEventListener('change', loadPerbandingan);
    document.getElementById('limit').addEventListener('change', loadPerbandingan);
    document.getElementById('page').addEventListener('change', loadPerbandingan);
    document.getElementById('printPDF').addEventListener('click', downloadPDF);
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
            popupKodeAkses.value = isVisible && originalCode ? originalCode : originalCode.substring(0, 2) + '*'.repeat(Math.max(0, originalCode.length - 2));
            togglePassword.textContent = isVisible ? '🙈' : '👁️';
        });
    }

    // Pastikan event tab berfungsi setelah Bootstrap dimuat
    document.querySelectorAll('#reportTabs .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            if (e.target.getAttribute('data-bs-target') === '#kesalahan') {
                console.log('Tab Kesalahan Umum aktif, memuat paket');
                loadPaket('kelasKesalahan', 'paketKesalahan');
            }
        });
    });

    const id_siswa = window.location.pathname.match(/\/guru\/report\/individu\/(\d+)/)?.[1];
    if (id_siswa) {
        console.log(`Inisialisasi laporan individu untuk id_siswa: ${id_siswa}`);
        fetchLaporanIndividu(id_siswa);
    }

    // Inisialisasi untuk laporan kesalahan umum hanya jika di halaman yang sesuai
    if (window.location.pathname.includes('/guru/report/kesalahan_kelas')) {
        const container = document.querySelector('.container');
        if (container) {
            const topikStatsJson = container.getAttribute('data-topik-stats');
            if (topikStatsJson) {
                try {
                    const topikStats = JSON.parse(topikStatsJson);
                    if (Object.keys(topikStats).length > 0) {
                        console.log('Data topikStats:', topikStats);
                        renderPieChart(topikStats);
                    } else {
                        console.warn('Data topikStats kosong.');
                        showErrorPopup('Tidak ada data kesalahan untuk ditampilkan.');
                    }
                } catch (error) {
                    console.error('Error parsing topikStats:', error);
                    showErrorPopup('Terjadi kesalahan dalam memuat data kesalahan.');
                }
            } else {
                console.warn('Data topik-stats tidak ditemukan di elemen container.');
                showErrorPopup('Data kesalahan tidak tersedia.');
            }
        }
    } else if (document.getElementById('pieChart') && !window.location.pathname.includes('/guru/report/individu')) {
        const urlParams = new URLSearchParams(window.location.search);
        const kelas = urlParams.get('kelas') || '3';
        const paket = urlParams.get('paket') || 'all';
        console.log(`Inisialisasi laporan kesalahan untuk kelas: ${kelas}, paket: ${paket}`);
        fetchLaporanKesalahan(kelas, paket);
    }

    // Inisialisasi untuk laporan perbandingan
    if (document.getElementById('studentTable') && document.getElementById('comparisonChart')) {
        loadPerbandingan();
        setupPerbandinganFilters();
    }
});