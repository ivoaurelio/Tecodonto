document.addEventListener('DOMContentLoaded', () => {
    // ATENÇÃO: COLOQUE A SUA URL GERADA PELO GOOGLE APPS SCRIPT AQUI!
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzED4U_6fqEidlD2zAjl81W4Z3vyv51XrzfMWhtJfVHZANqg7UCgiscQ1fUTnzdj-KFWA/exec'; 

    const mainForm = document.getElementById('form-cadastro-salas');
    const roomNameInput = document.getElementById('roomName');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');

    if(roomNameInput && charCount) {
        roomNameInput.addEventListener('input', (e) => {
            const currentLength = e.target.value.length;
            charCount.textContent = `${currentLength}/25`;
        });
    }

    const formAtivos = document.getElementById('form-cadastro-ativos');
    const assetType = document.getElementById('assetType');
    const otherAssetGroup = document.getElementById('otherAssetGroup');
    const otherAsset = document.getElementById('otherAsset');
    const submitBtnAtivos = document.getElementById('submitBtnAtivos');
    const formMessageAtivos = document.getElementById('formMessageAtivos');

    // Logic for "Outros" in Ativos
    if (assetType && otherAssetGroup) {
        assetType.addEventListener('change', (e) => {
            if (e.target.value === 'Outros') {
                otherAssetGroup.style.display = 'block';
                otherAsset.setAttribute('required', 'true');
            } else {
                otherAssetGroup.style.display = 'none';
                otherAsset.removeAttribute('required');
                otherAsset.value = '';
            }
        });
    }

    // Dynamic ID and Room Fetching logic for Ativos
    const registeredRoomSelect = document.getElementById('registeredRoom');
    const hiddenRoomType = document.getElementById('hiddenRoomType');
    const hiddenRoomNumber = document.getElementById('hiddenRoomNumber');

    if (registeredRoomSelect) {
        // Fetch rooms from Google Sheets
        const userName = localStorage.getItem('userName') || '';
        fetch(`${scriptURL}?action=getRooms&user_name=${userName}`)
            .then(res => res.json())
            .then(data => {
                registeredRoomSelect.innerHTML = '<option value="" disabled selected>Selecione a sala</option>';
                const roomsList = data.salas ? data.salas : data;
                roomsList.forEach(room => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ type: room.tipo, number: room.numero, name: room.nome });
                    option.textContent = `Sala ${room.numero} - ${room.nome} (${room.tipo})`;
                    registeredRoomSelect.appendChild(option);
                });
            })
            .catch(err => {
                console.error('Error fetching rooms:', err);
                registeredRoomSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar salas. Verifique a conexão.</option>';
            });

        registeredRoomSelect.addEventListener('change', (e) => {
            if (!e.target.value) return;
            try {
                const roomData = JSON.parse(e.target.value);
                hiddenRoomType.value = roomData.type;
                hiddenRoomNumber.value = roomData.number;
            } catch (err) {
                console.error(err);
            }
        });
    }

    // Generic form submit handler
    function setupForm(form, submitBtn, messageEl, callback) {
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            messageEl.style.display = 'none';

            const formData = new FormData(form);
            const data = new URLSearchParams();
            
            for (const pair of formData) {
                // If "Outros" is selected, we replace assetType with the custom value
                if (pair[0] === 'assetType' && pair[1] === 'Outros') {
                    data.append('assetType', formData.get('otherAsset'));
                } else if (pair[0] !== 'otherAsset') { // skip otherAsset as it's already merged
                    data.append(pair[0], pair[1]);
                }
            }

            // A URL agora é definida globalmente no topo do arquivo

            if(scriptURL === 'SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI') {
                setTimeout(() => {
                    showMessage(messageEl, 'Modo Teste visual concluído!', 'success');
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                    form.reset();
                    if(callback) callback();
                }, 1500);
                return;
            }

            fetch(scriptURL, {
                method: 'POST',
                body: data
            })
            .then(response => {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                showMessage(messageEl, 'Cadastrado com sucesso!', 'success');
                form.reset();
                if (otherAssetGroup) otherAssetGroup.style.display = 'none';
                if(callback) callback();
            })
            .catch(error => {
                console.error('Error!', error.message);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                showMessage(messageEl, 'Erro ao cadastrar. Tente novamente.', 'error');
            });
        });
    }

    setupForm(mainForm, submitBtn, formMessage, () => {
        if(charCount) charCount.textContent = '0/25';
    });

    setupForm(formAtivos, submitBtnAtivos, formMessageAtivos, null);

    const formEquipe = document.getElementById('form-gestao-equipe');
    const submitBtnEquipe = document.getElementById('submitBtnEquipe');
    const formMessageEquipe = document.getElementById('formMessageEquipe');
    setupForm(formEquipe, submitBtnEquipe, formMessageEquipe, null);

    const formClinicas = document.getElementById('form-gestao-clinicas');
    const submitBtnClinica = document.getElementById('submitBtnClinica');
    const formMessageClinica = document.getElementById('formMessageClinica');
    setupForm(formClinicas, submitBtnClinica, formMessageClinica, null);

    function showMessage(el, text, type) {
        if(!el) return;
        el.textContent = text;
        el.className = `form-message ${type}`;
        el.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                el.style.display = 'none';
            }, 6000);
        }
    }
});
