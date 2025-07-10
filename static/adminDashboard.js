let debounceTimeout;

// Update datetime real-time
function updateDatetime() {
    const now = new Date();
    const datetime = document.getElementById('datetime');
    if (datetime) {
        datetime.textContent = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}
setInterval(updateDatetime, 60000); // Update every minute
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

// Load data guru dengan paginasi untuk Home
function loadGuruHome(page = 1, limit = 8, filter = 'all', search = '') {
    const offset = (page - 1) * limit;
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');
    
    console.log(`[loadGuruHome] Fetching data: page=${page}, limit=${limit}, offset=${offset}, filter=${filter}, search=${search}`);
    
    fetch(`/admin/get_guru?page=${page}&limit=${limit}&offset=${offset}&status=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
        console.log('[loadGuruHome] Response:', data);
        if (data.status === 'sukses') {
            const table = document.getElementById('guruTable');
            const tbody = table.getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            data.guru.forEach(guru => {
                const tr = document.createElement('tr');
                const status = new Date(guru.kadaluarsa) > new Date() ? 'aktif' : 'nonaktif';
                const maskedCode = guru.kode_akses.slice(0, 2) + '*'.repeat(6); // Selalu 8 karakter
                tr.innerHTML = `
                    <td>${guru.nama}</td>
                    <td>${maskedCode}</td>
                    <td>${guru.kadaluarsa}</td>
                    <td>
                        <span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <input type="checkbox" class="toggle-switch" id="toggle-${guru.nama}" ${status === 'aktif' ? 'checked' : ''} data-nama="${guru.nama}" data-kode="${guru.kode_akses}" data-kadaluarsa="${guru.kadaluarsa}">
                        <label for="toggle-${guru.nama}"></label>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            setupToggleSwitchesHome();
            setupPaginationHome(data.total, page, limit, filter, search);
        } else {
            showErrorPopup(data.pesan);
        }
    })
    .catch(error => {
        if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
        console.error('[loadGuruHome] Error:', error);
        showErrorPopup('Terjamin kesalahan saat memuat data');
    });
}

