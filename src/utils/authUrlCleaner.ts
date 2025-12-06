/**
 * Limpa parâmetros de autenticação OAuth expirados da URL
 * Este utilitário deve ser executado ANTES de inicializar o Supabase
 * para evitar erros de "Session as retrieved from URL expires in -XXXs"
 */

export function cleanExpiredOAuthParams(): void {
    try {
        // Verifica se há parâmetros de autenticação na URL
        const hash = window.location.hash;
        if (!hash) return;

        const params = new URLSearchParams(hash.substring(1));

        // Detecta parâmetros OAuth
        const hasAuthParams = params.has('access_token') ||
                             params.has('refresh_token') ||
                             params.has('expires_in') ||
                             params.has('error');

        if (!hasAuthParams) return;

        console.log('[AuthCleaner] 🔍 Detectados parâmetros OAuth na URL');

        // Verifica se a sessão está expirada analisando expires_at ou expires_in
        const expiresIn = params.get('expires_in');
        const expiresAt = params.get('expires_at');

        let isExpired = false;
        const now = Math.floor(Date.now() / 1000); // timestamp em segundos

        if (expiresAt) {
            const expiryTimestamp = parseInt(expiresAt, 10);
            const timeUntilExpiry = expiryTimestamp - now;

            console.log('[AuthCleaner] ⏰ Verificando expiração:', {
                expiresAt: new Date(expiryTimestamp * 1000).toISOString(),
                timeUntilExpiry: `${timeUntilExpiry}s`,
                isExpired: timeUntilExpiry < 0
            });

            // Se já expirou ou está para expirar em menos de 60s
            if (timeUntilExpiry < 60) {
                isExpired = true;
            }
        }

        // Se há erro na URL, considera como expirado
        if (params.has('error')) {
            console.log('[AuthCleaner] ❌ Erro detectado na URL:', params.get('error'));
            isExpired = true;
        }

        // Se está expirado, limpa a URL imediatamente
        if (isExpired) {
            console.log('[AuthCleaner] 🧹 Limpando parâmetros OAuth expirados');
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }

        console.log('[AuthCleaner] ✅ Parâmetros OAuth parecem válidos, permitindo processamento normal');

    } catch (error) {
        console.error('[AuthCleaner] ❌ Erro ao verificar parâmetros OAuth:', error);
    }
}

/**
 * Suprime warnings específicos do Supabase sobre sessões expiradas
 * que são esperados e tratados graciosamente pela aplicação
 */
export function suppressExpiredSessionWarnings(): void {
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';

        // Suprime warnings sobre sessões expiradas que já estamos tratando
        if (
            message.includes('@supabase/gotrue-js: Session as retrieved from URL') ||
            message.includes('expires in -') ||
            message.includes('was issued over 120s ago')
        ) {
            // Silencia o warning, pois já estamos limpando a URL
            return;
        }

        originalConsoleWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
        const message = args[0]?.toString() || '';

        // Suprime erros 403 esperados ao tentar usar tokens expirados
        if (
            message.includes('403') &&
            message.includes('/auth/v1/user')
        ) {
            // Silencia o erro, pois a aplicação já está lidando com isso
            return;
        }

        originalConsoleError.apply(console, args);
    };
}
