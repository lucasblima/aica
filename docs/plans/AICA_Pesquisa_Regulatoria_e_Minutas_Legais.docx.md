**AICA LIFE OS**

*Sistema Operacional de Vida Integral*

**Pesquisa Regulatória & Minutas Legais**

Política de Privacidade & Termos de Serviço

Conformidade Global: LGPD • GDPR • CCPA/CPRA

Fevereiro 2026

*Versão 2.0 — Documento Confidencial*

# **PARTE I — PESQUISA REGULATÓRIA**

## **1\. Resumo Executivo**

Este documento consolida a pesquisa regulatória necessária para a elaboração da Política de Privacidade e dos Termos de Serviço da plataforma AICA Life OS, assegurando conformidade simultânea com três marcos regulatórios: a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018) do Brasil, o Regulamento Geral de Proteção de Dados (GDPR — EU 2016/679) da União Europeia e a Lei de Privacidade do Consumidor da Califórnia (CCPA/CPRA) dos Estados Unidos.

A AICA opera como um SaaS de produtividade pessoal integrado com IA generativa, processando dados altamente sensíveis incluindo reflexões pessoais, informações financeiras, rede de contatos profissionais e dados de calendário. Esta característica exige um nível elevado de transparência e proteção, superior ao de plataformas SaaS convencionais.

## **2\. Análise Comparativa dos Marcos Regulatórios**

A tabela abaixo sintetiza os requisitos-chave de cada regulamentação e seu impacto direto nas operações da AICA:

| Requisito | LGPD (Brasil) | GDPR (UE) | CCPA/CPRA (EUA) |
| ----- | ----- | ----- | ----- |
| **Base legal para tratamento** | 10 bases legais (Art. 7º): consentimento, contrato, legítimo interesse, etc. | 6 bases legais (Art. 6º): consentimento, contrato, interesse legítimo, etc. | Modelo opt-out. Transparência obrigatória, não exige consentimento prévio. |
| **Prazo DSAR (Solicitação de Dados)** | 15 dias (simplificado: imediato) | 30 dias (extensível para 60\) | 45 dias (extensível para 90\) |
| **Encarregado / DPO** | Obrigatório para todos os controladores (Art. 41). ANPD recomenda certificação em 2025\. | Obrigatório para processamento em larga escala de dados sensíveis. | Não obrigatório, mas recomendado. |
| **Sanções máximas** | 2% do faturamento ou R$50 milhões por infração. | 4% do faturamento global ou €20 milhões. | US$7.988 por violação intencional (2026). Ação civil privada. |
| **Transferência internacional** | Cláusulas contratuais padrão da ANPD (Resolução 8/2025). | SCCs, decisões de adequação, TIAs pós-Schrems II. | Divulgação de transferências. DPF para empresas certificadas. |
| **IA / Decisão automatizada** | Portaria ANPD 5/2024: transparência, auditabilidade, viés ético. | Art. 22: direito de não ser sujeito a decisões puramente automatizadas. | CPRA: avaliação de impacto para profiling. Opt-out de decisões automatizadas. |
| **Cookies / Rastreamento** | Consentimento explícito prévio. Granularidade por finalidade. | Consentimento prévio opt-in. Bloqueio antes da aceitação. | Modelo opt-out. Link 'Não Vender Meus Dados' obrigatório. |
| **Menores de idade** | Consentimento parental para \< 18 anos. | Consentimento parental para \< 16 (ou 13-16 por estado-membro). | Consentimento parental para \< 16\. COPPA para \< 13\. |

## **3\. Análise de Lacunas (Gap Analysis)**

Com base na análise dos documentos existentes da AICA (PrivacyPolicyPage.tsx e TermsOfServicePage.tsx) e na infraestrutura de privacidade já implementada no backend (módulo agents/privacy), identificamos as seguintes lacunas críticas que as novas minutas devem cobrir:

**3.1. Lacunas na Política de Privacidade Atual**

* **Escopo geográfico limitado:** A política atual referencia apenas a LGPD. Faltam seções específicas para direitos GDPR (portabilidade em formato estruturado, DPO) e CCPA (categorias de dados, 'Do Not Sell', Global Privacy Control).

