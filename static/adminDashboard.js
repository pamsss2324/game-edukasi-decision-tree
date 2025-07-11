let debounceTimeout;

// Update datetime real-time
function updateDatetime() {
    const now = new Date();
    const dateElement = document.getElementById('date');
    const timeElement = document.getElementById('time');
    if (dateElement && timeElement) {
        dateElement.textContent = now.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        timeElement.textContent = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}
setInterval(updateDatetime, 1000);
updateDatetime();

// Show error popup
function showErrorPopup(message) {
    const successPopup = document.getElementById('successPopup');
    if (successPopup) {
        successPopup.querySelector('h3').textContent = 'Gagal';
        successPopup.querySelector('p').textContent = message;
        successPopup.classList.remove('hidden');
        const closeBtn = successPopup.querySelector('button');
        closeBtn.onclick = () => successPopup.classList.add('hidden');
    } else {
        alert(message);
    }
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

// Load data guru dengan paginasi untuk Home
async function loadGuruHome(page = 1, limit = 8, filter = 'all', search = '') {
    showLoadingOverlay();
    try {
        const response = await fetch(`/admin/get_guru?page=${page}&limit=${limit}&status=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (data.status === 'sukses') {
            const tbody = document.querySelector('#guruTable tbody');
            tbody.innerHTML = '';
            data.guru.forEach(guru => {
                const status = guru.status ? 'Aktif' : 'Nonaktif';
                const badgeClass = guru.status ? 'status-aktif' : 'status-nonaktif';
                const maskedCode = guru.kode_akses.slice(0, 2) + '*'.repeat(6);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${guru.nama}</td>
                    <td>${maskedCode}</td>
                    <td>${guru.kadaluarsa || '-'}</td>
                    <td>
                        <label class="toggle-switch-label">
                            <input type="checkbox" class="toggle-switch" ${guru.status ? 'checked' : ''} data-nama="${guru.nama}">
                            <span class="status-badge ${badgeClass}">${status}</span>
                        </label>
                    </td>
                `;
                tbody.appendChild(row);
            });
            setupToggleSwitchesHome();
            setupPaginationHome(data.total, page, limit, filter, search);
        } else {
            showErrorPopup(data.pesan || 'Gagal memuat data');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat data');
    } finally {
        hideLoadingOverlay();
    }
}

// Load data guru dengan paginasi untuk Atur Kode
async function loadGuruManage(page = 1, limit = 10, filter = 'all', search = '') {
    showLoadingOverlay();
    try {
        const response = await fetch(`/admin/get_guru?page=${page}&limit=${limit}&status=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (data.status === 'sukses') {
            const tbody = document.querySelector('#manageTable tbody');
            tbody.innerHTML = '';
            data.guru.forEach(guru => {
                const isActive = guru.status && (!guru.kadaluarsa || new Date(guru.kadaluarsa) > new Date());
                const status = isActive ? 'Aktif' : 'Nonaktif';
                const badgeClass = isActive ? 'status-aktif' : 'status-nonaktif';
                const maskedCode = guru.kode_akses.slice(0, 2) + '*'.repeat(6);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${guru.nama}</td>
                    <td>${maskedCode}</td>
                    <td>${guru.kadaluarsa || '-'}</td>
                    <td>
                        <span class="status-badge ${badgeClass}">${status}</span>
                    </td>
                    <td>${guru.terakhir_diperbarui || 'N/A'}</td>
                    <td><button class="action-btn" onclick="openEditPopup('${guru.nama}', '${guru.kode_akses}', '${guru.kadaluarsa}')">Edit</button></td>
                `;
                tbody.appendChild(row);
            });
            setupPaginationManage(data.total, page, limit, filter, search);
        } else {
            showErrorPopup(data.pesan);
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat data');
    } finally {
        hideLoadingOverlay();
    }
}

// Pencarian dan filter untuk Home
function setupSearchAndFilterHome() {
    const searchBar = document.getElementById('guruSearch');
    const statusFilter = document.getElementById('statusFilter');
    if (!searchBar || !statusFilter) return;

    searchBar.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadGuruHome(1, 8, statusFilter.value, searchBar.value.trim());
        }, 500);
    });

    statusFilter.addEventListener('change', () => {
        loadGuruHome(1, 8, statusFilter.value, searchBar.value.trim());
    });
}

// Pencarian dan filter untuk Atur Kode
function setupSearchAndFilterManage() {
    const searchBar = document.getElementById('manageSearch');
    const statusFilter = document.getElementById('manageStatusFilter');
    if (!searchBar || !statusFilter) return;

    searchBar.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadGuruManage(1, 10, statusFilter.value, searchBar.value.trim());
        }, 500);
    });

    statusFilter.addEventListener('change', () => {
        loadGuruManage(1, 10, statusFilter.value, searchBar.value.trim());
    });
}

