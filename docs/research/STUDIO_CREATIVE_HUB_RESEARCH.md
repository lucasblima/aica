# AICA Studio: Hub Criativo de Conteudo — Pesquisa de Produto

**Data:** Fevereiro 2026
**Autor:** Lucas Boscacci Lima + Claude (pesquisa de produto)
**Modulo:** `src/modules/studio/`
**Status:** Pesquisa para roadmap

---

## 1. SUMARIO EXECUTIVO

### Visao Geral

O modulo Studio do AICA Life OS atualmente suporta producao de episodios de podcast com 4 etapas (Setup, Research, Pauta, Production). A arquitetura ja foi expandida para aceitar `podcast | video | article` via um config registry (`projectTypeConfigs.ts`), mas video e artigo estao marcados como `comingSoon: true`.

Este documento propoe a transformacao do Studio em um **Hub Criativo Completo** — uma plataforma integrada de criacao, producao e distribuicao de conteudo multimidia que atende criadores brasileiros. O hub abrangeria: podcasts, videos, artigos, newsletters, clips sociais e audiogramas.

### Principais Conclusoes

1. **O mercado brasileiro de criadores e massivo**: 106 milhoes de criadores (50% da populacao), mercado de USD 5,47 bilhoes em 2025, crescendo a 22,34% CAGR ate 2034. O Brasil e o 3o maior mercado de podcast do mundo com 51,8 milhoes de ouvintes.

2. **A IA transformou radicalmente o ciclo de criacao**: Ferramentas como Descript, Opus Clip, Castmagic e ElevenLabs reduziram o tempo de producao de semanas para horas. O Gemini 2.5 Flash/Pro do Google (ja integrado ao AICA) cobre a maioria das necessidades de NLP, sumarizacao e analise de conteudo.

3. **Reaproveitamento e o diferencial**: O modelo "crie uma vez, publique em todo lugar" e o padrao ouro. Um unico podcast pode gerar 10+ assets (clips, artigos, posts, newsletters, audiogramas). Plataformas como Repurpose.io cobram R$120-650+/mes so por essa funcionalidade.

4. **IA em portugues brasileiro esta madura**: O Gemini 2.5 tem excelente suporte a PT-BR. Modelos especializados como Tucano (200B tokens em portugues), GovBERT-BR e Sabia complementam para casos especificos. Transcricao de audio em PT-BR funciona bem tanto via Gemini quanto via Whisper/Deepgram.

5. **O gap de mercado e claro**: Nao existe uma plataforma brasileira que integre criacao de conteudo, IA em portugues, gestao de pipeline criativo e distribuicao multi-plataforma em um unico produto. O AICA pode preencher esse gap.

### Recomendacoes Estrategicas

- **Fase 1 (MVP)**: Expandir podcast com reaproveitamento automatico (clips, transcritos, show notes)
- **Fase 2**: Adicionar artigo/newsletter com assistencia IA para escrita e SEO
- **Fase 3**: Video com edicao assistida, legendas automaticas e thumbnails IA
- **Fase 4**: Distribuicao multi-plataforma e analytics cross-platform
- **Fase 5**: Marketplace de templates e workflows colaborativos

---

## 2. CICLO DE VIDA DA CRIACAO DE CONTEUDO — Framework Universal

### 2.1 Pre-Producao

| Tarefa | Podcast | Video | Artigo | Newsletter | Clip Social |
|--------|---------|-------|--------|------------|-------------|
| Pesquisa de tema/tendencias | Sim | Sim | Sim | Sim | Derivado |
| Analise de publico-alvo | Sim | Sim | Sim | Sim | Derivado |
| Definicao de pauta/roteiro | Pauta | Roteiro | Outline | Curadoria | Derivado |
| Pesquisa de convidado/fonte | Sim | Sim | Sim | Opcional | Nao |
| Briefing de convidado | Sim | Sim | Nao | Nao | Nao |
| Preparacao de perguntas | Sim | Sim | Nao | Nao | Nao |
| Agendamento | Sim | Sim | Deadline | Deadline | Derivado |
| Checklist tecnico | Audio/mic | Camera/luz | Nao | Nao | Nao |

**O que a IA pode fazer na pre-producao:**
- 🤖 Pesquisa automatizada de temas via RAG + Google Search grounding (Gemini 2.5 Flash)
- 🤖 Geracao de pauta/roteiro/outline com contexto do nicho (Gemini 2.5 Pro)
- 🤖 Pesquisa de perfil de convidado (ja implementado no Studio via `podcastAIService.ts`)
- 🤖 Sugestao de perguntas baseadas no perfil do convidado
- 🤖 Analise de tendencias e temas em alta (Gemini + Google Search grounding)
- 👤 Decisao editorial final (humano)
- 👤 Relacionamento com convidado (humano)
- 👤 Visao artistica/criativa (humano)

**Ferramentas/APIs de mercado:**
- Pesquisa: Google Trends API, Gemini com Google Search grounding
- Pauta: Gemini 2.5 Pro, Jasper AI ($39-59/mes)
- Convidado: LinkedIn API, Gemini para sumarizacao de perfil

### 2.2 Producao

| Tarefa | Podcast | Video | Artigo | Newsletter | Clip Social |
|--------|---------|-------|--------|------------|-------------|
| Gravacao/escrita | Audio | Video+audio | Texto | Texto | Edicao |
| Teleprompter | Sim | Sim | Nao | Nao | Nao |
| Gravacao remota | Sim | Sim | Nao | Nao | Nao |
| Edicao ao vivo | Nao | Nao | Sim | Sim | Sim |
| Captura de tela | Opcional | Sim | Nao | Nao | Nao |

**O que a IA pode fazer na producao:**
- 🤖 Teleprompter inteligente (ja implementado via `TeleprompterWindow.tsx`)
- 🤖 Transcricao em tempo real (Gemini Live API)
- 🤖 Remocao de ruido de audio (ElevenLabs, Podcastle)
- 🤖 Geracao de texto assistida (Gemini 2.5 Flash para rascunhos)
- 👤 Performance/entrega (humano)
- 👤 Edicao artistica (humano)
- 👤 Tom e voz autoral (humano)

**Ferramentas/APIs de mercado:**
- Gravacao remota: Riverside.fm ($15/mes), Descript
- Transcricao: Gemini 2.5 (nativo), Deepgram ($0.005/min), AssemblyAI ($0.006/min)
- Edicao de texto: Gemini 2.5 Flash, Jasper AI

### 2.3 Pos-Producao

| Tarefa | Podcast | Video | Artigo | Newsletter | Clip Social |
|--------|---------|-------|--------|------------|-------------|
| Edicao/corte | Audio | Video+audio | Revisao | Revisao | Corte |
| Transcricao | Sim | Sim | Nao | Nao | Sim |
| Legendas/captions | Opcional | Sim | Nao | Nao | Sim |
| Thumbnail/capa | Sim | Sim | Sim | Sim | Sim |
| Show notes | Sim | Descricao | Meta desc. | Preview | Caption |
| SEO | Sim | Sim | Sim | Sim | Hashtags |
| Extracao de clips | Sim | Sim | Nao | Nao | Produto final |
| Distribuicao | Multi-plat. | Multi-plat. | Publicacao | Envio | Multi-plat. |
| Analytics | Sim | Sim | Sim | Sim | Sim |

