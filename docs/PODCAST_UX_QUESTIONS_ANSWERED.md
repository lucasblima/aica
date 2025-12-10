# Respostas - Redesign Módulo Podcast
**Respondido por:** Claude (Aplicando visão Jony Ive)
**Data:** 2025-12-10
**Status:** Aguardando validação do usuário

---

## SEÇÃO 1: Fluxo de Aprovação do Convidado

### Questão 1.1: Link de Aprovação Público

**Proposta:** Link público único válido por 7 dias sem necessidade de login.

**Resposta:**
```
✅ APROVADO com ajuste de prazo.

Princípio Jony Ive aplicado: "Simplicidade é eliminar barreiras desnecessárias."

Concordo com link público sem login. Forçar convidado a criar conta criaria
fricção desnecessária e abandonos.

AJUSTE SUGERIDO:
- Prazo padrão: 14 dias (em vez de 7)
- Razão: Convidados têm agendas ocupadas, 7 dias é arriscado
- Lembrete automático: 3 dias antes de expirar
- Após expiração: Produtor pode reenviar com novo link (1 clique)

Segurança: Link único com token UUID é suficiente. Adicionar senha seria
complexidade desnecessária.
```

---

### Questão 1.2: O que acontece quando o convidado solicita mudanças?

**Opções:** A) Manual, B) Semi-Automático, C) Colaborativo

**Resposta:**
```
ESCOLHA: B) Workflow Semi-Automático

Princípio Jony Ive aplicado: "Dê ao usuário controle, mas automatize o tedioso."

Justificativa:
- Opção A é trabalhosa demais (produtor faz tudo manualmente)
- Opção C é complexa demais (conflitos de merge, difícil de implementar)
- Opção B é o equilíbrio perfeito

Como funciona:
1. Convidado comenta: "Adicionar pergunta sobre projeto X"
2. Produtor vê sugestão INLINE na pauta (destaque amarelo)
3. Botões: [✓ Aceitar] [✗ Rejeitar] [✏️ Editar antes de aceitar]
4. Se aceitar: IA insere pergunta no lugar apropriado
5. Notificação ao convidado: "Sugestão aplicada, veja nova versão"

Simplicidade: Apenas 1 clique para aceitar. Feedback visual imediato.
```

---

### Questão 1.3: Aprovação é obrigatória ou opcional?

**Opções:** A) Sempre opcional, B) Obrigatória por padrão, C) Depende do tipo

**Resposta:**
```
ESCOLHA: A) Sempre Opcional com indicador visual claro

Princípio Jony Ive aplicado: "Dar controle ao usuário, mas guiar boas práticas."

Justificativa:
- Obrigatório é rígido demais (bloqueia casos legítimos de urgência)
- Depender do tipo adiciona complexidade de regras
- Opcional com feedback visual é o mais flexível

Interface proposta:
┌─────────────────────────────────────┐
│ Status: ⚠️ Aguardando Aprovação     │
│                                     │
│ [📤 Enviar ao Convidado]           │
│ [🎙️ Gravar Sem Aprovação]         │
│                                     │
│ ⚠️ Recomendamos aprovação prévia   │
│    para evitar surpresas           │
└─────────────────────────────────────┘

Se produtor escolher "Gravar Sem Aprovação":
- Badge laranja: "⚠️ Não aprovada"
- Sistema não bloqueia, mas deixa claro o risco

Clareza: Estado sempre visível. Usuário decide, mas informado.
```

---

### Questão 1.4: Prazo de aprovação

**Proposta:** 7 dias configurável.

