# Google Cloud OAuth Verification Skill

Skill para verificação e aprovação OAuth do Google Cloud, incluindo análise de escopos, preparação de documentação e submissão para verificação.

---

## Quando Usar Esta Skill

Use quando precisar:
- Analisar requisitos para aprovação OAuth do Google
- Verificar se escopos OAuth estão corretos
- Preparar documentação para submissão
- Troubleshoot rejeições de verificação OAuth

---

## Checklist de Requisitos OAuth

### Requisitos de Domínio

```markdown
## Verificação de Domínio

- [ ] Domínio próprio registrado (não usar *.run.app, *.vercel.app, etc.)
- [ ] SSL/HTTPS configurado e válido
- [ ] Domínio verificado no Google Search Console
- [ ] DNS propagado completamente

### Verificar Domínio no Search Console
1. Acessar: https://search.google.com/search-console
2. Adicionar propriedade > Domínio
3. Adicionar registro TXT no DNS:
   ```
   Tipo: TXT
   Nome: @ (raiz)
   Valor: google-site-verification=CODIGO_FORNECIDO
   ```
4. Aguardar verificação (pode levar até 48h)
```

### Requisitos de Páginas Públicas

```markdown
## Páginas Obrigatórias

- [ ] Homepage pública e acessível
- [ ] Privacy Policy no mesmo domínio
- [ ] Terms of Service no mesmo domínio
- [ ] Links funcionais entre páginas

### URLs Padrão
- Homepage: https://seu-dominio.com ou /landing
- Privacy: https://seu-dominio.com/privacy
- Terms: https://seu-dominio.com/terms
```

### Requisitos de Privacy Policy para OAuth

```markdown
## Seções Obrigatórias na Privacy Policy

### Para Escopos Sensíveis (Calendar, Drive, etc.)
- [ ] Seção específica sobre o serviço Google integrado
- [ ] Lista de TODOS os escopos OAuth solicitados
- [ ] Explicação de USO para cada escopo
- [ ] Como dados são armazenados
- [ ] Como dados são compartilhados (ou não)
- [ ] Como revogar acesso
- [ ] Link para Google API Services User Data Policy

### Template de Seção Google Calendar
```jsx
<section>
  <h2>Integração com Google Calendar</h2>

  <h3>Permissões Solicitadas</h3>
  <ul>
    <li><strong>calendar.readonly</strong>: Leitura de eventos</li>
    <li><strong>userinfo.email</strong>: Identificação da conta</li>
  </ul>

  <h3>Como Usamos</h3>
  <p>Usamos para [explicação específica do uso]</p>

  <h3>Armazenamento</h3>
  <p>Tokens são armazenados [onde e como]</p>

  <h3>Compartilhamento</h3>
  <p>Não compartilhamos seus dados do Google com terceiros.</p>

  <h3>Revogar Acesso</h3>
  <p>Você pode revogar em [onde] ou em
     <a href="https://myaccount.google.com/permissions">
       Permissões da Conta Google
     </a>
  </p>

  <h3>Conformidade</h3>
  <p>Em conformidade com a
     <a href="https://developers.google.com/terms/api-services-user-data-policy">
       Google API Services User Data Policy
     </a>
  </p>
</section>
```
```

---

## Análise de Escopos OAuth

### Classificação de Escopos

```markdown
## Tipos de Escopos

### Non-Sensitive (Não requer verificação)
- userinfo.email
- userinfo.profile
- openid

### Sensitive (Requer verificação)
- calendar.readonly
- calendar.events
- drive.readonly
- gmail.readonly

### Restricted (Requer verificação + CASA audit)
- gmail.modify
- drive (full access)
- calendar (full access)
```

### Princípio do Mínimo Privilégio

```markdown
## Regras de Ouro para Escopos

1. NUNCA solicite escopos "para uso futuro"
2. Use o escopo MAIS RESTRITIVO possível
3. Se só precisa LER, use .readonly
4. Evite escopos que incluem outros (são redundantes)

### Exemplo - Google Calendar
❌ ERRADO (redundante):
- calendar
- calendar.events
- calendar.readonly

✅ CORRETO (mínimo necessário):
- calendar.readonly (se só lê)
- calendar.events (se precisa criar/editar)
```

### Análise de Código para Escopos

```bash
# Encontrar onde escopos são definidos
grep -rn "googleapis.com/auth" src/

# Verificar uso real dos escopos
grep -rn "calendar" src/services/
grep -rn "createEvent\|insertEvent" src/

# Se não há código que CRIA eventos, não precisa de calendar.events
```

---

## Vídeo de Demonstração

### Requisitos do Vídeo

```markdown
## Especificações

- Duração: 3-5 minutos
- Resolução: Mínimo 1080p
- Formato: MP4 (H.264)
- Hospedagem: YouTube (Não Listado)
- Áudio: Narração clara explicando cada etapa

## Conteúdo Obrigatório

1. **Intro (30s)**
   - Nome do app
   - Propósito da integração

2. **Fluxo de Autorização (1-2min)**
   - Botão de conexão
   - Popup de consentimento Google
   - Escopos visíveis na tela
   - Aceite do usuário
   - Redirect de volta

3. **Uso dos Dados (1-2min)**
   - Como dados aparecem no app
   - Funcionalidades que usam os dados
   - Benefício para o usuário

4. **Desconexão (30s)**
   - Como revogar acesso
   - O que acontece após revogar
```

