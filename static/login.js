function closeLoginPopup(popupId) {
    document.getElementById(popupId).style.display = "none";
}

document.getElementById("guruBtn").onclick = function() {
    console.log("Tombol Guru diklik"); // Tambahan untuk debugging
    document.getElementById("guruLoginPopup").style.display = "flex";
}

window.onclick = function(event) {
    var popup = document.getElementById("guruLoginPopup");
    if (event.target == popup) closeLoginPopup("guruLoginPopup");
    var adminPopup = document.getElementById("adminLoginPopup");
    if (event.target == adminPopup) closeLoginPopup("adminLoginPopup");
    var popupForm = document.getElementById("popupForm");
    if (event.target == popupForm) {
        closeLoginPopup("popupForm");
        var namaInput = document.getElementById("namaSiswa");
        var kelasSelect = document.getElementById("kelasSiswa");
        namaInput.value = '';
        kelasSelect.value = '';
    }
    var instruksiPopup = document.getElementById("instruksiPopup");
    if (event.target == instruksiPopup) closeLoginPopup("instruksiPopup");
}

function loginGuru() {
    var nama = document.getElementById("guruNama").value;
    var kode = document.getElementById("guruKode").value;
    fetch('/login/guru', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({nama: nama, kode_akses: kode})
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sukses') {
            window.location.href = '/guru/dashboard';
        } else {
            showCustomAlert(data.pesan);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showCustomAlert('Terjadi kesalahan saat login.');
    });
}

function loginAdmin() {
    var username = document.getElementById("adminUsername").value;
    var password = document.getElementById("adminPassword").value;
    fetch('/login/admin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: username, password: password})
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'sukses') {
            window.location.href = '/admin/adminDashboard';
        } else {
            showCustomAlert(data.pesan);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showCustomAlert('Terjadi kesalahan saat login.');
    });
}