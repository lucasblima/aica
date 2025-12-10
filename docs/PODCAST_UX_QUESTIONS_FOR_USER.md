# Perguntas para o Usuário - Redesign Módulo Podcast

**Data:** 2025-12-10
**Status:** Aguardando feedback

---

## Introdução

Analisamos o fluxo atual de cadastro e pesquisa de convidados do módulo podcast e identificamos problemas graves de usabilidade. Criamos uma proposta completa de redesign baseada nos princípios de Jony Ive (simplicidade, clareza, foco no usuário).

**Documentos criados:**
1. `PODCAST_GUEST_FLOW_REDESIGN.md` - Proposta completa e detalhada
2. `PODCAST_FLOW_VISUAL_SUMMARY.md` - Resumo visual com diagramas

Antes de iniciar a implementação, precisamos de suas respostas sobre algumas decisões críticas de design.

---

## SEÇÃO 1: Fluxo de Aprovação do Convidado

### Questão 1.1: Link de Aprovação Público

**Contexto:** Queremos que convidados possam visualizar e aprovar a pauta sem precisar criar conta no Aica.

**Proposta:**
- Link público único (ex: `aica.com/approve/abc123xyz`)
- Válido por 7 dias
- Interface simplificada (só visualizar + aprovar/comentar)
- Notificação automática ao produtor quando convidado responder

**Pergunta:** Você concorda com essa abordagem? Alguma preocupação com segurança ou prazo de expiração?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 1.2: O que acontece quando o convidado solicita mudanças?

**Cenário:** Convidado visualiza pauta e comenta: "Sugiro adicionar pergunta sobre projeto X".

**Opções:**

**A) Workflow Manual**
- Produtor recebe notificação
- Produtor edita pauta manualmente
- Produtor reenvia para nova aprovação
- Sistema cria nova versão (v2)

**B) Workflow Semi-Automático**
- Produtor vê sugestão inline na pauta
- Pode aceitar (adiciona automaticamente) ou rejeitar
- Se aceitar, versão atualizada é gerada
- Convidado recebe notificação de mudança aplicada

**C) Workflow Colaborativo**
- Convidado pode editar diretamente seções específicas
- Produtor recebe notificações de edições
- Produtor revisa e aprova mudanças
- Sistema faz merge das versões

**Pergunta:** Qual opção você prefere? Ou uma combinação?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 1.3: Aprovação é obrigatória ou opcional?

**Contexto:** Nem sempre é viável esperar aprovação (ex: convidado de última hora, pessoa que não responde email).

**Opções:**

**A) Sempre Opcional**
- Produtor pode "pular" aprovação e ir direto para gravação
- Sistema mostra aviso: "Pauta não aprovada pelo convidado"

**B) Obrigatória por padrão, mas pode ser desativada**
- Checkbox "Exigir aprovação" (marcado por padrão)
- Se marcado, bloqueia gravação até aprovação
- Produtor pode desmarcar se necessário

**C) Depende do tipo de convidado**
- Figura pública: aprovação obrigatória (temas sensíveis)
- Pessoa comum: aprovação opcional (mais informal)

**Pergunta:** Qual abordagem faz mais sentido para seu workflow?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 1.4: Prazo de aprovação

**Contexto:** Link público expira após X dias.

**Proposta:** 7 dias por padrão, mas configurável (3, 5, 7, 14 dias).

**Pergunta:** 7 dias é razoável? Você gostaria de poder personalizar por episódio?

**Sua resposta:**
```
[Escreva aqui]
```

---

## SEÇÃO 2: Campos Obrigatórios vs Opcionais

### Questão 2.1: Dados de Figura Pública

**Contexto:** Quando usuário escolhe "Figura Pública", sistema busca automaticamente.

**Campos:**

| Campo | Proposta | Você concorda? |
|-------|----------|----------------|
| Nome | Obrigatório | [ ] Sim [ ] Não |
| Referência (ex: "Prefeito do Rio") | Opcional mas recomendado | [ ] Sim [ ] Não |
| Email | Opcional | [ ] Sim [ ] Não - deve ser obrigatório |
| WhatsApp | Opcional | [ ] Sim [ ] Não - deve ser obrigatório |

**Pergunta adicional:** Se convidado é figura pública, faz sentido exigir email/WhatsApp desde o início? Ou só pedir depois, quando for enviar aprovação?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 2.2: Dados de Pessoa Comum

**Contexto:** Quando usuário escolhe "Pessoa Comum", tudo é preenchido manualmente.