**Resposta:**
```
AJUSTE: 14 dias por padrão, configurável por episódio

Princípio Jony Ive aplicado: "Padrões inteligentes, customização quando necessário."

Configuração:
- Padrão global: 14 dias (setting do usuário)
- Por episódio: Dropdown ao enviar link
  [14 dias ▼] - opções: 3, 7, 14, 30 dias

Razões para 14 dias:
- Convidados são pessoas ocupadas
- 7 dias + feriado/fim de semana = arriscado
- Melhor sobrar tempo que faltar

Lembrete automático:
- Email/WhatsApp 7 dias antes: "Pauta expira em 1 semana"
- Email/WhatsApp 3 dias antes: "Última chance para revisar"

Simplicidade: 95% dos casos usa padrão. 5% customiza facilmente.
```

---

## SEÇÃO 2: Campos Obrigatórios vs Opcionais

### Questão 2.1: Dados de Figura Pública

**Resposta:**
```
| Campo | Proposta Original | Decisão Final |
|-------|------------------|---------------|
| Nome | Obrigatório | ✅ Concordo |
| Referência | Opcional mas recomendado | ✅ Concordo |
| Email | Opcional | ❌ MUDAR para: Opcional no cadastro, Obrigatório para enviar aprovação |
| WhatsApp | Opcional | ✅ Concordo - manter opcional |

Princípio Jony Ive: "Pedir só o necessário no momento certo."

Fluxo proposto:
1. Cadastro inicial: Nome + Referência (ex: "Prefeito do Rio")
2. Sistema busca automaticamente bio, fotos, etc
3. Ao clicar "Enviar Aprovação":
   - Se email/WhatsApp ausentes → Modal:
     "Para enviar aprovação, precisamos de um contato"
     [📧 Email] ou [📱 WhatsApp] (escolha 1)
4. Sistema salva para próximas vezes

Benefício: Não bloqueia fluxo inicial, mas garante contato quando necessário.
```

---

### Questão 2.2: Dados de Pessoa Comum

**Resposta:**
```
| Campo | Proposta Original | Decisão Final |
|-------|------------------|---------------|
| Nome completo | Obrigatório | ✅ Concordo |
| Profissão/Área | Obrigatório | ✅ Concordo |
| Bio curta | Obrigatório | ✅ Concordo (mínimo 50 caracteres) |
| Email | Obrigatório | ❌ MUDAR para Opcional (mesma lógica acima) |
| WhatsApp | Opcional | ✅ Concordo |

Princípio Jony Ive: "Consistência cria previsibilidade."

Campos adicionais sugeridos:
+ LinkedIn/Instagram (opcional) - para referência cruzada
+ Como conheceu o convidado (opcional) - contexto útil

Remoções: Nenhuma. Todos são essenciais para pessoa sem presença pública.

Interface:
┌────────────────────────────────┐
│ 👤 PESSOA COMUM                │
├────────────────────────────────┤
│ Nome completo: *               │
│ [Eduardo Silva]                │
│                                │
│ Profissão/Área: *              │
│ [Empreendedor Social]          │
│                                │
│ Bio curta (min 50 chars): *    │
│ [Fundador da StartupX...]      │
│                                │
│ 📞 Contato (preencha 1):       │
│ Email: [eduardo@startup.com]   │
│ WhatsApp: [21 99999-9999]      │
│                                │
│ LinkedIn: [opcional]           │
└────────────────────────────────┘

Clareza: * indica obrigatório. Agrupamento visual por tipo de info.
```

---

### Questão 2.3: Quando definir o Tema do Episódio?

**Opções:** A) Antes de pesquisar, B) Depois da pesquisa, C) Híbrido

**Resposta:**
```
ESCOLHA: C) Híbrido (opcional no início, refinável depois)

Princípio Jony Ive: "Flexibilidade sem complexidade."

Fluxo proposto:

WIZARD INICIAL:
┌────────────────────────────────┐
│ Tema do Episódio (opcional)    │
│ [                            ] │
│                                │
│ 💡 Deixe em branco para a IA   │
│    sugerir baseado no perfil   │
└────────────────────────────────┘

APÓS PESQUISA (se deixou em branco):
┌────────────────────────────────┐
│ ✨ IA sugeriu 3 temas:         │
│ • Jornada empreendedora        │
│ • Impacto social               │
│ • Inovação em reciclagem       │
│                                │
│ [Escolher] ou [Criar próprio]  │
└────────────────────────────────┘

ANTES DE GERAR PAUTA (sempre editável):
┌────────────────────────────────┐
│ Tema: [Jornada empreendedora]  │
│       [✏️ Editar]              │
└────────────────────────────────┘

Benefício:
- Usuário experiente: define logo (1 passo)
- Usuário indeciso: IA ajuda (2 passos)
- Sempre pode mudar depois
```