// Toggle switch untuk Home
function setupToggleSwitchesHome() {
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('change', async function() {
            const nama = this.getAttribute('data-nama');
            showLoadingOverlay();
            try {
                const response = await fetch('/admin/toggle_guru_status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nama })
                });
                const data = await response.json();
                if (data.status === 'sukses') {
                    loadGuruHome(1, 8, document.getElementById('statusFilter').value, document.getElementById('guruSearch').value.trim());
                } else {
                    this.checked = !this.checked; // Kembalikan toggle jika gagal
                    showErrorPopup(data.pesan || 'Gagal mengubah status');
                }
            } catch (error) {
                this.checked = !this.checked; // Kembalikan toggle jika gagal
                showErrorPopup('Terjadi kesalahan saat mengubah status');
            } finally {
                hideLoadingOverlay();
            }
        });
    });
}

// Paginasi untuk Home
function setupPaginationHome(totalItems, currentPage, limit, filter, search) {
    const pagination = document.getElementById('pagination-home');
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / limit);

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => loadGuruHome(currentPage - 1, limit, filter, search);
        pagination.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage;
            pageButton.onclick = () => loadGuruHome(i, limit, filter, search);
            pagination.appendChild(pageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => loadGuruHome(currentPage + 1, limit, filter, search);
        pagination.appendChild(nextButton);
    }
}

// Paginasi untuk Atur Kode
function setupPaginationManage(totalItems, currentPage, limit, filter, search) {
    const pagination = document.getElementById('pagination-manage');
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / limit);

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => loadGuruManage(currentPage - 1, limit, filter, search);
        pagination.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage;
            pageButton.onclick = () => loadGuruManage(i, limit, filter, search);
            pagination.appendChild(pageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => loadGuruManage(currentPage + 1, limit, filter, search);
        pagination.appendChild(nextButton);
    }
}

// Edit popup untuk Atur Kode
function openEditPopup(nama, kode, kadaluarsa) {
    const popup = document.getElementById('editPopup');
    const editKode = document.getElementById('editKode');
    const editKadaluarsa = document.getElementById('editKadaluarsa');
    if (popup && editKode && editKadaluarsa) {
        document.getElementById('editNama').value = nama;
        editKode.value = kode;
        editKadaluarsa.value = kadaluarsa || '';
        popup.classList.remove('hidden');
        validateEditForm(); // Pastikan validasi dijalankan saat popup dibuka
    }
}

function validateEditForm() {
    const kode = document.getElementById('editKode');
    const kadaluarsa = document.getElementById('editKadaluarsa');
    const kodeError = document.getElementById('editKodeError');
    const kadaluarsaError = document.getElementById('editKadaluarsaError');
    const submitBtn = document.querySelector('#editForm button[type="submit"]');

    if (!kode || !kadaluarsa || !kodeError || !kadaluarsaError || !submitBtn) return;

    const kodeValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value);
    const kadaluarsaValid = !kadaluarsa.value || new Date(kadaluarsa.value) > new Date();
    submitBtn.disabled = !(kodeValid && kadaluarsaValid);

    kodeError.style.display = kodeValid ? 'none' : 'block';
    kodeError.textContent = kodeValid ? '' : 'Kode akses minimal 8 karakter, berisi huruf dan angka';
    kadaluarsaError.style.display = kadaluarsaValid ? 'none' : 'block';
    kadaluarsaError.textContent = kadaluarsaValid ? '' : 'Kadaluarsa harus di masa depan';

    kode.style.borderColor = kodeValid ? '#EDF2F7' : '#F56565';
    kadaluarsa.style.borderColor = kadaluarsaValid ? '#EDF2F7' : '#F56565';
}

// Tambahkan event listener untuk input agar validasi diperbarui secara real-time
document.addEventListener('DOMContentLoaded', () => {
    const editKode = document.getElementById('editKode');
    const editKadaluarsa = document.getElementById('editKadaluarsa');
    if (editKode && editKadaluarsa) {
        editKode.addEventListener('input', validateEditForm);
        editKadaluarsa.addEventListener('input', validateEditForm);
    }
});

function setupEditForm() {
    const editForm = document.getElementById('editForm');
    if (!editForm) return;

    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nama = document.getElementById('editNama').value;
        const kode = document.getElementById('editKode').value;
        const kadaluarsa = document.getElementById('editKadaluarsa').value;

        showLoadingOverlay();
        try {
            const response = await fetch('/admin/update_guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama, kode_akses: kode, kadaluarsa })
            });
            const data = await response.json();
            if (data.status === 'sukses') {
                closePopup();
                loadGuruManage(1, 10, document.getElementById('manageStatusFilter').value, document.getElementById('manageSearch').value.trim());
            } else {
                showErrorPopup(data.pesan || 'Gagal memperbarui akun');
            }
        } catch (error) {
            showErrorPopup('Terjadi kesalahan saat menyimpan data');
        } finally {
            hideLoadingOverlay();
        }
    });
}