**Campos:**

| Campo | Proposta | Você concorda? |
|-------|----------|----------------|
| Nome completo | Obrigatório | [ ] Sim [ ] Não |
| Profissão/Área | Obrigatório | [ ] Sim [ ] Não |
| Bio curta | Obrigatório | [ ] Sim [ ] Não |
| Email | Obrigatório | [ ] Sim [ ] Não |
| WhatsApp | Opcional | [ ] Sim [ ] Não - deve ser obrigatório |

**Pergunta:** Algum campo que deveria ser removido ou adicionado?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 2.3: Quando definir o Tema do Episódio?

**Contexto:** Tema pode ser definido em vários momentos.

**Opções:**

**A) No Wizard Inicial (antes de pesquisar)**
- Usuário define tema logo após escolher convidado
- Sistema usa tema para guiar pesquisa

**B) Depois da Pesquisa (ao configurar pauta)**
- Usuário vê resultados da pesquisa primeiro
- Depois define tema baseado no que encontrou

**C) Híbrido (opcional no início, refinável depois)**
- Campo "tema" opcional no wizard
- Pode ser deixado em branco (IA sugere)
- Pode ser editado depois

**Pergunta:** Qual faz mais sentido para você?

**Sua resposta:**
```
[Escreva aqui]
```

---

## SEÇÃO 3: Integrações de Comunicação

### Questão 3.1: Envio de WhatsApp

**Contexto:** Para enviar mensagens automáticas via WhatsApp, existem algumas opções.

**Opções:**

**A) WhatsApp Business API (oficial)**
- Mais confiável e profissional
- Requer cadastro e aprovação (demora ~1 semana)
- Custo: ~R$0.10 por mensagem
- Permite tracking de status (enviado, lido, etc)

**B) Link wa.me (semi-automático)**
- Gera link `wa.me/5521999999999?text=Olá Eduardo...`
- Abre WhatsApp Web/App no navegador do produtor
- Produtor clica "Enviar" manualmente
- Gratuito, mas não rastreia status

**C) Clipboard Copy (manual)**
- Sistema gera mensagem formatada
- Botão "Copiar mensagem"
- Produtor cola no WhatsApp manualmente
- Mais trabalhoso, mas funciona imediatamente

**Pergunta:** Qual opção você prefere? Você tem WhatsApp Business ou está disposto a configurar?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 3.2: Envio de Email

**Contexto:** Para enviar emails automáticos, precisamos de um serviço.

**Opções:**

**A) Serviço Third-Party (SendGrid, Mailgun, Resend)**
- Confiável, rastreamento de abertura/cliques
- Requer API key
- Custo: gratuito até 100/dia, depois ~R$0.05/email
- Melhor deliverability (não cai em spam)

**B) Supabase Edge Function + Resend**
- Já está no stack do projeto
- Fácil de implementar
- Custo similar

**C) Email do próprio usuário (mailto: link)**
- Abre client de email do produtor (Gmail, Outlook)
- Produtor clica "Enviar" manualmente
- Gratuito, mas não rastreia

**Pergunta:** Qual você prefere? Você já tem conta em algum serviço de email? Prefere integração automática ou controle manual?

**Sua resposta:**
```
[Escreva aqui]
```

---

## SEÇÃO 4: Priorização de Funcionalidades

### Questão 4.1: Qual fase implementar primeiro?

**Contexto:** Redesign tem 6 fases. Podemos implementar incrementalmente.

**Fases:**

| Fase | Descrição | Tempo estimado | Prioridade (1-5) |
|------|-----------|----------------|------------------|
| 1. Fundação | Tipo de convidado + cadastro manual | 1-2 dias | [   ] |
| 2. Transparência | Badges de fonte + qualidade | 2-3 dias | [   ] |
| 3. Edição | Preview editável | 1-2 dias | [   ] |
| 4. Aprovação | Envio + tracking de aprovação | 3-4 dias | [   ] |
| 5. Tracking | Timeline + notificações | 1-2 dias | [   ] |
| 6. Polimento | Animações + UX refinements | 1-2 dias | [   ] |

**Pergunta:** Numere de 1 (mais importante) a 6 (menos importante) na coluna "Prioridade".

---

### Questão 4.2: Funcionalidade "Must-Have" vs "Nice-to-Have"

**Contexto:** Se tivermos que cortar features para lançar mais rápido, o que é essencial?