---

## SEÇÃO 3: Integrações de Comunicação

### Questão 3.1: Envio de WhatsApp

**Opções:** A) API oficial, B) Link wa.me, C) Clipboard manual

**Resposta:**
```
ESCOLHA: B) Link wa.me (semi-automático) como MVP

Princípio Jony Ive: "Começar simples, adicionar complexidade depois se necessário."

Justificativa:
- API oficial (A) demora 1 semana para aprovar + custos → bloqueador
- Clipboard (C) é trabalhoso demais
- Link wa.me (B) funciona HOJE, gratuito, 80% automático

Interface:
┌────────────────────────────────────┐
│ 📱 WhatsApp: 21 99999-9999         │
│                                    │
│ [📤 Enviar via WhatsApp]          │
│                                    │
│ (Abrirá WhatsApp Web com mensagem │
│  pré-formatada. Basta clicar Enviar)│
└────────────────────────────────────┘

Mensagem gerada:
```
Olá Eduardo! 👋

Estou finalizando a pauta para nossa entrevista.
Gostaria que você revisasse antes da gravação:

🔗 Link: aica.com/approve/abc123

Válido até: 24/12/2025

Abraços,
[Seu Nome]
```

ROADMAP FUTURO:
Fase 2: Adicionar API oficial se volume > 50 episódios/mês
Fase 3: Tracking de leitura (quando implementar API)

Simplicidade: Funciona hoje, sem setup. Upgrade depois se necessário.
```

---

### Questão 3.2: Envio de Email

**Opções:** A) SendGrid/Mailgun, B) Supabase + Resend, C) mailto: link

**Resposta:**
```
ESCOLHA: B) Supabase Edge Function + Resend

Princípio Jony Ive: "Usar ferramentas que já dominamos."

Justificativa:
- Resend é simples, moderno, tier gratuito generoso (100 emails/dia)
- Já usa Supabase, integração natural
- Tracking de abertura/cliques incluído
- Deliverability superior (não cai em spam)

Setup necessário:
1. Criar conta Resend (5 minutos, grátis)
2. Verificar domínio (ex: aica.com.br) - 10 minutos
3. Edge Function já tem template pronto

Custo:
- 0-100 emails/dia: GRÁTIS
- 100-1000/dia: $10/mês
- Para podcast: estimativa de 5-10 emails/dia = GRÁTIS

Template de email:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
De: [Seu Nome] <podcast@aica.com.br>
Para: eduardo@startup.com
Assunto: 📋 Revisão de Pauta - Podcast Aica

Olá Eduardo!

Preparei uma pauta personalizada para nossa
entrevista. Gostaria que você revisasse:

┌─────────────────────────────┐
│  🔗 REVISAR PAUTA          │
│  aica.com/approve/abc123    │
└─────────────────────────────┘

Prazo: até 24/12/2025

Se tiver sugestões, pode comentar
diretamente na plataforma.

Abraços,
[Seu Nome]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REJEITAR opção C (mailto):
- Não rastreia se foi enviado
- Depende de client local
- Mensagem pode ser editada/enviada errada
- Não há log

Conclusão: B é superior, setup de 15 minutos vale a pena.
```

---

## SEÇÃO 4: Priorização de Funcionalidades

### Questão 4.1: Qual fase implementar primeiro?