* **IA generativa insuficiente:** A seção sobre processamento por IA é genérica. Não detalha: quais modelos são usados (Gemini), se dados de usuários treinam modelos, decisões automatizadas vs. assistidas, e direito de opção de não-processamento por IA.

* **Subprocessadores não listados:** Não há lista de subprocessadores (Google Cloud, Supabase, etc.) nem política de atualização quando novos subprocessadores forem adicionados.

* **Transferência internacional omissa:** Não menciona que dados podem ser processados fora do Brasil (servidores Google Cloud, Supabase nos EUA/UE).

* **Períodos de retenção vagos:** Apesar do backend implementar períodos específicos (7d, 30d, 365d, 730d), a política fala apenas em 'tempo necessário'. CPRA exige períodos específicos.

* **Telegram e e-mail ausentes:** Nenhuma menção sobre coleta de dados via Telegram ou comunicações por e-mail.

**3.2. Lacunas nos Termos de Serviço Atuais**

* **Planos e preços indefinidos:** Menciona planos pagos genericamente sem especificar valores (Pro R$39,90/mês, Teams R$149/mês) nem políticas de reembolso.

* **Métodos de pagamento brasileiros:** Não menciona PIX, Boleto Bancário ou outros métodos locais.

* **SLA (Nível de Serviço):** Não há compromissos de disponibilidade ou tempo de resposta.

* **Limitação de responsabilidade fraca:** A cláusula atual é genérica. Precisa de teto claro e exclusões específicas para insights de IA.

* **Lei aplicável para usuários internacionais:** Menciona apenas foro brasileiro. Faltam cláusulas de arbitração para usuários internacionais e ressalvas GDPR/CCPA.

* **Programa de convites (viral):** O sistema de convites Gmail-style não está coberto nos termos.

## **4\. Requisitos Específicos por Integração**

**4.1. Google (Auth, Calendar, Drive, Gemini AI)**

* Declarar uso de OAuth 2.0 para autenticação sem armazenar senhas do Google.

* Especificar escopos de acesso: leitura/escrita de calendário, leitura de Drive.

* Gemini API: declarar que dados enviados para geração de texto não são retidos pelo Google para treinamento de modelo (conforme Google Cloud Data Processing Terms).

* Informar que o usuário pode desconectar a integração a qualquer momento nas configurações.

**4.2. Supabase (Banco de Dados / Backend)**

* Identificar Supabase como operador (processador) de dados.

* Declarar localização dos servidores e mecanismos de transferência internacional.

* Row Level Security (RLS) como medida técnica de isolamento de dados por usuário.

* Criptografia em trânsito (TLS) e em repouso (AES-256).

**4.3. Telegram**

* Declarar que a integração coleta mensagens e metadados mediante consentimento explícito.

* Especificar período de retenção das mensagens (alinhado ao backend: 365 dias com soft-delete).

* Informar que o processamento de mensagens por IA requer consentimento separado.

**4.4. E-mail**

* Declarar finalidades de comunicação: transacional (notificações, confirmações) e marketing (newsletters, atualizações).

* Oferecer mecanismo de unsubscribe em todas as comunicações não-transacionais.

* Conformidade com CAN-SPAM Act (EUA) e regulamentações anti-spam brasileiras.

**4.5. Integrações Futuras (Cláusula Guarda-Chuva)**

* Incluir cláusula genérica permitindo novas integrações mediante consentimento do usuário.

* Compromisso de atualizar a política dentro de 30 dias após adição de novo subprocessador.

* Mecanismo de notificação (e-mail \+ banner in-app) para mudanças materiais.

## **5\. Considerações Específicas sobre IA Generativa**

A AICA utiliza o Google Gemini API para diversas funcionalidades (pesquisa de convidados para podcast, geração de roteiros, sugestões de tarefas, análise de sentimento). Este uso exige atenção especial nos documentos legais:

* **Transparência sobre processamento por IA:** GDPR Art. 13-14 e Portaria ANPD 5/2024 exigem informação clara quando dados pessoais são processados por algoritmos.

