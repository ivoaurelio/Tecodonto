document.addEventListener('DOMContentLoaded', () => {
    const reportContent = document.getElementById('report-content');
    const maintenanceResults = document.getElementById('maintenance-results');
    const loaderContainer = document.getElementById('loader-container');
    const printDate = document.getElementById('print-date');
    const filterSection = document.getElementById('maintenance-filter-section');
    
    // Tab Butons
    const btnTabAdmin = document.getElementById('btn-tab-admin');
    const btnTabManut = document.getElementById('btn-tab-manut');

    // Filter Form Elements
    const formManut = document.getElementById('form-filtro-manutencao');
    const selectRoom = document.getElementById('filterRoom');
    const selectAsset = document.getElementById('filterAsset');
    const dateStart = document.getElementById('filterStartDate');
    const dateEnd = document.getElementById('filterEndDate');
    const btnGerar = document.getElementById('btn-gerar-manutencao');
    const filterMessage = document.getElementById('filterMessage');

    // Print Headers
    const reportTitle = document.querySelector('.form-header h1');
    const printClinicTitle = document.getElementById('print-clinic-name');
    const printSubtitleP = document.querySelector('.print-header-content p:first-of-type');
    
    let globalSalas = [];
    let globalAtivos = [];
    let roomMapCache = {};
    let assetMapCache = {};

    const loggedClinic = sessionStorage.getItem('userName');
    const userName = loggedClinic || '';

    // Initialize UI Customization
    if (reportTitle && loggedClinic && loggedClinic !== 'MESTRE') {
        reportTitle.innerHTML = `Central da Clínica <br><span style="font-size: 1.5rem; color: var(--primary-green);">${loggedClinic.toUpperCase()}</span>`;
    }
    
    if (printDate) {
        const today = new Date();
        printDate.textContent = `Gerado em: ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}`;
    }

    const criClass = {
        'Baixa': 'cri-baixa',
        'Média': 'cri-media',
        'Alta': 'cri-alta'
    };

    // ==========================================
    // 1. BOOTSTRAP DATABASES (Salas e Ativos)
    // ==========================================
    if (reportContent) {
        Promise.all([
            window.supabaseFetch(`salas?user_name=eq.${encodeURIComponent(userName)}&select=*`),
            window.supabaseFetch(`ativos?user_name=eq.${encodeURIComponent(userName)}&select=*`)
        ])
        .then(([salasData, ativosData]) => {
            loaderContainer.style.display = 'none';
            reportContent.style.display = 'block';

            globalSalas = salasData || [];
            globalAtivos = ativosData || [];

            // Populate Caches
            globalSalas.forEach(s => roomMapCache[s.id] = s.nome ? s.nome : `Sala ${s.numero}`);
            globalAtivos.forEach(a => assetMapCache[a.id] = a);

            // Populate Admin Report
            buildAdminReport();

            // Populate Maintenance Room Dropdown
            populateRoomsDropdown();
        })
        .catch(err => {
            console.error(err);
            loaderContainer.innerHTML = '<p style="color: #dc3545; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar os dados base.</p>';
        });
    }

    // ==========================================
    // 2. TOGGLE TABS LOGIC
    // ==========================================
    function setTab(tabName) {
        if (tabName === 'ADMIN') {
            btnTabAdmin.className = 'btn btn-primary';
            btnTabAdmin.style.flex = '1';
            btnTabAdmin.style.borderRadius = '8px';
            btnTabAdmin.style.fontWeight = '600';
            
            btnTabManut.className = 'btn btn-secondary';
            btnTabManut.style.flex = '1';
            btnTabManut.style.borderRadius = '8px';
            btnTabManut.style.fontWeight = '600';

            filterSection.style.display = 'none';
            maintenanceResults.style.display = 'none';
            reportContent.style.display = 'block';

            if(printClinicTitle) printClinicTitle.textContent = "Relatório Administrativo de Ativos";
            if(printSubtitleP) printSubtitleP.textContent = "Programa de Controle de Manutenção";

        } else if (tabName === 'MANUT') {
            btnTabManut.className = 'btn btn-primary';
            btnTabManut.style.flex = '1';
            btnTabManut.style.borderRadius = '8px';
            btnTabManut.style.fontWeight = '600';
            
            btnTabAdmin.className = 'btn btn-secondary';
            btnTabAdmin.style.flex = '1';
            btnTabAdmin.style.borderRadius = '8px';
            btnTabAdmin.style.fontWeight = '600';

            filterSection.style.display = 'block';
            reportContent.style.display = 'none';
            maintenanceResults.style.display = 'block'; // Shows table logic underneath

            if(printClinicTitle) printClinicTitle.textContent = "Relatório de Manutenções";
            
            // Set default date range (Current Month)
            if(!dateStart.value) {
                const date = new Date();
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                dateStart.value = `${y}-${m}-01`;
                dateEnd.value = `${y}-${m}-${new Date(y, date.getMonth() + 1, 0).getDate()}`;
            }

            // Sync Header UI Date
            updateMaintenancePrintHeader();
        }
    }

    if(btnTabAdmin) btnTabAdmin.addEventListener('click', () => setTab('ADMIN'));
    if(btnTabManut) btnTabManut.addEventListener('click', () => setTab('MANUT'));

    function updateMaintenancePrintHeader() {
        if(printSubtitleP && dateStart.value && dateEnd.value) {
            const startStr = dateStart.value.split('-').reverse().join('/');
            const endStr = dateEnd.value.split('-').reverse().join('/');
            printSubtitleP.textContent = `Período: ${startStr} até ${endStr}`;
        }
    }

    // ==========================================
    // 3. ADMIN REPORT BUILDER
    // ==========================================
    function buildAdminReport() {
        if(globalSalas.length === 0) {
            reportContent.innerHTML = `
                <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                    <i class="fa-solid fa-folder-open fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <h3>Nenhum dado encontrado.</h3>
                    <p>Cadastre salas e ativos para visualizar o relatório.</p>
                </div>
            `;
            return;
        }

        let html = '';
        const salas = [...globalSalas].sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

        salas.forEach(sala => {
            const roomAssets = globalAtivos.filter(a => a.sala === sala.id);

            html += `
                <div class="room-section">
                    <div class="room-header">
                        <h3>Sala ${sala.numero} - ${sala.nome}</h3>
                        <div class="room-badge">${sala.tipo}</div>
                    </div>
            `;

            if (roomAssets.length > 0) {
                html += `
                    <table class="assets-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Equipamento</th>
                                <th>Marca / Modelo</th>
                                <th>Nº Série</th>
                                <th>Criticidade</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                roomAssets.sort((a, b) => a.id.localeCompare(b.id));

                roomAssets.forEach(ativo => {
                    const critText = ativo.criticidade ? ativo.criticidade.split(' ')[0] : '-';
                    const badge = `<span class="criticality-badge ${criClass[critText] || 'cri-baixa'}">${ativo.criticidade || '-'}</span>`;
                    html += `
                            <tr>
                                <td style="font-weight: 600; color: var(--primary-blue);">${ativo.codigo || ativo.id.substring(0,8)}</td>
                                <td>${ativo.tipo}</td>
                                <td>${ativo.modelo || '-'}</td>
                                <td>${ativo.numero_serie || '-'}</td>
                                <td>${badge}</td>
                            </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;
            } else {
                html += `
                    <div class="empty-state">Nenhum equipamento cadastrado nesta sala ainda.</div>
                `;
            }

            html += `</div>`; 
        });

        reportContent.innerHTML = html;
    }

    // ==========================================
    // 4. MAINTENANCE FILTER CASCADE LOGIC
    // ==========================================
    function populateRoomsDropdown() {
        if (!selectRoom) return;
        let htmlRooms = '<option value="" disabled selected>Escolha a sala (ou Todas)</option>';
        htmlRooms += '<option value="ALL">Todas as Salas do Sistema</option>';
        
        const salas = [...globalSalas].sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
        salas.forEach(sala => {
            const salaNome = sala.nome ? sala.nome : `Sala ${sala.numero}`;
            htmlRooms += `<option value="${sala.id}">${sala.numero} - ${salaNome}</option>`;
        });
        selectRoom.innerHTML = htmlRooms;
    }

    if (selectRoom && selectAsset) {
        selectRoom.addEventListener('change', () => {
            const salaId = selectRoom.value;
            
            if (salaId === 'ALL') {
                selectAsset.innerHTML = '<option value="ALL" selected>Todos os equipamentos (Todas as Salas)</option>';
                selectAsset.disabled = true;
                return;
            }

            const ativosDaSala = globalAtivos.filter(a => a.sala === salaId);
            
            if (ativosDaSala.length === 0) {
                selectAsset.innerHTML = '<option value="" disabled selected>Nenhum ativo nesta sala.</option>';
                selectAsset.disabled = true;
                return;
            }

            let htmlAssets = '<option value="ALL" selected>Todos os equipamentos (Desta Sala)</option>';
            ativosDaSala.forEach(ativo => {
                const label = `${ativo.tipo} ${ativo.modelo ? ' - ' + ativo.modelo : ''} (${ativo.codigo || 'Sem ID'})`;
                htmlAssets += `<option value="${ativo.id}">${label}</option>`;
            });
            
            selectAsset.innerHTML = htmlAssets;
            selectAsset.disabled = false;
        });
    }

    // ==========================================
    // 5. MAINTENANCE DATA FETCHING
    // ==========================================
    if (formManut) {
        formManut.addEventListener('submit', (e) => {
            e.preventDefault();
            
            filterMessage.style.display = 'none';

            let query = `manutencoes?user_name=eq.${encodeURIComponent(userName)}`;
            
            // Filters
            if(selectRoom.value && selectRoom.value !== 'ALL') {
                query += `&sala_id=eq.${encodeURIComponent(selectRoom.value)}`;
            }
            if(selectAsset.value && selectAsset.value !== 'ALL' && !selectAsset.disabled) {
                query += `&ativo_id=eq.${encodeURIComponent(selectAsset.value)}`;
            }
            if(dateStart.value) {
                query += `&data_atendimento=gte.${encodeURIComponent(dateStart.value)}`;
            }
            if(dateEnd.value) {
                query += `&data_atendimento=lte.${encodeURIComponent(dateEnd.value)}`;
            }

            // Order Latest First
            query += `&order=data_atendimento.desc`;

            const loader = btnGerar.querySelector('.loader');
            const icon = btnGerar.querySelector('i');
            btnGerar.disabled = true;
            icon.style.display = 'none';
            if (loader) loader.style.display = 'inline-block';

            updateMaintenancePrintHeader();

            window.supabaseFetch(query)
                .then(data => {
                    btnGerar.disabled = false;
                    icon.style.display = 'inline-block';
                    if (loader) loader.style.display = 'none';
                    buildMaintenanceReport(data);
                })
                .catch(err => {
                    btnGerar.disabled = false;
                    icon.style.display = 'inline-block';
                    if (loader) loader.style.display = 'none';
                    filterMessage.style.display = 'block';
                    filterMessage.textContent = "Erro ao puxar dados da nuvem. Verifique sua conexão.";
                });
        });
    }

    function buildMaintenanceReport(data) {
        if (!data || data.length === 0) {
            maintenanceResults.innerHTML = `
                <div style="text-align: center; color: var(--text-light); padding: 2rem; border: 1px dashed #cbd5e1; border-radius: 8px;">
                    <i class="fa-solid fa-face-frown-open fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <h3>Nenhum Histórico Encontrado</h3>
                    <p>Filtre outro período de datas ou escolha "Todas as Salas".</p>
                </div>
            `;
            return;
        }

        const filterStartDate = document.getElementById('filterStartDate').value;
        const filterEndDate = document.getElementById('filterEndDate').value;
        const formatShort = (d) => d ? d.split('-').reverse().join('/') : '---';
        const hojeHora = new Date().toLocaleString('pt-BR');
        
        // Fetch Logo dynamically from auth.js injected DOM element
        let hLogo = '';
        const printClinicLogo = document.getElementById('print-clinic-logo');
        if (printClinicLogo && printClinicLogo.src && printClinicLogo.src.length > 10) {
            hLogo = `<img src="${printClinicLogo.src}" style="max-height: 50px; max-width: 120px; object-fit: contain;">`;
        }
        
        let headerRow = `<tr class="print-row-only" style="border: none !important;">
            <th colspan="7" style="border: none !important; padding: 1cm 0 10px 0;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    ${hLogo}
                    <h2 style="margin: 0; color: #334155; font-size: 1.4rem; font-family: Arial, sans-serif;">Relatório de Manutenções</h2>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; color: #64748b; font-size: 0.9rem; font-family: Arial, sans-serif;">
                    <p style="margin: 0;">Período: ${formatShort(filterStartDate)} até ${formatShort(filterEndDate)}</p>
                    <p style="margin: 0;">Gerado em: ${hojeHora}</p>
                </div>
                <hr style="margin: 10px 0 0 0; border: 0; border-top: 2px solid #e2e8f0;">
            </th>
        </tr>`;

        let html = `<div class="table-responsive"><table class="assets-table" style="font-family: Arial, sans-serif; width: 100%; text-align: left; border-collapse: collapse;">
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
                <td style="padding: 0.4rem; font-weight: bold; border-bottom: 1px solid #f1f5f9; white-space: nowrap; text-align: left;">${assetIdStr}</td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: normal; text-align: left;">${ativo.tipo}</td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: normal; text-align: left;">${salaNome}</td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; text-align: left;"><span style="background:${bg}; color:${fr}; font-size: 8pt; padding: 0.2rem 0.4rem; text-transform: uppercase; border-radius: 4px; font-weight: bold;">${m.tipo}</span></td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; text-align: left;">${dateAtend}</td>
                <td style="padding: 0.4rem; white-space: normal; word-wrap: break-word; border-bottom: 1px solid #f1f5f9; text-align: left;">
                    ${m.descricao}
                </td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; text-align: left;">${dateProx}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        maintenanceResults.innerHTML = html;
    }
});
