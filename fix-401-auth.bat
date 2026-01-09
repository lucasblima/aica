@echo off
echo.
echo ========================================
echo Fix: 401 Unauthorized
echo ========================================
echo.
echo PROBLEMA: Token de autenticacao invalido
echo.
echo SOLUCAO (1 minuto):
echo.
echo 1. Vou abrir o app no navegador
echo 2. Pressione F12 (DevTools)
echo 3. Va na aba "Application"
echo 4. Clique em "Storage" (menu esquerdo)
echo 5. Clique "Clear site data"
echo 6. Marque TODAS as opcoes
echo 7. Clique "Clear data"
echo 8. Recarregue a pagina (F5)
echo 9. Faca login novamente
echo 10. Teste sincronizar WhatsApp
echo.
echo ========================================
echo.
echo Abrindo navegador em 3 segundos...
timeout /t 3 /nobreak >nul

start "" "http://localhost:3001/contacts"

echo.
echo ========================================
echo Navegador aberto!
echo ========================================
echo.
echo Siga as instrucoes acima ou leia:
echo FIX_401_UNAUTHORIZED.md
echo.
pause
