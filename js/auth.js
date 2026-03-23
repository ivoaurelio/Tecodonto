// auth.js - Deve ser chamado no <head> ou no topo do <body> das páginas restritas

(function checkAuth() {
    // 1. Verifica se está logado
    const loggedUser = localStorage.getItem('loggedUser');
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName'); // Clinic ID

    if (!loggedUser || !userRole || !userName) {
        // Redireciona para o login se não houver sessão e não estiver já no login
        if(!window.location.href.includes('login.html') && !window.location.href.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'login.html';
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    const loggedUser = localStorage.getItem('loggedUser');
    
    // 2. Injeta um cabeçalho de usuário na Navbar se existir
    const navMenu = document.querySelector('.nav-list');
    if (navMenu && loggedUser && !window.location.href.includes('index.html') && !window.location.href.includes('login.html')) {
        const userLi = document.createElement('li');
        userLi.innerHTML = `<span class="nav-link" style="color: var(--primary-green); font-weight: 700; cursor: default;"><i class="fa-solid fa-user-circle"></i> ${loggedUser.split(' ')[0]}</span>`;
        navMenu.appendChild(userLi);

        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = `<a href="#" id="btn-logout" class="nav-link" style="color: #dc3545;"><i class="fa-solid fa-right-from-bracket"></i> Sair</a>`;
        navMenu.appendChild(logoutLi);

        document.getElementById('btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
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
    } 
    else if (role === 'Suporte') {
        disableElements(reqAdmin);
        disableElements(reqSuper);
    } 
    else if (role === 'Administrador') {
        disableElements(reqSuper);
    }
}