### Roteiro Template

```markdown
## Roteiro - [Nome do App] OAuth Demo

### INTRO [0:00-0:30]
"Este vídeo demonstra como [App] utiliza a integração
com [Google Service] para [propósito]."

### CONTEXTO [0:30-1:00]
"[App] permite que usuários [funcionalidade principal].
A integração com [Google Service] possibilita [benefício]."

### AUTORIZAÇÃO [1:00-2:30]
1. "O usuário inicia clicando em [botão]"
2. "A tela de consentimento mostra os escopos:"
   - [Escopo 1]: [explicação]
   - [Escopo 2]: [explicação]
3. "Após autorizar, retorna ao app"

### USO [2:30-4:00]
"Agora vemos os dados do [Google Service]:"
- [Demonstrar funcionalidade 1]
- [Demonstrar funcionalidade 2]

### DESCONEXÃO [4:00-4:30]
"O usuário pode revogar acesso em [local]"

### ENCERRAMENTO [4:30-5:00]
"[App] segue as diretrizes de privacidade do Google."
```

---

## Preparação para Submissão

### Informações Necessárias

```markdown
## Dados para Formulário de Verificação

### App Information
- App name: [Nome oficial]
- User support email: [email@dominio]
- App logo: [PNG 120x120px]

### App Domain
- Homepage: https://[dominio]/
- Privacy Policy: https://[dominio]/privacy
- Terms of Service: https://[dominio]/terms

### Authorized domains
- [dominio.com]

### Scopes
- [Lista de escopos]

### Sensitive scope justification
- [Justificativa detalhada]

### Demo video
- [URL YouTube não listado]

### Test credentials (se necessário)
- Email: [test@dominio]
- Password: [senha]
- Instructions: [Como testar]
```

### Template de Justificativa de Escopo

```markdown
## Justificativa para [escopo]

### Por que precisamos deste escopo
[Explicar a funcionalidade que requer o escopo]

### Como usamos os dados
- [Uso 1]
- [Uso 2]

### Por que não usamos escopo menor
[Explicar por que escopos mais restritos não atendem]

### Conformidade
Nosso uso está em conformidade com a Google API Services
User Data Policy, especificamente:
- Limited Use requirements
- Secure data handling
- Appropriate access
```

---

## Troubleshooting de Rejeições

### Motivos Comuns de Rejeição

```markdown
## Problemas Frequentes

### "Domain not verified"
- Verificar domínio no Google Search Console
- Usar domínio próprio (não *.run.app)
- Aguardar propagação DNS

### "Privacy policy doesn't disclose data usage"
- Adicionar seção específica sobre Google API
- Listar todos os escopos
- Explicar uso de cada escopo

### "Scopes not justified"
- Demonstrar uso REAL no vídeo
- Remover escopos não utilizados
- Escrever justificativa detalhada

### "Video doesn't show consent screen"
- Pausar no consent screen
- Mostrar escopos claramente
- Garantir alta resolução
```

---

## Links Úteis

### Documentação Oficial
- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

### Ferramentas
- [Google Cloud Console](https://console.cloud.google.com)
- [Google Search Console](https://search.google.com/search-console)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [OAuth Playground](https://developers.google.com/oauthplayground)

### Escopos por API
- [Calendar API Scopes](https://developers.google.com/calendar/api/auth)
- [Gmail API Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Drive API Scopes](https://developers.google.com/drive/api/guides/api-specific-auth)

---

## Comandos Úteis

```bash
# Verificar escopos no código
grep -rn "googleapis.com/auth" src/

# Verificar uso de APIs
grep -rn "calendar\|Calendar" src/services/

# Verificar redirect URIs
grep -rn "redirectTo\|redirect_uri" src/

# Verificar OAuth client ID
grep -rn "OAUTH_CLIENT_ID\|client_id" .env* cloudbuild.yaml
```

---

## Checklist Final

```markdown
## Pronto para Submissão?

### Infraestrutura
- [ ] Domínio próprio configurado
- [ ] SSL válido
- [ ] Domínio verificado no Search Console

### Código
- [ ] Escopos são mínimos necessários
- [ ] Sem escopos redundantes
- [ ] Tratamento de erros OAuth

### Documentação
- [ ] Privacy Policy com seção Google
- [ ] Todos escopos documentados
- [ ] Data fixa de atualização
- [ ] Email de contato correto

### OAuth Consent Screen
- [ ] Nome correto
- [ ] Logo configurado
- [ ] URLs corretas
- [ ] Domínios autorizados

### Vídeo
- [ ] 3-5 minutos
- [ ] Mostra consent screen
- [ ] Demonstra uso real
- [ ] YouTube não listado

### Justificativas
- [ ] Uma por escopo
- [ ] Clara e objetiva
- [ ] Demonstra necessidade
```
