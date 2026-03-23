document.addEventListener('DOMContentLoaded', () => {
    // ATENÇÃO: COLOQUE A SUA URL GERADA PELO GOOGLE APPS SCRIPT AQUI!
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzED4U_6fqEidlD2zAjl81W4Z3vyv51XrzfMWhtJfVHZANqg7UCgiscQ1fUTnzdj-KFWA/exec'; 

    const reportContent = document.getElementById('report-content');
    const loaderContainer = document.getElementById('loader-container');
    const printDate = document.getElementById('print-date');
    
    // Customize title with clinic
    const reportTitle = document.querySelector('.form-header h1');
    const loggedClinic = localStorage.getItem('userName');
    if (reportTitle && loggedClinic && loggedClinic !== 'MESTRE') {
        reportTitle.innerHTML = `Relatório da Clínica <br><span style="font-size: 1.5rem; color: var(--primary-green);">${loggedClinic.toUpperCase()}</span>`;
    }

    const criClass = {
        'Baixa': 'cri-baixa',
        'Média': 'cri-media',
        'Alta': 'cri-alta'
    };

    if (printDate) {
        const today = new Date();
        printDate.textContent = `Gerado em: ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}`;
    }

    if (reportContent) {
        const userName = localStorage.getItem('userName') || '';
        fetch(`${scriptURL}?action=getReport&user_name=${userName}`)
            .then(res => res.json())
            .then(data => {
                loaderContainer.style.display = 'none';
                reportContent.style.display = 'block';

                const salas = data.salas || [];
                const ativos = data.ativos || [];

                if(salas.length === 0) {
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

                // Sort salas by number
                salas.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

                salas.forEach(sala => {
                    const roomAssets = ativos.filter(a => a.tipo === sala.tipo && String(a.numero) === String(sala.numero));

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

                        // Sort assets by ID
                        roomAssets.sort((a, b) => a.id.localeCompare(b.id));

                        roomAssets.forEach(ativo => {
                            // Extrair o primeiro nome ou "Baixa/Média/Alta"
                            const critText = ativo.criticidade ? ativo.criticidade.split(' ')[0] : '-';
                            const badge = `<span class="criticality-badge ${criClass[critText] || 'cri-baixa'}">${ativo.criticidade || '-'}</span>`;
                            html += `
                                    <tr>
                                        <td style="font-weight: 600; color: var(--primary-blue);">${ativo.id}</td>
                                        <td>${ativo.equipamento}</td>
                                        <td>${ativo.marca}</td>
                                        <td>${ativo.serie || '-'}</td>
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
            })
            .catch(err => {
                console.error(err);
                loaderContainer.innerHTML = '<p style="color: #dc3545; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar os dados. Verifique a sua URL do Apps Script ou permissões.</p>';
            });
    }
});
