# Refatoração Visual do Módulo Studio (Ceramic UI)

## Visão Geral
O Módulo Studio (`StudioMode.tsx`) foi completamente refatorado para alinhar-se ao sistema de design "Aica Ceramic". O tema escuro/cyberpunk anterior foi substituído por uma estética minimalista, quente e tátil ("Warm Minimalist"), utilizando tons de creme, bege e sombras suaves.

## Componentes Refatorados

### 1. StudioHeader (`StudioHeader.tsx`)
- **Mudança**: De `bg-zinc-950` (Dark) para `bg-ceramic-base` (Light/Warm).
- **Detalhes**:
  - Botões com sombras táteis (`shadow-[...]`).
  - Tipografia atualizada para cores primárias (`#5C554B`) e secundárias (`#948D82`).
  - Indicadores de status (Clock, Timer, Connection) redesenhados como "cápsulas" embutidas ou elevadas.

### 2. LiveConsole (`LiveConsole.tsx`)
- **Mudança**: De painéis escuros para cartões brancos com bordas suaves.
- **Detalhes**:
  - Botões de controle "Monitorar" e "Co-Host" com estados ativos coloridos (Indigo/Purple) e inativos neutros.
  - Área de transcrição e chat com estilo de "papel" (`bg-white` com borda sutil).
  - Visualizador de áudio integrado com fundo `#E5E3DC`.

### 3. BioPanel (`BioPanel.tsx`)
- **Mudança**: Sistema de abas redesenhado e conteúdo tipográfico limpo.
- **Detalhes**:
  - Abas estilo "Segmented Control" com fundo `#E5E3DC` e seleção branca elevada.
  - Conteúdo da Bio com tipografia otimizada para leitura (`prose-sm`).
  - Seção de "Pontos Sensíveis" com destaque semântico (vermelho suave).

### 4. NewsMap (`NewsMap.tsx`)
- **Mudança**: Completa inversão de Dark Mode para Light Mode.
- **Detalhes**:
  - Fundo `#F7F6F4` com cartões de notícias brancos.
  - Indicadores de sentimento (Positivo/Negativo) com bordas coloridas laterais.
  - Filtros de sentimento como "pílulas" táteis.

### 5. TopicManager (`TopicManager.tsx`)
- **Mudança**: Inputs e lista de tópicos com design "Ceramic".
- **Detalhes**:
  - Input de nova pauta com sombra "Inset" (`shadow-inner`) para sensação de profundidade.
  - Itens da lista arrastáveis com `bg-white` e sombra suave.
  - Seção de Quebra-Gelo colapsável com estilo consistente.

### 6. AudioConsole (`AudioConsole.tsx`)
- **Mudança**: Refinamento do componente flutuante.
- **Detalhes**:
  - Fundo `#F0EFE9]/95` com blur para integração com o ambiente.
  - Sombras profundas para destacar o componente sobre o conteúdo.
  - Botão de gravação com gradiente Rose e anéis de pulsação.

### 7. TechnicalSheetView (`TechnicalSheetView.tsx`)
- **Mudança**: Adaptação para texto escuro e ícones coloridos.
- **Detalhes**:
  - Ícones com fundo circular `#F0EFE9`.
  - Layout de lista limpo e hierárquico.

## Cores Principais Utilizadas
- **Fundo Base**: `#F0EFE9` (Ceramic Base)
- **Superfícies**: `#FFFFFF` (White Card), `#F7F6F4` (Off-white)
- **Elementos UI**: `#E5E3DC` (Inputs/Tabs Background), `#D6D3CD` (Borders)
- **Texto**: `#5C554B` (Primary), `#948D82` (Secondary)
- **Acentos**: Indigo (IA/Ações), Rose (Gravação), Green (Sucesso/Conexão)

## Próximos Passos
- Validar a integração funcional completa (News API, Chat Backend).
- Testar em diferentes resoluções.
