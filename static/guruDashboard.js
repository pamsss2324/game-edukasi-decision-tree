let debounceTimeout;

// Show error popup
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

// Show loading overlay
function showLoadingOverlay() {
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
}

async function loadSiswa(page = 1, limit = 6, kelasFilter = 'all', search = '') {
    showLoadingOverlay();
    try {
        const response = await fetch(`/guru/get_siswa?page=${page}&limit=${limit}&kelas=${encodeURIComponent(kelasFilter)}&search=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (data.status === 'sukses') {
            const tbody = document.querySelector('#siswaTable tbody');
            tbody.innerHTML = '';
            data.siswa.forEach(siswa => {
                const row = document.createElement('tr');
                row.onclick = () => showDetailSiswa(siswa.id, siswa.nama);
                row.innerHTML = `
                    <td>${siswa.nama}</td>
                    <td>Kelas ${siswa.kelas}</td>
                    <td>${siswa.kesulitan_diduga || 'Belum ada data'}</td>
                    <td>${siswa.tanggal ? new Date(siswa.tanggal).toLocaleDateString('id-ID') : 'Belum ada data'}</td>
                `;
                tbody.appendChild(row);
            });
            setupPagination(data.total, page, limit, kelasFilter, search);
        } else {
            showErrorPopup(data.pesan || 'Data kuis siswa belum tersedia');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat data');
    } finally {
        hideLoadingOverlay();
    }
}

// Pencarian dan filter
function setupSearchAndFilter() {
    const searchBar = document.getElementById('siswaSearch');
    const kelasFilter = document.getElementById('kelasFilter');
    if (!searchBar || !kelasFilter) return;

    searchBar.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadSiswa(1, 6, kelasFilter.value, searchBar.value.trim());
        }, 500);
    });

    kelasFilter.addEventListener('change', () => {
        loadSiswa(1, 6, kelasFilter.value, searchBar.value.trim());
    });
}

// Paginasi
function setupPagination(totalItems, currentPage, limit = 6, kelasFilter, search) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
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

// Tampilkan detail siswa
async function showDetailSiswa(id_siswa, nama_siswa) {
    console.log('Showing Detail for ID:', id_siswa, 'Name:', nama_siswa);
    showLoadingOverlay();
    try {
        const response = await fetch(`/guru/get_detail_siswa?id_siswa=${id_siswa}`);
        const data = await response.json();
        if (data.status === 'sukses') {
            if (!data.kesulitan_diduga || data.kesulitan_diduga === 'Belum ada data') {
                showCustomAlert('Data kuis siswa belum tersedia');
            } else {
                const popup = document.getElementById('detailPopup');
                if (popup) {
                    document.getElementById('detailTitle').textContent = `Detail Data Siswa/i ${nama_siswa}`;
                    document.getElementById('detailBenar').textContent = data.jumlah_benar || '0';
                    document.getElementById('detailSalah').textContent = data.jumlah_salah || '0';
                    document.getElementById('detailWaktu').textContent = data.waktu_rata2_per_soal || '0';
                    document.getElementById('detailAsal').textContent = data.dideteksi_asal ? 'Ya' : 'Tidak';
                    document.getElementById('detailKesulitan').textContent = data.kesulitan_diduga || 'Belum ada data';
                    document.getElementById('detailPelajaranSulit').textContent = data.pelajaran_sulit || 'Tidak ada';
                    popup.classList.add('visible');
                    popup.classList.remove('hidden');
                    console.log('Detail Popup Shown, Class:', popup.className);
                    setTimeout(() => console.log('After Delay, Class:', popup.className), 100);
                } else {
                    showErrorPopup('Popup detail tidak ditemukan');
                }
            }
        } else {
            showErrorPopup(data.pesan || 'Data kuis siswa belum tersedia');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat detail siswa');
    } finally {
        hideLoadingOverlay();
    }
}

// Tampilkan informasi akun
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
            setTimeout(() => console.log('After Delay, Class:', popup.className), 100);
        } else {
            showErrorPopup('Popup informasi tidak ditemukan');
        }
    } catch (error) {
        showErrorPopup('Gagal memuat informasi akun');
    } finally {
        hideLoadingOverlay();
    }
}

// Logout
function confirmLogout(event) {
    console.log('Confirming Logout');
    if (event) event.preventDefault();
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        logoutPopup.classList.add('visible');
        logoutPopup.classList.remove('hidden');
        console.log('Logout Popup Shown, Class:', logoutPopup.className);
        setTimeout(() => console.log('After Delay, Class:', logoutPopup.className), 100);
    } else {
        showErrorPopup('Popup logout tidak ditemukan');
    }
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

function performLogout() {
    showLoadingOverlay();
    window.location.href = '/';
}

// Toggle dropdown untuk navbar
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

// Load data awal
window.onload = () => {
    loadSiswa(1, 6, 'all', '');
    setupSearchAndFilter();
    setupDropdownToggle();

    const logoutLinks = document.querySelectorAll('.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            confirmLogout(e);
        });
    });

    const infoLinks = document.querySelectorAll('.info-link');
    infoLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadInformasi(e);
        });
    });

    const togglePassword = document.getElementById('togglePassword');
    const popupKodeAkses = document.getElementById('popupKodeAkses');
    if (togglePassword && popupKodeAkses) {
        let isVisible = false;
        const originalCode = popupKodeAkses.dataset.fullCode || popupKodeAkses.value; // Fallback ke value jika data-full-code undefined
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
};

function showCustomAlert(message) {
    const popup = document.getElementById('customAlert');
    if (popup) {
        document.getElementById('alertMessage').textContent = message || 'Data kuis siswa belum tersedia';
        popup.classList.add('visible');
        popup.classList.remove('hidden');
    } else {
        showErrorPopup('Popup alert tidak ditemukan');
    }
}