* **Decisão automatizada vs. assistida:** A AICA segue modelo 'human-in-the-loop' — IA sugere, usuário decide. Isto deve ser claramente declarado para evitar enquadramento no Art. 22 GDPR.

* **Não treinamento de modelos:** Declarar explicitamente que dados de usuários NÃO são usados para treinar modelos de IA de terceiros.

* **Opt-out granular:** O sistema de consentimento já implementado (ConsentPurpose.AI\_PROCESSING) deve ser refletido na política.

* **DPIA (Relatório de Impacto):** Recomendar a elaboração de RIPD para o processamento por IA, conforme exigência GDPR para processamento de alto risco.

## **6\. Recomendações de Implementação**

| Prioridade | Ação | Prazo | Status |
| ----- | ----- | ----- | ----- |
| **CRÍTICA** | Publicar Política de Privacidade v2.0 com cobertura LGPD+GDPR+CCPA | Março 2026 | Em elaboração |
| **CRÍTICA** | Publicar Termos de Serviço v2.0 com cláusulas de pagamento e IA | Março 2026 | Em elaboração |
| **ALTA** | Nomear DPO/Encarregado e publicar contato | Março 2026 | Pendente |
| **ALTA** | Implementar banner de cookies com granularidade LGPD/GDPR | Abril 2026 | Pendente |
| **ALTA** | Elaborar RIPD (Relatório de Impacto à Proteção de Dados) para processamento IA | Abril 2026 | Pendente |
| **MÉDIA** | Implementar link 'Do Not Sell' para conformidade CCPA | Maio 2026 | Pendente |
| **MÉDIA** | Estabelecer processo DSAR automatizado respeitando prazos de cada jurisdição | Maio 2026 | Parcial (backend pronto) |
| **MÉDIA** | Firmar DPAs (Acordos de Processamento de Dados) com Google e Supabase | Junho 2026 | Pendente |

*As minutas detalhadas da Política de Privacidade e dos Termos de Serviço encontram-se nas Partes II e III deste documento.*

# **PARTE II — MINUTA: POLÍTICA DE PRIVACIDADE**

*Esta minuta incorpora os requisitos identificados na pesquisa regulatória (Parte I), cobrindo simultaneamente LGPD, GDPR e CCPA/CPRA. Notas em itálico indicam instruções de personalização.*

**POLÍTICA DE PRIVACIDADE — AICA LIFE OS**

*Última atualização: \[DATA DE PUBLICAÇÃO\]*

## **1\. Introdução e Escopo**

A Aica ("nós", "nosso" ou "nossa") opera a plataforma Aica Life OS, um Sistema Operacional de Vida Integral que integra gestão de tarefas, calendário, reflexão pessoal, rede de contatos, captação de financiamento, produção de conteúdo e gestão financeira em uma plataforma unificada.

Esta Política de Privacidade descreve como coletamos, usamos, compartilhamos e protegemos suas informações pessoais quando você utiliza nossos serviços, e quais são seus direitos em relação aos seus dados. Esta política aplica-se globalmente e atende aos requisitos da:

* Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) — Brasil

* Regulamento Geral de Proteção de Dados (GDPR — EU 2016/679) — União Europeia

* California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA) — Estados Unidos

* Marco Civil da Internet (Lei nº 12.965/2014) — Brasil

* Código de Defesa do Consumidor (Lei nº 8.078/1990) — Brasil

## **2\. Identificação do Controlador**

**Controlador de Dados:** \[RAZÃO SOCIAL DA AICA\]

**CNPJ:** \[NÚMERO DO CNPJ\]

**Endereço:** \[ENDEREÇO COMPLETO\]

**Encarregado de Dados (DPO):** \[NOME DO DPO\]

**E-mail do Encarregado:** dpo@aica.life

**E-mail geral:** contato@comtxae.com

## **3\. Dados que Coletamos**

**3.1. Dados Fornecidos Diretamente por Você**

* **Dados de cadastro:** nome, endereço de e-mail, senha (armazenada com hash), foto de perfil.

* **Conteúdo criado:** tarefas (Atlas), reflexões diárias (Jornada), contatos profissionais (Rede), projetos de captação (Captação), episódios de podcast (Studio), transações financeiras (Financeiro).

