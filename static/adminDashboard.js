// Update datetime real-time
function updateDatetime() {
    const now = new Date();
    const datetime = document.getElementById('datetime');
    datetime.textContent = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    .catch(error => console.error('Error:', error));
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
                    <td>${guru.updated_at || 'N/A'}</td>
                    <td><button class="action-btn" onclick="openEditPopup('${guru.nama}', '${guru.kode_akses}', '${guru.kadaluarsa}')">Edit</button></td>
                `;
                tbody.appendChild(tr);
            });
            setupPaginationManage(data.total, page, limit, filter);
        } else {
            alert(data.pesan);
        }
    })
    .catch(error => console.error('Error:', error));
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
            fetch('/admin/update_status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nama, kode_akses: kode, kadaluarsa, status: newStatus })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status !== 'sukses') alert(data.pesan);
                else loadGuruHome(1, 10, document.getElementById('statusFilter').value);
            })
            .catch(error => console.error('Error:', error));
        });
    });
}

// Pagination for Home
function setupPaginationHome(totalItems, currentPage, limit, filter) {
    const pagination = document.getElementById('pagination-home');
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

function validateEditForm() {
    const kode = document.getElementById('editKode');
    const kadaluarsa = document.getElementById('editKadaluarsa');
    const kodeValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value);
    const kadaluarsaValid = !kadaluarsa.required || (kadaluarsa.value && new Date(kadaluarsa.value) > new Date());
    document.querySelector('#editForm button[type="submit"]').disabled = !(kodeValid && kadaluarsaValid);
    if (!kodeValid) kode.style.borderColor = '#F56565';
    else kode.style.borderColor = '#EDF2F7';
    if (kadaluarsa.required && !kadaluarsaValid) kadaluarsa.style.borderColor = '#F56565';
    else kadaluarsa.style.borderColor = '#EDF2F7';
}

document.getElementById('editForm').addEventListener('submit', function(e) {
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
        if (data.status === 'sukses') {
            alert(data.pesan);
            closePopup();
            loadGuruManage(1, 10, document.getElementById('manageStatusFilter').value);
        } else {
            alert(data.pesan);
        }
    })
    .catch(error => console.error('Error:', error));
});

// Logout functionality
function confirmLogout() {
    window.location.href = '{{ url_for("halaman_utama") }}';
}

function closePopup() {
    document.querySelectorAll('.popup').forEach(popup => popup.classList.add('hidden'));
    if (document.getElementById('editPopup').classList.contains('hidden')) {
        document.getElementById('editKode').removeEventListener('input', validateEditForm);
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        if (item.classList.contains('logout')) {
            document.getElementById('logoutPopup').classList.remove('hidden');
        }
    });
});

// Load initial data for Home
window.onload = () => {
    if (document.getElementById('home-section')) {
        loadGuruHome(1, 10, 'all');
        setupSearchAndFilterHome();
    }
    if (document.getElementById('manageTable')) {
        loadGuruManage(1, 10, 'all');
        setupSearchAndFilterManage();
    }
    if (document.getElementById('createAccountForm')) {
        setupCreateAccountForm();
    }
};

// ... (kode sebelumnya tetap sama hingga window.onload)

// Form validation for Buat Akun Guru
function setupCreateAccountForm() {
    const form = document.getElementById('createAccountForm');
    if (!form) return;

    const nama = document.getElementById('guruNama');
    const kode = document.getElementById('guruKode');
    const kadaluarsa = document.getElementById('guruKadaluarsa');
    const submitBtn = document.getElementById('submitBtn');
    const namaError = document.getElementById('namaError');
    const kodeError = document.getElementById('kodeError');
    const kadaluarsaError = document.getElementById('kadaluarsaError');
    const togglePassword = document.getElementById('togglePassword');

    if (!nama || !kode || !kadaluarsa || !submitBtn || !namaError || !kodeError || !kadaluarsaError || !togglePassword) {
        console.error('Salah satu elemen form tidak ditemukan');
        return;
    }

    function validateForm() {
        const kodeValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value);
        const kadaluarsaValid = kadaluarsa.value && new Date(kadaluarsa.value) > new Date();
        const isValid = nama.value.trim() && kodeValid && kadaluarsaValid;

        submitBtn.disabled = !isValid;

        namaError.textContent = nama.value.trim() ? '' : 'Nama wajib diisi';
        kodeError.textContent = kodeValid ? '' : 'Kode akses minimal 8 karakter dan harus berisi huruf serta angka';
        kadaluarsaError.textContent = kadaluarsaValid ? '' : 'Kadaluarsa harus di masa depan';

        nama.style.borderColor = nama.value.trim() ? '#EDF2F7' : '#F56565';
        kode.style.borderColor = kodeValid ? '#EDF2F7' : '#F56565';
        kadaluarsa.style.borderColor = kadaluarsaValid ? '#EDF2F7' : '#F56565';
    }

    togglePassword.addEventListener('click', function() {
        const type = kode.getAttribute('type') === 'password' ? 'text' : 'password';
        kode.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁️' : '🙈';
        this.style.transform = type === 'password' ? 'scale(1)' : 'scale(1.1)';
        this.style.opacity = type === 'password' ? '1' : '0.8';
    });

    [nama, kode, kadaluarsa].forEach(input => {
        input.addEventListener('input', validateForm);
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!submitBtn.disabled) {
            fetch('/admin/add_guru', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nama: nama.value, kode_akses: kode.value, kadaluarsa: kadaluarsa.value })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.pesan);
                if (data.status === 'sukses') form.reset();
                validateForm();
            })
            .catch(error => console.error('Error:', error));
        }
    });

    validateForm();
}

// Edit popup for Atur Kode
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
            if (data.status === 'sukses') {
                alert(data.pesan);
                closePopup();
                loadGuruManage(1, 10, document.getElementById('manageStatusFilter').value);
            } else {
                alert(data.pesan);
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

function validateEditForm() {
    const kode = document.getElementById('editKode');
    const kadaluarsa = document.getElementById('editKadaluarsa');
    if (!kode || !kadaluarsa) return;

    const kodeValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(kode.value);
    const kadaluarsaValid = !kadaluarsa.required || (kadaluarsa.value && new Date(kadaluarsa.value) > new Date());
    const submitBtn = editForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = !(kodeValid && kadaluarsaValid);

    if (!kodeValid) kode.style.borderColor = '#F56565';
    else kode.style.borderColor = '#EDF2F7';
    if (kadaluarsa.required && !kadaluarsaValid) kadaluarsa.style.borderColor = '#F56565';
    else kadaluarsa.style.borderColor = '#EDF2F7';
}

// Logout functionality
function confirmLogout() {
    window.location.href = '{{ url_for("halaman_utama") }}';
}

function closePopup() {
    document.querySelectorAll('.popup').forEach(popup => popup.classList.add('hidden'));
    const editPopup = document.getElementById('editPopup');
    if (editPopup && editPopup.classList.contains('hidden')) {
        const editKode = document.getElementById('editKode');
        if (editKode) editKode.removeEventListener('input', validateEditForm);
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        if (item.classList.contains('logout')) {
            const popup = document.getElementById('logoutPopup');
            if (popup) {
                popup.classList.remove('hidden');
            } else {
                console.error('Popup logout tidak ditemukan');
            }
        }
    });
});

// Load initial data
window.onload = () => {
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
};