// Load data guru dengan paginasi untuk Atur Kode
function loadGuruManage(page = 1, limit = 10, filter = 'all', search = '') {
    const offset = (page - 1) * limit;
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');
    
    console.log(`[loadGuruManage] Fetching data: page=${page}, limit=${limit}, offset=${offset}, filter=${filter}, search=${search}`);
    
    fetch(`/admin/get_guru?page=${page}&limit=${limit}&offset=${offset}&status=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
        console.log('[loadGuruManage] Response:', data);
        if (data.status === 'sukses') {
            const table = document.getElementById('manageTable');
            const tbody = table.getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            data.guru.forEach(guru => {
                const tr = document.createElement('tr');
                const status = new Date(guru.kadaluarsa) > new Date() ? 'aktif' : 'nonaktif';
                const maskedCode = guru.kode_akses.slice(0, 2) + '*'.repeat(6); // Selalu 8 karakter
                tr.innerHTML = `
                    <td>${guru.nama}</td>
                    <td>${maskedCode}</td>
                    <td>${guru.kadaluarsa}</td>
                    <td>
                        <span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </td>
                    <td>${guru.terakhir_diperbarui || 'N/A'}</td>
                    <td><button class="action-btn" onclick="openEditPopup('${guru.nama}', '${guru.kode_akses}', '${guru.kadaluarsa}')">Edit</button></td>
                `;
                tbody.appendChild(tr);
            });
            setupPaginationManage(data.total, page, limit, filter, search);
        } else {
            showErrorPopup(data.pesan);
        }
    })
    .catch(error => {
        if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
        console.error('[loadGuruManage] Error:', error);
        showErrorPopup('Terjamin kesalahan saat memuat data');
    });
}

// Pencarian dan filter untuk Home
function setupSearchAndFilterHome() {
    const searchBar = document.getElementById('guruSearch');
    const statusFilter = document.getElementById('statusFilter');
    if (!searchBar || !statusFilter) {
        console.error('[setupSearchAndFilterHome] Elemen tidak ditemukan:', { searchBar, statusFilter });
        return;
    }
    searchBar.addEventListener('input', () => {
        const searchValue = searchBar.value.trim();
        console.log('[setupSearchAndFilterHome] Search input:', searchValue);
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            console.log('[setupSearchAndFilterHome] Calling loadGuruHome dengan:', { page: 1, limit: 8, filter: statusFilter.value, search: searchValue });
            loadGuruHome(1, 8, statusFilter.value, searchValue);
        }, 500);
    });

    statusFilter.addEventListener('change', () => {
        const searchValue = searchBar.value.trim();
        console.log('[setupSearchAndFilterHome] Filter changed:', statusFilter.value);
        loadGuruHome(1, 8, statusFilter.value, searchValue);
    });
}

// Pencarian dan filter untuk Atur Kode
function setupSearchAndFilterManage() {
    const searchBar = document.getElementById('manageSearch');
    const statusFilter = document.getElementById('manageStatusFilter');
    if (!searchBar || !statusFilter) {
        console.error('[setupSearchAndFilterManage] Elemen tidak ditemukan:', { searchBar, statusFilter });
        return;
    }
    searchBar.addEventListener('input', () => {
        const searchValue = searchBar.value.trim();
        console.log('[setupSearchAndFilterManage] Search input:', searchValue);
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            console.log('[setupSearchAndFilterManage] Calling loadGuruManage dengan:', { page: 1, limit: 10, filter: statusFilter.value, search: searchValue });
            loadGuruManage(1, 10, statusFilter.value, searchValue);
        }, 500);
    });

    statusFilter.addEventListener('change', () => {
        const searchValue = searchBar.value.trim();
        console.log('[setupSearchAndFilterManage] Filter changed:', statusFilter.value);
        loadGuruManage(1, 10, statusFilter.value, searchValue);
    });
}

// Toggle switch untuk Home
function setupToggleSwitchesHome() {
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const nama = this.getAttribute('data-nama');
            const kode = this.getAttribute('data-kode');
            const kadaluarsa = this.getAttribute('data-kadaluarsa');
            const newStatus = this.checked ? 'aktif' : 'nonaktif';
            const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
            if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');
            
            fetch('/admin/toggle_guru_status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nama, kode_akses: kode, status: newStatus })
            })
            .then(response => response.json())
            .then(data => {
                if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
                console.log('[ToggleStatus] Response:', data);
                if (data.status !== 'sukses') showErrorPopup(data.pesan);
                else loadGuruHome(1, 8, document.getElementById('statusFilter').value, document.getElementById('guruSearch').value.trim());
            })
            .catch(error => {
                if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
                console.error('[Toggle Error]:', error);
                showErrorPopup('Terjamin kesalahan saat mengubah status');
            });
        });
    });
}

// Paginasi untuk Home
function setupPaginationHome(totalItems, currentPage, limit, filter, search) {
    const pagination = document.getElementById('pagination-home');
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / limit);

    if (totalPages > totalPages) {
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
        editKode.value = kode; // Menampilkan kode asli
        editKadaluarsa.value = kadaluarsa;
        popup.classList.remove('hidden');
        editKode.addEventListener('input', function() {
            validateEditForm();
        });
    }
}

function validateEditForm() {
    const kode = document.getElementById('editKode');
    const kadaluarsa = document.getElementById('editKadaluarsa');
    const kodeError = document.getElementById('editKodeError');
    const kadaluarsaError = document.getElementById('editKadaluarsaError');
    if (!kode || !kadaluarsa) return;

    const kodeValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value);
    const kadaluarsaValid = !kadaluarsa.required || (kadaluarsa.value && new Date(kadaluarsa.value) > new Date());
    const submitBtn = document.querySelector('#editForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = !(kodeValid && kadaluarsaValid);

    kodeError.style.display = kodeValid ? 'none' : 'block';
    kodeError.textContent = kodeValid ? '' : 'Kode akses minimal 8 karakter, berisi huruf dan angka';
    kadaluarsaError.style.display = kadaluarsaValid ? 'none' : 'block';
    kadaluarsaError.textContent = kadaluarsaValid ? '' : 'Kadaluarsa harus di masa depan';

    kode.style.borderColor = kodeValid ? '#EDF2F7' : '#F56565';
    kadaluarsa.style.borderColor = kadaluarsaValid ? '#EDF2F7' : '#F56565';
}

function setupEditForm() {
    const editForm = document.getElementById('editForm');
    if (!editForm) return;

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const nama = document.getElementById('editNama').value;
        const kode = document.getElementById('editKode').value;
        const kadaluarsa = document.getElementById('editKadaluarsa').value;
        const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
        if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');

        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode)) {
            showErrorPopup('Kode akses minimal 8 karakter dan harus berisi huruf serta angka.');
            if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
            return;
        }
        if (kadaluarsa && new Date(kadaluarsa) <= new Date()) {
            showErrorPopup('Kadaluarsa harus di masa depan.');
            if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
            return;
        }

        fetch('/admin/update_guru', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nama, kode_akses: kode, kadaluarsa })
        })
        .then(response => response.json())
        .then(data => {
            if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden'); // Perbaikan di sini
            console.log('[Update Guru] Response:', data);
            if (data.status === 'sukses') {
                closePopup();
                loadGuruManage(1, 10, document.getElementById('manageStatusFilter').value, document.getElementById('manageSearch').value.trim());
            } else {
                showErrorPopup(data.pesan);
            }
        })
        .catch(error => {
            if (pageLoadingOverlay) pageLoadingOverlay.classList.add('hidden');
            console.error('[Update Guru] Error:', error);
            showErrorPopup('Terjadi kesalahan saat menyimpan data');
        });
    });
}

// Validasi form Buat Akun Guru
function setupCreateAccountForm() {
    console.log('Setup Form create account initialized');
    const form = document.getElementById('createAccountForm');
    if (!form) {
        console.error('Form tidak ditemukan');
        return;
    }

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
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');

    if (!nama || !kode || !kadaluarsa || !submitBtn || !namaError || !kodeError || !kadaluarsaError || !togglePassword || !successPopup || !pageLoadingOverlay) {
        console.error('[setupCreateAccountForm] Form elemen tidak ditemukan:', { nama, kode, kadaluarsa, submitBtn, namaError, kodeError, kadaluarsaError, togglePassword, successPopup, pageLoadingOverlay });
        return;
    }

    function validateForm() {
        const kodeValid = kode.value ? /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value) : true;
        const kadaluarsaValid = kadaluarsa.value ? new Date(kadaluarsa.value) > new Date() : true;
        const isValid = (nama.value.trim() || !nama.value) && kodeValid && kadaluarsaValid;

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

    [nama, kode, kadaluarsa].forEach(input => {
        input.addEventListener('input', validateForm);
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('[submit form]');
        if (!submitBtn.disabled) {
            submitText.style.display = 'none';
            loadingSpinner.style.display = 'inline-block';
            submitBtn.disabled = true;
            pageLoadingOverlay.classList.remove('hidden');

            fetch('/admin/add_guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama: nama.value, kode_akses: kode.value, kadaluarsa: kadaluarsa.value })
            })
            .then(response => {
                console.log('Fetch response:', response);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log('✅ data:', data);
                submitText.style.display = 'inline';
                loadingSpinner.style.display = 'none';
                submitBtn.disabled = false;
                pageLoadingOverlay.classList.add('hidden');
                if (successPopup && pageLoadingOverlay) {
                    successPopup.classList.remove('hidden');
                    if (data.status === 'sukses') {
                        successPopup.querySelector('h3').textContent = 'Sukses';
                        successPopup.querySelector('p').textContent = 'Akun guru berhasil dibuat!';
                        const closeBtn = successPopup.querySelector('button');
                        closeBtn.onclick = () => {
                            successPopup.classList.add('hidden');
                            pageLoadingOverlay.classList.remove('hidden');
                            setTimeout(() => {
                                window.location.href = '/admin/adminDashboard';
                            }, 1000);
                        };
                    } else {
                        successPopup.querySelector('h3').textContent = 'Error';
                        successPopup.querySelector('p').textContent = data.pesan || 'Terjamin kesalahan';
                        const closeBtn = successPopup.querySelector('button');
                        closeBtn.onclick = () => {
                            successPopup.classList.add('hidden');
                        };
                    }
                } else {
                    console.error('Popup elemen tidak ditemukan:', { successPopup, pageLoadingOverlay });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                submitText.style.display = 'inline';
                loadingSpinner.style.display = 'none';
                submitBtn.disabled = false;
                pageLoadingOverlay.classList.add('hidden');
                if (successPopup) {
                    successPopup.classList.remove('hidden');
                    successPopup.querySelector('h3').textContent = 'Error';
                    successPopup.querySelector('p').textContent = 'Terjamin kesalahan saat menyimpan data';
                    const closeBtn = successPopup.querySelector('button');
                    closeBtn.onclick = () => {
                        successPopup.classList.add('hidden');
                    };
                } else {
                    console.error('Success popup tidak ditemukan');
                }
            });
        }
    });

    // Inisialisasi tanpa validasi awal
    submitBtn.disabled = true;
}

// Logout
function confirmLogout() {
    console.log('Confirm logout dipanggil');
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        logoutPopup.classList.remove('hidden');
        console.log('Logout popup ditampilkan');
    } else {
        console.error('Logout popup tidak ditemukan');
        showErrorPopup('Error menunjukkan popup logout');
    }
}

function closePopup() {
    document.querySelectorAll('.popup').forEach(popup => popup.classList.add('hidden'));
}

function performLogout() {
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('hidden');
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
            if (!isOpen) {
                dropdownContent.style.display = 'block';
            }
        });
    });

    // Tutup dropdown saat klik di luar
    document.addEventListener('click', (e) => {
        const isClickInside = e.target.closest('.dropdown');
        if (!isClickInside) {
            document.querySelectorAll('.dropdown-content').forEach(content => content.style.display = 'none');
        }
    });
}

// Load data awal
window.onload = () => {
    console.log('Window dimuat');
    if (document.getElementById('home-section')) {
        loadGuruHome(1, 8, 'all', '');
        setupSearchAndFilterHome();
    }
    if (document.getElementById('manageTable')) {
        loadGuruManage(1, 10, 'all', '');
        setupSearchAndFilterManage();
        setupEditForm();
        const editKode = document.getElementById('editKode');
        if (editKode) editKode.addEventListener('input', validateEditForm);
    }
    if (document.getElementById('createAccountForm')) {
        setupCreateAccountForm();
    }
    setupDropdownToggle();

    // Inisialisasi logout
    const logoutLinks = document.querySelectorAll('.logout');
    console.log('Logout links ditemukan:', logoutLinks.length);
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            console.log('Logout diklik');
            e.preventDefault();
            confirmLogout();
        });
    });

    // Inisialisasi tombol logout popup
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        const yesButton = logoutPopup.querySelector('.popup-buttons button:first-child');
        const noButton = logoutPopup.querySelector('.popup-buttons button:last-child');
        if (yesButton) yesButton.addEventListener('click', performLogout);
        if (noButton) noButton.addEventListener('click', closePopup);
    }
};