**O que a IA pode fazer na pos-producao:**
- 🤖 Transcricao automatica (Gemini 2.5 — ate 9,5h de audio por prompt)
- 🤖 Geracao de legendas multi-idioma (Gemini, Maestra, HeyGen)
- 🤖 Extracao automatica de melhores momentos/clips (Opus Clip, Gemini analise)
- 🤖 Geracao de show notes/resumos (Gemini 2.5 Flash)
- 🤖 Criacao de thumbnails (Canva API, Midjourney via API)
- 🤖 Otimizacao de SEO (Surfer SEO, Gemini)
- 🤖 Geracao de hashtags e captions (Gemini 2.5 Flash)
- 🤖 Formatacao por plataforma (Repurpose.io)
- 👤 Aprovacao final de edits (humano)
- 👤 Decisao de publicacao (humano)
- 👤 Interacao com audiencia (humano)

**Ferramentas/APIs de mercado:**
- Clips: Opus Clip ($15-29/mes), Castmagic
- Legendas: Maestra, Veed, AssemblyAI
- Thumbnails: Canva API, Pikzels, FastPix
- Distribuicao: Repurpose.io ($349-1790/ano), Buffer ($6/canal/mes)
- Analytics: Dash Social, Socialinsider

---

## 3. ANALISE DE COMPETIDORES E REFERENCIAS

### 3.1 Ferramentas de Podcast

| Plataforma | Workflow | Diferencial | Precos | API |
|-----------|----------|-------------|--------|-----|
| **Riverside.fm** | Gravacao remota HD + edicao baseada em texto + Magic Clips | Gravacao lossless ate 4K, cada participante grava localmente | Free / $15/mes (Standard) / $24/mes (Business) | Nao publica |
| **Descript** | Edicao de audio/video pela transcricao + Overdub (voz IA) | Editar audio editando texto; clonagem de voz para correcoes | Free / $24/mes (Hobbyist) / $33/mes (Pro) | API limitada |
| **Spotify for Creators** | Hosting gratuito + analytics + monetizacao + video podcast | Acesso direto ao ecossistema Spotify, Partner Program (3 eps + 2K horas) | Gratuito | Distribution API (recente) |
| **Castmagic** | Upload de audio, transcricao IA, geracao automatica de conteudo | Templates automaticos para newsletter, tweets, Q&A, resumos | Free / Creator / Pro / Teams | API em beta |

### 3.2 Ferramentas de Video

| Plataforma | Workflow | Diferencial | Precos | API |
|-----------|----------|-------------|--------|-----|
| **Kapwing** | Editor online + IA para legendas, corte, resize | Entry-level acessivel, forte em mobile, IA generosa no free | Free / $16/mes (Pro) / $50/mes (Business) | REST API |
| **Opus Clip** | Upload de video longo, IA extrai clips virais automaticamente | ClipAnything + ReframeAnything + Virality Score | Free / ~$15/mes (Starter) / ~$29/mes (Pro) | Nao publica |
| **Synthesia** | Avatares IA falam seu roteiro em 120+ idiomas | Videos com apresentador IA sem camera | Free limitado / $29/mes (Starter) | API disponivel |
| **Frame.io** | Revisao colaborativa de video com comentarios timestamped | Integracao Adobe Premiere/Final Cut, controle de versao | Free / $15/user/mes (Pro) / $25/user/mes (Team) | API REST completa |
| **CapCut** | Editor gratuito otimizado para short-form e social | Melhor editor gratuito do mercado, features IA agressivas | Free / Pro | Nao publica |

### 3.3 Ferramentas de Escrita

| Plataforma | Workflow | Diferencial | Precos | API |
|-----------|----------|-------------|--------|-----|
| **Notion** | Wiki + docs + database + gestao de projetos | Flexibilidade extrema, template marketplace | Free / $10/mes (Plus) / $18/mes (Business) | API REST completa |
| **Substack** | Newsletter + blog + comunidade + monetizacao | Rede social de escritores, descoberta organica, zero setup | Gratuito (10% do faturamento) | API limitada |
| **Ghost** | Blog + newsletter + memberships + SEO nativo | Open-source, 0% de comissao, SEO superior | $9/mes (Starter) / $25/mes (Creator) | API REST completa |
| **Jasper AI** | Escrita IA para marketing, SEO, ads, email | 30+ idiomas, brand voice, templates por canal | $39/mes (Creator) / $59/mes (Pro) | API no plano Business |

### 3.4 Plataformas Multi-Formato

| Plataforma | Workflow | Diferencial | Precos | API |
|-----------|----------|-------------|--------|-----|
| **Canva** | Design grafico + video + apresentacoes + social media | 12 APIs novas (2025): Design Editing, Autofill, Brand Templates | Free / $13/mes (Pro) / Enterprise | APIs extensas |
| **Repurpose.io** | Automatiza publicacao cross-platform | 1 conteudo para YouTube + TikTok + IG + LinkedIn + X automaticamente | $349/ano (Starter) / $790/ano (Pro) | Workflows automatizados |
| **Buffer** | Agendamento social + analytics + AI assistant | Simplicidade, Start Page (link in bio) | Free (3 canais) / $6/canal/mes | API disponivel |

### 3.5 Ferramentas AI-Nativas (2025-2026)

| Plataforma | Capacidade | Diferencial | Precos | API |
|-----------|------------|-------------|--------|-----|
| **Runway ML** | Geracao de video IA (Gen-4), edicao in-video | Aleph: edicao pos-geracao via prompt de texto | Free (125 creditos) / $15/editor/mes | API com pricing por credito |
| **ElevenLabs** | Text-to-speech, clonagem de voz, remocao de ruido | Qualidade de voz indistinguivel de humano em ingles; PT-BR bom | Free / $5/mes (Starter) / $99/mes (Pro) | API REST completa |
| **Suno** | Geracao de musica IA a partir de texto | Suno V5: qualidade de producao profissional | Free (50 cred/dia) / $10/mes (Pro) | Nao oficial (3rd party) |
| **Midjourney** | Geracao de imagens IA | Qualidade artistica superior para thumbnails e capas | ~$10/mes (Basic) / $30/mes (Standard) | Nao oficial (3rd party) |
| **NotebookLM** | Sumarizacao de documentos, geracao de podcasts IA | Podcast API para gerar conversas IA a partir de documentos | Gratuito / Enterprise | API Enterprise (allowlist) |

---

## 4. WORKFLOWS DE CONTEUDO POTENCIALIZADOS POR IA

### 4.1 Pesquisa e Curadoria

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Pesquisa de temas trending | Google Trends + Gemini Search Grounding | Sim, nativo | 🟢 Baixa |
| Sumarizacao de fontes | Gemini 2.5 Pro (1M tokens de contexto) | Sim, excelente | 🟢 Baixa |
| RAG sobre documentos proprios | Gemini File Search API | Sim, nativo | 🟡 Media |
| Analise de concorrentes | Gemini + web scraping | Parcial | 🟡 Media |
| Curadoria de noticias | Gemini Search Grounding + filtros | Sim | 🟡 Media |

### 4.2 Escrita e Roteirizacao

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Geracao de roteiro/pauta | Gemini 2.5 Pro | Sim, excelente em PT-BR | 🟢 Baixa |
| Otimizacao de SEO | Surfer SEO API / Frase | Parcial (falta dados SERP) | 🟡 Media |
| Ajuste de tom/voz | Gemini 2.5 Flash com few-shot | Sim | 🟢 Baixa |
| Geracao de headlines | Gemini 2.5 Flash | Sim | 🟢 Baixa |
| Verificacao de fatos | Gemini Search Grounding | Parcial (precisa validacao humana) | 🟡 Media |
| Traducao PT-BR para outros idiomas | Gemini 2.5 Flash | Sim, alta qualidade | 🟢 Baixa |

