// supabase.js - Configuração global do banco de dados REST API

const SUPABASE_URL = 'https://lzyxrxsqczaojaottfoi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_73we-s9S6Ofo743I6vuTFg_WRBwaOvK';

window.supabaseFetch = async function(endpoint, options = {}) {
    const defaultHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        ...options,
        headers: { ...defaultHeaders, ...(options.headers || {}) }
    });

    if (!response.ok) {
        let errorText = await response.text();
        
        let userFacingError = 'Erro de sistema: ' + errorText;
        
        try {
            const parsed = JSON.parse(errorText);
            if (parsed.code === '23505') {
                if (parsed.message?.includes('clinicas_pkey')) {
                    userFacingError = 'Ops! Já existe uma Clínica registrada com este ID. Escolha um código exclusivo e tente novamente.';
                } else if (parsed.message?.includes('usuarios_email_key')) {
                    userFacingError = 'Ops! Já existe um usuário utilizando este E-mail de acesso. Por favor, cadastre um e-mail diferente.';
                } else {
                    userFacingError = 'Ops! Ocorreu uma tentativa de registrar uma informação que já existe em nossos bancos (Dado Duplicado).';
                }
            } else if (parsed.code === '23503') {
                userFacingError = 'Tentativa de associar a um registro que não pertence à clínica ou não existe mais.';
            } else {
                 userFacingError = `Falha (${parsed.code}): ${parsed.message}`;
            }
        } catch (e) {}
        
        // Log this error to Supabase silently
        const loggedUser = sessionStorage.getItem('userName') || 'Anônimo';
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
                method: 'POST',
                headers: { ...defaultHeaders },
                body: JSON.stringify({
                    user_name: loggedUser,
                    endpoint: endpoint.split('?')[0],
                    metodo: options.method || 'GET',
                    mensagem_erro: errorText
                })
            });
            document.dispatchEvent(new Event('erroRegistrado'));
        } catch(e) {}
        
        throw new Error(userFacingError);
    }
    
    if (response.status === 204) return [];
    return await response.json();
};