* **Dados de calendário:** quando você conecta seu Google Calendar, acessamos eventos para sincronização.

* **Dados financeiros:** transações, categorias de gastos e receitas inseridos manualmente no módulo Financeiro.

* **Comunicações:** mensagens de suporte, feedback e interações via e-mail ou Telegram.

**3.2. Dados Coletados Automaticamente**

* **Dados de uso:** interações com a plataforma, funcionalidades utilizadas, horários de acesso.

* **Dados de dispositivo:** tipo de dispositivo, sistema operacional, versão do navegador.

* **Dados de rede:** endereço IP, localização aproximada (derivada do IP).

* **Cookies e tecnologias similares:** veja Seção 10 para detalhes.

**3.3. Dados Recebidos de Terceiros**

* **Google:** dados de perfil via Google Sign-In (nome, e-mail, foto); eventos do Google Calendar.

* **Telegram:** mensagens e metadados quando a integração está ativa.

**3.4. Categorias de Dados para Fins do CCPA**

Para usuários residentes na Califórnia, coletamos as seguintes categorias conforme definido pelo CCPA:

* Identificadores (nome, e-mail, IP)

* Informações comerciais (histórico de transações)

* Atividade na internet (logs de uso, funcionalidades acessadas)

* Informações profissionais (rede de contatos, projetos)

* Inferências (preferências derivadas pelo uso da plataforma e por IA)

## **4\. Como Utilizamos Seus Dados**

Processamos seus dados pessoais com as seguintes finalidades e bases legais:

| Finalidade | Base Legal (LGPD) | Base Legal (GDPR) |
| ----- | ----- | ----- |
| Prestação dos serviços contratados | Execução de contrato (Art. 7º, V) | Contrato (Art. 6(1)(b)) |
| Personalização com IA | Consentimento (Art. 7º, I) | Consentimento (Art. 6(1)(a)) |
| Análise e melhoria do serviço | Legítimo interesse (Art. 7º, IX) | Interesse legítimo (Art. 6(1)(f)) |
| Comunicações de marketing | Consentimento (Art. 7º, I) | Consentimento (Art. 6(1)(a)) |
| Segurança e prevenção de fraudes | Legítimo interesse (Art. 7º, IX) | Interesse legítimo (Art. 6(1)(f)) |
| Obrigações legais e regulatórias | Obrigação legal (Art. 7º, II) | Obrigação legal (Art. 6(1)(c)) |

## **5\. Processamento por Inteligência Artificial**

A Aica utiliza inteligência artificial (Google Gemini API) para aprimorar sua experiência. É fundamental que você compreenda como essa tecnologia interage com seus dados:

* **Funcionalidades com IA:** pesquisa e briefing de convidados para podcasts (Studio), sugestões de tarefas e priorização (Atlas), análise de padrões de produção e bem-estar (Jornada), sugestões para editais de financiamento (Captação), categorização automática de transações (Financeiro).

* **Modelo assistido (human-in-the-loop):** todas as sugestões de IA são apresentadas como recomendações. A decisão final é sempre sua. Não tomamos decisões automatizadas que produzam efeitos jurídicos sobre você.

* **Seus dados NÃO treinam modelos:** os dados enviados à API do Google Gemini são usados exclusivamente para gerar respostas imediatas e não são retidos pelo Google para treinamento de modelos, conforme os Termos de Processamento de Dados do Google Cloud.

* **Consentimento separado:** o processamento de dados por IA requer consentimento específico, que pode ser revogado a qualquer momento nas configurações da plataforma, sem prejuízo das demais funcionalidades.

* **Limitações da IA:** as sugestões de IA são fornecidas 'como estão' e podem conter imprecisões. Não garantimos a acurácia, completude ou adequação para qualquer finalidade específica.

## **6\. Compartilhamento de Dados**

**6.1. Subprocessadores**

Compartilhamos seus dados com os seguintes prestadores de serviço (subprocessadores), estritamente para a prestação do serviço:

