let soalArray = [];
let currentSoalIndex = 0;
let currentKelas = null;
let currentPaket = null;
let editSoalArray = [];
let editCurrentIndex = 0;
let editFilename = null;
let originalEditSoalArray = [];
let currentHistoryFilename = null;

function showLoadingOverlay() {
    const overlay = document.getElementById('pageLoadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('pageLoadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function closePopup() {
    document.querySelectorAll('.popup').forEach(popup => {
        if (popup.classList.contains('visible')) {
            popup.classList.remove('visible');
            popup.classList.add('hidden');
        }
    });
}

function showSuccessPopup(message) {
    const notificationPopup = document.getElementById('notificationPopup');
    if (notificationPopup) {
        notificationPopup.querySelector('#notificationMessage').textContent = message;
        notificationPopup.classList.remove('hidden');
        notificationPopup.classList.add('visible');
        setTimeout(() => closePopup(), 3000);
    }
}

function showErrorPopup(message) {
    const notificationPopup = document.getElementById('notificationPopup');
    if (notificationPopup) {
        notificationPopup.querySelector('#notificationMessage').textContent = message;
        notificationPopup.classList.remove('hidden');
        notificationPopup.classList.add('visible');
        setTimeout(() => closePopup(), 3000);
    }
}

function validateSoalForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const getInputValue = (id) => {
        const el = form.querySelector(id) || form.querySelector(`[id$="${id.split('#')[1]}"]`);
        return el ? el.value.trim() : '';
    };

    const pertanyaan = getInputValue(`#${formId === 'soalFormTambah' ? 'pertanyaanTambah' : 'pertanyaanEdit'}`);
    const pilihanA = getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanATambah' : 'pilihanAEdit'}`);
    const pilihanB = getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanBTambah' : 'pilihanBEdit'}`);
    const pilihanC = getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanCTambah' : 'pilihanCEdit'}`);
    const pilihanD = getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanDTambah' : 'pilihanDEdit'}`);
    const jawaban = getInputValue(`#${formId === 'soalFormTambah' ? 'jawabanTambah' : 'jawabanEdit'}`);
    const topik = getInputValue(`#${formId === 'soalFormTambah' ? 'topikTambah' : 'topikEdit'}`);
    const kategori = getInputValue(`#${formId === 'soalFormTambah' ? 'kategoriTambah' : 'kategoriEdit'}`);
    const pelajaran = getInputValue(`#${formId === 'soalFormTambah' ? 'pelajaranTambah' : 'pelajaranEdit'}`);
    const tingkatKesulitan = getInputValue(`#${formId === 'soalFormTambah' ? 'tingkatKesulitanTambah' : 'tingkatKesulitanEdit'}`);

    if (!pertanyaan || pertanyaan.length < 5) {
        showErrorPopup('Pertanyaan wajib diisi dan minimal 5 karakter.');
        return false;
    }
    if (!pilihanA || !pilihanB || !pilihanC || !pilihanD) {
        showErrorPopup('Semua pilihan (A, B, C, D) wajib diisi.');
        return false;
    }
    if (![pilihanA, pilihanB, pilihanC, pilihanD].includes(jawaban)) {
        showErrorPopup('Jawaban harus sesuai dengan salah satu pilihan.');
        return false;
    }
    if (!topik || topik.length < 3) {
        showErrorPopup('Topik wajib diisi dan minimal 3 karakter.');
        return false;
    }
    if (!kategori || kategori.length < 3) {
        showErrorPopup('Kategori wajib diisi dan minimal 3 karakter.');
        return false;
    }
    if (!['Matematika', 'IPA', 'Bahasa Indonesia'].includes(pelajaran)) {
        showErrorPopup('Pelajaran harus Matematika, IPA, atau Bahasa Indonesia.');
        return false;
    }
    if (!['mudah', 'sedang', 'sulit'].includes(tingkatKesulitan)) {
        showErrorPopup('Tingkat kesulitan harus Mudah, Sedang, atau Sulit.');
        return false;
    }
    return true;
}

async function showPreviewSoal(index, array) {
    closePopup();
    showLoadingOverlay();
    try {
        const soal = array[index];
        const totalSoal = array.length;
        const previewPopup = document.getElementById('previewPopup');
        const content = document.getElementById('previewContent');
        content.innerHTML = `
            <div class="preview-card">
                <h4>ID: ${soal.id}</h4>
                <p><strong>Pertanyaan:</strong> ${soal.pertanyaan}</p>
                <p><strong>Pilihan:</strong></p>
                <ul>
                    <li>A: ${soal.pilihan[0]}</li>
                    <li>B: ${soal.pilihan[1]}</li>
                    <li>C: ${soal.pilihan[2]}</li>
                    <li>D: ${soal.pilihan[3]}</li>
                </ul>
                <p><strong>Jawaban:</strong> ${soal.jawaban}</p>
                <p><strong>Topik:</strong> ${soal.topik}</p>
                <p><strong>Kategori:</strong> ${soal.kategori}</p>
                <p><strong>Pelajaran:</strong> ${soal.pelajaran}</p>
                <p><strong>Tingkat Kesulitan:</strong> ${soal.tingkat_kesulitan}</p>
            </div>
            <div class="nav-buttons">
                <button id="prevPreview" ${index === 0 ? 'disabled' : ''}>Sebelumnya</button>
                <button id="nextPreview" ${index === totalSoal - 1 ? 'disabled' : ''}>Selanjutnya</button>
                <select id="pilihSoalPreview">
                    ${array.map((_, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>Soal ${i + 1}</option>`).join('')}
                </select>
                <button onclick="closePopup()">Tutup</button>
            </div>
        `;
        previewPopup.classList.remove('hidden');
        previewPopup.classList.add('visible');
        document.getElementById('prevPreview')?.addEventListener('click', () => showPreviewSoal(index - 1, array));
        document.getElementById('nextPreview')?.addEventListener('click', () => showPreviewSoal(index + 1, array));
        document.getElementById('pilihSoalPreview').addEventListener('change', (e) => showPreviewSoal(parseInt(e.target.value), array));
    } catch (error) {
        showErrorPopup('Gagal menampilkan pratinjau');
    } finally {
        hideLoadingOverlay();
    }
}

function saveSoalToArray(formId, array, index, validate = false) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const getInputValue = (id) => {
        const el = form.querySelector(id) || form.querySelector(`[id$="${id.split('#')[1]}"]`);
        return el ? el.value.trim() : '';
    };

    if (validate && !validateSoalForm(formId)) return false;

    const soal = {
        id: formId === 'soalFormTambah' ? 
            `${currentKelas}-${currentPaket}-${(index + 1).toString().padStart(2, '0')}` :
            array[index]?.id || `${editSoalArray[0]?.id.split('-')[0]}-${editFilename.split('_paket')[1].split('.json')[0]}-${(index + 1).toString().padStart(2, '0')}`,
        pertanyaan: getInputValue(`#${formId === 'soalFormTambah' ? 'pertanyaanTambah' : 'pertanyaanEdit'}`),
        pilihan: [
            getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanATambah' : 'pilihanAEdit'}`),
            getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanBTambah' : 'pilihanBEdit'}`),
            getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanCTambah' : 'pilihanCEdit'}`),
            getInputValue(`#${formId === 'soalFormTambah' ? 'pilihanDTambah' : 'pilihanDEdit'}`)
        ],
        jawaban: getInputValue(`#${formId === 'soalFormTambah' ? 'jawabanTambah' : 'jawabanEdit'}`),
        topik: getInputValue(`#${formId === 'soalFormTambah' ? 'topikTambah' : 'topikEdit'}`),
        kategori: getInputValue(`#${formId === 'soalFormTambah' ? 'kategoriTambah' : 'kategoriEdit'}`),
        pelajaran: getInputValue(`#${formId === 'soalFormTambah' ? 'pelajaranTambah' : 'pelajaranEdit'}`),
        tingkat_kesulitan: getInputValue(`#${formId === 'soalFormTambah' ? 'tingkatKesulitanTambah' : 'tingkatKesulitanEdit'}`)
    };

    array[index] = soal;
    return true;
}

