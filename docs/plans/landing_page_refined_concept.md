# 🏺 AICA Life OS: O Oleiro Digital (Visão Híbrida)

O design de interface não é sobre onde os botões estão, é sobre como o usuário se sente ao apertá-los. Nesta visão refinada para a landing page do AICA Life OS, mesclamos a fisicalidade rústica e elegante da "Forja Suave" (o design system Ceramic) com o impacto de alívio imediato do "Sopro de Clareza". 

O objetivo é pegar o usuário num momento de exaustão digital, fazê-lo *sentir* o peso desse caos e, no segundo seguinte, entregar-lhe nas mãos uma ferramenta moldada perfeitamente para sua vida.

---

## 1. O Arco Narrativo: Do Caos à Argila Polida

A jornada do usuário na página é desenhada para espelhar a transição psicológica que o próprio produto oferece.

**1. O Confronto (Topo d'Água / 0-2s iniciais)**
- **Visual:** A tela carrega não com a beleza do Ceramic, mas com uma representação estilizada do caos atual do usuário. Estilhaços visuais (um relógio em vermelho, uma planilha quebrada, ícones de notificação, balões de WhatsApp desorganizados) flutuam como detritos numa opacidade desconfortável.
- **A Frase de Impacto:** Em tipografia pesada, a única âncora visual estável no centro dispara a verdade: **"Você não precisa de mais um app. Você precisa de espaço."**
- **Emoção:** Identificação imediata, fadiga, "meu Deus, essa é a minha vida".

**2. A Transmutação (Início do Scroll / Hero)**
- **Visual:** O fio âmbar do AICA desponta, circulando o caos. Ele atua como as mãos do oleiro. Os estilhaços giram, perdem suas arestas cortantes e se aglutinam no centro.
- **A Transição:** O barulho se afunila. O fundo "limpa" para o creme quente (`#F0EFE9`) do Ceramic. Da fusão daqueles estilhaços desajeitados, "nasce" um dashboard central, liso, perfeitamente emoldurado por sombras taupe suaves. 
- **Emoção:** O alívio de um respiro profundo. A passagem da ansiedade para o controle absoluto e estético.

**3. O Ateliê (Showcase dos Módulos)**
- **Visual:** O usuário rola para baixo e encontra seus módulos de vida não como links azuis, mas como blocos físicos, pedras polidas de cerâmica na mesa.
- **A Transição:** O fio narrativo continua. Agora que o caos virou massa moldável, apresentamos as "ferramentas" do oleiro. Cada bloco parece ter peso, reagindo fisicamente ao toque.
- **Emoção:** Curiosidade tátil, descoberta, sensação de produto artesanal e *premium*.

**4. A Porta do Forno (Conversão)**
- **Visual:** O fim da página não é um rodapé esquecido, é a porta de entrada. Um odômetro mecânico rotacionando vagarosamente marca os que já entraram. O design divide-se entre quem tem a "Chave do Ateliê" (Código) e quem aguarda a "Próxima Fornada" (Waitlist). 
- **Emoção:** Exclusividade, urgência controlada, pertencimento.

---

## 2. Storyboard Hero: A Roda do Oleiro

Esta animação não pode depender de scroll ativo para finalizar (para evitar travamentos). O scroll apenas dita a "narrativa de descer a página", mas a aglutinação é engatilhada e auto-resolvida para garantir fluidez.

* **Frame 1 (0ms): O Estado Cru**
  * O fundo não é o creme final, mas um tom levemente mais denso/sujo.
  * *Copy central:* Aparece brutal, em Inter/Fredoka bold: "Você não precisa de mais um app. Você precisa de espaço."
  * *Elementos:* 5 a 6 "estilhaços" 2D foscos flutuando erraticamente fora de foco (borrão levíssimo) nas bordas.
* **Frame 2 (Scroll detectado / 0-400ms): O Laço Magnético**
  * A copy central dissolve suavemente (fade out `linear`).
  * Um círculo muito fino em dourado âmbar (`#D97706`) se desenha no centro da tela (`stroke-dasharray`).
  * Os estilhaços param seu movimento errático e começam a ser puxados para o centro. Curva: `easeInExpo` (começam devagar, aceleram violentamente pro centro).
* **Frame 3 (400-700ms): A Forja**
  * Os estilhaços colidem no círculo central. Neste exato momento, o fundo da tela inteiro cruza para o creme quente e tranquilizador do Ceramic (`easeOutCubic`).
  * O amontoado de peças sofre um *scale down* rústico, borra-se em movimento (ilusão de velocidade) e comprime-se.
* **Frame final (700-1100ms): O Polimento**
  * Um card UI do AICA (um micro-dashboard lindo, com a clássica sombra do Ceramic apontando pra cima) "desabrocha" do ponto central (`scale 0` a `1`).
  * *Curva:* `spring` (Bounciness: 0.3). O card sobe, passa um pouquinho do tamanho ideal e assenta com inércia, como um bloco físico pesado caindo na mesa.
  * O brilho dourado (âmbar) corre uma vez pela borda superior e some.

**Mobile vs Desktop:**
* **Mobile:** A lente/ponto focal é menor, os estilhaços ocupam menos espaço horizontal e a copy de impacto ("Você não precisa de mais um app") domina 60% da tela inicial. O card que nasce é vertical (mobile dashboard).
* **Desktop:** O caos é mais espalhado. O card final que "nasce" da forja é largo, mostrando múltiplas colunas do OS simultaneamente.

---

## 3. A Prateleira de Módulos (Blocos Táteis)

Organizados em um Scroll X horizontal solto (no mobile, com *snap*), ou uma grade flexível asimétrica no desktop. 
Todos são blocos creme de raiz. A diferença de personalidade se dá nas ilustrações monocromáticas discretas encravadas (baixo-relevo) na tampa.
Ao serem tocados ou focados (*hover/tap*), eles afundam (`drop-shadow` vira `inset-shadow`), como se fossem botões físicos densos. A ilustração interna se ilumina levemente.

1. **Atlas (Caixa de Madeira):**
   * *Ilustração Tampa:* 4 quadrantes sutilmente afundados (Eisenhower).
   * *Ação Tátil:* Afunda firmemente. Um quadrante brilha em dourado.
   * *Frase de Valor:* "A matriz que corta o ruído."
2. **Journey (Diário de Argila):**
   * *Ilustração Tampa:* Uma linha gráfica sinuosa.
   * *Ação Tátil:* Afunda com suavidade. A linha anima-se como um pulso cardíaco cálido.
   * *Frase de Valor:* "Autoconhecimento registrado, emoções mapeadas."
3. **Studio (Microfone de Mesa):**
   * *Ilustração Tampa:* Formas de onda concêntricas.
   * *Ação Tátil:* A onda se estica.
   * *Frase de Valor:* "Sua voz, organizada pela IA."
4. **Grants (Cofre Translúcido):**
   * *Ilustração Tampa:* Documentos empilhados geometricamente.
   * *Ação Tátil:* O bloco parece revelar uma luz interna. 
   * *Frase de Valor:* "Editais mapeados. Recursos na mão."
5. **Finance (Bandeja Metálica):**
   * *Ilustração Tampa:* Um cifrão contido numa gaveta.
   * *Ação Tátil:* Um clique físico seco. O ícone de um PDF escorrega para a gaveta.
   * *Frase de Valor:* "Extratos lidos, gastos categorizados sozinhos."
6. **Connections (Placa de Fios):**
   * *Ilustração Tampa:* Nós conectados.
   * *Ação Tátil:* Um brilho viaja pelo fio central. O ícone do WhatsApp desponta na borda.
   * *Frase de Valor:* "O CRM do seu WhatsApp diário."
7. **Flux (Cronômetro Emborrachado):**
   * *Ilustração Tampa:* Um anel de completude e um halter.
   * *Ação Tátil:* Afundamento rápido e enérgico (spring veloz).
   * *Frase de Valor:* "Treinos prescritos. Execução rastreada."
8. **Agenda (Calendário Côncavo):**
   * *Ilustração Tampa:* Uma grade de 7x4.
   * *Ação Tátil:* Linhas de sincronização conectam os dias num flash rápido.
   * *Frase de Valor:* "Seu Google Calendar, agora inteligente."

**A Conexão Visual:** O fundo da seção tem linhas em "baixo-relevo" ziguezagueando entre a "prateleira". Se o usuário foca no **Atlas**, a linha que vai até a **Agenda** ganha brilho (indicando integração), sem que o usuário tenha que ler nenhum texto explicativo sobre isso.

---

## 4. A Conversão: A Porta do Ateliê

O fundo escurece ligeiramente (não para preto, mas para um tom areia denso), elevando as duas caixas de input principais, fazendo-as brilhar.

**Centro-Topo (A Prova Social):** 
O **Odômetro Mecânico**. Não é digital. Ele imita contadores físicos de portas ou flippers de estação de trem. Quando a página carrega essa seção, os números (`1`, `8`, `4`, `2`) "viram" mecanicamente com um salto físico até parar no número de inscritos reais. Traz visceralidade.

**Layout dos Caminhos (Dois Cards Grandes):**

**Caminho 1: O Acesso VIP (Código de Convite)**
* *Hierarquia:* É o card "Alfa". Fica sob os holofotes do Ceramic. Ele é creme, mas suas bordas têm chanfros reflexivos dourados.
* *Copy:* "Chave do Ateliê." / "Tem um convite? Seja bem-vindo."
* *Microinteração:* O placeholder é misterioso: `AICA-XXXX-XXXX`. Ao digitar cada caractere válido, o toque é recompensado com um pequeno salto (bounce) da letra. Se o código for recusado: O campo balança suavemente na horizontal e o recuo é suave. Códigos válidos: O texto do botão transita de "Verificar" para "Entrar no OS", o botão infla ligeiramente, brilhando totalmente em âmbar.

**Caminho 2: A Fila (Lista de Espera)**
* *Hierarquia:* Menor brilho. O design é mais fosco, encravado na parede (sombra interior de buraco), denotando que você vai ter que "depositar" seu e-mail num slot.
* *Copy:* "Próxima Fornada." / "Não empilhamos usuários, esculpimos rotinas. Entre na fila de qualidade."
* *Microinteração:* Ao submeter o e-mail, o botão de "Entrar" recua como uma trava física. Uma mensagem escorrega para a frente: *"Enviado à forja. Te avisaremos."* com a marca de um checkmark esculpido em argila.

---

## 5. Mapa de Motion Design (Desempenho Estrito)

Este mapa atende as especificações Mobile-first de performance. Tudo executado movendo CSS `transform` ou `opacity` usando GPU, sem `clip-paths` de scroll (usamos `Intersection Observer` para carregar animações ao invés de atrelar o progresso delas ao percentual do scroll, protegendo a renderização mobile).

| Seção | Trigger | Animação | Duração | Easing (Curva) | Comportamento Mobile | Fallback (Reduced-Motion) |
|---|---|---|---|---|---|---|
| **Página Inicial** | Load | Fade-up da frase principal e aparição dos detritos | 800ms | `easeOutQuart` | Mesma essência, ajustado limite vertical. | Aparece instantaneamente sem fade/slide |
| **Hero Transformação** | Scroll detectado (Primeiro deslizar) | Aglutinação central dos estilhaços (Scale/Translate) | 600ms | `easeInExpo` → colisão → `spring` (bounciness médio) | Centraliza a colisão para a grade central, garantindo que tudo chegue unificado. | Estado final do "Polimento" carregado por default (card já aparece) |
| **Pano de Fundo Hero** | Simultâneo à Colisão | Mudança do fundo "Sujo" para "Creme Ceramic" | 400ms | `linear` color transition | Fundo se espalha desde o card central para as bordas. | Cor creme default carregada do início |
| **Bloco de Módulo (Entrada)** | Scroll on view (Intersection) | Cards rotacionam de trás para frente no eixo X sutilmente | 500ms (Staggered 50ms) | `easeOutBack` | Fade Up simples por causa do container flexível. | Renderizados estaticamente no load |
| **Hover/Touch no Módulo** | User tap/hover | Drop-shadow vira inset-shadow (Afunda), ilustra brilham | 200ms | `spring` (stiffness alto, rápido) | Foco é mantido pós tap para leitura, desfaz com deslize. | Troca imediata de sombras (sem transição) |
| **Conexão Visual (Linhas)** | Foco em Módulo específico | Path length via SVG da linha ganha animação | 400ms | `easeInOutCubic` | Traços menores, fade-in da linha apenas se em vista. | Linha estática desativada |
| **Odômetro Waitlist** | Scroll on view (Intersection) | Efeito de roleta/flipper girando números verticais Y | 1200ms | `easeOutExpo` (Desacelera no final) | Mesmos blocos maiores para visão em telões miniatura. | Exibe número estático de imediato |
| **Input Convite VIP** | Keystroke (valid / invalid) | Shake horizontal / Botão "infla" no sucesso (Scale 1.05) | Shake: 300ms / Infla: 200ms | `spring` oscilatório | Teclado nativo não ofusca botão por ancoragem fixa na box. | Borda fica vermelha (erro) ou verde (sucesso), sem shake |
| **Input Waitlist (Sucesso)** | Submit Request | Botão desliza para baixo (como botão mecânico afundando e sumindo) | 300ms | `easeInCubic` | O texto desce o componente natural. | Botão troca de estado por texto "Enviado" na hora. |
