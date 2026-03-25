document.addEventListener('DOMContentLoaded', () => {
    // Garantir que Auth carregou
    const userName = sessionStorage.getItem('userName');
    if (!userName) return; // auth.js fará o redirecionamento

    // Refs Globais da DOM
    const roomSelect = document.getElementById('registeredRoom');
    const assetSelect = document.getElementById('assetSelect');
    const textArea = document.getElementById('serviceDescription');
    const charCount = document.getElementById('charCount');
    const form = document.getElementById('form-registro-manutencao');
    const manutencoesList = document.getElementById('manutencoesList');
    const submitBtn = document.getElementById('submitBtnManutencao');

    // Estado local para Assets
    let clinicAssetsCache = [];
    let roomMapCache = {};
    let assetMapCache = {};

    // 1. Contador de Caracteres Animado
    if (textArea) {
        textArea.addEventListener('input', () => {
            const size = textArea.value.length;
            charCount.textContent = `${size}/200`;
            if (size >= 190) {
                charCount.style.color = '#ef4444';
                charCount.style.fontWeight = 'bold';
            } else {
                charCount.style.color = '#64748b';
                charCount.style.fontWeight = 'normal';
            }
        });
    }

    // 2. Carregamento Inicial (Salas e Todos os Ativos da Clínica)
    function carregarSalasEAtivos() {
        Promise.all([
            window.supabaseFetch(`salas?user_name=eq.${encodeURIComponent(userName)}&select=id,numero,nome`),
            window.supabaseFetch(`ativos?user_name=eq.${encodeURIComponent(userName)}&select=*`)
        ]).then(([salasData, ativosData]) => {
            clinicAssetsCache = ativosData || [];
            
            // Populate Rooms
            let htmlRooms = '<option value="" disabled selected>Selecione a sala</option>';
            const salas = (salasData || []).sort((a,b) => parseInt(a.numero) - parseInt(b.numero));
            
            salas.forEach(sala => {
                const salaNome = sala.nome ? sala.nome : `Sala ${sala.numero}`;
                roomMapCache[sala.id] = salaNome;
                htmlRooms += `<option value="${sala.id}">${sala.numero} - ${salaNome}</option>`;
            });

            if (salas.length === 0) {
                htmlRooms = '<option value="" disabled selected>Nenhuma sala cadastrada. Cadastre primeiro.</option>';
            }

            roomSelect.innerHTML = htmlRooms;

            // Cache Asset Map for history
            clinicAssetsCache.forEach(a => {
                assetMapCache[a.id] = a;
            });

            // Chama histórico
            carregarHistorico();
            
        }).catch(err => {
            console.error("Erro ao puxar dados vitais:", err);
            roomSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar dados.</option>';
        });
    }

    // 3. Listener de Cascade (Sala -> Ativos)
    if (roomSelect && assetSelect) {
        roomSelect.addEventListener('change', () => {
            const salaId = roomSelect.value;
            const ativosDaSala = clinicAssetsCache.filter(a => a.sala === salaId);

            if (ativosDaSala.length === 0) {
                assetSelect.innerHTML = '<option value="" disabled selected>Nenhum ativo nesta sala.</option>';
                assetSelect.disabled = true;
                return;
            }

            let htmlAssets = '<option value="" disabled selected>Selecione o equipamento que sofreu manutenção</option>';
            ativosDaSala.forEach(ativo => {
                const label = `${ativo.tipo} ${ativo.modelo ? ' - ' + ativo.modelo : ''} (${ativo.codigo || 'Sem ID'})`;
                htmlAssets += `<option value="${ativo.id}">${label}</option>`;
            });
            assetSelect.innerHTML = htmlAssets;
            assetSelect.disabled = false;
        });
    }

    // 4. Submit do Formulário
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!assetSelect.value) {
                alert("Por favor, selecione um equipamento válido!");
                return;
            }

            const payload = {
                user_name: userName,
                sala_id: roomSelect.value,
                ativo_id: assetSelect.value,
                tipo: document.getElementById('serviceType').value,
                data_atendimento: document.getElementById('serviceDate').value,
                data_proximo: document.getElementById('nextServiceDate').value,
                descricao: textArea.value
            };

            const loader = submitBtn.querySelector('.loader');
            const icon = submitBtn.querySelector('i');
            
            submitBtn.disabled = true;
            icon.style.display = 'none';
            if (loader) loader.style.display = 'inline-block';

            // ENVIA PARA A NOVA TABELA
            window.supabaseFetch('manutencoes', { method: 'POST', body: payload })
                .then(data => {
                    submitBtn.disabled = false;
                    icon.style.display = 'inline-block';
                    if (loader) loader.style.display = 'none';

                    if (window.mostrarAlertaGlobal) {
                        window.mostrarAlertaGlobal("Registro de Manutenção salvo com sucesso na nuvem!", true);
                    } else {
                        alert("Salvo com sucesso!");
                    }

                    form.reset();
                    assetSelect.innerHTML = '<option value="" disabled selected>Primeiro escolha uma sala acima</option>';
                    assetSelect.disabled = true;
                    if(charCount) charCount.textContent = '0/200';
                    carregarHistorico();
                })
                .catch(err => {
                    submitBtn.disabled = false;
                    icon.style.display = 'inline-block';
                    if (loader) loader.style.display = 'none';
                    if (window.mostrarAlertaGlobal) window.mostrarAlertaGlobal("Falha ao salvar. Verifique se a tabela 'manutencoes' foi criada.", false);
                    console.error("Erro insert manutencao:", err);
                });
        });
    }

    // 5. Histórico Recente
    function carregarHistorico() {
        if (!manutencoesList) return;
        
        window.supabaseFetch(`manutencoes?user_name=eq.${encodeURIComponent(userName)}&order=data_atendimento.desc&limit=20`)
            .then(data => {
                if (!data || data.length === 0) {
                    manutencoesList.innerHTML = '<p class="empty-state">Ainda não há registros de manutenção lançados.</p>';
                    return;
                }

                const hojeHora = new Date().toLocaleString('pt-BR');
                // Fetch Logo dynamically from auth.js injected DOM element
                let hLogo = '';
                const printClinicLogo = document.getElementById('print-clinic-logo');
                if (printClinicLogo && printClinicLogo.src && printClinicLogo.src.length > 10) {
                    hLogo = `<img src="${printClinicLogo.src}" style="max-height: 50px; max-width: 120px; object-fit: contain;">`;
                }
                
                let headerRow = `<tr class="print-row-only" style="border: none !important; display: none;">
                    <th colspan="7" style="border: none !important; padding: 1cm 0 10px 0;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                            ${hLogo}
                            <h2 style="margin: 0; color: #334155; font-size: 1.4rem; font-family: Arial, sans-serif;">Histórico Recente de Manutenções</h2>
                        </div>
                        <div style="display: flex; justify-content: flex-end; align-items: flex-end; color: #64748b; font-size: 0.9rem; font-family: Arial, sans-serif;">
                            <p style="margin: 0;">Gerado em: ${hojeHora}</p>
                        </div>
                        <hr style="margin: 10px 0 0 0; border: 0; border-top: 2px solid #e2e8f0;">
                    </th>
                </tr>`;

                let html = `<div class="table-responsive" style="padding-bottom: 1rem;"><table class="assets-table" style="font-family: Arial, sans-serif; width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        ${headerRow}
                        <tr style="font-size: 11pt; font-weight: bold; text-align: left;">
                            <th style="padding: 0.4rem;">ID</th><th style="padding: 0.4rem;">Ativo</th><th style="padding: 0.4rem;">Local</th><th style="padding: 0.4rem;">Tipo</th><th style="padding: 0.4rem;">Data</th><th style="padding: 0.4rem;">Descrição</th><th style="padding: 0.4rem;">Próxima Preventiva</th>
                        </tr>
                    </thead>
                    <tbody>`;
                
                data.forEach(m => {
                    const ativo = assetMapCache[m.ativo_id] || { tipo: '? Ativo Removido', modelo: '', codigo: null, id: m.ativo_id };
                    const salaNome = roomMapCache[m.sala_id] || '? Sala';

                    let dateAtend = '-';
                    if (m.data_atendimento) {
                        const parts = m.data_atendimento.split('-');
                        if(parts.length === 3) dateAtend = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    
                    let dateProx = '-';
                    if (m.data_proximo) {
                        const parts = m.data_proximo.split('-');
                        if(parts.length === 3) dateProx = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }

                    let bg = m.tipo === 'Preventivo' ? '#dcfce7' : (m.tipo === 'Preditivo' ? '#fef08a' : '#fee2e2');
                    let fr = m.tipo === 'Preventivo' ? '#166534' : (m.tipo === 'Preditivo' ? '#854d0e' : '#991b1b');
                    
                    const assetIdStr = ativo.codigo || (ativo.id ? ativo.id.substring(0,8) : '---');

                    html += `<tr style="font-family: Arial, sans-serif; font-size: 10pt; text-align: left; color: black;">
                        <td style="padding: 0.4rem; font-weight: bold; color: var(--primary-blue); white-space: nowrap; text-align: left;">${assetIdStr}</td>
                        <td style="padding: 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; text-align: left;">${ativo.tipo}</td>
                        <td style="padding: 0.4rem; color: var(--text-light); white-space: nowrap; text-align: left;">${salaNome}</td>
                        <td style="padding: 0.4rem; white-space: nowrap; text-align: left;"><span style="background:${bg}; color:${fr}; font-size: 8pt; padding: 0.2rem 0.4rem; text-transform: uppercase; border-radius: 4px; font-weight: bold;">${m.tipo}</span></td>
                        <td style="padding: 0.4rem; font-weight: 500; white-space: nowrap; text-align: left;">${dateAtend}</td>
                        <td style="padding: 0.4rem; white-space: normal; word-wrap: break-word; text-align: left;">
                            ${m.descricao}
                        </td>
                        <td style="padding: 0.4rem; color: var(--text-light); white-space: nowrap; text-align: left;">${dateProx}</td>
                    </tr>`;
                });

                html += '</tbody></table></div>';
                manutencoesList.innerHTML = html;
            })
            .catch(err => {
                manutencoesList.innerHTML = '<p style="color:red">Não foi possível carregar o histórico no momento.</p>';
            });
    }

    // Inicializar
    carregarSalasEAtivos();
});