async function submitPaket() {
    const expectedSoal = { '3': 15, '4': 18, '5': 21 }[currentKelas];
    if (soalArray.length !== expectedSoal) {
        showErrorPopup(`Paket harus berisi ${expectedSoal} soal. Saat ini: ${soalArray.length} soal.`);
        return;
    }

    showLoadingOverlay();
    try {
        const response = await fetch(`/soal/soal_kelas${currentKelas}_paket${currentPaket}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soal: soalArray })
        });
        const data = await response.json();
        if (data.status === 'sukses') {
            showSuccessPopup('Paket soal berhasil disimpan');
            soalArray = [];
            currentSoalIndex = 0;
            currentKelas = null;
            currentPaket = null;
            const form = document.getElementById('soalFormTambah');
            if (form) form.reset();
            document.getElementById('prevTambah').disabled = true;
            document.getElementById('nextTambah').disabled = true;
            document.getElementById('previewTambah').disabled = true;
            document.getElementById('submitTambah').disabled = true;
            document.getElementById('pilihSoalTambah').disabled = true;
            document.getElementById('soalInfoTambah').textContent = '';
            form.style.display = 'none';
        } else {
            showErrorPopup(data.pesan || 'Gagal menyimpan paket soal');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat menyimpan paket');
    } finally {
        hideLoadingOverlay();
    }
}

async function submitEditPaket() {
    showLoadingOverlay();
    try {
        console.log('Data dikirim:', JSON.stringify({ soal: editSoalArray }));
        const response = await fetch(`/soal/${editFilename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soal: editSoalArray })
        });
        const data = await response.json();
        if (data.status === 'sukses') {
            showSuccessPopup('Paket soal berhasil diperbarui');
            editSoalArray = [];
            editCurrentIndex = 0;
            editFilename = null;
            originalEditSoalArray = [];
            const form = document.getElementById('soalFormEdit');
            if (form) form.reset();
            document.getElementById('prevEdit').disabled = true;
            document.getElementById('nextEdit').disabled = true;
            document.getElementById('previewEdit').disabled = true;
            document.getElementById('submitEdit').disabled = true;
            document.getElementById('pilihSoalEdit').disabled = true;
            document.getElementById('soalInfoEdit').textContent = '';
            form.style.display = 'none';
        } else {
            showErrorPopup(data.pesan || 'Gagal menyimpan perubahan');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat menyimpan perubahan');
    } finally {
        hideLoadingOverlay();
    }
}