| Subprocessador | Finalidade | Dados Processados | Localização |
| ----- | ----- | ----- | ----- |
| Supabase (PostgreSQL) | Banco de dados principal, autenticação | Todos os dados da plataforma | EUA (AWS us-east-1) |
| Google Cloud | Hospedagem (Cloud Run), APIs | Dados de aplicação, logs | EUA / Região configurável |
| Google Gemini API | Processamento de IA generativa | Dados enviados para geração (sem retenção) | EUA |
| Google (Auth/Calendar/Drive) | Autenticação, sincronização | Perfil, eventos de calendário | Global |
| Telegram API | Integração de mensagens | Mensagens, metadados | Global |

**6.2. Não vendemos seus dados**

A Aica NÃO vende, NÃO compartilha para fins de publicidade cruzada e NÃO aluga suas informações pessoais a terceiros. Para fins do CCPA, declaramos que não 'vendemos' nem 'compartilhamos' (conforme definição legal) dados pessoais de consumidores californianos.

**6.3. Divulgação obrigatória**

Podemos divulgar dados pessoais quando exigido por lei, ordem judicial, ou para proteger nossos direitos legais, a segurança de usuários ou o interesse público.

## **7\. Transferência Internacional de Dados**

Seus dados podem ser transferidos e processados em países fora do Brasil, incluindo os Estados Unidos, onde estão localizados nossos principais provedores de infraestrutura. Para garantir a proteção adequada:

* Utilizamos Cláusulas Contratuais Padrão (CCPs) aprovadas pela ANPD (Resolução 8/2025) para transferências internacionais a partir do Brasil.

* Adotamos Standard Contractual Clauses (SCCs) da Comissão Europeia para transferências a partir da UE/EEE.

* Realizamos Transfer Impact Assessments (TIAs) quando aplicável, conforme orientações pós-Schrems II.

* Implementamos medidas técnicas suplementares: criptografia end-to-end, pseudonimização e controles de acesso rigorosos.

## **8\. Retenção de Dados**

Mantemos seus dados pelo período mínimo necessário para cada finalidade:

| Categoria de Dados | Período de Retenção | Base Legal |
| ----- | ----- | ----- |
| Dados de conta e perfil | Até exclusão da conta pelo usuário | Execução de contrato |
| Conteúdo criado (tarefas, reflexões, contatos) | Até exclusão pelo usuário ou da conta | Execução de contrato |
| Mensagens de integrações (Telegram) | 365 dias, com soft-delete | Consentimento / Limitação de finalidade |
| Logs de sessão e acesso | 30 dias | Legítimo interesse |
| Dados de análise de IA (anonimizados após 30 dias) | 365 dias (anonimizado) | Legítimo interesse |
| Logs de auditoria de privacidade | 730 dias (2 anos) | Obrigação legal |
| Dados de cache e temporários | 7 dias | Limitação de finalidade |

## **9\. Seus Direitos**

**9.1. Direitos sob a LGPD (Residentes no Brasil)**

Conforme os Artigos 17 e 18 da LGPD, você tem direito a:

* Confirmação e acesso aos seus dados pessoais (resposta simplificada imediata; completa em até 15 dias)

* Correção de dados incompletos, inexatos ou desatualizados

* Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos

* Portabilidade dos dados a outro fornecedor de serviço

* Eliminação dos dados tratados com base no consentimento

* Informação sobre compartilhamento com terceiros

* Revogação do consentimento a qualquer momento

* Oposição ao tratamento quando baseado em legítimo interesse

* Revisão de decisões automatizadas (Art. 20\)

**9.2. Direitos adicionais sob o GDPR (Residentes na UE/EEE)**

* Direito à portabilidade em formato estruturado, de uso corrente e leitura automática (JSON/CSV)

* Direito à restrição do processamento

* Direito de não ser sujeito a decisões exclusivamente automatizadas (Art. 22 GDPR)

* Direito de apresentar reclamação à autoridade de proteção de dados competente

**9.3. Direitos sob o CCPA/CPRA (Residentes na Califórnia)**

* Direito de saber quais categorias e peças específicas de dados pessoais coletamos

* Direito de exclusão dos seus dados pessoais

* Direito de correção de dados pessoais inexatos

