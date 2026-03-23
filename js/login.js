document.addEventListener('DOMContentLoaded', () => {
    // A URL será a mesma da plataforma principal
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzED4U_6fqEidlD2zAjl81W4Z3vyv51XrzfMWhtJfVHZANqg7UCgiscQ1fUTnzdj-KFWA/exec'; 

    const loginForm = document.getElementById('form-login');
    const btnLogin = document.getElementById('btn-login');
    const loginMessage = document.getElementById('loginMessage');

    // Se o usuário já estiver logado, redireciona direto
    if (localStorage.getItem('loggedUser')) {
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
            const password = document.getElementById('loginPassword').value.trim();

            const data = new URLSearchParams();
            data.append('formType', 'Login');
            data.append('user_name', user_name);
            data.append('email', email);
            data.append('senha', password);

            // Modo teste visual se a URL não foi configurada pro novo script ainda
            if(scriptURL.includes('SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI')) {
                setTimeout(() => {
                    localStorage.setItem('loggedUser', email);
                    localStorage.setItem('userRole', 'Super Administrador');
                    localStorage.setItem('userName', user_name);
                    window.location.href = 'admin.html';
                }, 1000);
                return;
            }

            fetch(scriptURL, {
                method: 'POST',
                body: data
            })
            .then(res => res.json())
            .then(response => {
                btnLogin.classList.remove('loading');
                btnLogin.disabled = false;

                if (response.result === 'success') {
                    // Salvar na sessão local
                    localStorage.setItem('loggedUser', response.nome || email);
                    localStorage.setItem('userRole', response.nivel);
                    localStorage.setItem('userName', response.user_name || user_name);
                    
                    showMessage(loginMessage, `Bem-vindo, ${response.nome || email}!`, 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1000);

                } else {
                    showMessage(loginMessage, response.message || 'Dados inválidos. Tente novamente.', 'error');
                }
            })
            .catch(error => {
                console.error(error);
                btnLogin.classList.remove('loading');
                btnLogin.disabled = false;
                showMessage(loginMessage, 'Erro de conexão. Verifique sua internet.', 'error');
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