// Validasi form Buat Akun Guru
function setupCreateAccountForm() {
    const form = document.getElementById('createAccountForm');
    if (!form) return;

    const nama = document.getElementById('guruNama');
    const kode = document.getElementById('guruKode');
    const kadaluarsa = document.getElementById('guruKadaluarsa');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const namaError = document.getElementById('namaError');
    const kodeError = document.getElementById('kodeError');
    const kadaluarsaError = document.getElementById('kadaluarsaError');
    const togglePassword = document.getElementById('togglePassword');
    const successPopup = document.getElementById('successPopup');

    if (!nama || !kode || !kadaluarsa || !submitBtn || !namaError || !kodeError || !kadaluarsaError || !togglePassword || !successPopup) return;

    function validateForm() {
        const kodeValid = kode.value ? /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value) : true;
        const kadaluarsaValid = kadaluarsa.value ? new Date(kadaluarsa.value) > new Date() : true;
        const isValid = nama.value.trim() && kodeValid && kadaluarsaValid;

        submitBtn.disabled = !isValid;
        namaError.style.display = nama.value.trim() ? 'none' : 'block';
        kodeError.style.display = kodeValid ? 'none' : 'block';
        kadaluarsaError.style.display = kadaluarsaValid ? 'none' : 'block';

        nama.style.borderColor = nama.value.trim() ? '#EDF2F7' : '#F56565';
        kode.style.borderColor = kodeValid ? '#EDF2F7' : '#F56565';
        kadaluarsa.style.borderColor = kadaluarsaValid ? '#EDF2F7' : '#F56565';
    }

    togglePassword.addEventListener('click', function() {
        const type = kode.getAttribute('type') === 'password' ? 'text' : 'password';
        kode.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁️' : '🙈';
        this.style.transform = type === 'password' ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(1.05)';
        this.style.opacity = type === 'password' ? '1' : '0.8';
    });

    [nama, kode, kadaluarsa].forEach(input => input.addEventListener('input', validateForm));

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!submitBtn.disabled) {
            submitText.style.display = 'none';
            loadingSpinner.style.display = 'inline-block';
            submitBtn.disabled = true;
            showLoadingOverlay();

            try {
                const response = await fetch('/admin/add_guru', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nama: nama.value, kode_akses: kode.value, kadaluarsa: kadaluarsa.value })
                });
                const data = await response.json();
                if (data.status === 'sukses') {
                    successPopup.querySelector('h3').textContent = 'Sukses';
                    successPopup.querySelector('p').textContent = 'Akun guru berhasil dibuat!';
                    successPopup.classList.remove('hidden');
                    const closeBtn = successPopup.querySelector('button');
                    closeBtn.onclick = () => {
                        successPopup.classList.add('hidden');
                        window.location.href = '/admin/adminDashboard';
                    };
                } else {
                    showErrorPopup(data.pesan || 'Terjadi kesalahan');
                }
            } catch (error) {
                showErrorPopup('Terjadi kesalahan saat menyimpan data');
            } finally {
                submitText.style.display = 'inline';
                loadingSpinner.style.display = 'none';
                submitBtn.disabled = false;
                hideLoadingOverlay();
            }
        }
    });

    submitBtn.disabled = true;
}

// Logout
function confirmLogout() {
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) logoutPopup.classList.remove('hidden');
}

function closePopup() {
    document.querySelectorAll('.popup').forEach(popup => popup.classList.add('hidden'));
}

function performLogout() {
    showLoadingOverlay();
    window.location.href = '/admin/logout';
}

// Toggle dropdown
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
    if (document.getElementById('home-section')) {
        loadGuruHome(1, 8, 'all', '');
        setupSearchAndFilterHome();
    }
    if (document.getElementById('manageTable')) {
        loadGuruManage(1, 10, 'all', '');
        setupSearchAndFilterManage();
        setupEditForm();
    }
    if (document.getElementById('createAccountForm')) {
        setupCreateAccountForm();
    }
    setupDropdownToggle();

    const logoutLinks = document.querySelectorAll('.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            confirmLogout();
        });
    });

    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        const yesButton = logoutPopup.querySelector('.popup-buttons button:first-child');
        const noButton = logoutPopup.querySelector('.popup-buttons button:last-child');
        if (yesButton) yesButton.addEventListener('click', performLogout);
        if (noButton) noButton.addEventListener('click', closePopup);
    }
};