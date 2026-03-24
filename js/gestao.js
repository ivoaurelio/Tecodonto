// js/gestao.js
document.addEventListener('DOMContentLoaded', () => {
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');

    // Customize title with clinic
    const clinicNameDisplay = document.getElementById('clinic-name-display');
    if (clinicNameDisplay && userName && userName !== 'MESTRE') {
        clinicNameDisplay.innerHTML = `Equipe (${userName.toUpperCase()})`;
    }

    const equipeList = document.getElementById('equipeList');
    const clinicasList = document.getElementById('clinicasList');

    function carregarEquipe() {
        if (equipeList) {
            let endpoint = `usuarios?user_name=eq.${encodeURIComponent(userName)}&select=*`;
            if (userRole === 'Super Administrador') {
                endpoint = `usuarios?select=*&order=user_name.asc`; // MESTRE ve todas as clinicas
            }

            window.supabaseFetch(endpoint)
                .then(data => {
                    if (data.length === 0) {
                        equipeList.innerHTML = '<p class="empty-state">Nenhum membro da equipe encontrado além dos administradores principais.</p>';
                    } else {
                        let html = '<table class="assets-table" style="width: 100%; min-width: 900px; font-size: 0.85rem;"><thead><tr><th style="width: 100px; text-align: center;">Ações</th><th style="text-align: left !important;">Clínica Vinculada</th><th style="min-width: 150px; text-align: left !important;">Nome</th><th>Função</th><th style="min-width: 180px; text-align: left !important;">E-mail</th><th>Status</th><th>Criado em</th></tr></thead><tbody>';
                        data.forEach(membro => {
                            const dataCriacao = new Date(membro.created_at).toLocaleDateString('pt-BR');
                            const statusBadge = membro.ativo ? '<span style="color: #059669; background: #d1fae5; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Ativo</span>' : '<span style="color: #dc2626; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Inativo</span>';
                            
                            const btnEdit = `<button class="btn-edit" onclick="editarUsuario('${membro.email}', '${membro.nome}', '${membro.nivel}', '${membro.user_name}')" style="color:#0284c7; background:transparent; border:none; cursor:pointer; margin-right:8px;" title="Editar Usuário"><i class="fa-solid fa-pen"></i></button>`;
                            const btnDel = `<button class="btn-delete" onclick="deletarUsuario('${membro.email}')" style="color:#ef4444; background:transparent; border:none; cursor:pointer;" title="Deletar Usuário"><i class="fa-solid fa-trash"></i></button>`;

                            html += `<tr>
                                        <td style="text-align: center;">${btnEdit}${btnDel}</td>
                                        <td><strong>${membro.user_name}</strong></td>
                                        <td>${membro.nome}</td>
                                        <td><span class="criticality-badge" style="background:#e0f2fe; color:#0369a1;">${membro.nivel}</span></td>
                                        <td>${membro.email}</td>
                                        <td>${statusBadge}</td>
                                        <td>${dataCriacao}</td>
                                     </tr>`;
                        });
                        html += '</tbody></table>';
                        equipeList.innerHTML = html;
                    }
                })
                .catch(err => equipeList.innerHTML = '<p class="empty-state">Erro ao carregar a equipe.</p>');
        }
    }

    function carregarClinicas() {
        if (clinicasList && userRole === 'Super Administrador') {
            window.supabaseFetch(`clinicas?select=*&order=created_at.desc`)
                .then(data => {
                    if(data.length === 0) {
                        clinicasList.innerHTML = '<p class="empty-state">Nenhuma clínica cadastrada.</p>';
                    } else {
                        let html = '<table class="assets-table" style="width: 100%; font-size: 0.9rem;"><thead><tr><th style="width: 100px; text-align: center;">Ações</th><th style="width: 60px; text-align: center;">Logo</th><th style="text-align: left !important;">ID de Acesso</th><th style="text-align: left !important;">Nome Comercial</th><th style="text-align: center;">Data de Cadastro</th></tr></thead><tbody>';
                        data.forEach(c => {
                            const dataCriacao = new Date(c.created_at).toLocaleDateString('pt-BR');
                            const logoHtml = c.logo ? `<img src="data:image/webp;base64,${c.logo}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1;">` : `<div style="width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8;"><i class="fa-solid fa-image"></i></div>`;
                            
                            const btnEdit = `<button class="btn-edit" onclick="editarClinica('${c.user_name}', '${c.nome}', '${c.logo || ''}')" style="color:#0284c7; background:transparent; border:none; cursor:pointer; font-size: 1.1rem; margin-right:8px;" title="Editar Clínica"><i class="fa-solid fa-pen"></i></button>`;
                            const btnDel = `<button class="btn-delete" onclick="deletarClinica('${c.user_name}')" style="color:#ef4444; background:transparent; border:none; cursor:pointer; font-size: 1.1rem;" title="Deletar Clínica"><i class="fa-solid fa-trash"></i></button>`;

                            html += `<tr>
                                        <td style="text-align: center;">${btnEdit}${btnDel}</td>
                                        <td style="text-align: center;">${logoHtml}</td>
                                        <td style="text-align: left !important;"><strong>${c.user_name}</strong></td>
                                        <td style="text-align: left !important;">${c.nome}</td>
                                        <td style="text-align: center;">${dataCriacao}</td>
                                     </tr>`;
                        });
                        html += '</tbody></table>';
                        clinicasList.innerHTML = html;
                    }
                })
                .catch(err => {
                    clinicasList.innerHTML = '<p style="color:red">Erro de conexão.</p>';
                });
        }
    }
    
    function carregarErros() {
        const errorLogsList = document.getElementById('errorLogsList');
        if (errorLogsList && userRole === 'Super Administrador') {
            window.supabaseFetch(`error_logs?select=*&order=created_at.desc&limit=50`)
                .then(data => {
                    if(data.length === 0) {
                        errorLogsList.innerHTML = '<p class="empty-state">Sistema estável. Nenhum erro registrado.</p>';
                    } else {
                        let html = '<table class="assets-table" style="width: 100%; min-width: 900px; font-size: 0.85rem;"><thead><tr><th style="width:140px; text-align:left !important;">Data/Hora</th><th style="text-align:left !important;">Usuário</th><th style="text-align:left !important;">Tabela/Endpoint</th><th style="text-align:center !important; width:80px;">Ação</th><th style="text-align:left !important;">Falha Registrada</th></tr></thead><tbody>';
                        data.forEach(e => {
                            const dataErro = new Date(e.created_at).toLocaleString('pt-BR');
                            let colorType = '#f59e0b';
                            if (e.metodo === 'DELETE') colorType = '#ef4444';
                            if (e.metodo === 'GET') colorType = '#0ea5e9';
                            if (e.metodo === 'POST') colorType = '#10b981';

                            html += `<tr>
                                        <td>${dataErro}</td>
                                        <td><strong>${e.user_name || 'Desconhecido'}</strong></td>
                                        <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem; border:1px solid #cbd5e1;">/${e.endpoint}</code></td>
                                        <td style="text-align:center;"><span style="font-weight:bold; color:${colorType}; background:${colorType}15; padding:2px 6px; border-radius:4px;">${e.metodo}</span></td>
                                        <td style="color:#ef4444; max-width:400px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title='${e.mensagem_erro.replace(/'/g, "&#39;")}'>${e.mensagem_erro}</td>
                                     </tr>`;
                        });
                        html += '</tbody></table>';
                        errorLogsList.innerHTML = html;
                    }
                })
                .catch(err => {
                    errorLogsList.innerHTML = '<p style="color:#ef4444; text-align:center;">Erro ao se conectar em modo silencioso à tabela de Logs.</p>';
                });
        }
    }

    // Inicializar carregamento
    carregarClinicas();
    carregarEquipe();
    carregarErros();
    document.addEventListener('clinicaCadastrada', carregarClinicas);
    document.addEventListener('membroCadastrado', carregarEquipe);
    document.addEventListener('erroRegistrado', carregarErros);

    // Sistema de Modal Customizado
    function mostrarConfirmacao(mensagem, isCritical, callbackConfirmar) {
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
    }

    function mostrarAlerta(mensagem, isSuccess, callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff; padding:2rem; border-radius:16px; max-width:400px; width:90%; text-align:center;';

        const text = document.createElement('p');
        text.innerText = mensagem;
        text.style.color = '#1e293b';
        text.style.fontSize = '1.1rem';
        text.style.marginBottom = '1.5rem';

        const btnOk = document.createElement('button');
        btnOk.innerText = 'OK';
        btnOk.className = 'btn';
        btnOk.style.cssText = `background:${isSuccess ? '#10b981' : '#ef4444'}; color:#fff; cursor:pointer; border:none; padding:0.6rem 2rem; border-radius:8px; font-weight:600;`;
        btnOk.onclick = () => {
            document.body.removeChild(overlay);
            if(callback) callback();
        };

        modal.append(text, btnOk);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    window.deletarUsuario = function(email) {
        mostrarConfirmacao(`Tem certeza que deseja excluir permanentemente o acesso de ${email}?`, false, () => {
            enviarDelecao('DeletarUsuario', 'email', email);
        });
    };

    window.deletarClinica = function(clinicaId) {
        mostrarConfirmacao(`⚠️ ATENÇÃO EXTREMA ⚠️\n\nTem certeza que deseja DELETAR a clínica "${clinicaId}" e todos os seus usuários?\nEsta ação é irreversível!`, true, () => {
            enviarDelecao('DeletarClinica', 'user_name_alvo', clinicaId);
        });
    };

    window.editarUsuario = function(email, nome, nivel, targetClinic) {
        document.getElementById('userEmail').value = email;
        document.getElementById('userEmail').disabled = true; // Email is unique ID
        document.getElementById('userName').value = nome;
        document.getElementById('userLevel').value = nivel;
        if (document.getElementById('targetClinic')) document.getElementById('targetClinic').value = targetClinic;
        
        // Remove password requirement on edit
        const pwd = document.getElementById('userPassword');
        if(pwd) {
            pwd.required = false;
            pwd.placeholder = "Deixe em branco para manter a senha";
        }
        
        const formUrl = document.getElementById('form-gestao-equipe');
        if(formUrl) {
            formUrl.dataset.editId = email;
            const btn = document.getElementById('submitBtnEquipe');
            if(btn) btn.querySelector('.btn-text').textContent = 'Salvar Alterações';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelarEdicaoUsuario = function() {
        const form = document.getElementById('form-gestao-equipe');
        if (!form) return;
        
        form.reset();
        delete form.dataset.editId;
        
        const emailInput = document.getElementById('userEmail');
        if(emailInput) emailInput.disabled = false;
        
        const pwd = document.getElementById('userPassword');
        if(pwd) {
            pwd.required = true;
            pwd.placeholder = "6 a 8 caracteres";
        }
        
        const btnText = document.querySelector('#form-gestao-equipe .btn-submit .btn-text');
        if(btnText) btnText.textContent = 'Cadastrar Membro';
    };

    window.editarClinica = function(user_name, nome, logoBase64) {
        document.getElementById('newClinicId').value = user_name;
        document.getElementById('newClinicId').disabled = true; // Cannot edit PK
        document.getElementById('newClinicName').value = nome;
        
        if (logoBase64 && logoBase64 !== '') {
            const preview = document.getElementById('logoPreview');
            if (preview) {
                 preview.src = `data:image/webp;base64,${logoBase64}`;
                 preview.style.display = 'block';
                 const logoIcon = document.getElementById('logoPlaceholderIcon');
                 if(logoIcon) logoIcon.style.display = 'none';
                 const hiddenLogo = document.getElementById('hiddenLogoBase64');
                 if(hiddenLogo) hiddenLogo.value = logoBase64;
                 const fileName = document.getElementById('logoFileName');
                 if(fileName) fileName.textContent = 'Imagem prévia carregada';
            }
        }
        
        // Remove requirement for First Admin when editing existing clinic
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        const adminPwd = document.getElementById('adminPassword');
        if(adminName) adminName.required = false;
        if(adminEmail) adminEmail.required = false;
        if(adminPwd) adminPwd.required = false;

        const formUrl = document.getElementById('form-gestao-clinicas');
        if(formUrl) {
            formUrl.dataset.editId = user_name;
            const btn = document.getElementById('submitBtnClinica');
            if(btn) btn.querySelector('.btn-text').textContent = 'Salvar Alterações';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelarEdicaoClinica = function() {
        const form = document.getElementById('form-gestao-clinicas');
        if (!form) return;
        
        form.reset();
        delete form.dataset.editId;
        
        const clinicIdInput = document.getElementById('newClinicId');
        if(clinicIdInput) clinicIdInput.disabled = false;

        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        const adminPwd = document.getElementById('adminPassword');
        if(adminName) adminName.required = true;
        if(adminEmail) adminEmail.required = true;
        if(adminPwd) adminPwd.required = true;
        
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
        
        const btnText = document.getElementById('submitBtnClinica').querySelector('.btn-text');
        if(btnText) btnText.textContent = 'Implantar Clínica';
    };

    function enviarDelecao(formType, paramName, paramValue) {
        let endpoint = '';
        if (formType === 'DeletarUsuario') endpoint = `usuarios?email=eq.${encodeURIComponent(paramValue)}`;
        if (formType === 'DeletarClinica') endpoint = `clinicas?user_name=eq.${encodeURIComponent(paramValue)}`;
        
        window.supabaseFetch(endpoint, { method: 'DELETE' })
            .then(() => {
                mostrarAlerta('Registro excluído com sucesso!', true, () => {
                    if (formType === 'DeletarUsuario') carregarEquipe(); // Reload silently
                    if (formType === 'DeletarClinica') carregarClinicas();
                });
            }).catch(e => mostrarAlerta('Erro ao excluir: ' + e.message, false));
    }
});
