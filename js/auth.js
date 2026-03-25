// auth.js - Deve ser chamado no <head> ou no topo do <body> das páginas restritas

(function checkAuth() {
    // 1. Verifica se está logado
    const loggedUser = sessionStorage.getItem('loggedUser');
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName'); // Clinic ID

    if (!loggedUser || !userRole || !userName) {
        // Redireciona para o login se não houver sessão e não estiver já no login
        if(!window.location.href.includes('login.html') && !window.location.href.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'login.html';
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName');
    const loggedUser = sessionStorage.getItem('loggedUser');
    
    // 2. Injeta um cabeçalho de usuário na Navbar se existir
    const navMenu = document.querySelector('.nav-list');
    if (navMenu && loggedUser && !window.location.href.includes('index.html') && !window.location.href.includes('login.html')) {
        const userLi = document.createElement('li');
        userLi.innerHTML = `<span class="nav-link" style="color: var(--primary-green); font-weight: 700; cursor: default;"><i class="fa-solid fa-user-circle"></i> ${loggedUser.split(' ')[0]} <span style="font-size: 0.75rem; font-weight: 600; color: #475569; background: #e2e8f0; padding: 3px 8px; border-radius: 12px; margin-left: 6px; vertical-align: middle; letter-spacing: 0.5px;">${userName || 'Clínica Padrão'}</span></span>`;
        navMenu.appendChild(userLi);

        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = `<a href="#" id="btn-logout" class="nav-link" style="color: #dc3545;"><i class="fa-solid fa-right-from-bracket"></i> Sair</a>`;
        navMenu.appendChild(logoutLi);

        document.getElementById('btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // 3. Modifica a DOM baseado nos papéis (Adicionando a lógica de gray-out ou hard block nos botões do admin.html)
    applyRoleRestrictions(userRole);

    // 4. Se houver formulário na página, injeta silenciosamente o user_name
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if(userName) {
            let hiddenClinic = form.querySelector('input[name="user_name"]');
            if (!hiddenClinic) {
                hiddenClinic = document.createElement('input');
                hiddenClinic.type = 'hidden';
                hiddenClinic.name = 'user_name';
                form.appendChild(hiddenClinic);
            }
            hiddenClinic.value = userName;
        }
        
        let hiddenEditor = form.querySelector('input[name="editor"]');
        if (!hiddenEditor) {
            hiddenEditor = document.createElement('input');
            hiddenEditor.type = 'hidden';
            hiddenEditor.name = 'editor';
            form.appendChild(hiddenEditor);
        }
        hiddenEditor.value = loggedUser;
    });

    // Replace generic form-header icons with Clinic Logo & Name
    const formHeaders = document.querySelectorAll('.form-header .icon-wrapper');
    const activeUserName = sessionStorage.getItem('userName');
    if (activeUserName) {
        window.supabaseFetch(`clinicas?user_name=eq.${encodeURIComponent(activeUserName)}&select=nome,logo`)
            .then(data => {
                const clinicData = (data && data.length > 0) ? data[0] : { nome: activeUserName, logo: null };
                
                if (formHeaders.length > 0) {
                    formHeaders.forEach(wrapper => {
                        wrapper.innerHTML = '';
                        wrapper.style.background = 'transparent';
                        wrapper.style.boxShadow = 'none';
                        wrapper.style.width = '100%';
                        wrapper.style.height = 'auto';
                        wrapper.style.flexDirection = 'column';
                        wrapper.style.marginBottom = '1rem';
                        wrapper.style.display = 'flex';
                        
                        wrapper.innerHTML = `<h3 style="color: var(--primary-blue); margin: 0; font-size: 1.15rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${clinicData.nome}</h3>`;
                    });
                }

                // WHITELABEL: Swap Navbar Logo for active Clinic Logo (executed regardless of form headers)
                const headerLogo = document.getElementById('header-logo');
                let processedSrc = null;
                
                if (clinicData.logo && clinicData.logo.trim() !== '') {
                    processedSrc = clinicData.logo.trim();
                    if (!processedSrc.startsWith('http') && !processedSrc.startsWith('data:')) processedSrc = 'data:image/png;base64,' + processedSrc;
                }

                if (headerLogo && processedSrc) {
                    headerLogo.src = processedSrc;
                }

                // REPORT PRINT HEADER: Inject Clinic Logo and Name into print-exclusive DOM elements
                const printClinicLogo = document.getElementById('print-clinic-logo');
                const printClinicName = document.getElementById('print-clinic-name');
                if (printClinicLogo && processedSrc) {
                    printClinicLogo.src = processedSrc;
                }
                if (printClinicName) {
                    printClinicName.textContent = clinicData.nome || activeUserName;
                }

                // WATERMARK: Inject 'Powered by TecOdonto' below header, precisely aligned with the left logo
                const navContainer = document.querySelector('.nav-container');
                if (navContainer && !navContainer.querySelector('.powered-by')) {
                    navContainer.style.position = 'relative';
                    
                    const poweredDiv = document.createElement('div');
                    poweredDiv.className = 'powered-by';
                    poweredDiv.style.cssText = 'position: absolute; left: 0; bottom: -28px; display: flex; align-items: center; justify-content: flex-start; opacity: 0.8; z-index: 10; font-size: 0.8rem;';
                    
                    poweredDiv.innerHTML = `<span style="color: var(--text-light); margin-right: 0.4rem;">powered by</span><img src="assets/logo.png" style="height: 18px; object-fit: contain; opacity: 0.9;" alt="TecOdonto">`;
                    
                    navContainer.appendChild(poweredDiv);
                }
            })
            .catch(err => {
                if (formHeaders.length > 0) {
                    formHeaders.forEach(wrapper => {
                        wrapper.innerHTML = `<h3 style="color: var(--primary-blue); margin: 0;">${activeUserName}</h3>`;
                        wrapper.style.background = 'transparent';
                        wrapper.style.boxShadow = 'none';
                    });
                }
            });
    }
});

function applyRoleRestrictions(role) {
    if (!role) return;
    
    // Opcionalmente, selecionar botões específicos. 
    // Super Administrador: Tudo habilitado (inclusive Gestão de Clínicas)
    // Administrador: Tudo habilitado (inclusive Gestão de Equipe, menos Gestão de Clínicas)
    // Suporte: Relatório, Salas, Ativos habilitados. Gestão de Equipe e Clínicas desabilitado.
    // Operador: Relatório habilitado. O resto desabilitado.

    const reqSuper = document.querySelectorAll('.req-superadmin');
    const reqAdmin = document.querySelectorAll('.req-admin');
    const reqSuporte = document.querySelectorAll('.req-suporte');
    const reqTecnico = document.querySelectorAll('.req-tecnico');

    // Desabilitador Helper
    const disableElements = (elements) => {
        elements.forEach(el => {
            el.style.opacity = '0.5';
            el.style.pointerEvents = 'none';
            el.style.cursor = 'not-allowed';
            const icon = el.querySelector('i');
            if(icon) { icon.className = 'fa-solid fa-lock'; icon.style.color = '#94a3b8'; }
            
            // Se for form element
            if(el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'SELECT') {
                el.disabled = true;
            }
        });
    };

    if (role === 'Operador') {
        disableElements(reqSuporte);
        disableElements(reqAdmin);
        disableElements(reqSuper);
        disableElements(reqTecnico);
    } 
    else if (role === 'Suporte') {
        disableElements(reqAdmin);
        disableElements(reqSuper);
        disableElements(reqTecnico);
    } 
    else if (role === 'Técnico') {
        disableElements(reqSuporte);
        disableElements(reqAdmin);
        disableElements(reqSuper);
    }
    else if (role === 'Administrador') {
        disableElements(reqSuper);
    }
}