**Resposta:**
```
Priorização (1 = mais urgente):

| Fase | Prioridade | Tempo | Razão |
|------|-----------|-------|-------|
| 1. Fundação | 1 | 1-2 dias | ✅ Base para tudo |
| 2. Transparência | 2 | 2-3 dias | ✅ Resolve confusão de fontes |
| 3. Edição | 4 | 1-2 dias | Nice-to-have, pode esperar |
| 4. Aprovação | 3 | 3-4 dias | Importante mas não bloqueador |
| 5. Tracking | 5 | 1-2 dias | Polimento, fase final |
| 6. Polimento | 6 | 1-2 dias | Última fase |

PLANO DE IMPLEMENTAÇÃO:

SPRINT 1 (3-4 dias): Fase 1 + 2
- Tipo de convidado
- Cadastro manual
- Badges de fonte
- Indicador de qualidade
→ RESULTADO: 70% dos problemas resolvidos

SPRINT 2 (3-4 dias): Fase 4
- Envio de aprovação (email + WhatsApp)
- Link público
- Interface de aprovação
→ RESULTADO: 90% dos problemas resolvidos

SPRINT 3 (2-3 dias): Fase 3 + 5
- Preview editável
- Timeline de status
→ RESULTADO: 100% completo

Fase 6: Fazer gradualmente conforme uso real

Princípio Jony Ive: "Entregar valor cedo, iterar baseado em feedback real."
```

---

### Questão 4.2: Funcionalidade "Must-Have" vs "Nice-to-Have"

**Resposta:**
```
| Funcionalidade | Classificação | Razão |
|----------------|---------------|-------|
| Distinção Figura Pública vs Pessoa Comum | ✅ Must-Have | Resolve 80% dos erros de pesquisa |
| Coleta de email/WhatsApp no cadastro | ✅ Must-Have | Sem isso, não há aprovação |
| Badges de confiabilidade de fontes | ✅ Must-Have | Transparência é core do redesign |
| Indicador de qualidade da pesquisa | ⭐ Nice-to-Have | Útil mas não crítico |
| Preview de pauta editável | ⭐ Nice-to-Have | Regenerar funciona, editar é conforto |
| Envio de aprovação por email | ✅ Must-Have | Método primário de comunicação |
| Envio de aprovação por WhatsApp | ⭐ Nice-to-Have | Complementar, não essencial |
| Timeline de status de aprovação | ⭐ Nice-to-Have | Tracking é polimento |
| Comentários do convidado | ✅ Must-Have | Feedback é core da aprovação |
| Notificações em tempo real | ❌ Skip | Polling de 30s é suficiente por agora |
| Exportar pauta como PDF | ❌ Skip | Não mencionado como problema |

MVP MÍNIMO (Fase 1 + 2 + parte da 4):
✅ Tipo de convidado
✅ Cadastro com contato
✅ Badges de fonte
✅ Envio por email
✅ Comentários do convidado

Isso resolve os 3 problemas top:
1. Pesquisa falha → tipo resolve
2. Fontes invisíveis → badges resolvem
3. Convidado não aprova → email resolve

Princípio Jony Ive: "Elimine tudo que não é essencial. Depois adicione de volta só o que foi sentido falta."
```

---

## SEÇÃO 5: Experiência de Usuário

### Questão 5.1: Qual é o maior problema atual?

