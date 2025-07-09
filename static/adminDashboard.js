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

// Load guru data with pagination for Home
function loadGuruHome(page = 1, limit = 10, filter = 'all') {
    const offset = (page - 1) * limit;
    fetch(`/admin/get_guru?page=${page}&limit=${limit}&offset=${offset}&status=${filter}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        console.log('Home data:', data);
        if (data.status === 'sukses') {
            const table = document.getElementById('guruTable');
            const tbody = table.getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            data.guru.forEach(guru => {
                const tr = document.createElement('tr');
                const status = new Date(guru.kadaluarsa) > new Date() ? 'aktif' : 'nonaktif';
                const maskedCode = guru.kode_akses.slice(0, 2) + '*'.repeat(guru.kode_akses.length - 2);
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
            setupPaginationHome(data.total, page, limit, filter);
        } else {
            alert(data.pesan);
        }
    })
    .catch(error => console.error('Error loading Home data:', error));
}

// Load guru data with pagination for Atur Kode
function loadGuruManage(page = 1, limit = 10, filter = 'all') {
    const offset = (page - 1) * limit;
    fetch(`/admin/get_guru?page=${page}&limit=${limit}&offset=${offset}&status=${filter}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        console.log('Manage data:', data);
        if (data.status === 'sukses') {
            const table = document.getElementById('manageTable');
            const tbody = table.getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            data.guru.forEach(guru => {
                const tr = document.createElement('tr');
                const status = new Date(guru.kadaluarsa) > new Date() ? 'aktif' : 'nonaktif';
                const maskedCode = guru.kode_akses.slice(0, 2) + '*'.repeat(guru.kode_akses.length - 2);
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
            setupPaginationManage(data.total, page, limit, filter);
        } else {
            alert(data.pesan);
        }
    })
    .catch(error => console.error('Error loading Manage data:', error));
}

// Search and filter functionality for Home
function setupSearchAndFilterHome() {
    const searchBar = document.getElementById('guruSearch');
    const statusFilter = document.getElementById('statusFilter');
    let debounceTimeout;

    searchBar.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadGuruHome(1, 10, statusFilter.value);
        }, 300);
    });

    statusFilter.addEventListener('change', () => {
        loadGuruHome(1, 10, statusFilter.value);
    });
}

// Search and filter functionality for Atur Kode
function setupSearchAndFilterManage() {
    const searchBar = document.getElementById('manageSearch');
    const statusFilter = document.getElementById('manageStatusFilter');
    let debounceTimeout;

    searchBar.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadGuruManage(1, 10, statusFilter.value);
        }, 300);
    });

    statusFilter.addEventListener('change', () => {
        loadGuruManage(1, 10, statusFilter.value);
    });
}

// Toggle switch functionality for Home
function setupToggleSwitchesHome() {
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const nama = this.getAttribute('data-nama');
            const kode = this.getAttribute('data-kode');
            const kadaluarsa = this.getAttribute('data-kadaluarsa');
            const newStatus = this.checked ? 'aktif' : 'nonaktif';
            fetch('/admin/toggle_guru_status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nama, kode_akses: kode, kadaluarsa, status: newStatus })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Toggle status response:', data);
                if (data.status !== 'sukses') alert(data.pesan);
                else loadGuruHome(1, 10, document.getElementById('statusFilter').value);
            })
            .catch(error => console.error('Error toggling status:', error));
        });
    });
}

// Pagination for Home
function setupPaginationHome(totalItems, currentPage, limit, filter) {
    const pagination = document.getElementById('pagination-home');
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / limit);

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => loadGuruHome(currentPage - 1, limit, filter);
        pagination.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage;
            pageButton.onclick = () => loadGuruHome(i, limit, filter);
            pagination.appendChild(pageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => loadGuruHome(currentPage + 1, limit, filter);
        pagination.appendChild(nextButton);
    }
}

// Pagination for Atur Kode
function setupPaginationManage(totalItems, currentPage, limit, filter) {
    const pagination = document.getElementById('pagination-manage');
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / limit);

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => loadGuruManage(currentPage - 1, limit, filter);
        pagination.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage;
            pageButton.onclick = () => loadGuruManage(i, limit, filter);
            pagination.appendChild(pageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => loadGuruManage(currentPage + 1, limit, filter);
        pagination.appendChild(nextButton);
    }
}