**Marque:**
- ✅ = Must-Have (essencial, não pode faltar)
- ⭐ = Nice-to-Have (importante mas pode esperar)
- ❌ = Skip (não é prioridade agora)

| Funcionalidade | Classificação |
|----------------|---------------|
| Distinção Figura Pública vs Pessoa Comum | [   ] |
| Coleta de email/WhatsApp no cadastro | [   ] |
| Badges de confiabilidade de fontes | [   ] |
| Indicador de qualidade da pesquisa (score numérico) | [   ] |
| Preview de pauta editável | [   ] |
| Envio de aprovação por email | [   ] |
| Envio de aprovação por WhatsApp | [   ] |
| Timeline de status de aprovação | [   ] |
| Comentários do convidado | [   ] |
| Notificações em tempo real (Supabase Realtime) | [   ] |
| Exportar pauta como PDF | [   ] |

---

## SEÇÃO 5: Experiência de Usuário

### Questão 5.1: Qual é o maior problema atual?

**Pergunta:** Dos problemas identificados, qual causa mais frustração no dia a dia?

**Problemas identificados:**
1. Pesquisa falha sem feedback adequado
2. Não sabe de onde vêm as informações (fontes invisíveis)
3. Geração de pautas inconsistente (precisa regenerar várias vezes)
4. Convidado não aprova/comenta pauta antes da gravação
5. Adicionar fontes personalizadas não funciona
6. Chat com IA não funciona (é mock)

**Sua resposta (numere de 1 a 6 por ordem de gravidade):**
```
[Escreva aqui]
```

---

### Questão 5.2: Cenário de uso típico

**Pergunta:** Descreva um cenário real de como você gostaria de usar o módulo de podcast.

**Exemplo:**
"Quero entrevistar um empreendedor local que criou uma startup de reciclagem. Ele não é figura pública, mas tem uma história interessante. Eu já conversei com ele pelo WhatsApp e ele topou. Quero preparar uma pauta focada na jornada dele, desafios do negócio e impacto social. Gostaria de enviar a pauta para ele revisar antes da gravação."

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 5.3: Tempo disponível para aprovar pauta

**Pergunta:** Em média, quanto tempo antes da gravação você finaliza a pauta?

- [ ] 1-2 dias antes
- [ ] 3-5 dias antes
- [ ] 1 semana antes
- [ ] Mais de 1 semana
- [ ] No mesmo dia (last minute)

**Sua resposta:**
```
[Escreva aqui]
```

---

## SEÇÃO 6: Outros Feedbacks

### Questão 6.1: Algo que esquecemos?

**Pergunta:** Existe alguma funcionalidade, preocupação ou caso de uso que não cobrimos?

**Sua resposta:**
```
[Escreva aqui]
```

---

### Questão 6.2: Inspirações

**Pergunta:** Você usa alguma outra ferramenta/app que tem um fluxo parecido e funciona bem? (ex: Descript para podcasts, Notion para documentos colaborativos, etc)

**Sua resposta:**
```
[Escreva aqui]
```

---

## SEÇÃO 7: Aprovação Final

### Questão 7.1: Aprovação da Proposta

**Pergunta:** Você aprova a direção geral do redesign? Alguma mudança fundamental antes de começarmos?

**Opções:**
- [ ] ✅ Aprovado, pode começar
- [ ] ⚠️ Aprovado com ajustes (especifique abaixo)
- [ ] ❌ Preciso discutir mais / tenho dúvidas

**Seus comentários:**
```
[Escreva aqui]
```

---

### Questão 7.2: Qual fase começar?

**Pergunta:** Com base nas suas respostas, qual fase você gostaria que implementássemos primeiro?

**Sugestão nossa:** Fase 1 (Fundação) + Fase 2 (Transparência) como MVP, depois Fase 4 (Aprovação).

**Sua escolha:**
```
[Escreva aqui]
```

---

## Próximos Passos

Após receber suas respostas:

1. ✅ Ajustar proposta com base no feedback
2. ✅ Criar protótipos visuais das telas (Figma ou HTML/CSS)
3. ✅ Validar novamente antes de codar
4. ✅ Implementar fase escolhida
5. ✅ Testar com usuário real
6. ✅ Iterar

---

**Como responder:**
Edite este arquivo diretamente ou copie as perguntas para um email/documento separado.

**Prazo sugerido:** 2-3 dias para você revisar com calma.

**Contato:** Envie respostas para [seu método preferido de comunicação]

---

**Última atualização:** 2025-12-10