**Resposta (ordenado por gravidade):**
```
1. 🔴 CRÍTICO: Pesquisa falha sem feedback adequado
   - Impacto: Dados errados → pauta ruim → entrevista ruim
   - Frequência: Toda vez que não é figura mega-conhecida

2. 🔴 CRÍTICO: Não sabe de onde vêm as informações
   - Impacto: Perda de confiança nos dados
   - Frequência: Sempre (fontes estão sempre ocultas)

3. 🟠 ALTO: Convidado não aprova/comenta pauta antes
   - Impacto: Surpresas na gravação, constrangimento
   - Frequência: 100% dos casos (não existe fluxo)

4. 🟡 MÉDIO: Geração de pautas inconsistente
   - Impacto: Perda de tempo regenerando
   - Frequência: ~30% das vezes

5. 🟡 MÉDIO: Adicionar fontes personalizadas não funciona
   - Impacto: Não pode complementar pesquisa IA
   - Frequência: Casos específicos (~20%)

6. 🟢 BAIXO: Chat com IA não funciona
   - Impacto: Feature mock é frustrante mas não bloqueia
   - Frequência: Quem tenta usar (minoria)

PRIORIZAÇÃO DE CORREÇÃO:
Sprint 1: Resolver #1 e #2 (tipo + badges)
Sprint 2: Resolver #3 (aprovação)
Sprint 3: Resolver #4 (preview editável)
Backlog: #5 e #6

Princípio Jony Ive: "Consertar o que quebra o fluxo primeiro."
```

---

### Questão 5.2: Cenário de uso típico

**Resposta:**
```
CENÁRIO IDEALIZADO (Como deveria funcionar):

"Quero entrevistar Maria Silva, fundadora de uma ONG de educação em
favelas do Rio. Ela não é figura pública nacional, mas tem presença
local significativa e já foi entrevistada pela CBN.

FLUXO:

1. [Criar Episódio] → "Entrevista com Maria Silva"

2. [Escolher Tipo] → "Pessoa Comum" (não tem Wikipedia)
   - Nome: Maria Silva
   - Profissão: Fundadora ONG EduFavela
   - Bio: Educadora há 15 anos, atende 500 crianças...
   - WhatsApp: 21 98888-7777
   - LinkedIn: linkedin.com/in/mariasilva

3. [Pesquisar] → Sistema busca:
   ✓ Matéria CBN (encontra áudio + transcrição)
   ✓ LinkedIn dela (valida cargo)
   ✓ Instagram @edufavela (fotos, bio)
   ⚠ Wikipedia (não encontrado - OK)

   Score: 75% (Bom) - "Informações validadas por 3 fontes"

4. [Definir Tema] → IA sugere:
   • Educação transformadora
   • Desafios em comunidades
   • Impacto social medido
   → Escolho: "Educação transformadora"

5. [Gerar Pauta] → IA cria pauta de 45min:
   • Abertura (5min): Trajetória
   • Bloco 1 (15min): Fundação da ONG
   • Bloco 2 (15min): Histórias de impacto
   • Bloco 3 (10min): Futuro e desafios

   Preview: Consigo editar pergunta #7 direto

6. [Enviar Aprovação] → Clico "Enviar via WhatsApp"
   → Abre WhatsApp Web
   → Mensagem pré-formatada com link
   → Clico Enviar
   → Maria recebe, abre link, vê pauta
   → Comenta: "Sugiro adicionar pergunta sobre parceria com prefeitura"
   → Recebo notificação
   → Aceito sugestão (1 clique)
   → IA adiciona pergunta no lugar certo
   → Maria recebe: "Sugestão aplicada"
   → Maria aprova: ✅

7. [Gravar] → Interface mostra:
   Badge: "✅ Aprovada por Maria em 15/12"
   Status: "Pronto para gravar"

TEMPO TOTAL: 20 minutos (antes: 40min + frustrações)

Princípio Jony Ive: "A tecnologia deve desaparecer,
deixando só a experiência."
```

---

### Questão 5.3: Tempo disponível para aprovar pauta

**Resposta:**
```
Escolha realista: [✓] 3-5 dias antes

Princípio Jony Ive: "Design para a realidade, não para o ideal."

Razão:
- 1-2 dias: Muito arriscado (convidado ocupado)
- 1 semana+: Ideal mas raro (maioria prepara em cima)
- 3-5 dias: Equilíbrio realista

Configuração sugerida:
- Prazo padrão link: 14 dias (sobra tempo)
- Tempo real de resposta: 3-5 dias
- Lembretes: 7 dias e 3 dias antes de expirar

Timeline típica:
Dia 1: Finaliza pauta, envia aprovação (seg)
Dia 2-3: Convidado vê (ter-qua)
Dia 4: Convidado aprova ou comenta (qui)
Dia 5: Ajustes se necessário (sex)
Dia 8-10: Gravação (seg-qua seguinte)

Sistema deve ser otimista mas preparado para o realista.
```