### 4.3 Audio

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Transcricao de audio | Gemini 2.5 (9,5h/prompt) / Deepgram ($0.005/min) | Sim, excelente | 🟢 Baixa |
| Diarizacao (separar speakers) | Gemini 2.5 (nativo) / AssemblyAI | Sim | 🟢 Baixa |
| Remocao de ruido | ElevenLabs / Podcastle | Nao (precisa modelo especializado) | 🟡 Media |
| Clonagem de voz | ElevenLabs ($5-99/mes) / Descript Overdub | Nao | 🔴 Alta |
| Text-to-speech PT-BR | ElevenLabs / Gemini Live API | Parcial (Gemini Live e novo) | 🟡 Media |
| Dublagem automatica | ElevenLabs / Rask AI | Nao | 🔴 Alta |
| Deteccao de filler words | AssemblyAI / Descript | Nao | 🟡 Media |

### 4.4 Video

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Auto-edicao (corte silencio) | Descript / CapCut | Nao | 🟡 Media |
| Extracao de clips virais | Opus Clip / Gemini (analise de transcricao) | Parcial (analise sim, corte nao) | 🟡 Media |
| Legendas automaticas | Gemini transcricao + SRT / Maestra | Parcial (transcricao sim, overlay nao) | 🟡 Media |
| B-roll automatico | Runway ML / Synthesia | Nao | 🔴 Alta |
| Resize multi-formato | Kapwing / Opus Clip ReframeAnything | Nao | 🟡 Media |
| Thumbnails IA | Canva API / Midjourney / Gemini Imagen | Parcial (Imagen emergente) | 🟡 Media |

### 4.5 Imagem e Design

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Capas de episodio | Canva Autofill API / Midjourney | Nao (Gemini nao e designer) | 🟡 Media |
| Quote cards | Canva API com templates | Nao | 🟡 Media |
| Social media graphics | Canva API / Figma API | Nao | 🟡 Media |
| Brand kit consistency | Canva Brand Templates API | Nao | 🟡 Media |

### 4.6 Distribuicao

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Formatacao por plataforma | Repurpose.io / APIs unificadas (Late, Post for Me) | Nao (mas Gemini gera o texto) | 🟡 Media |
| Agendamento multi-plataforma | Buffer API / Late API / Post for Me | Nao | 🟡 Media |
| Publicacao automatica | Spotify Distribution API / YouTube API | Nao | 🔴 Alta |
| Hashtag generation | Gemini 2.5 Flash | Sim | 🟢 Baixa |
| Caption por plataforma | Gemini 2.5 Flash (com prompt por rede) | Sim | 🟢 Baixa |

### 4.7 Analytics e Previsao

| Capacidade | Melhor Ferramenta/API | Gemini Resolve? | Complexidade |
|-----------|----------------------|-----------------|--------------|
| Previsao de engajamento | Dash Social Vision AI / Gemini analise | Parcial | 🔴 Alta |
| Insights de audiencia | Platform APIs nativas | Nao | 🟡 Media |
| Analise de sentimento | Gemini 2.5 Flash | Sim, excelente em PT-BR | 🟢 Baixa |
| Recomendacao de horario | Dados historicos + Gemini analise | Parcial | 🟡 Media |
| ROI de conteudo | Custom analytics pipeline | Nao | 🔴 Alta |

---

## 5. PIPELINE DE REAPROVEITAMENTO DE CONTEUDO

### 5.1 O Modelo "Crie Uma Vez, Publique em Todo Lugar"

Um unico podcast/video longo pode gerar:

```
📱 CONTEUDO-MAE (podcast 60min ou video longo)
    │
    ├── 📝 Transcricao completa
    │   ├── Artigo/blog post (2.000-3.000 palavras)
    │   ├── Show notes (500 palavras)
    │   ├── Newsletter semanal
    │   └── Thread no X/Twitter
    │
    ├── 🎬 Clips de video (15-60s)
    │   ├── 3-5 Reels/Shorts/TikToks
    │   ├── Clips para LinkedIn
    │   └── Teasers para stories
    │
    ├── 🎵 Audio
    │   ├── Audiogramas (audio + waveform animada)
    │   ├── Soundbites para stories
    │   └── Episodio editado (versoes curta/longa)
    │
    ├── 🖼️ Visuais
    │   ├── Thumbnail do episodio
    │   ├── 5-10 Quote cards
    │   ├── Carrossel Instagram/LinkedIn
    │   └── Infografico de resumo
    │
    └── 📊 Metadados
        ├── Descricao SEO
        ├── Tags/hashtags por plataforma
        ├── Timestamps/capitulos
        └── Captions por plataforma
```

**Total potencial: 20-30+ pecas de conteudo a partir de 1 gravacao.**

### 5.2 Workflow Otimo de Reaproveitamento

```
ETAPA 1: CAPTURA (Dia 0)
├── Gravar podcast/video
├── IA transcreve em tempo real
└── IA marca melhores momentos automaticamente

ETAPA 2: PROCESSAMENTO (Dia 0-1)
├── IA gera transcricao final com diarizacao
├── IA extrai 5-10 highlights/clips
├── IA gera resumo executivo e show notes
├── IA sugere titulos e descricoes SEO
└── IA cria draft de artigo/newsletter

ETAPA 3: PRODUCAO DE ASSETS (Dia 1-2)
├── Clips cortados e legendados automaticamente
├── Thumbnails gerados (template + IA)
├── Quote cards criados
├── Audiogramas produzidos
└── Carrosseis montados

ETAPA 4: REVISAO HUMANA (Dia 2-3)
├── Criador revisa e aprova cada asset
├── Ajusta tom, corrige erros
├── Seleciona melhores opcoes
└── Define calendario de publicacao

ETAPA 5: DISTRIBUICAO (Dia 3-7+)
├── Dia 3: Episodio completo (Spotify, Apple, YouTube)
├── Dia 3: Artigo/blog post
├── Dia 4-5: Clips nas redes sociais
├── Dia 5-6: Newsletter
├── Dia 6-7: Quote cards e audiogramas
└── Continuo: Reutilizacao em conteudo futuro
```

### 5.3 Best Practices por Plataforma

| Plataforma | Formato Ideal | Duracao | Aspect Ratio | Dicas |
|-----------|---------------|---------|--------------|-------|
| **YouTube** | Video longo + Shorts | Longo: 15-60min / Shorts: 30-60s | 16:9 / 9:16 | Thumbnails com texto grande, capitulos |
| **Spotify** | Audio + video podcast | 30-90min | N/A / 16:9 | Titulos descritivos, 3+ eps para Partner Program |
| **Instagram** | Reels + carrossel + stories | Reels: 15-60s / Carrossel: 10 slides | 9:16 / 1:1 | Hooks nos 3 primeiros segundos |
| **TikTok** | Video curto vertical | 15-60s (ideal 30s) | 9:16 | Trending sounds, legendas grandes |
| **LinkedIn** | Video + artigo + carrossel | Video: 1-3min / Post: 150-300 palavras | 1:1 ou 16:9 | Tom profissional, dados e insights |
| **X (Twitter)** | Threads + clips curtos | Thread: 5-10 tweets / Clip: 30s | 16:9 | Hooks fortes, engajamento no 1o tweet |
| **Apple Podcasts** | Audio | 30-90min | N/A | Show notes detalhados, capitulos |
| **Newsletter** | Email longo-form | 800-1.500 palavras | N/A | Assunto forte, CTA claro, personalizacao |