* Direito de opt-out da venda/compartilhamento de dados (não aplicável — não vendemos dados)

* Direito de limitar o uso de dados pessoais sensíveis

* Direito à não discriminação pelo exercício de direitos

**9.4. Como Exercer Seus Direitos**

Você pode exercer seus direitos de duas formas:

* Diretamente na plataforma: Configurações \> Privacidade \> Meus Dados

* Por e-mail: dpo@aica.life

Responderemos no prazo mais restritivo aplicável à sua jurisdição (15 dias para Brasil, 30 dias para UE, 45 dias para Califórnia).

## **10\. Cookies e Tecnologias Similares**

Utilizamos cookies e tecnologias similares para:

* **Cookies essenciais:** necessários para autenticação e funcionamento da plataforma. Não requerem consentimento.

* **Cookies de desempenho:** análise de uso e melhoria do serviço. Requerem consentimento opt-in (LGPD/GDPR).

* **Cookies de funcionalidade:** preferências e personalização. Requerem consentimento opt-in.

Você pode gerenciar suas preferências de cookies através do banner de consentimento apresentado em seu primeiro acesso, ou a qualquer momento nas Configurações da plataforma. Respeitamos automaticamente o sinal Global Privacy Control (GPC) quando detectado em seu navegador.

## **11\. Segurança dos Dados**

Implementamos medidas técnicas e organizacionais para proteger seus dados:

* Criptografia em trânsito (TLS 1.3) e em repouso (AES-256)

* Row Level Security (RLS) em todas as tabelas do banco de dados, garantindo isolamento completo entre usuários

* Autenticação segura via OAuth 2.0 (Google Sign-In) sem armazenamento de senhas de terceiros

* Logs de auditoria imutáveis com cadeia de hash para detecção de adulteração

* Mascaramento de PII (Informações Pessoais Identificáveis) em logs de sistema

* Políticas de retenção automatizadas com purgação agendada

* Backups regulares com criptografia

## **12\. Privacidade de Menores**

A Aica não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que coletamos dados de um menor sem consentimento parental adequado, tomaremos medidas imediatas para eliminar tais dados.

## **13\. Alterações nesta Política**

Podemos atualizar esta Política periodicamente. Para alterações materiais, notificaremos você com antecedência mínima de 30 dias através de: aviso destacado na plataforma, e-mail para seu endereço cadastrado, e atualização da data de 'última atualização' no topo desta página. Seu uso continuado após a notificação constitui aceitação das alterações.

## **14\. Contato**

Para dúvidas sobre esta política, sobre como tratamos seus dados, ou para exercer seus direitos:

**Encarregado de Dados (DPO):** dpo@aica.life

**Suporte geral:** contato@comtxae.com

Se não estiver satisfeito com nossa resposta, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) em www.gov.br/anpd, ou à autoridade de proteção de dados competente em sua jurisdição.

# **PARTE III — MINUTA: TERMOS DE SERVIÇO**

*Esta minuta atualiza os Termos de Serviço existentes, incorporando cláusulas de pagamento, IA, programa de convites e conformidade internacional.*

**TERMOS DE SERVIÇO — AICA LIFE OS**

*Última atualização: \[DATA DE PUBLICAÇÃO\]*

## **1\. Aceitação dos Termos**

Estes Termos de Serviço ("Termos") constituem um acordo legal entre você ("Usuário") e \[RAZÃO SOCIAL DA AICA\] ("Aica", "nós") e regem seu acesso e uso da plataforma Aica Life OS, incluindo todos os módulos, funcionalidades, APIs e serviços associados. Ao criar uma conta ou utilizar nossos serviços, você concorda com estes Termos e com nossa Política de Privacidade.

## **2\. Descrição dos Serviços**

A Aica Life OS é um Sistema Operacional de Vida Integral que oferece os seguintes módulos:

* **Atlas:** gestão de tarefas com Matriz de Eisenhower e sincronização de calendário.

* **Jornada:** reflexão pessoal e autoconhecimento através de momentos e perguntas diárias.

* **Rede:** CRM pessoal com organização de contatos por contexto.

* **Captação:** gestão de oportunidades e projetos de financiamento assistida por IA.

