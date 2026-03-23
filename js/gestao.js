// js/gestao.js
document.addEventListener('DOMContentLoaded', () => {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzED4U_6fqEidlD2zAjl81W4Z3vyv51XrzfMWhtJfVHZANqg7UCgiscQ1fUTnzdj-KFWA/exec'; 
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    // Customize title with clinic
    const clinicNameDisplay = document.getElementById('clinic-name-display');
    if (clinicNameDisplay && userName && userName !== 'MESTRE') {
        clinicNameDisplay.innerHTML = `Equipe (${userName.toUpperCase()})`;
    }

    const equipeList = document.getElementById('equipeList');
    const clinicasList = document.getElementById('clinicasList');

    if (equipeList) {
        fetch(`${scriptURL}?action=getEquipe&user_name=${userName}`)
            .then(res => res.json())
            .then(data => {
                if (data.length === 0) {
                    equipeList.innerHTML = '<p class="empty-state">Nenhum membro da equipe encontrado além dos administradores principais.</p>';
                } else {
                    let html = '<table class="assets-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Nível</th><th>Ação</th></tr></thead><tbody>';
                    data.forEach(membro => {
                        html += `<tr>
                                    <td>${membro.nome}</td>
                                    <td>${membro.email}</td>
                                    <td><span class="criticality-badge" style="background:#e0f2fe; color:#0369a1;">${membro.nivel}</span></td>
                                    <td><button class="btn-delete" onclick="deletarUsuario('${membro.email}')" style="color:#ef4444; background:transparent; border:none; cursor:pointer;" title="Deletar Usuário"><i class="fa-solid fa-trash"></i></button></td>
                                 </tr>`;
                    });
                    html += '</tbody></table>';
                    equipeList.innerHTML = html;
                }
            })
            .catch(err => equipeList.innerHTML = '<p class="empty-state">Erro ao carregar a equipe.</p>');
    }

    if (clinicasList && userRole === 'Super Administrador') {
        fetch(`${scriptURL}?action=getClinicas`)
            .then(res => res.json())
            .then(data => {
                if(data.length === 0) {
                    clinicasList.innerHTML = '<p class="empty-state">Nenhuma clínica cadastrada.</p>';
                } else {
                    let html = '<table class="assets-table"><thead><tr><th>ID (user_name)</th><th>Nome da Clínica</th><th>Data Cadastro</th><th>Ação</th></tr></thead><tbody>';
                    data.forEach(c => {
                        html += `<tr>
                                    <td><strong>${c.user_name}</strong></td>
                                    <td>${c.nome}</td>
                                    <td>${c.data}</td>
                                    <td><button class="btn-delete" onclick="deletarClinica('${c.user_name}')" style="color:#ef4444; background:transparent; border:none; cursor:pointer;" title="Deletar Clínica"><i class="fa-solid fa-trash"></i></button></td>
                                 </tr>`;
                    });
                    html += '</tbody></table>';
                    clinicasList.innerHTML = html;
                }
            })
            .catch(err => clinicasList.innerHTML = '<p class="empty-state">Erro ao carregar as clínicas.</p>');
    }

    window.deletarUsuario = function(email) {
        if(!confirm(`Tem certeza que deseja excluir permanentemente o acesso de ${email}?`)) return;
        enviarDelecao('DeletarUsuario', 'email', email);
    };

    window.deletarClinica = function(clinicaId) {
        if(!confirm(`⚠️ ATENÇÃO EXTREMA ⚠️\nTem certeza que deseja DELETAR a clínica "${clinicaId}" e t-o-d-o-s os seus usuários administrativos associados?\nEsta ação é irreversível!`)) return;
        enviarDelecao('DeletarClinica', 'user_name_alvo', clinicaId);
    };

    function enviarDelecao(formType, paramName, paramValue) {
        const data = new URLSearchParams();
        data.append('formType', formType);
        data.append(paramName, paramValue);
        data.append('autor_delecao', localStorage.getItem('loggedUser'));

        fetch(scriptURL, { method: 'POST', body: data })
            .then(res => res.json())
            .then(resp => {
                if(resp.result === 'success') {
                    alert('Excluído com sucesso!');
                    window.location.reload();
                } else {
                    alert('Erro ao excluir: ' + (resp.message || 'Falha no servidor.'));
                }
            }).catch(e => alert('Erro de conexão com o servidor.'));
    }
});