### 5.4 Ferramentas que Automatizam o Reaproveitamento

| Ferramenta | O que Automatiza | Preco | Integracao |
|-----------|-----------------|-------|------------|
| **Castmagic** | Transcricao, show notes, tweets, newsletter draft | A partir de ~$23/mes | Upload de audio |
| **Opus Clip** | Extracao de clips virais de videos longos | Free / $15-29/mes | Upload de video |
| **Repurpose.io** | Publicacao automatica cross-platform | $349-1790/ano | YouTube, TikTok, IG, LinkedIn, X |
| **Headliner** | Audiogramas (audio + waveform visual) | Free / $15/mes | Upload de audio |
| **Canva** | Quote cards, thumbnails, social graphics | Free / $13/mes (Pro) | Templates + API |
| **Descript** | Edicao por texto, clips, legendas | Free / $24-33/mes | Upload de audio/video |

---

## 6. WORKFLOWS COLABORATIVOS

### 6.1 Gestao de Convidados

**Pipeline de booking:**
```
Identificar → Pesquisar → Convidar → Confirmar → Briefar → Gravar → Follow-up
```

| Etapa | Descricao | Automacao IA |
|-------|-----------|-------------|
| Identificar | Encontrar convidados relevantes para o tema | 🤖 Gemini sugere com base no tema |
| Pesquisar | Levantar background do convidado | 🤖 Gemini pesquisa perfil (ja existe) |
| Convidar | Enviar convite personalizado | 🤖 Gemini gera email de convite |
| Confirmar | Agendar data/hora | 🤖 Integracao com Agenda (modulo existente) |
| Briefar | Enviar pauta e preparacao | 🤖 Gemini gera briefing automatico |
| Gravar | Sessao de gravacao | 👤 Humano |
| Follow-up | Agradecer, enviar link, solicitar divulgacao | 🤖 Gemini gera email de follow-up |

### 6.2 Papeis de Equipe

| Papel | Responsabilidades | Permissoes |
|-------|-------------------|------------|
| **Host/Criador** | Decisoes editoriais, gravacao, aprovacao final | Full access |
| **Produtor** | Agendamento, pipeline, coordenacao | Editar, agendar |
| **Editor** | Corte, montagem, pos-producao | Editar assets |
| **Designer** | Thumbnails, capas, visuais | Editar visuais |
| **Social Manager** | Distribuicao, agendamento, engajamento | Publicar, agendar |
| **Revisor** | Revisar textos, legendas, transcricoes | Comentar, aprovar |

### 6.3 Workflows de Revisao/Aprovacao

```
DRAFT → REVIEW → REVISION → APPROVED → SCHEDULED → PUBLISHED
         │          │
         └── Comentarios inline (a la Frame.io)
                    └── Criador revisa e atualiza
```

**Features necessarias:**
- Comentarios timestamped em audio/video (estilo Frame.io)
- Marcacao inline em textos
- Status por asset (draft, em revisao, aprovado, publicado)
- Notificacoes por etapa
- Historico de versoes

### 6.4 Controle de Versao para Assets Criativos

| Tipo de Asset | Versionamento | Ferramenta de Referencia |
|--------------|---------------|-------------------------|
| Audio | Versao por export (v1, v2, final) | Descript |
| Video | Versao por render + comentarios | Frame.io |
| Texto | Git-like diff + historico | Notion, Google Docs |
| Imagens | Versao por export | Canva |
| Metadata | Auditoria de mudancas | Custom (Supabase) |

---

## 7. ECOSSISTEMA DE CRIADORES BRASILEIROS

### 7.1 Plataformas Mais Populares

| Plataforma | Uso por Criadores BR | Observacoes |
|-----------|---------------------|-------------|
| **Instagram** | Dominante — Reels, Stories, Feed | Principal plataforma para criadores BR |
| **YouTube** | Muito forte — videos longos + Shorts | Monetizacao mais consolidada |
| **TikTok** | Crescimento explosivo — Gen Z | Forte em entretenimento, lifestyle, educacao |
| **Spotify** | Lider em podcast no Brasil | 44% dos brasileiros ouvem podcast semanalmente |
| **LinkedIn** | Crescente — conteudo profissional | Criadores B2B e thought leaders |
| **X (Twitter)** | Nicho — tech, politica, noticias | Threads e debates em tempo real |
| **Kwai** | Significativo — classes C/D | Competidor local do TikTok |
| **WhatsApp** | Distribuicao — grupos e listas | Canal de distribuicao, nao de criacao |

### 7.2 Mercado de Podcast BR (2025-2026)

- **51,8 milhoes** de ouvintes de podcast no Brasil (3o maior do mundo)
- **44%** dos brasileiros ouvem podcast semanalmente
- Mercado de publicidade em podcast no Brasil: projecao de **US$78,67 milhoes** ate 2027 (CAGR 3,63%)
- Receita global de publicidade em podcast/vodcast: **US$5 bilhoes** em 2026 (Deloitte)
- Spotify reduziu os requisitos do Partner Program em ~80% (jan/2026): 3 episodios + 2.000 horas + 1.000 ouvintes
- Video podcast e a tendencia dominante — Spotify investindo fortemente

### 7.3 Creator Economy BR

- **106 milhoes** de criadores no Brasil (50% da populacao, maior percentual global)
- Mercado de **USD 5,47 bilhoes** em 2025
- Projecao: **USD 33,58 bilhoes** ate 2034 (CAGR 22,34%)
- Profissionalizacao crescente: criadores se tornando embaixadores, co-criadores de produtos, lideres de comunidade
- Mais de 60% dos usuarios consomem conteudo comico ou de "relaxamento" regularmente
- Top 5 categorias: entretenimento geral, lifestyle, beleza/moda, educacao, humor

### 7.4 Ferramentas Locais Usadas

| Ferramenta | Uso | Observacao |
|-----------|-----|-----------|
| **Canva** | Design, social media | Extremamente popular no BR, localizacao excelente |
| **CapCut** | Edicao de video (especialmente Reels/TikTok) | Gratuito e poderoso |
| **mLabs** | Gestao de redes sociais | Ferramenta brasileira popular |
| **RD Station** | Marketing digital | Forte em B2B brasileiro |
| **Hotmart** | Monetizacao de conteudo digital | Plataforma brasileira de infoprodutos |
| **Kiwify** | Venda de produtos digitais | Alternativa ao Hotmart |
| **Spotify** | Distribuicao de podcast | Plataforma #1 para podcast no BR |
| **StreamYard** | Lives e gravacao remota | Popular para lives no YouTube/Facebook |

### 7.5 Consideracoes Regulatorias

**LGPD (Lei Geral de Protecao de Dados):**
- Aplica-se a qualquer organizacao que processe dados de individuos no Brasil
- Criadores devem ter politica de privacidade
- Coleta de dados de ouvintes/leitores requer consentimento
- ANPD (autoridade regulatoria) tem agenda ambiciosa para 2025-2026 incluindo IA
- Email marketing requer opt-in explicito