* **Studio:** produção de podcasts com pesquisa de convidados e roteiros por IA.

* **Financeiro:** gestão de transações financeiras pessoais.

Os serviços podem ser atualizados, modificados ou descontinuados mediante aviso prévio de 30 dias.

## **3\. Conta de Usuário**

Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Deve ter no mínimo 18 anos de idade para utilizar a plataforma. Você concorda em fornecer informações verdadeiras, precisas e completas durante o cadastro, e em mantê-las atualizadas.

## **4\. Conduta do Usuário**

Ao utilizar a Aica, você concorda em NÃO:

* Violar leis ou regulamentos aplicáveis em qualquer jurisdição

* Infringir direitos de propriedade intelectual de terceiros

* Realizar engenharia reversa, descompilar ou desmontar a plataforma

* Tentar obter acesso não autorizado a sistemas, dados de outros usuários ou infraestrutura

* Distribuir código malicioso, fazer scraping ou coleta automatizada sem autorização

* Usar a plataforma para fins ilegais, assediar outros usuários ou falsificar identidade

## **5\. Propriedade Intelectual**

**5.1. Propriedade da Aica**

A plataforma Aica, incluindo código-fonte, design, funcionalidades, marca, logotipos e documentação, são de propriedade exclusiva da Aica ou de seus licenciadores, protegidos por leis de propriedade intelectual.

**5.2. Seu Conteúdo**

Você retém todos os direitos sobre o conteúdo que cria na plataforma. Ao utilizar a Aica, você nos concede uma licença limitada, não exclusiva e revogável para: armazenar e processar seu conteúdo para prestação dos serviços; manter cópias de segurança (backups); e utilizar dados agregados e anonimizados para melhoria da plataforma. Esta licença encerra-se automaticamente com a exclusão de sua conta.

## **6\. Serviços de Inteligência Artificial**

A Aica incorpora funcionalidades de IA generativa. Ao utilizá-las, você reconhece que:

* As sugestões de IA são recomendações, não aconselhamento profissional (jurídico, financeiro, médico, etc.)

* Os insights podem conter imprecisões e devem ser verificados antes de decisões importantes

* Você é integralmente responsável pelas decisões tomadas com base em recomendações da IA

* Não garantimos resultados específicos do uso de funcionalidades de IA

* Você pode desabilitar funcionalidades de IA a qualquer momento nas Configurações, sem perda de acesso aos demais módulos

## **7\. Integrações com Terceiros**

A Aica permite integração com serviços de terceiros (Google Calendar, Google Drive, Telegram, entre outros). Ao ativar uma integração, você concede à Aica permissão para acessar os dados necessários do serviço conectado, conforme os escopos de acesso apresentados no momento da autorização. Você pode revogar qualquer integração a qualquer momento. Não somos responsáveis pelos serviços, disponibilidade ou políticas de terceiros.

## **8\. Termos de Pagamento**

**8.1. Planos e Preços**

A Aica oferece os seguintes planos:

* **Gratuito:** acesso limitado a funcionalidades básicas, sem custo.

* **Pro (R$39,90/mês):** acesso completo a todos os módulos, funcionalidades de IA avançadas, suporte prioritário.

* **Teams (R$149,00/mês):** plano Pro \+ colaboração em equipe, gestão de membros, painel administrativo.

* **Consultoria:** serviços de consultoria individual com preços sob demanda.

Preços podem ser ajustados mediante aviso prévio de 30 dias. Alterações aplicam-se ao próximo ciclo de cobrança.

**8.2. Métodos de Pagamento**

Aceitamos: cartão de crédito/débito, PIX e Boleto Bancário. Pagamentos internacionais são processados em USD ou EUR através do nosso processador de pagamentos, com conversão cambial aplicável.

**8.3. Renovação e Cancelamento**

Assinaturas são renovadas automaticamente ao final de cada período. Você pode cancelar a qualquer momento nas Configurações. O cancelamento efetiva-se ao final do período já pago, mantendo acesso até o encerramento.

**8.4. Reembolso**