async function loadArsipTable(page = 1, search = '', status = '') {
    showLoadingOverlay();
    try {
        const response = await fetch(`/guru/get_arsip_data?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&limit=7`);
        const data = await response.json();
        if (data.status === 'sukses') {
            const tbody = document.querySelector('#arsipTable tbody');
            tbody.innerHTML = '';
            data.packages.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.filename.split('_')[1].replace('kelas', 'Kelas ').replace(/(\d+)/, ' $1')}</td>
                    <td>${item.filename.split('_paket')[1].split('.json')[0]}</td>
                    <td>${item.terakhir_diarsip || '-'}</td>
                    <td>${item.terakhir_diaktif || '-'}</td>
                    <td>${item.diarsipkan_diaktifkan_oleh || '-'}</td>
                    <td class="status-cell ${item.status === 'Aktif' ? 'active' : 'archived'}" data-file="${item.filename}" data-status="${item.status}">
                        ${item.status}
                    </td>
                `;
                tbody.appendChild(row);
            });

            const pagination = document.getElementById('paginationArsip');
            pagination.innerHTML = '';
            for (let i = 1; i <= Math.ceil(data.total / 7); i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = i === page ? 'active' : '';
                btn.addEventListener('click', () => loadArsipTable(i, search, status));
                pagination.appendChild(btn);
            }

            document.querySelectorAll('.status-cell').forEach(cell => {
                cell.addEventListener('click', async () => {
                    const filename = cell.dataset.file;
                    const currentStatus = cell.dataset.status;
                    showLoadingOverlay();
                    try {
                        const response = await fetch('/guru/archive_soal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename })
                        });
                        const data = await response.json();
                        if (data.status === 'sukses') {
                            showSuccessPopup(data.pesan || 'Status berhasil diperbarui');
                            loadArsipTable(page, search, status);
                        } else {
                            showErrorPopup(data.pesan || 'Gagal memperbarui status');
                        }
                    } catch (error) {
                        showErrorPopup('Terjadi kesalahan saat memperbarui status');
                    } finally {
                        hideLoadingOverlay();
                    }
                });
            });

            // Tambahkan event listener untuk klik baris (kecuali kolom status)
            tbody.querySelectorAll('tr').forEach(row => {
                row.addEventListener('click', toggleHistoryPopup);
            });
        } else {
            showErrorPopup(data.pesan || 'Gagal memuat data arsip');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat data arsip');
    } finally {
        hideLoadingOverlay();
    }
}

async function loadHistoryPopup(filename) {
    currentHistoryFilename = filename;
    const historyPopup = document.getElementById('historyPopup');
    if (!historyPopup) return;

    showLoadingOverlay();
    try {
        const search = document.getElementById('historySearch')?.value || '';
        const status = document.getElementById('historyStatusFilter')?.value || 'all';
        const date = document.getElementById('historyDateFilter')?.value || '';
        const page = parseInt(document.getElementById('historyPage')?.value) || 1;

        const response = await fetch(`/guru/get_history?filename=${encodeURIComponent(filename)}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&date=${encodeURIComponent(date)}&page=${page}&limit=10`);
        const data = await response.json();
        if (data.status === 'sukses') {
            const tbody = historyPopup.querySelector('#historyTable tbody');
            tbody.innerHTML = '';
            data.history.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${(page - 1) * 10 + index + 1}</td>
                    <td class="${item.status === 'Aktif' ? 'active' : 'archived'}">${item.status}</td>
                    <td>${item.tanggal}</td>
                    <td>${item.diarsipkan_diaktifkan_oleh || '-'}</td>
                `;
                tbody.appendChild(row);
            });

            const pagination = historyPopup.querySelector('.pagination');
            pagination.innerHTML = '';
            for (let i = 1; i <= Math.ceil(data.total / 10); i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = i === page ? 'active' : '';
                btn.addEventListener('click', () => {
                    document.getElementById('historyPage').value = i;
                    loadHistoryPopup(filename);
                });
                pagination.appendChild(btn);
            }
        } else {
            showErrorPopup(data.pesan || 'Gagal memuat riwayat');
        }
    } catch (error) {
        showErrorPopup('Terjadi kesalahan saat memuat riwayat');
    } finally {
        hideLoadingOverlay();
        historyPopup.classList.remove('hidden');
        historyPopup.classList.add('visible');
    }
}

function toggleHistoryPopup(event) {
    const cell = event.target.closest('td');
    if (cell && cell.classList.contains('status-cell')) return; // Pengecualian untuk kolom status

    const row = event.target.closest('tr');
    if (row) {
        const filename = row.querySelector('.status-cell')?.dataset.file;
        if (filename) {
            closePopup();
            loadHistoryPopup(filename);
        }
    }
}

function enableFormInputs(formId) {
    const inputs = document.querySelectorAll(`#${formId} input`);
    const selects = document.querySelectorAll(`#${formId} select`);
    inputs.forEach(input => input.disabled = false);
    selects.forEach(select => select.disabled = false);
}