**Digital ECA (Lei 2.628/2022):**
- Protecao de criancas e adolescentes em ambientes digitais
- Afeta criadores que produzem conteudo para audiencia mais jovem
- Sancionada em setembro 2025

**Direitos Autorais:**
- Musica em podcasts/videos requer licenciamento (ECAD no Brasil)
- Uso de vozes clonadas por IA requer consentimento
- Conteudo gerado por IA nao tem protecao autoral clara (area cinza legal)

**Licenciamento de Conteudo:**
- CONAR regula publicidade e marketing de influenciadores
- Formats hibridos (afiliados, programas de criadores) sob escrutinio crescente

### 7.6 IA em PT-BR — Estado Atual

| Capacidade | Melhor Opcao | Qualidade PT-BR |
|-----------|-------------|-----------------|
| Geracao de texto | Gemini 2.5 Pro/Flash | Excelente |
| Transcricao de audio | Gemini 2.5 / Whisper large-v3 | Muito boa |
| Text-to-speech | ElevenLabs Multilingual v2 | Boa (sotaques limitados) |
| Analise de sentimento | Gemini 2.5 Flash (com few-shot PT-BR) | Muito boa |
| SEO em portugues | Surfer SEO / Frase | Boa |
| Modelos nativos PT-BR | Tucano (200B tokens), Sabia, GovBERT-BR | Em evolucao |
| Embeddings PT-BR | Gemini text-embedding-004 | Muito boa |

**Nota:** O GigaVerbo dataset (200B tokens deduplicated em portugues) e os modelos Tucano atingiram performance comparavel ao ingles em tarefas de NLP, mostrando que a barreira do idioma esta sendo superada.

### 7.7 Infraestrutura de Pagamento

| Metodo | Penetracao | Relevancia para Studio |
|--------|-----------|----------------------|
| **Pix** | Dominante (150M+ usuarios) | Pagamento instantaneo, zero taxa para pessoa fisica |
| **Boleto** | Ainda relevante | Importante para classes C/D sem cartao |
| **Cartao de credito** | Alto | Assinaturas recorrentes |
| **Carteiras digitais** | Crescente (PicPay, Mercado Pago) | Alternativa a cartao |

**Nota para AICA:** O modulo de Billing ja integra Asaas (gateway brasileiro) com suporte a Pix e boleto, alinhado com o mercado local.

---

## 8. ARQUITETURA PROPOSTA PARA O AICA STUDIO

### 8.1 Tipos de Conteudo — Pipeline Completa

#### 8.1.1 Podcast

**Pre-producao:**
| Etapa | Capacidade IA | Implementacao |
|-------|-------------|---------------|
| Pesquisa de tema | Gemini Search Grounding | Edge Function `studio-research` |
| Pesquisa de convidado | Gemini + web search | Ja existe (`podcastAIService.ts`) |
| Geracao de pauta | Gemini 2.5 Pro | Ja existe (`pautaGeneratorService.ts`) |
| Sugestao de perguntas | Gemini 2.5 Flash | Nova Edge Function |
| Agendamento | Integracao modulo Agenda | Frontend integration |

**Producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Teleprompter | Nativo | Ja existe (`TeleprompterWindow.tsx`) |
| Gravacao audio | WebRTC + MediaRecorder API | Expandir `audioUtils.ts` |
| Gravacao remota | Riverside.fm embed ou custom WebRTC | Integracao externa |
| Transcricao tempo real | Gemini Live API | Ja existe (`geminiLiveService.ts`) |

**Pos-producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Transcricao final | Gemini 2.5 (audio upload) | Edge Function `studio-transcribe` |
| Show notes automaticos | Gemini 2.5 Flash | Edge Function `studio-show-notes` |
| Extracao de clips | Gemini analise + FFmpeg (server) | Edge Function `studio-clips` |
| Legendas SRT | Gemini transcricao com timestamps | Edge Function |
| Distribuicao | Spotify API + RSS feed | Servico de distribuicao |

#### 8.1.2 Video

**Pre-producao:**
| Etapa | Capacidade IA | Implementacao |
|-------|-------------|---------------|
| Roteiro | Gemini 2.5 Pro com context do canal | Edge Function `studio-script` |
| Storyboard | Gemini descricao de cenas | Edge Function |
| Checklist de filmagem | Template + Gemini customizacao | Frontend component |

**Producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Upload de video | Supabase Storage + chunked upload | Frontend + backend |
| Transcricao | Gemini 2.5 (video upload ate 9,5h) | Edge Function |
| Marcacao de chapters | Gemini analise de transcricao | Edge Function |

**Pos-producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Legendas automaticas | Gemini transcricao + SRT | Edge Function |
| Thumbnail IA | Canva Autofill API ou Gemini Imagen | Edge Function + Canva |
| Descricao SEO | Gemini 2.5 Flash | Edge Function |
| Extracao de Shorts | Gemini analise + FFmpeg | Edge Function |
| Resize multi-formato | FFmpeg (server-side) | Cloud Run job |

#### 8.1.3 Artigo

**Pre-producao:**
| Etapa | Capacidade IA | Implementacao |
|-------|-------------|---------------|
| Pesquisa de tema + SEO | Gemini Search Grounding | Edge Function |
| Outline estruturado | Gemini 2.5 Pro | Edge Function `studio-outline` |
| Briefing de fontes | Gemini + RAG | Edge Function |

**Producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Editor de texto rico | TipTap ou Lexical (React) | Frontend component |
| Assistencia de escrita | Gemini 2.5 Flash (inline suggestions) | Edge Function streaming |
| Verificacao gramatical | Gemini ou LanguageTool API | Edge Function |

**Pos-producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Revisao de SEO | Gemini analise + metricas | Edge Function |
| Geracao de meta description | Gemini 2.5 Flash | Edge Function |
| Social media snippets | Gemini 2.5 Flash (por plataforma) | Edge Function |
| Imagem de capa | Canva API / Gemini Imagen | Edge Function |

#### 8.1.4 Newsletter

**Pre-producao:**
| Etapa | Capacidade IA | Implementacao |
|-------|-------------|---------------|
| Curadoria de conteudo | Gemini Search Grounding + RAG | Edge Function |
| Template selection | Configuracao + Gemini sugestao | Frontend |

**Producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Editor de newsletter | TipTap com blocks (header, CTA, quote) | Frontend component |
| Escrita assistida | Gemini 2.5 Flash | Edge Function streaming |
| Personalizacao | Merge fields + Gemini variantes | Backend |

**Pos-producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Preview multi-cliente | Email rendering engine | Frontend |
| A/B testing de subject | Gemini gera variantes | Edge Function |
| Envio | Resend API / Mailgun | Edge Function |
| Analytics | Open/click tracking | Backend |

#### 8.1.5 Clip Social

**Pre-producao:**
| Etapa | Capacidade IA | Implementacao |
|-------|-------------|---------------|
| Selecao de conteudo-mae | Gemini analisa transcricao e sugere melhores momentos | Edge Function |
| Escolha de formato | Template por plataforma | Frontend |

**Producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Corte automatico | FFmpeg + timestamps da IA | Cloud Run job |
| Legendas estilizadas | FFmpeg + ASS subtitles / Canva | Cloud Run job |
| Resize | FFmpeg (9:16, 1:1, 16:9) | Cloud Run job |

