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
        // Fetch rooms from Supabase
        const userName = sessionStorage.getItem('userName') || '';
        window.supabaseFetch(`salas?user_name=eq.${encodeURIComponent(userName)}&select=*&order=numero.asc`)
            .then(data => {
                registeredRoomSelect.innerHTML = '<option value="" disabled selected>Selecione a sala</option>';
                const roomsList = data;
                roomsList.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id; // STORE ROOM UUID
                    option.textContent = `Sala ${room.numero} - ${room.nome} (${room.tipo})`;
                    registeredRoomSelect.appendChild(option);
                });
            })
            .catch(err => {
                console.error('Error fetching rooms:', err);
                registeredRoomSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar salas. Verifique a conexão.</option>';
            });
    }

    // Dynamic Clinic Fetching logic for Team Management (Super Admin only)
    const targetClinicGroup = document.getElementById('targetClinicGroup');
    const targetClinicSelect = document.getElementById('targetClinic');
    if (targetClinicGroup && targetClinicSelect && (sessionStorage.getItem('userName') || '').toUpperCase() === 'MESTRE') {
        targetClinicGroup.style.display = 'block';
        targetClinicSelect.required = true;
        window.supabaseFetch(`clinicas?select=user_name,nome`)
            .then(data => {
                targetClinicSelect.innerHTML = '<option value="">Sua Clínica Logada (MESTRE)</option>';
                data.forEach(clinica => {
                    const sel = document.createElement('option');
                    sel.value = clinica.user_name;
                    sel.textContent = `${clinica.nome} (${clinica.user_name})`;
                    targetClinicSelect.appendChild(sel);
                });
            })
            .catch(err => console.error('Erro ao buscar clínicas para equipe:', err));
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
            const formType = formData.get('formType');
            const userNameVal = sessionStorage.getItem('userName');
            
            let tableName = '';
            let payload = {};

            if (formType === 'CadastroClinica') {
                const clinicPayload = {
                    nome: formData.get('newClinicName')
                };
                // Only include logo if user changed it. If hidden variable exists, keep it.
                const logoInput = formData.get('logoBase64');
                if (logoInput !== null) clinicPayload.logo = logoInput;

                if (form.dataset.editId) {
                    if(SUPABASE_URL.includes('SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI')) return;
                    window.supabaseFetch(`clinicas?user_name=eq.${encodeURIComponent(form.dataset.editId)}`, {
                        method: 'PATCH',
                        body: clinicPayload
                    }).then(() => {
                        submitBtn.classList.remove('loading');
                        submitBtn.disabled = false;
                        showMessage(messageEl, 'Clínica atualizada com sucesso!', 'success');
                        form.reset();
                        delete form.dataset.editId;
                        document.getElementById('newClinicId').disabled = false;
                        submitBtn.querySelector('.btn-text').textContent = 'Implantar Clínica';
                        
                        const logoPreview = document.getElementById('logoPreview');
                        if (logoPreview) { logoPreview.src = ''; logoPreview.style.display = 'none'; }
                        const logoIcon = document.getElementById('logoPlaceholderIcon');
                        if (logoIcon) logoIcon.style.display = 'block';
                        
                        if(callback) callback();
                        document.dispatchEvent(new Event('clinicaCadastrada'));
                    }).catch(error => {
                        console.error('Error!', error.message);
                        submitBtn.classList.remove('loading');
                        submitBtn.disabled = false;
                        showMessage(messageEl, error.message || 'Erro ao atualizar.', 'error');
                    });
                    return;
                }

                // POST logic for Clinic
                clinicPayload.user_name = formData.get('newClinicId');
                
                // Mestre creates clinic + its 1st admin in one click
                const adminPayload = {
                    user_name: clinicPayload.user_name,
                    nome: formData.get('nome'),
                    email: formData.get('email') ? formData.get('email').toLowerCase() : '',
                    senha: formData.get('senha'),
                    nivel: 'Administrador',
                    ativo: true
                };

                if(SUPABASE_URL.includes('SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI')) return;

                window.supabaseFetch('clinicas', { method: 'POST', body: clinicPayload })
                .then(() => {
                    return window.supabaseFetch('usuarios', { method: 'POST', body: adminPayload })
                    .catch(async err => {
                        // Rollback manual: se der erro na criação do usuário, exclua a clínica!
                        await window.supabaseFetch(`clinicas?user_name=eq.${encodeURIComponent(clinicPayload.user_name)}`, { method: 'DELETE' }).catch(() => {});
                        throw err; // Repassa o erro de email para o UI
                    });
                })
                .then(() => {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                    showMessage(messageEl, 'Clínica e Administrador criados com sucesso!', 'success');
                    form.reset();
                    
                    const logoPreview = document.getElementById('logoPreview');
                    const logoPlaceholderIcon = document.getElementById('logoPlaceholderIcon');
                    const logoFileName = document.getElementById('logoFileName');
                    if (logoPreview && logoPlaceholderIcon && logoFileName) {
                        logoPreview.src = '';
                        logoPreview.style.display = 'none';
                        logoPlaceholderIcon.style.display = 'block';
                        logoFileName.textContent = 'Nenhuma imagem selecionada';
                        const hiddenLogoBase64 = document.getElementById('hiddenLogoBase64');
                        if (hiddenLogoBase64) hiddenLogoBase64.value = '';
                    }
                    if(callback) callback();
                    document.dispatchEvent(new Event('clinicaCadastrada'));
                    if (charCount) charCount.textContent = '0/25';
                })
                .catch(error => {
                    console.error('Error!', error.message);
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                    showMessage(messageEl, error.message || 'Erro ao cadastrar. Tente novamente.', 'error');
                });
                
                return; // Early return because we handled custom promise chain
            } else if (formType === 'CadastroUsuario') {
                tableName = 'usuarios';
                const specifiedTarget = formData.get('targetClinic');
                
                payload = {
                    nome: formData.get('nome'),
                    nivel: formData.get('nivel'),
                    ativo: true
                };

                // Only define user_name if a dropdown was explicitly chosen, OR if it's a new insertion
                if (specifiedTarget) {
                    payload.user_name = specifiedTarget;
                } else if (!form.dataset.editId) {
                    payload.user_name = userNameVal;
                }
                
                const pwd = formData.get('senha');
                if (pwd) payload.senha = pwd;
                
                if (!form.dataset.editId) {
                    payload.email = formData.get('email').toLowerCase();
                }
            } else if (formType === 'CadastroSala') {
                tableName = 'salas';
                payload = {
                    user_name: userNameVal,
                    tipo: formData.get('roomType'),
                    nome: formData.get('roomName'),
                    numero: formData.get('roomNumber')
                };
            } else if (formType === 'CadastroAtivo') {
                tableName = 'ativos';
                let tipo = formData.get('assetType');
                if (tipo === 'Outros') tipo = formData.get('otherAsset');
                
                payload = {
                    user_name: userNameVal,
                    sala: formData.get('registeredRoom'), // THE UUID
                    tipo: tipo,
                    modelo: formData.get('brandModel'),
                    numero_serie: formData.get('serialNumber'),
                    criticidade: formData.get('criticality')
                };
            }

            if(SUPABASE_URL.includes('SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI')) return;

            if (formType !== 'CadastroClinica' && tableName) {
                let method = 'POST';
                let endpointSuffix = '';
                
                if (form.dataset.editId) {
                    method = 'PATCH';
                    if (tableName === 'usuarios') {
                        endpointSuffix = `?email=eq.${encodeURIComponent(form.dataset.editId)}`;
                    } else if (tableName === 'salas' || tableName === 'ativos') {
                        endpointSuffix = `?id=eq.${encodeURIComponent(form.dataset.editId)}`;
                    }
                }

                let preRequisitePromise = Promise.resolve();

                if (formType === 'CadastroAtivo' && method === 'POST') {
                    const salaId = payload.sala;
                    preRequisitePromise = window.supabaseFetch(`salas?id=eq.${encodeURIComponent(salaId)}&select=tipo,numero`)
                        .then(salaResult => {
                            if (!salaResult || salaResult.length === 0) throw new Error("Sala não encontrada.");
                            const salaInfo = salaResult[0];
                            let typeChar = 'C';
                            if (salaInfo.tipo === 'Sala de Suporte Clínico') typeChar = 'S';
                            else if (salaInfo.tipo === 'Sala Técnica') typeChar = 'T';

                            return window.supabaseFetch(`ativos?sala=eq.${encodeURIComponent(salaId)}&select=codigo`)
                                .then(ativosResult => {
                                    let maxYY = 0;
                                    (ativosResult || []).forEach(a => {
                                        if (a.codigo && a.codigo.includes('-')) {
                                            const parts = a.codigo.split('-');
                                            const numStr = parts[1]; // xyy
                                            if (numStr && numStr.length >= 2) {
                                                const yyStr = numStr.substring(numStr.length - 2);
                                                const parsedYY = parseInt(yyStr, 10);
                                                if (!isNaN(parsedYY) && parsedYY > maxYY) maxYY = parsedYY;
                                            }
                                        }
                                    });
                                    const nextYY = (maxYY + 1).toString().padStart(2, '0');
                                    payload.codigo = `EQ${typeChar}-${salaInfo.numero}${nextYY}`;
                                });
                        });
                }

                preRequisitePromise.then(() => {
                    return window.supabaseFetch(tableName + endpointSuffix, {
                        method: method,
                        body: payload
                    });
                })
                .then(() => {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                    
                    const actionWord = method === 'PATCH' ? 'atualizado' : 'cadastrado';
                    showMessage(messageEl, `Registro ${actionWord} com sucesso!`, 'success');
                    form.reset();
                    
                    if (form.dataset.editId) {
                        delete form.dataset.editId;
                        if (formType === 'CadastroUsuario') {
                            document.getElementById('userEmail').disabled = false;
                            const pwd = document.getElementById('userPassword');
                            if(pwd) { pwd.required = true; pwd.placeholder = "6 a 8 caracteres"; }
                            submitBtn.querySelector('.btn-text').textContent = 'Cadastrar Membro';
                        }
                    }
                    
                    // Cleanup Custom Logo UI specifically for admin if it exists
                    const logoPreview = document.getElementById('logoPreview');
                    const logoPlaceholderIcon = document.getElementById('logoPlaceholderIcon');
                    const logoFileName = document.getElementById('logoFileName');
                    if (logoPreview && logoPlaceholderIcon && logoFileName) {
                        logoPreview.src = '';
                        logoPreview.style.display = 'none';
                        logoPlaceholderIcon.style.display = 'block';
                        logoFileName.textContent = 'Nenhuma imagem selecionada';
                        const hiddenLogoBase64 = document.getElementById('hiddenLogoBase64');
                        if (hiddenLogoBase64) hiddenLogoBase64.value = '';
                    }
                    
                    if (otherAssetGroup) otherAssetGroup.style.display = 'none';
                    if(callback) callback();

                    if (form.id === 'form-gestao-clinicas') {
                        document.dispatchEvent(new Event('clinicaCadastrada'));
                    } else if (form.id === 'form-gestao-equipe') {
                        document.dispatchEvent(new Event('membroCadastrado'));
                    } else if (form.id === 'form-cadastro-salas') {
                        document.dispatchEvent(new Event('salaCadastrada'));
                    } else if (form.id === 'form-cadastro-ativos') {
                        document.dispatchEvent(new Event('ativoCadastrado'));
                    }
                    if (charCount) { // Check if charCount exists for the current form
                        charCount.textContent = '0/25';
                    }
            })
            .catch(error => {
                console.error('Error!', error.message);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                showMessage(messageEl, error.message || 'Erro ao cadastrar. Tente novamente.', 'error');
            });
            }
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
    // Expose Custom Modals Globally for inline Delete Scripts
    window.mostrarConfirmacaoGlobal = function(mensagem, isCritical, callbackConfirmar) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease-out;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff; padding:2rem; border-radius:16px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); max-width:400px; width:90%; text-align:center;';

        const icon = document.createElement('div');
        icon.innerHTML = isCritical ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-circle-question"></i>';
        icon.style.color = isCritical ? '#ef4444' : '#eab308';
        icon.style.fontSize = '3rem';
        icon.style.marginBottom = '1rem';

        const text = document.createElement('p');
        text.innerText = mensagem;
        text.style.color = '#1e293b';
        text.style.fontSize = '1.1rem';
        text.style.marginBottom = '1.5rem';
        text.style.fontWeight = '500';

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex; gap:1rem; justify-content:center;';

        const btnCancel = document.createElement('button');
        btnCancel.innerText = 'Cancelar';
        btnCancel.className = 'btn';
        btnCancel.style.cssText = 'background:#f1f5f9; color:#475569; padding:0.6rem 1.2rem; cursor:pointer; font-weight:600; border:none; border-radius:8px;';
        btnCancel.onclick = () => document.body.removeChild(overlay);

        const btnConfirm = document.createElement('button');
        btnConfirm.innerText = 'Sim, Excluir';
        btnConfirm.className = 'btn';
        btnConfirm.style.cssText = `background:${isCritical ? '#ef4444' : '#0ea5e9'}; color:#fff; padding:0.6rem 1.2rem; cursor:pointer; font-weight:600; border:none; border-radius:8px;`;
        btnConfirm.onclick = () => {
            document.body.removeChild(overlay);
            callbackConfirmar();
        };

        btnGroup.append(btnCancel, btnConfirm);
        modal.append(icon, text, btnGroup);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    };

    window.mostrarAlertaGlobal = function(mensagem, isSuccess, callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff; padding:2rem; border-radius:16px; max-width:400px; width:90%; text-align:center;';

        const text = document.createElement('p');
        text.innerText = mensagem;
        text.style.color = isSuccess ? '#10b981' : '#ef4444';
        text.style.fontSize = '1.1rem';
        text.style.fontWeight = '600';
        text.style.marginBottom = '1.5rem';

        const btn = document.createElement('button');
        btn.innerText = 'OK';
        btn.className = 'btn';
        btn.style.cssText = 'background:#f1f5f9; color:#475569; padding:0.6rem 1.2rem; cursor:pointer; font-weight:600; border:none; border-radius:8px;';
        btn.onclick = () => {
            document.body.removeChild(overlay);
            if(callback) callback();
        };

        modal.append(text, btn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    };
});