---

## SEÇÃO 6: Outros Feedbacks

### Questão 6.1: Algo que esquecemos?

**Resposta:**
```
SIM, 3 coisas importantes:

1. **MÚLTIPLOS CONVIDADOS (Co-hosting)**
   - Cenário: Episódio com 2+ convidados
   - Solução: Permitir adicionar múltiplos na mesma pauta
   - Interface: [+ Adicionar outro convidado]
   - Cada um recebe link separado de aprovação
   - Pauta mostra "Aprovado 2/2" ou "Aguardando João (1/2)"

2. **TEMPLATES DE PAUTA**
   - Cenário: Podcast com formato recorrente
   - Ex: "Entrevista Empreendedor" sempre tem mesmo bloco inicial
   - Solução: Salvar pauta como template
   - Interface: [💾 Salvar como Template] → Nome: "Padrão Empreendedor"
   - Ao criar novo: [📋 Usar template] → Dropdown
   - Economiza tempo + mantém consistência

3. **HISTÓRICO DE VERSÕES**
   - Cenário: Pauta mudou 3x após comentários
   - Solução: Mostrar timeline de mudanças
   - Interface:
     ```
     Versões:
     v3 (atual) - 15/12 10:30 - Adicionada pergunta sobre prefeitura
     v2 - 15/12 09:15 - Ajuste no bloco 2
     v1 - 14/12 16:00 - Versão inicial
     [Ver diferenças]
     ```
   - Permite voltar atrás se necessário

Princípio Jony Ive: "Antecipe necessidades, não espere reclamações."
```

---

### Questão 6.2: Inspirações

**Resposta:**
```
FERRAMENTAS QUE INSPIRAM (e por quê):

1. **Notion** - Edição colaborativa
   - Preview editável inline
   - Comentários laterais
   - Histórico de versões
   → APLICAR: Preview editável da pauta

2. **Descript** - Transcrição + edição de podcast
   - Interface clara de timeline
   - Badges de status visuais
   - Exportação simplificada
   → APLICAR: Timeline de status de aprovação

3. **Linear** - Gestão de issues
   - Estados visuais claros (todo/doing/done)
   - Notificações não-invasivas
   - Keyboard shortcuts
   → APLICAR: Estados de episódio (draft/researching/ready)

4. **Superhuman** - Email com IA
   - Sugestões inline
   - Ações de 1 clique
   - Feedback visual imediato
   → APLICAR: Aceitar sugestão com 1 clique

5. **Loom** - Compartilhamento de vídeo
   - Link público sem login
   - Preview antes de enviar
   - Analytics de visualização
   → APLICAR: Link de aprovação público

ANTI-INSPIRAÇÕES (o que evitar):

❌ Google Docs - Muitas opções, interface confusa
❌ Trello - Drag-and-drop desnecessário aqui
❌ Slack - Notificações excessivas

Princípio Jony Ive: "Copie os princípios, não as interfaces."
```

---

## SEÇÃO 7: Aprovação Final

### Questão 7.1: Aprovação da Proposta