**Pos-producao:**
| Etapa | Ferramenta/API | Implementacao |
|-------|---------------|---------------|
| Caption por plataforma | Gemini 2.5 Flash (prompt por rede) | Edge Function |
| Hashtags | Gemini 2.5 Flash + trending analysis | Edge Function |
| Agendamento | APIs de plataforma (Late, Buffer) | Edge Function |
| Publicacao | APIs unificadas | Edge Function |

### 8.2 Preocupacoes Transversais

#### 8.2.1 Gestao de Assets (Media Library)

```
studio_assets
├── id (UUID)
├── user_id (UUID, FK auth.users)
├── project_id (UUID, FK studio_projects)
├── asset_type (enum: audio, video, image, document, transcript)
├── file_url (text, Supabase Storage)
├── file_size (bigint)
├── duration_seconds (int, nullable)
├── metadata (jsonb: dimensions, codec, bitrate)
├── tags (text[])
├── created_at (timestamp)
└── updated_at (timestamp)

studio_brand_kit
├── id (UUID)
├── user_id (UUID)
├── brand_name (text)
├── logo_url (text)
├── color_primary (text)
├── color_secondary (text)
├── font_heading (text)
├── font_body (text)
├── tone_of_voice (text)
├── intro_audio_url (text, nullable)
├── outro_audio_url (text, nullable)
└── templates (jsonb: thumbnail, quote_card, audiogram)

studio_templates
├── id (UUID)
├── user_id (UUID, nullable — null = system template)
├── template_type (enum: thumbnail, quote_card, social_post, newsletter)
├── name (text)
├── config (jsonb: layout, placeholders, styles)
├── preview_url (text)
└── is_public (boolean)
```

#### 8.2.2 Arquitetura de Agentes IA

```
STUDIO AI AGENTS (via Agent Orchestra do AICA)
│
├── 🔍 Research Agent
│   ├── Usa: Gemini Search Grounding + RAG
│   ├── Serve: Pre-producao (todos os formatos)
│   └── Trust Level: supervised (resultado sempre revisado)
│
├── ✍️ Writer Agent
│   ├── Usa: Gemini 2.5 Pro (roteiros), Flash (captions, hashtags)
│   ├── Serve: Producao (artigo, newsletter) + Pos-producao (show notes, descricoes)
│   └── Trust Level: supervised → auto (conforme uso)
│
├── 🎙️ Audio Agent
│   ├── Usa: Gemini 2.5 (transcricao) + ElevenLabs (TTS, noise)
│   ├── Serve: Producao (transcricao real-time) + Pos-producao (clips, legendas)
│   └── Trust Level: supervised
│
├── 🎬 Video Agent
│   ├── Usa: FFmpeg (corte) + Gemini (analise) + Canva (thumbnails)
│   ├── Serve: Pos-producao (clips, legendas, thumbnails)
│   └── Trust Level: supervised
│
├── 📊 Analytics Agent
│   ├── Usa: Gemini (analise) + Platform APIs (dados)
│   ├── Serve: Pos-publicacao (insights, recomendacoes)
│   └── Trust Level: auto (read-only)
│
└── 📤 Distribution Agent
    ├── Usa: Buffer/Late API + Platform APIs
    ├── Serve: Publicacao (agendamento, formatacao)
    └── Trust Level: supervised (publicacao requer aprovacao)
```

#### 8.2.3 Integracao com Calendario (Content Calendar)

```
studio_content_calendar
├── id (UUID)
├── user_id (UUID)
├── project_id (UUID, FK studio_projects)
├── asset_id (UUID, FK studio_assets, nullable)
├── platform (enum: spotify, youtube, instagram, tiktok, linkedin, x, newsletter, blog)
├── scheduled_at (timestamp)
├── published_at (timestamp, nullable)
├── status (enum: draft, scheduled, publishing, published, failed)
├── caption (text)
├── hashtags (text[])
├── metadata (jsonb: platform-specific)
└── created_at (timestamp)
```

**Integracao com modulo Agenda:**
- Deadlines de producao aparecem no calendario do AICA
- Datas de publicacao sincronizadas
- Lembretes automaticos por etapa do pipeline
- Vista de "Content Calendar" dedicada no Studio

#### 8.2.4 Dashboard de Analytics

**Metricas cross-platform:**
- Total de conteudos publicados (por periodo, por formato)
- Engajamento agregado (views, likes, comments, shares)
- Crescimento de audiencia (seguidores, assinantes, ouvintes)
- Performance por plataforma
- Melhor horario de publicacao
- ROI de conteudo (tempo investido vs. engajamento)

**Por conteudo individual:**
- Views/plays
- Engajamento rate
- Retention curve (para video/audio)
- Click-through rate (para newsletter)
- Conversao (cliques em CTA)

**Implementacao:**
- Dados coletados via Platform APIs (YouTube Analytics, Spotify for Creators, IG Insights, etc.)
- Armazenados em tabela `studio_analytics`
- Dashboard React com graficos (recharts ou visx, ja usados no AICA)
- Gemini gera insights semanais ("Seu clip sobre X performou 3x melhor que a media")

#### 8.2.5 Modelo de Colaboracao

| Feature | Implementacao | Prioridade |
|---------|---------------|-----------|
| Convites por email | Supabase auth + RLS policies | 🔴 Alta |
| Papeis (host, editor, designer) | Coluna `role` em tabela de membros | 🔴 Alta |
| Permissoes por papel | RLS policies granulares | 🔴 Alta |
| Comentarios em assets | Tabela `studio_comments` com timestamps | 🟡 Media |
| Notificacoes | Supabase Realtime + push notifications | 🟡 Media |
| Historico de atividade | Tabela de audit log | 🟢 Baixa |
| Co-edicao em tempo real | Supabase Realtime + CRDT | 🟢 Baixa |

### 8.3 Matriz de Prioridade — O Que Construir

#### Fase 1: Podcast Completo + Reaproveitamento (3-4 semanas)
**Objetivo:** Tornar o pipeline de podcast end-to-end, com reaproveitamento automatico.

| Feature | Descricao | Prioridade | Complexidade |
|---------|-----------|-----------|-------------|
| Transcricao automatica | Upload de audio, Gemini transcreve | 🔴 Alta | 🟢 Baixa |
| Show notes IA | Gemini gera resumo + highlights | 🔴 Alta | 🟢 Baixa |
| Extracao de quotes | Gemini identifica melhores frases | 🔴 Alta | 🟢 Baixa |
| Content Calendar basico | Tabela + UI de calendario de publicacao | 🔴 Alta | 🟡 Media |
| Brand kit basico | Logo, cores, fontes por usuario | 🟡 Media | 🟢 Baixa |

#### Fase 2: Artigo/Newsletter + Escrita IA (3-4 semanas)
**Objetivo:** Habilitar criacao de conteudo escrito com assistencia IA.

| Feature | Descricao | Prioridade | Complexidade |
|---------|-----------|-----------|-------------|
| Ativar tipo `article` | Remover `comingSoon`, implementar workspace | 🔴 Alta | 🟡 Media |
| Editor de texto rico | TipTap com toolbar completa | 🔴 Alta | 🟡 Media |
| Outline IA | Gemini gera estrutura de artigo | 🔴 Alta | 🟢 Baixa |
| Escrita assistida inline | Sugestoes enquanto digita | 🟡 Media | 🟡 Media |
| SEO analysis | Gemini analisa e sugere melhorias | 🟡 Media | 🟡 Media |
| Newsletter workspace | Template editor + preview + envio | 🟡 Media | 🔴 Alta |

