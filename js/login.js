document.addEventListener('DOMContentLoaded', () => {
    // A URL será a mesma da plataforma principal
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzED4U_6fqEidlD2zAjl81W4Z3vyv51XrzfMWhtJfVHZANqg7UCgiscQ1fUTnzdj-KFWA/exec'; 

    const loginForm = document.getElementById('form-login');
    const btnLogin = document.getElementById('btn-login');
    const loginMessage = document.getElementById('loginMessage');

    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const loginPassword = document.getElementById('loginPassword');
    if (togglePassword && loginPassword) {
        togglePassword.addEventListener('click', () => {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // Se o usuário já estiver logado, redireciona direto
    if (sessionStorage.getItem('loggedUser')) {
        window.location.href = 'admin.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            btnLogin.classList.add('loading');
            btnLogin.disabled = true;
            loginMessage.style.display = 'none';

            const user_name = document.getElementById('loginClinic').value.trim();
            const email = document.getElementById('loginUser').value.trim();
            const password = document.getElementById('loginPassword').value;

            const data = new URLSearchParams();
            data.append('formType', 'Login');
            data.append('user_name', user_name);
            data.append('email', email);
            data.append('senha', password);

            // Modo teste visual se a URL não foi configurada pro novo script ainda
            if(SUPABASE_URL.includes('SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI')) return;

            window.supabaseFetch(`usuarios?user_name=ilike.${encodeURIComponent(user_name)}&email=ilike.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(password)}&select=*`)
            .then(data => {
                btnLogin.classList.remove('loading');
                btnLogin.disabled = false;

                if (data.length > 0) {
                    const user = data[0];
                    if (user.ativo === false) {
                        showMessage(loginMessage, 'Usuário inativo. Contate o administrador.', 'error');
                        return;
                    }
                    
                    // Salvar na sessão local
                    sessionStorage.setItem('loggedUser', user.nome || email);
                    sessionStorage.setItem('userRole', user.nivel);
                    sessionStorage.setItem('userName', user.user_name || user_name);
                    
                    showMessage(loginMessage, `Bem-vindo, ${user.nome || email}!`, 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1000);

                } else {
                    showMessage(loginMessage, 'Credenciais inválidas ou você não pertence a esta clínica.', 'error');
                }
            })
            .catch(error => {
                console.error(error);
                btnLogin.classList.remove('loading');
                btnLogin.disabled = false;
                
                let errorMsg = 'Erro de conexão. Verifique sua internet.';
                if(error && error.message) {
                    try {
                        const parsed = JSON.parse(error.message);
                        if (parsed.message) errorMsg = 'Supabase: ' + parsed.message;
                    } catch(e) {
                        errorMsg = 'Erro interno: ' + error.message;
                    }
                }
                showMessage(loginMessage, errorMsg, 'error');
            });
        });
    }

    function showMessage(el, text, type) {
        if(!el) return;
        el.textContent = text;
        el.className = `form-message ${type}`;
        el.style.display = 'block';
    }
});