Oferecemos garantia de satisfação de 7 dias corridos a partir da primeira cobrança, conforme o Art. 49 do Código de Defesa do Consumidor. Após este período, reembolsos serão avaliados caso a caso.

## **9\. Programa de Convites**

A Aica pode oferecer um sistema de convites onde usuários existentes recebem convites limitados para compartilhar com terceiros. Ao enviar um convite, você declara que tem o consentimento do destinatário para compartilhar seu endereço de e-mail conosco. Convites não são transferíveis e não possuem valor monetário. A Aica reserva-se o direito de modificar ou descontinuar o programa a qualquer momento.

## **10\. Disponibilidade e Suporte**

Empenhamo-nos em manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência mínima de 24 horas. Suporte técnico é oferecido por e-mail em dias úteis, com tempo de resposta de até 48 horas para plano Gratuito e 24 horas para planos pagos.

## **11\. Limitação de Responsabilidade**

A PLATAFORMA É FORNECIDA "COMO ESTÁ" E "CONFORME DISPONÍVEL". Na máxima extensão permitida por lei, a Aica não será responsável por:

* Danos indiretos, incidentais, consequenciais, punitivos ou especiais

* Perda de dados, lucros cessantes ou interrupção de negócios

* Decisões tomadas com base em sugestões ou insights de IA

* Indisponibilidade ou mau funcionamento de serviços de terceiros integrados

* Conteúdo gerado por IA que contenha imprecisões

Nossa responsabilidade total em qualquer reclamação é limitada ao valor pago por você nos últimos 12 meses, ou R$500, o que for maior. Nada nestes Termos exclui responsabilidade que não pode ser limitada por lei aplicável (incluindo direitos do consumidor sob o CDC).

## **12\. Suspensão e Encerramento**

**12.1. Por Você**

Você pode encerrar sua conta a qualquer momento através de Configurações \> Conta \> Excluir Conta, ou entrando em contato com o suporte. Após a exclusão, seus dados serão removidos conforme nossa Política de Retenção de Dados (Seção 8 da Política de Privacidade).

**12.2. Por Nós**

Reservamo-nos o direito de suspender ou encerrar sua conta, mediante aviso prévio de 15 dias (exceto em casos de violação grave), se você violar estes Termos, usar a plataforma de forma prejudicial ou abusiva, fornecer informações falsas, ou não pagar taxas devidas após notificação.

## **13\. Modificações dos Termos**

Podemos atualizar estes Termos periodicamente. Para alterações materiais, notificaremos com antecedência mínima de 30 dias por aviso na plataforma e e-mail. Seu uso continuado após a notificação constitui aceitação. Se você discordar, deve cessar o uso e pode solicitar exclusão de conta e reembolso proporcional do período não utilizado.

## **14\. Resolução de Disputas**

**14.1. Lei Aplicável**

Estes Termos são regidos pelas leis da República Federativa do Brasil. Para usuários na UE/EEE, nada nestes Termos limita seus direitos obrigatórios sob as leis de proteção ao consumidor de seu país de residência. Para usuários na Califórnia, seus direitos sob o CCPA/CPRA são preservados independentemente destes Termos.

**14.2. Resolução Informal**

Antes de iniciar procedimento formal, encorajamos contato pelo e-mail contato@comtxae.com para tentativa de resolução amigável no prazo de 30 dias.

**14.3. Foro**

Para usuários brasileiros, qualquer disputa será resolvida no foro da comarca de \[CIDADE/ESTADO\], Brasil, conforme Art. 101, I do CDC quando aplicável. Usuários em outras jurisdições podem optar pela mediação online antes de procedimentos judiciais.

## **15\. Disposições Gerais**

Acordo Completo: Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre você e a Aica. Divisibilidade: Se qualquer disposição for considerada inválida, as demais permanecerão em vigor. Renúncia: A não aplicação de qualquer disposição não constitui renúncia. Cessão: Você não pode ceder seus direitos sem nosso consentimento prévio por escrito. A Aica pode ceder seus direitos mediante notificação.

## **16\. Contato**

**E-mail:** contato@comtxae.com

**DPO:** dpo@aica.life

Ao usar a Aica, você confirma que leu, compreendeu e concorda com estes Termos de Serviço.