// Edit popup for Atur Kode
function openEditPopup(nama, kode, kadaluarsa) {
    const popup = document.getElementById('editPopup');
    const editKode = document.getElementById('editKode');
    const editKadaluarsa = document.getElementById('editKadaluarsa');
    if (popup && editKode && editKadaluarsa) {
        document.getElementById('editNama').value = nama;
        editKode.value = kode;
        editKadaluarsa.value = kadaluarsa;
        popup.classList.remove('hidden');
        editKode.addEventListener('input', function() {
            if (editKode.value !== kode) editKadaluarsa.required = true;
            else editKadaluarsa.required = false;
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
    kadaluarsaError.style.display = kadaluarsaValid ? 'none' : 'block';

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

        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode)) {
            alert('Kode akses minimal 8 karakter dan harus berisi huruf serta angka.');
            return;
        }
        if (kadaluarsa && new Date(kadaluarsa) <= new Date()) {
            alert('Kadaluarsa harus di masa depan.');
            return;
        }

        fetch('/admin/update_guru', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nama, kode_akses: kode, kadaluarsa })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Update response:', data);
            if (data.status === 'sukses') {
                alert(data.pesan);
                closePopup();
                loadGuruManage(1, 10, document.getElementById('manageStatusFilter').value);
            } else {
                alert(data.pesan);
            }
        })
        .catch(error => console.error('Error updating guru:', error));
    });
}

// Form validation for Buat Akun Guru
function setupCreateAccountForm() {
    console.log('Setup Create Account Form initialized');
    const form = document.getElementById('createAccountForm');
    if (!form) {
        console.error('Form not found');
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
        console.error('One or more form elements not found:', { nama, kode, kadaluarsa, submitBtn, namaError, kodeError, kadaluarsaError, togglePassword, successPopup, pageLoadingOverlay });
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
    console.log('Form submitted');
    if (!submitBtn.disabled) {
        submitText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
        submitBtn.disabled = true;

        fetch('/admin/add_guru', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nama: nama.value, kode_akses: kode.value, kadaluarsa: kadaluarsa.value })
        })
        .then(response => {
            console.log('Fetch response:', response);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Fetch data:', data);
            submitText.style.display = 'inline';
            loadingSpinner.style.display = 'none';
            submitBtn.disabled = false;
            if (successPopup && pageLoadingOverlay) { // Tambah pengecekan eksplisit
                successPopup.classList.remove('hidden');
                if (data.status === 'sukses') {
                    successPopup.querySelector('h3').textContent = 'Sukses';
                    successPopup.querySelector('p').textContent = 'Akun guru berhasil dibuat';
                    const closeBtn = successPopup.querySelector('button');
                    closeBtn.onclick = () => {
                        successPopup.classList.add('hidden');
                        pageLoadingOverlay.classList.remove('hidden');
                        setTimeout(() => {
                            window.location.href = '/admin/adminDashboard';
                        }, 1000);
                    };
                } else {
                    successPopup.querySelector('h3').textContent = 'Gagal';
                    successPopup.querySelector('p').textContent = data.pesan || 'Terjadi kesalahan';
                    const closeBtn = successPopup.querySelector('button');
                    closeBtn.onclick = () => {
                        successPopup.classList.add('hidden');
                    };
                }
            } else {
                console.error('Popup elements not found:', { successPopup, pageLoadingOverlay });
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            submitText.style.display = 'inline';
            loadingSpinner.style.display = 'none';
            submitBtn.disabled = false;
            if (successPopup) {
                successPopup.classList.remove('hidden');
                successPopup.querySelector('h3').textContent = 'Gagal';
                successPopup.querySelector('p').textContent = 'Terjadi kesalahan saat menyimpan data';
                const closeBtn = successPopup.querySelector('button');
                closeBtn.onclick = () => {
                    successPopup.classList.add('hidden');
                };
            } else {
                console.error('Success popup not found');
            }
        });
    }
});

    // Inisialisasi tanpa validasi awal
    submitBtn.disabled = true;
}

// Logout functionality
function confirmLogout() {
    console.log('Confirm logout called');
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        logoutPopup.classList.remove('hidden');
        console.log('Logout popup displayed');
    } else {
        console.error('Logout popup not found');
    }
}

function closePopup() {
    document.querySelectorAll('.popup').forEach(popup => popup.classList.add('hidden'));
}

function performLogout() {
    window.location.href = '/admin/logout';
}

// Toggle dropdown on click
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

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const isClickInside = e.target.closest('.dropdown');
        if (!isClickInside) {
            document.querySelectorAll('.dropdown-content').forEach(content => content.style.display = 'none');
        }
    });
}

// Load initial data
window.onload = () => {
    console.log('Window loaded');
    if (document.getElementById('home-section')) {
        loadGuruHome(1, 10, 'all');
        setupSearchAndFilterHome();
    }
    if (document.getElementById('manageTable')) {
        loadGuruManage(1, 10, 'all');
        setupSearchAndFilterManage();
        setupEditForm();
        const editKode = document.getElementById('editKode');
        if (editKode) editKode.addEventListener('input', validateEditForm);
    }
    if (document.getElementById('createAccountForm')) {
        setupCreateAccountForm();
    }
    setupDropdownToggle();

    // Add logout event listener with logging
    const logoutLinks = document.querySelectorAll('.logout');
    console.log('Logout links found:', logoutLinks.length);
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            console.log('Logout clicked');
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