#### Fase 3: Video + Clips Sociais (4-6 semanas)
**Objetivo:** Suporte a video com extracao automatica de clips.

| Feature | Descricao | Prioridade | Complexidade |
|---------|-----------|-----------|-------------|
| Ativar tipo `video` | Upload, transcricao, analise | 🔴 Alta | 🟡 Media |
| Legendas automaticas | Gemini gera SRT | 🔴 Alta | 🟡 Media |
| Extracao de clips | Gemini identifica momentos + FFmpeg corta | 🔴 Alta | 🔴 Alta |
| Thumbnails IA | Templates + Gemini Imagen / Canva API | 🟡 Media | 🟡 Media |
| Resize multi-formato | FFmpeg converte 16:9, 9:16, 1:1 | 🟡 Media | 🟡 Media |
| Audiogramas | Audio + waveform visual | 🟢 Baixa | 🟡 Media |

#### Fase 4: Distribuicao Multi-Plataforma (3-4 semanas)
**Objetivo:** Publicar e agendar conteudo em todas as plataformas.

| Feature | Descricao | Prioridade | Complexidade |
|---------|-----------|-----------|-------------|
| API social unificada | Integracao com Late/Buffer/Post for Me | 🔴 Alta | 🔴 Alta |
| Agendamento de posts | Content Calendar com scheduling | 🔴 Alta | 🟡 Media |
| Captions por plataforma | Gemini gera texto adaptado | 🔴 Alta | 🟢 Baixa |
| Hashtag suggestions | Gemini + trending analysis | 🟡 Media | 🟢 Baixa |
| RSS feed para podcast | Geracao automatica de RSS | 🟡 Media | 🟡 Media |
| Preview por plataforma | Mockup de como vai aparecer | 🟢 Baixa | 🟡 Media |

#### Fase 5: Analytics + Colaboracao (4-6 semanas)
**Objetivo:** Insights de performance e trabalho em equipe.

| Feature | Descricao | Prioridade | Complexidade |
|---------|-----------|-----------|-------------|
| Analytics dashboard | Metricas cross-platform | 🔴 Alta | 🔴 Alta |
| Insights IA | Gemini analisa performance e sugere | 🟡 Media | 🟡 Media |
| Convites de equipe | Email + role assignment | 🟡 Media | 🟡 Media |
| Comentarios em assets | Timestamped comments | 🟡 Media | 🟡 Media |
| Workflow de aprovacao | Status pipeline com notificacoes | 🟢 Baixa | 🟡 Media |
| Co-edicao real-time | CRDT + Supabase Realtime | 🟢 Baixa | 🔴 Alta |

### 8.4 Avaliacao de Viabilidade Tecnica

| Capacidade | Viabilidade | Dependencia | Nota |
|-----------|------------|-------------|------|
| Transcricao IA | ✅ Alta | Gemini API (ja integrado) | Audio ate 9,5h por prompt |
| Geracao de texto IA | ✅ Alta | Gemini API (ja integrado) | PT-BR excelente |
| Upload de audio/video | ✅ Alta | Supabase Storage | Limite: 50MB free tier |
| Extracao de clips (video) | 🟡 Media | FFmpeg no servidor | Requer Cloud Run job |
| Legendas automaticas | ✅ Alta | Gemini transcricao | SRT generation simples |
| Thumbnails IA | 🟡 Media | Canva API (Enterprise) ou Gemini Imagen | Canva requer Enterprise |
| Distribuicao multi-plat. | 🟡 Media | APIs de terceiros (Late, Buffer) | Custo adicional de APIs |
| Resize de video | 🟡 Media | FFmpeg no servidor | Requer Cloud Run job |
| TTS / clonagem de voz | 🟡 Media | ElevenLabs API ($5-99/mes) | Custo por uso |
| Analytics cross-platform | ⚠️ Baixa-media | Platform APIs (muitas restricoes) | Cada API tem limites |
| Co-edicao real-time | ⚠️ Baixa | CRDT + Supabase Realtime | Complexidade muito alta |
| Newsletter sending | ✅ Alta | Resend/Mailgun API | ~$20/mes para 50K emails |

### 8.5 Mudancas na Arquitetura Existente

**Tabela unificada `studio_projects` (substitui hierarchy atual):**

```sql
CREATE TABLE studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_type TEXT NOT NULL CHECK (project_type IN ('podcast', 'video', 'article', 'newsletter', 'clip')),
  parent_project_id UUID REFERENCES studio_projects(id), -- clips derivam de projetos-mae
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'approved', 'published', 'archived')),
  current_stage TEXT NOT NULL, -- etapa atual no pipeline
  stage_config JSONB NOT NULL DEFAULT '{}', -- config por tipo de projeto
  metadata JSONB NOT NULL DEFAULT '{}', -- dados especificos do tipo
  brand_kit_id UUID REFERENCES studio_brand_kit(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;

-- RLS: usuarios so veem seus proprios projetos
CREATE POLICY "Users can CRUD own projects" ON studio_projects
  FOR ALL USING (auth.uid() = user_id);
```

**Mapeamento com config registry existente:**

```typescript
// Expandir ProjectType no types/studio.ts
export type ProjectType = 'podcast' | 'video' | 'article' | 'newsletter' | 'clip';

// Expandir projectTypeConfigs.ts
const NEWSLETTER_CONFIG: ProjectTypeConfig = {
  type: 'newsletter',
  label: 'Newsletter',
  iconName: 'Mail',
  description: 'Newsletters com curadoria e escrita assistida por IA',
  color: 'violet',
  requiredFields: ['title', 'theme'],
  optionalFields: ['description', 'scheduledDate'],
  databaseTable: 'studio_projects', // tabela unificada
  hasParentHierarchy: false,
  stages: ['curate', 'write', 'design', 'review', 'send'],
  comingSoon: true,
};

const CLIP_CONFIG: ProjectTypeConfig = {
  type: 'clip',
  label: 'Clip Social',
  iconName: 'Scissors',
  description: 'Clips curtos derivados de podcasts e videos',
  color: 'pink',
  requiredFields: ['title'],
  optionalFields: ['platform', 'caption'],
  databaseTable: 'studio_projects',
  hasParentHierarchy: true, // deriva de projeto-mae
  stages: ['select', 'edit', 'caption', 'schedule'],
  comingSoon: true,
};
```

### 8.6 Edge Functions Necessarias (Novas)

| Edge Function | Capacidade | Gemini Model | Prioridade |
|--------------|-----------|-------------|-----------|
| `studio-transcribe` | Transcricao de audio/video com diarizacao | gemini-2.5-flash | 🔴 Fase 1 |
| `studio-show-notes` | Geracao de show notes, resumo, highlights | gemini-2.5-flash | 🔴 Fase 1 |
| `studio-extract-quotes` | Extracao de melhores frases/momentos | gemini-2.5-flash | 🔴 Fase 1 |
| `studio-outline` | Geracao de outline para artigos | gemini-2.5-pro | 🔴 Fase 2 |
| `studio-write-assist` | Escrita assistida inline (streaming) | gemini-2.5-flash | 🟡 Fase 2 |
| `studio-seo-analysis` | Analise e otimizacao de SEO | gemini-2.5-flash | 🟡 Fase 2 |
| `studio-generate-captions` | Captions por plataforma | gemini-2.5-flash | 🔴 Fase 4 |
| `studio-analytics-insights` | Insights semanais de performance | gemini-2.5-pro | 🟡 Fase 5 |
| `studio-clip-extract` | Identifica timestamps dos melhores momentos | gemini-2.5-flash | 🔴 Fase 3 |
| `studio-thumbnail` | Gera prompt para thumbnail ou chama Imagen | gemini-2.5-flash | 🟡 Fase 3 |