function updateNavigationButtons(formId, prevId, nextId, previewId, submitId, selectId, infoId, duplicateId, deleteId, sortId) {
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const previewBtn = document.getElementById(previewId);
    const submitBtn = document.getElementById(submitId);
    const select = document.getElementById(selectId);
    const info = document.getElementById(infoId);
    const duplicateBtn = document.getElementById(duplicateId);
    const deleteBtn = document.getElementById(deleteId);
    const sortBtn = document.getElementById(sortId);
    const expectedSoal = { '3': 15, '4': 18, '5': 21 }[formId === 'soalFormTambah' ? currentKelas : (editSoalArray[0]?.id.split('-')[0] || '4')];
    const totalSoal = formId === 'soalFormTambah' ? currentSoalIndex + 1 : editCurrentIndex + 1;
    const array = formId === 'soalFormTambah' ? soalArray : editSoalArray;
    const currentIndex = formId === 'soalFormTambah' ? currentSoalIndex : editCurrentIndex;

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= (expectedSoal - 1 || array.length - 1);
    if (previewBtn) previewBtn.disabled = !array.every(soal => validateSoalForm(formId));
    if (submitBtn) submitBtn.disabled = formId === 'soalFormEdit' ? !hasChanges() || !array.every(soal => validateSoalForm(formId)) : (formId === 'soalFormTambah' && currentIndex < expectedSoal - 1);
    if (duplicateBtn) duplicateBtn.disabled = formId !== 'soalFormEdit';
    if (deleteBtn) deleteBtn.disabled = formId !== 'soalFormEdit' || array.length <= 1;
    if (sortBtn) sortBtn.disabled = formId !== 'soalFormEdit' || array.length <= 1;
    if (select) select.disabled = false;
    if (info) info.textContent = `${totalSoal} dari ${expectedSoal || array.length}`;
    if (select) {
        select.innerHTML = '';
        for (let i = 0; i < (formId === 'soalFormTambah' ? expectedSoal : array.length); i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Soal ${i + 1}`;
            if (i === currentIndex) option.selected = true;
            select.appendChild(option);
        }
    }
}

function showConfirmPopup(message, onConfirm) {
    const confirmPopup = document.getElementById('confirmPopup');
    if (confirmPopup) {
        confirmPopup.querySelector('#confirmMessage').textContent = message;
        confirmPopup.classList.remove('hidden');
        confirmPopup.classList.add('visible');
        const yesButton = confirmPopup.querySelector('.popup-buttons button:first-child');
        const noButton = confirmPopup.querySelector('.popup-buttons button:last-child');
        yesButton.onclick = () => {
            onConfirm();
            closePopup();
        };
        noButton.onclick = closePopup;
    }
}

function duplicateSoal(formId) {
    const array = formId === 'soalFormTambah' ? soalArray : editSoalArray;
    const currentIndex = formId === 'soalFormTambah' ? currentSoalIndex : editCurrentIndex;
    const newIndex = array.length;
    array.push({ ...array[currentIndex], id: `${array[0].id.split('-')[0]}-${editFilename.split('_paket')[1].split('.json')[0]}-${(newIndex + 1).toString().padStart(2, '0')}` });
    if (formId === 'soalFormEdit') editCurrentIndex = newIndex;
    updateNavigationButtons(formId, 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
    showSuccessPopup('Soal berhasil diduplikasi');
}

function deleteSoal(formId) {
    const array = formId === 'soalFormTambah' ? soalArray : editSoalArray;
    const currentIndex = formId === 'soalFormTambah' ? currentSoalIndex : editCurrentIndex;
    if (array.length > 1) {
        array.splice(currentIndex, 1);
        if (currentIndex >= array.length) editCurrentIndex = array.length - 1;
        const form = document.getElementById(formId);
        const soal = array[editCurrentIndex] || {};
        form.querySelector('#pertanyaanEdit').value = soal.pertanyaan || '';
        form.querySelector('#pilihanAEdit').value = soal.pilihan?.[0] || soal.pilihanA || '';
        form.querySelector('#pilihanBEdit').value = soal.pilihan?.[1] || soal.pilihanB || '';
        form.querySelector('#pilihanCEdit').value = soal.pilihan?.[2] || soal.pilihanC || '';
        form.querySelector('#pilihanDEdit').value = soal.pilihan?.[3] || soal.pilihanD || '';
        form.querySelector('#jawabanEdit').value = soal.jawaban || '';
        form.querySelector('#topikEdit').value = soal.topik || '';
        form.querySelector('#kategoriEdit').value = soal.kategori || '';
        form.querySelector('#pelajaranEdit').value = soal.pelajaran || 'Matematika';
        form.querySelector('#tingkatKesulitanEdit').value = soal.tingkat_kesulitan || soal.tingkatKesulitan || 'mudah';
        updateNavigationButtons(formId, 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
        showSuccessPopup('Soal berhasil dihapus');
    } else {
        showErrorPopup('Minimal harus ada 1 soal');
    }
}

function sortSoal(formId, criteria = 'id') {
    const array = formId === 'soalFormTambah' ? soalArray : editSoalArray;
    array.sort((a, b) => a[criteria].localeCompare(b[criteria]));
    editCurrentIndex = 0;
    const form = document.getElementById(formId);
    const soal = array[0];
    form.querySelector('#pertanyaanEdit').value = soal.pertanyaan || '';
    form.querySelector('#pilihanAEdit').value = soal.pilihan?.[0] || soal.pilihanA || '';
    form.querySelector('#pilihanBEdit').value = soal.pilihan?.[1] || soal.pilihanB || '';
    form.querySelector('#pilihanCEdit').value = soal.pilihan?.[2] || soal.pilihanC || '';
    form.querySelector('#pilihanDEdit').value = soal.pilihan?.[3] || soal.pilihanD || '';
    form.querySelector('#jawabanEdit').value = soal.jawaban || '';
    form.querySelector('#topikEdit').value = soal.topik || '';
    form.querySelector('#kategoriEdit').value = soal.kategori || '';
    form.querySelector('#pelajaranEdit').value = soal.pelajaran || 'Matematika';
    form.querySelector('#tingkatKesulitanEdit').value = soal.tingkat_kesulitan || soal.tingkatKesulitan || 'mudah';
    updateNavigationButtons(formId, 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
    showSuccessPopup(`Soal diurutkan berdasarkan ${criteria}`);
}

function hasChanges() {
    const cleanOriginal = JSON.stringify(originalEditSoalArray).replace(/\s+/g, '');
    const cleanCurrent = JSON.stringify(editSoalArray).replace(/\s+/g, '');
    return cleanCurrent !== cleanOriginal;
}

function addFormListeners(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', () => {
                saveSoalToArray(formId, formId === 'soalFormTambah' ? soalArray : editSoalArray, formId === 'soalFormTambah' ? currentSoalIndex : editCurrentIndex, true);
                updateNavigationButtons(formId, 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
            });
        });
    }
}

function cancelChanges(formId) {
    const currentIndex = formId === 'soalFormTambah' ? currentSoalIndex : editCurrentIndex;
    const array = formId === 'soalFormTambah' ? soalArray : editSoalArray;
    const originalSoal = originalEditSoalArray[currentIndex];
    const form = document.getElementById(formId);
    if (form && originalSoal) {
        form.querySelector('#pertanyaanEdit').value = originalSoal.pertanyaan || '';
        form.querySelector('#pilihanAEdit').value = originalSoal.pilihan?.[0] || originalSoal.pilihanA || '';
        form.querySelector('#pilihanBEdit').value = originalSoal.pilihan?.[1] || originalSoal.pilihanB || '';
        form.querySelector('#pilihanCEdit').value = originalSoal.pilihan?.[2] || originalSoal.pilihanC || '';
        form.querySelector('#pilihanDEdit').value = originalSoal.pilihan?.[3] || originalSoal.pilihanD || '';
        form.querySelector('#jawabanEdit').value = originalSoal.jawaban || '';
        form.querySelector('#topikEdit').value = originalSoal.topik || '';
        form.querySelector('#kategoriEdit').value = originalSoal.kategori || '';
        form.querySelector('#pelajaranEdit').value = originalSoal.pelajaran || 'Matematika';
        form.querySelector('#tingkatKesulitanEdit').value = originalSoal.tingkat_kesulitan || originalSoal.tingkatKesulitan || 'mudah';
        saveSoalToArray(formId, array, currentIndex, true);
        updateNavigationButtons(formId, 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
        showSuccessPopup('Perubahan dibatalkan');
    }
}

window.onload = () => {
    document.querySelectorAll('.sidebar ul a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
            const sectionId = item.getAttribute('data-section') + '-section';
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
                if (sectionId === 'arsip-section') {
                    loadArsipTable(1, '', 'all');
                }
            }
            document.querySelectorAll('.sidebar ul a').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    const defaultSection = document.getElementById('tambah-section');
    if (defaultSection) {
        defaultSection.style.display = 'block';
        document.querySelector('.sidebar ul a[data-section="tambah"]').classList.add('active');
    }

    document.querySelector('.hamburger')?.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('active');
    });

    document.getElementById('okTambah')?.addEventListener('click', async () => {
        currentKelas = document.getElementById('kelasTambah')?.value;
        if (!currentKelas) {
            showErrorPopup('Pilih kelas terlebih dahulu');
            return;
        }
        showLoadingOverlay();
        try {
            const response = await fetch(`/guru/get_last_paket?kelas=${currentKelas}`);
            if (!response.ok) throw new Error('Gagal mengambil nomor paket dari server');
            const data = await response.json();
            console.log('Respons dari server:', data);
            if (data.status === 'sukses' && data.last_paket !== undefined) {
                currentPaket = data.last_paket + 1;
                soalArray = new Array({ '3': 15, '4': 18, '5': 21 }[currentKelas]).fill(null);
                currentSoalIndex = 0;
                const form = document.getElementById('soalFormTambah');
                if (form) {
                    form.style.display = 'block';
                    enableFormInputs('soalFormTambah');
                    form.reset();
                    updateNavigationButtons('soalFormTambah', 'prevTambah', 'nextTambah', 'previewTambah', 'submitTambah', 'pilihSoalTambah', 'soalInfoTambah', null, null, null);
                    addFormListeners('soalFormTambah');
                    document.getElementById('pilihSoalTambah').addEventListener('change', (e) => {
                        currentSoalIndex = parseInt(e.target.value);
                        const soal = soalArray[currentSoalIndex] || {};
                        const form = document.getElementById('soalFormTambah');
                        form.querySelector('#pertanyaanTambah').value = soal.pertanyaan || '';
                        form.querySelector('#pilihanATambah').value = soal.pilihan?.[0] || '';
                        form.querySelector('#pilihanBTambah').value = soal.pilihan?.[1] || '';
                        form.querySelector('#pilihanCTambah').value = soal.pilihan?.[2] || '';
                        form.querySelector('#pilihanDTambah').value = soal.pilihan?.[3] || '';
                        form.querySelector('#jawabanTambah').value = soal.jawaban || '';
                        form.querySelector('#topikTambah').value = soal.topik || '';
                        form.querySelector('#kategoriTambah').value = soal.kategori || '';
                        form.querySelector('#pelajaranTambah').value = soal.pelajaran || 'Matematika';
                        form.querySelector('#tingkatKesulitanTambah').value = soal.tingkat_kesulitan || 'mudah';
                        updateNavigationButtons('soalFormTambah', 'prevTambah', 'nextTambah', 'previewTambah', 'submitTambah', 'pilihSoalTambah', 'soalInfoTambah', null, null, null);
                    });
                    showSuccessPopup('Data paket berhasil dimuat');
                }
            } else {
                showErrorPopup(data.pesan || 'Data respons tidak valid');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorPopup('Terjadi kesalahan saat memuat data. Periksa koneksi atau coba lagi.');
        } finally {
            hideLoadingOverlay();
        }
    });

    document.getElementById('prevTambah')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentSoalIndex > 0) {
            saveSoalToArray('soalFormTambah', soalArray, currentSoalIndex, false);
            currentSoalIndex--;
            const soal = soalArray[currentSoalIndex] || {};
            const form = document.getElementById('soalFormTambah');
            form.querySelector('#pertanyaanTambah').value = soal.pertanyaan || '';
            form.querySelector('#pilihanATambah').value = soal.pilihan?.[0] || '';
            form.querySelector('#pilihanBTambah').value = soal.pilihan?.[1] || '';
            form.querySelector('#pilihanCTambah').value = soal.pilihan?.[2] || '';
            form.querySelector('#pilihanDTambah').value = soal.pilihan?.[3] || '';
            form.querySelector('#jawabanTambah').value = soal.jawaban || '';
            form.querySelector('#topikTambah').value = soal.topik || '';
            form.querySelector('#kategoriTambah').value = soal.kategori || '';
            form.querySelector('#pelajaranTambah').value = soal.pelajaran || 'Matematika';
            form.querySelector('#tingkatKesulitanTambah').value = soal.tingkat_kesulitan || 'mudah';
            updateNavigationButtons('soalFormTambah', 'prevTambah', 'nextTambah', 'previewTambah', 'submitTambah', 'pilihSoalTambah', 'soalInfoTambah', null, null, null);
        }
    });

    document.getElementById('nextTambah')?.addEventListener('click', (e) => {
        e.preventDefault();
        const expectedSoal = { '3': 15, '4': 18, '5': 21 }[currentKelas];
        saveSoalToArray('soalFormTambah', soalArray, currentSoalIndex, false);
        if (currentSoalIndex < expectedSoal - 1) {
            currentSoalIndex++;
            const form = document.getElementById('soalFormTambah');
            const soal = soalArray[currentSoalIndex] || {};
            form.querySelector('#pertanyaanTambah').value = soal.pertanyaan || '';
            form.querySelector('#pilihanATambah').value = soal.pilihan?.[0] || '';
            form.querySelector('#pilihanBTambah').value = soal.pilihan?.[1] || '';
            form.querySelector('#pilihanCTambah').value = soal.pilihan?.[2] || '';
            form.querySelector('#pilihanDTambah').value = soal.pilihan?.[3] || '';
            form.querySelector('#jawabanTambah').value = soal.jawaban || '';
            form.querySelector('#topikTambah').value = soal.topik || '';
            form.querySelector('#kategoriTambah').value = soal.kategori || '';
            form.querySelector('#pelajaranTambah').value = soal.pelajaran || 'Matematika';
            form.querySelector('#tingkatKesulitanTambah').value = soal.tingkat_kesulitan || 'mudah';
            updateNavigationButtons('soalFormTambah', 'prevTambah', 'nextTambah', 'previewTambah', 'submitTambah', 'pilihSoalTambah', 'soalInfoTambah', null, null, null);
        }
    });

    document.getElementById('previewTambah')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (saveSoalToArray('soalFormTambah', soalArray, currentSoalIndex, true)) {
            showPreviewSoal(currentSoalIndex, soalArray);
        }
    });

    document.getElementById('submitTambah')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (saveSoalToArray('soalFormTambah', soalArray, currentSoalIndex, true)) {
            showConfirmPopup('Apakah anda sudah yakin untuk melakukan submit soal?', submitPaket);
        }
    });

    document.getElementById('okEdit')?.addEventListener('click', async () => {
        const paketEdit = document.getElementById('paketEdit')?.value;
        if (!paketEdit) {
            showErrorPopup('Pilih paket terlebih dahulu');
            return;
        }
        showLoadingOverlay();
        try {
            const response = await fetch(`/soal/${paketEdit}`);
            const data = await response.json();
            if (response.ok) {
                editSoalArray = Array.isArray(data) ? data : [];
                if (editSoalArray.length === 0) throw new Error('Data soal kosong');
                editCurrentIndex = 0;
                editFilename = paketEdit;
                originalEditSoalArray = JSON.parse(JSON.stringify(editSoalArray));
                const form = document.getElementById('soalFormEdit');
                const soal = editSoalArray[editCurrentIndex];
                if (form) {
                    form.style.display = 'block';
                    enableFormInputs('soalFormEdit');
                    const inputs = form.querySelectorAll('input, select');
                    inputs.forEach(input => input.value = '');
                    form.querySelector('#pertanyaanEdit').value = soal.pertanyaan || '';
                    form.querySelector('#pilihanAEdit').value = soal.pilihan?.[0] || soal.pilihanA || '';
                    form.querySelector('#pilihanBEdit').value = soal.pilihan?.[1] || soal.pilihanB || '';
                    form.querySelector('#pilihanCEdit').value = soal.pilihan?.[2] || soal.pilihanC || '';
                    form.querySelector('#pilihanDEdit').value = soal.pilihan?.[3] || soal.pilihanD || '';
                    form.querySelector('#jawabanEdit').value = soal.jawaban || '';
                    form.querySelector('#topikEdit').value = soal.topik || '';
                    form.querySelector('#kategoriEdit').value = soal.kategori || '';
                    form.querySelector('#pelajaranEdit').value = soal.pelajaran || 'Matematika';
                    form.querySelector('#tingkatKesulitanEdit').value = soal.tingkat_kesulitan || soal.tingkatKesulitan || 'mudah';
                    updateNavigationButtons('soalFormEdit', 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
                    addFormListeners('soalFormEdit');
                    document.getElementById('pilihSoalEdit').addEventListener('change', (e) => {
                        editCurrentIndex = parseInt(e.target.value);
                        const soal = editSoalArray[editCurrentIndex];
                        const form = document.getElementById('soalFormEdit');
                        form.querySelector('#pertanyaanEdit').value = soal.pertanyaan || '';
                        form.querySelector('#pilihanAEdit').value = soal.pilihan?.[0] || soal.pilihanA || '';
                        form.querySelector('#pilihanBEdit').value = soal.pilihan?.[1] || soal.pilihanB || '';
                        form.querySelector('#pilihanCEdit').value = soal.pilihan?.[2] || soal.pilihanC || '';
                        form.querySelector('#pilihanDEdit').value = soal.pilihan?.[3] || soal.pilihanD || '';
                        form.querySelector('#jawabanEdit').value = soal.jawaban || '';
                        form.querySelector('#topikEdit').value = soal.topik || '';
                        form.querySelector('#kategoriEdit').value = soal.kategori || '';
                        form.querySelector('#pelajaranEdit').value = soal.pelajaran || 'Matematika';
                        form.querySelector('#tingkatKesulitanEdit').value = soal.tingkat_kesulitan || soal.tingkatKesulitan || 'mudah';
                        updateNavigationButtons('soalFormEdit', 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
                    });
                    showSuccessPopup('Data paket berhasil dimuat');
                }
            } else {
                showErrorPopup(data.pesan || 'Gagal memuat soal');
            }
        } catch (error) {
            console.error('Error loading soal:', error);
            showErrorPopup('Terjadi kesalahan saat memuat soal');
        } finally {
            hideLoadingOverlay();
        }
    });

    document.getElementById('prevEdit')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (editCurrentIndex > 0) {
            saveSoalToArray('soalFormEdit', editSoalArray, editCurrentIndex, false);
            editCurrentIndex--;
            const soal = editSoalArray[editCurrentIndex];
            const form = document.getElementById('soalFormEdit');
            form.querySelector('#pertanyaanEdit').value = soal.pertanyaan;
            form.querySelector('#pilihanAEdit').value = soal.pilihan[0] || soal.pilihanA || '';
            form.querySelector('#pilihanBEdit').value = soal.pilihan[1] || soal.pilihanB || '';
            form.querySelector('#pilihanCEdit').value = soal.pilihan[2] || soal.pilihanC || '';
            form.querySelector('#pilihanDEdit').value = soal.pilihan[3] || soal.pilihanD || '';
            form.querySelector('#jawabanEdit').value = soal.jawaban;
            form.querySelector('#topikEdit').value = soal.topik;
            form.querySelector('#kategoriEdit').value = soal.kategori;
            form.querySelector('#pelajaranEdit').value = soal.pelajaran;
            form.querySelector('#tingkatKesulitanEdit').value = soal.tingkat_kesulitan || soal.tingkatKesulitan;
            updateNavigationButtons('soalFormEdit', 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
        }
    });

    document.getElementById('nextEdit')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (editCurrentIndex < editSoalArray.length - 1) {
            saveSoalToArray('soalFormEdit', editSoalArray, editCurrentIndex, false);
            editCurrentIndex++;
            const soal = editSoalArray[editCurrentIndex];
            const form = document.getElementById('soalFormEdit');
            form.querySelector('#pertanyaanEdit').value = soal.pertanyaan;
            form.querySelector('#pilihanAEdit').value = soal.pilihan[0] || soal.pilihanA || '';
            form.querySelector('#pilihanBEdit').value = soal.pilihan[1] || soal.pilihanB || '';
            form.querySelector('#pilihanCEdit').value = soal.pilihan[2] || soal.pilihanC || '';
            form.querySelector('#pilihanDEdit').value = soal.pilihan[3] || soal.pilihanD || '';
            form.querySelector('#jawabanEdit').value = soal.jawaban;
            form.querySelector('#topikEdit').value = soal.topik;
            form.querySelector('#kategoriEdit').value = soal.kategori;
            form.querySelector('#pelajaranEdit').value = soal.pelajaran;
            form.querySelector('#tingkatKesulitanEdit').value = soal.tingkat_kesulitan || soal.tingkatKesulitan;
            updateNavigationButtons('soalFormEdit', 'prevEdit', 'nextEdit', 'previewEdit', 'submitEdit', 'pilihSoalEdit', 'soalInfoEdit', 'duplicateEdit', 'deleteEdit', 'sortEdit');
        }
    });

    document.getElementById('previewEdit')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (saveSoalToArray('soalFormEdit', editSoalArray, editCurrentIndex, true)) {
            showPreviewSoal(editCurrentIndex, editSoalArray);
        }
    });

    document.getElementById('submitEdit')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (saveSoalToArray('soalFormEdit', editSoalArray, editCurrentIndex, true)) {
            showConfirmPopup('Apakah anda sudah yakin untuk melakukan submit soal?', submitEditPaket);
        }
    });

    document.getElementById('cancelChanges')?.addEventListener('click', () => cancelChanges('soalFormEdit'));

    fetch('/soal?list=true')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sukses') {
                const paketEdit = document.getElementById('paketEdit');
                if (paketEdit) {
                    paketEdit.innerHTML = '<option value="">Pilih Paket</option>';
                    data.files.forEach(file => {
                        if (file.match(/^soal_kelas\d+_paket\d+\.json$/)) {
                            const option = document.createElement('option');
                            option.value = file;
                            option.textContent = file;
                            paketEdit.appendChild(option);
                        }
                    });
                }
            }
        })
        .catch(error => showErrorPopup('Gagal memuat daftar paket'));

    document.getElementById('arsipSearch')?.addEventListener('input', debounce(() => {
        const search = document.getElementById('arsipSearch').value;
        const status = document.getElementById('statusFilterArsip').value;
        loadArsipTable(1, search, status);
    }, 300));

    document.getElementById('statusFilterArsip')?.addEventListener('change', () => {
        const search = document.getElementById('arsipSearch').value;
        const status = document.getElementById('statusFilterArsip').value;
        loadArsipTable(1, search, status);
    });

    document.getElementById('arsipSearch')?.addEventListener('input', debounce(() => {
        const search = document.getElementById('arsipSearch').value;
        const status = document.getElementById('statusFilterArsip').value;
        loadArsipTable(1, search, status);
    }, 300));

    document.getElementById('statusFilterArsip')?.addEventListener('change', () => {
        const search = document.getElementById('arsipSearch').value;
        const status = document.getElementById('statusFilterArsip').value;
        loadArsipTable(1, search, status);
    });

    // Tambahkan event listener untuk kontrol di pop-up riwayat
    document.getElementById('historySearch')?.addEventListener('input', debounce(() => {
        loadHistoryPopup(currentHistoryFilename);
    }, 300));
    document.getElementById('historyStatusFilter')?.addEventListener('change', () => {
        loadHistoryPopup(currentHistoryFilename);
    });
    document.getElementById('historyDateFilter')?.addEventListener('change', () => {
        loadHistoryPopup(currentHistoryFilename);
    });
    document.getElementById('closeHistoryPopup')?.addEventListener('click', closePopup);

    document.querySelectorAll('.info-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            closePopup();
            showLoadingOverlay();
            try {
                const nama_guru = document.getElementById('infoNamaGuru');
                const kode_akses = document.getElementById('popupKodeAkses');
                const kadaluarsa = document.getElementById('infoKadaluarsa');
                if (nama_guru && kode_akses && kadaluarsa) {
                    nama_guru.value = nama_guru.getAttribute('data-initial') || nama_guru.value || '';
                    kode_akses.value = kode_akses.getAttribute('data-initial') || kode_akses.value || '';
                    kode_akses.dataset.fullCode = kode_akses.dataset.fullCode || '';
                    kadaluarsa.value = kadaluarsa.getAttribute('data-initial') || kadaluarsa.value || '';

                    if (!nama_guru.value || !kode_akses.value || !kadaluarsa.value) {
                        showErrorPopup('Data informasi belum tersedia. Silakan coba lagi.');
                        return;
                    }

                    const informasiPopup = document.getElementById('informasiPopup');
                    if (informasiPopup) {
                        informasiPopup.classList.remove('hidden');
                        informasiPopup.classList.add('visible');
                        document.getElementById('togglePassword')?.addEventListener('click', () => {
                            const kode = document.getElementById('popupKodeAkses');
                            if (kode) {
                                kode.value = kode.value === kode.getAttribute('data-initial') ? kode.dataset.fullCode : kode.getAttribute('data-initial');
                            }
                        });
                    }
                }
            } catch (error) {
                showErrorPopup('Terjadi kesalahan saat memuat informasi');
            } finally {
                hideLoadingOverlay();
            }
        });
    });

    document.querySelectorAll('.logout').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            closePopup();
            const logoutPopup = document.getElementById('logoutPopup');
            if (logoutPopup) {
                logoutPopup.classList.remove('hidden');
                logoutPopup.classList.add('visible');
                const yesButton = document.querySelector('#logoutPopup .popup-buttons button:first-child');
                const noButton = document.querySelector('#logoutPopup .popup-buttons button:last-child');
                if (yesButton) yesButton.addEventListener('click', () => { window.location.href = '/admin/logout'; });
                if (noButton) noButton.addEventListener('click', closePopup);
            }
        });
    });

    function performLogout() {
        showLoadingOverlay();
        window.location.href = '/admin/logout';
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};