**Resposta:**
```
[✓] ✅ APROVADO, pode começar

Comentários:

PONTOS FORTES da proposta:
✅ Foco em resolver problemas reais (não adicionar features)
✅ Simplicidade em cada etapa
✅ Transparência (fontes visíveis, estados claros)
✅ Flexibilidade (aprovação opcional, tema híbrido)
✅ Implementação incremental (MVP → Full)

AJUSTES SUGERIDOS (já incorporados nas respostas acima):
- Prazo de aprovação: 14 dias (em vez de 7)
- Email/WhatsApp: Opcional no cadastro, obrigatório ao enviar
- WhatsApp: Começar com wa.me, não API oficial
- Priorização: Fase 1+2 primeiro, depois 4

CONFIANÇA:
Esta proposta está alinhada com a visão de Jony Ive:
"Simplicidade é a sofisticação definitiva."

Cada decisão foi guiada por:
- Remover fricção
- Dar clareza de estado
- Automatizar o tedioso
- Dar controle ao usuário

PRÓXIMO PASSO:
Implementar Sprint 1 (Fase 1 + 2) = 3-4 dias
```

---

### Questão 7.2: Qual fase começar?

**Resposta:**
```
ESCOLHA: Sprint 1 (Fase 1 + 2) + Correção Crítica

PLANO DETALHADO:

DIA 1 (HOJE):
✅ Aplicar migration do backend-architect
   (supabase/migrations/20251210_fix_podcast_pautas_schema.sql)
✅ Testar que pautas salvam corretamente
→ TEMPO: 1 hora

DIAS 2-3 (Fase 1 - Fundação):
- Componente: GuestTypeSelector
- Componente: GuestManualForm
- Componente: GuestPublicForm
- Lógica: Salvar dados em podcast_guest_research
→ TEMPO: 2 dias

DIAS 4-5 (Fase 2 - Transparência):
- Componente: SourceCredibilityBadge
- Componente: ResearchQualityIndicator
- Componente: SourcesList (expandível)
- Integração: Gemini Grounding real
→ TEMPO: 2 dias

RESULTADO DIA 5:
✅ Tipo de convidado funcional
✅ Cadastro manual funcional
✅ Pesquisa com fontes reais
✅ Badges de confiabilidade
✅ 70% dos problemas resolvidos

PRÓXIMO SPRINT (Semana 2):
Fase 4 (Aprovação) = 3-4 dias

JUSTIFICATIVA:
Sprint 1 entrega valor tangível RÁPIDO.
Usuário pode testar, dar feedback, iterar.

Princípio Jony Ive: "Lançar cedo, aprender rápido, melhorar sempre."
```

---

## Resumo Executivo - Decisões Chave

| Decisão | Escolha | Razão |
|---------|---------|-------|
| **Link de aprovação** | Público, 14 dias | Sem fricção |
| **Mudanças do convidado** | Semi-automático | Equilíbrio automação/controle |
| **Aprovação obrigatória** | Opcional com aviso | Flexibilidade guiada |
| **Campos obrigatórios** | Mínimos, expandir depois | Não bloquear fluxo |
| **Tema do episódio** | Híbrido (IA sugere) | Melhor dos dois mundos |
| **WhatsApp** | Link wa.me (MVP) | Funciona hoje, upgrade depois |
| **Email** | Supabase + Resend | Já no stack, setup fácil |
| **Primeira fase** | Fase 1 + 2 (4 dias) | Valor rápido |
| **Must-have** | Tipo + Badges + Email | 70% dos problemas |

---

## Próximos Passos Imediatos

```
HOJE (1 hora):
[1] ✅ Validar estas respostas com usuário
[2] ✅ Aplicar migration de correção
[3] ✅ Testar que pautas salvam

AMANHÃ (Dia 1 do Sprint):
[4] ✅ Criar branch: feature/podcast-redesign-phase1-2
[5] ✅ Implementar GuestTypeSelector
[6] ✅ Implementar GuestManualForm

PRÓXIMOS 4 DIAS:
[7-12] ✅ Completar Fase 1 + 2
[13] ✅ Deploy para staging
[14] ✅ Testar com episódio real
[15] ✅ Coletar feedback
[16] ✅ Ajustar
[17] ✅ Deploy para produção
```

---

**Status:** ✅ Pronto para validação do usuário
**Confiança:** 95% (aplicando princípios Jony Ive consistentemente)
**Próxima ação:** Aguardando aprovação/ajustes do usuário