### 8.7 Estimativa de Custos de API (por usuario ativo/mes)

| Servico | Uso Estimado | Custo/mes |
|---------|-------------|-----------|
| Gemini 2.5 Flash | ~500K tokens input + 200K output | ~$0.15 |
| Gemini 2.5 Pro | ~100K tokens input + 50K output | ~$0.50 |
| Supabase Storage | ~5GB de audio/video | $0.25 |
| ElevenLabs (opcional) | ~50K caracteres TTS | ~$5.00 |
| Buffer/Late API (opcional) | ~100 posts/mes | ~$6.00 |
| Email (Resend) | ~1K emails/mes | ~$0.00 (free tier) |
| **Total base (sem extras)** | | **~$1.00/usuario/mes** |
| **Total com TTS + distribuicao** | | **~$12.00/usuario/mes** |

**Nota:** O custo base e extremamente baixo porque o Gemini (ja integrado ao AICA) cobre a maioria das necessidades de IA. Os custos sobem significativamente apenas com TTS (ElevenLabs) e distribuicao automatica (APIs de plataforma).

---

## 9. REFERENCIAS

### Mercado e Estatisticas
- IMARC Group - Brazil Creator Economy Market 2034: https://www.imarcgroup.com/brazil-creator-economy-market
- Polaris Market Research - Creator Economy Platforms Market: https://www.polarismarketresearch.com/industry-analysis/creator-economy-platforms-market
- Statista - Podcast Advertising Brazil: https://www.statista.com/outlook/dmo/digital-media/digital-music/podcast-advertising/brazil
- Backlinko - Podcast Statistics 2026: https://backlinko.com/podcast-stats
- Deloitte - Video Podcasts Reach 2026: https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions/2026/video-podcasts-reach.html
- Favikon - Creator Economy in Brazil: https://www.favikon.com/resources/analysis-of-the-creator-economy-in-brazil
- Mobility Foresights - Brazil Creator Economy Market: https://mobilityforesights.com/product/brazil-creator-ecoonomy-market
- ElectroIQ - Creator Economy Statistics 2025: https://electroiq.com/stats/creator-economy-statistics/

### Ferramentas e Plataformas
- Riverside.fm Pricing: https://riverside.com/pricing
- Castmagic Review 2026: https://www.linktly.com/artificial-intelligence-software/castmagic-review/
- Descript vs Riverside: https://www.fahimai.com/descript-vs-riverside
- Opus Clip Pricing: https://www.opus.pro/pricing
- Frame.io Pricing: https://dinosaur.frame.io/pricing
- CapCut Standard vs Pro: https://www.capcut.com/resource/capcut-standard-vs-pro
- Ghost vs Substack: https://ghost.org/vs/substack/
- Jasper AI Pricing: https://www.jasper.ai/pricing
- Canva APIs: https://www.canva.com/newsroom/news/new-apis-data-connectors/
- Repurpose.io: https://repurpose.io/
- Buffer Pricing: https://buffer.com/pricing
- Spotify for Creators: https://creators.spotify.com/

### IA e Tecnologia
- ElevenLabs API Pricing: https://elevenlabs.io/pricing/api
- ElevenLabs Pricing Breakdown 2026: https://flexprice.io/blog/elevenlabs-pricing-breakdown
- Runway ML Review 2026: https://toolhatch.ai/tool/runway-ml-review/
- Suno Pricing: https://suno.com/pricing
- Gemini API Audio Understanding: https://ai.google.dev/gemini-api/docs/audio
- Gemini 2.5 Pro Documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro
- Deepgram Speech-to-Text Pricing 2025: https://deepgram.com/learn/speech-to-text-api-pricing-breakdown-2025
- AssemblyAI Alternatives: https://www.assemblyai.com/blog/deepgram-alternatives
- Whisper API Pricing: https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed
- Zapier - Best AI Video Generators 2026: https://zapier.com/blog/best-ai-video-generator/
- NotebookLM API: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks

### IA em Portugues Brasileiro
- Tucano: Advancing Neural Text Generation for Portuguese: https://www.sciencedirect.com/science/article/pii/S2666389925001734
- TeenyTinyLlama: https://www.sciencedirect.com/science/article/pii/S2666827024000343
- GigaVerbo Dataset: https://techxplore.com/news/2025-07-dataset-boost-portuguese-language-ai.html
- LLMs in Brazilian Portuguese Survey: https://journals-sol.sbc.org.br/index.php/jbcs/article/view/5789
- Brazilian AI Linguistics: https://blog.scielo.org/en/2025/07/18/linguistics-for-a-brazilian-artificial-intelligence-ai/

### Regulamentacao e Legal
- LGPD Compliance: https://lawwwing.com/en/is-your-website-lgpd-compliant-a-guide-for-digital-businesses-in-brazil/
- Brazil Digital Policy 2025: https://www.cov.com/en/news-and-insights/insights/2025/02/brazils-digital-policy-in-2025-ai-cloud-cyber-data-centers-and-social-media
- Brazil Data Protection Report: https://iclg.com/practice-areas/data-protection-laws-and-regulations/brazil
- CONAR Advertising Regulations: https://practiceguides.chambers.com/practice-guides/advertising-marketing-2025/brazil/trends-and-developments

### SEO e Analytics
- Surfer SEO - Best AI SEO Tools: https://surferseo.com/blog/best-ai-seo-tools/
- Dash Social Predictive AI: https://www.dashsocial.com/features/predictive-ai
- Social Media Monitoring APIs: https://www.shortimize.com/blog/social-media-monitoring-api
- Socialinsider AI Analytics: https://www.socialinsider.io/blog/ai-social-media-analytics/

### Distribuicao e Agendamento
- Late - Unified Social Media API: https://getlate.dev/
- Post for Me API: https://www.postforme.dev
- Ayrshare Social Media API: https://www.ayrshare.com/
- Spotify Partner Program Updates: https://newsroom.spotify.com/2026-01-07/spotify-partner-program-updates/

### Reaproveitamento de Conteudo
- Descript - Repurpose Content: https://www.descript.com/blog/article/how-to-repurpose-content
- Foundation Inc - Podcast Repurposing: https://foundationinc.co/lab/podcast-repurposing
- Planable - Content Repurposing: https://planable.io/blog/repurposing-content/
- Best Content Repurposing Software 2026: https://postiv.ai/blog/content-repurposing-software

### Ferramentas de Subtitles e Legendas
- AssemblyAI - Best Subtitle Generators: https://www.assemblyai.com/blog/best-ai-subtitle-generators
- Maestra AI: https://maestra.ai
- HeyGen Video Translator: https://www.heygen.com/translate

### Content Calendar e Editorial
- Kordiam - Editorial Planning Tools: https://kordiam.io/best-editorial-content-planning-tools
- Planable - Content Calendar Tools: https://planable.io/blog/content-calendar-tools/

---

*Documento gerado em Fevereiro 2026 para informar o roadmap de produto do AICA Studio. Dados de mercado e precos sujeitos a atualizacao.*
