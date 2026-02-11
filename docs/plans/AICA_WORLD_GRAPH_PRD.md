# 🌍 AICA World Graph - PRD Técnico

## Visão Geral

O **World Graph** é a evolução do AICA de um conjunto de módulos isolados para um **sistema operacional de vida verdadeiramente integrado**. Inspirado em mecânicas de RPG, o World Graph conecta todos os elementos da vida do usuário - espaços físicos, objetos, pessoas, organizações, tarefas e eventos - em um grafo de conhecimento pessoal navegável e inteligente.

---

## 🎯 Objetivos Estratégicos

### Diferenciação de Mercado
- Nenhum competidor (Notion, Todoist, Obsidian) modela **espaços físicos e objetos**
- Criar "lock-in" através de dados insubstituíveis (histórico de casa, manutenções)
- Habilitar queries contextuais impossíveis em outros sistemas

### Casos de Uso Primários
1. **Gestão de Imóvel Pessoal** (Casa TAF95)
2. **Administração de Associação** (Gavea Parque)
3. **Inventário e Manutenção** (objetos, equipamentos)
4. **CRM Contextual** (prestadores por especialidade e localização)

---

## 🏗️ Arquitetura de Dados

### Modelo Conceitual

```
┌─────────────────────────────────────────────────────────────────┐
│                        WORLD GRAPH                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐                │
│   │ SPACES  │──────│ OBJECTS │──────│  TASKS  │                │
│   └────┬────┘      └────┬────┘      └────┬────┘                │
│        │                │                │                      │
│        │    ┌───────────┴───────────┐    │                      │
│        │    │                       │    │                      │
│   ┌────┴────┴───┐           ┌───────┴────┴────┐                │
│   │   PEOPLE    │───────────│  ORGANIZATIONS  │                │
│   └─────────────┘           └─────────────────┘                │
│                                                                  │
│   ┌─────────────┐           ┌─────────────────┐                │
│   │   EVENTS    │───────────│    MESSAGES     │                │
│   └─────────────┘           └─────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Schema de Banco de Dados (Supabase)

#### Tabela Principal: `world_entities`

```sql
CREATE TABLE world_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Tipagem
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'space',        -- Imóveis, cômodos, áreas
    'object',       -- Móveis, equipamentos, itens
    'person',       -- Contatos, prestadores
    'organization', -- Associações, empresas, grupos
    'task',         -- Tarefas vinculadas a entidades
    'event'         -- Eventos, manutenções, ocorrências
  )),
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,                    -- Emoji ou ícone
  cover_image_url TEXT,
  
  -- Hierarquia
  parent_entity_id UUID REFERENCES world_entities(id),
  path LTREE,                   -- Para queries hierárquicas eficientes
  depth INTEGER DEFAULT 0,
  
  -- Localização
  location_type TEXT CHECK (location_type IN ('coordinates', 'address', 'relative')),
  coordinates GEOGRAPHY(POINT, 4326),
  address JSONB,                -- {street, number, city, state, country, zip}
  
  -- Atributos flexíveis por tipo
  attributes JSONB DEFAULT '{}',
  
  -- Metadados
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'maintenance', 'sold')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_world_entities_user ON world_entities(user_id);
CREATE INDEX idx_world_entities_type ON world_entities(entity_type);
CREATE INDEX idx_world_entities_parent ON world_entities(parent_entity_id);
CREATE INDEX idx_world_entities_path ON world_entities USING GIST (path);
CREATE INDEX idx_world_entities_tags ON world_entities USING GIN (tags);
CREATE INDEX idx_world_entities_attributes ON world_entities USING GIN (attributes);

-- RLS
ALTER TABLE world_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entities"
  ON world_entities
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Tabela de Relacionamentos: `world_relations`

```sql
CREATE TABLE world_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Entidades relacionadas
  from_entity_id UUID NOT NULL REFERENCES world_entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES world_entities(id) ON DELETE CASCADE,
  
  -- Tipo de relação
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    -- Espaciais
    'contains',      -- Espaço contém outro espaço/objeto
    'located_in',    -- Objeto está em espaço
    
    -- Propriedade
    'owns',          -- Pessoa/org possui espaço/objeto
    'manages',       -- Pessoa administra organização
    
    -- Serviço
    'serves',        -- Prestador serve em espaço/organização
    'maintains',     -- Pessoa faz manutenção de objeto
    'installed',     -- Quem instalou o objeto
    
    -- Social
    'member_of',     -- Pessoa é membro de organização
    'knows',         -- Pessoa conhece pessoa
    'recommended_by', -- Prestador recomendado por pessoa
    
    -- Temporal
    'resulted_in',   -- Evento resultou em task
    'related_to'     -- Relação genérica
  )),
  
  -- Metadados da relação
  metadata JSONB DEFAULT '{}',
  strength INTEGER DEFAULT 5 CHECK (strength BETWEEN 1 AND 10), -- Para ranking
  
  -- Período de validade (para histórico)
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_entity_id, to_entity_id, relation_type)
);

-- Índices
CREATE INDEX idx_world_relations_from ON world_relations(from_entity_id);
CREATE INDEX idx_world_relations_to ON world_relations(to_entity_id);
CREATE INDEX idx_world_relations_type ON world_relations(relation_type);

-- RLS
ALTER TABLE world_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own relations"
  ON world_relations
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Tabela de Histórico: `world_events`

```sql
CREATE TABLE world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Entidade afetada
  entity_id UUID NOT NULL REFERENCES world_entities(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'maintenance',   -- Manutenção realizada
    'purchase',      -- Compra/aquisição
    'sale',          -- Venda
    'damage',        -- Dano/problema
    'upgrade',       -- Melhoria
    'inspection',    -- Inspeção/vistoria
    'note',          -- Anotação geral
    'photo',         -- Registro fotográfico
    'warranty_start', -- Início de garantia
    'warranty_end'   -- Fim de garantia
  )),
  
  -- Detalhes
  title TEXT NOT NULL,
  description TEXT,
  
  -- Pessoas envolvidas
  performed_by UUID REFERENCES world_entities(id), -- Quem fez (prestador, etc)
  
  -- Financeiro (opcional)
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  finance_transaction_id UUID, -- Link para módulo Finance
  
  -- Mídia
  attachments JSONB DEFAULT '[]', -- [{url, type, caption}]
  
  -- Datas
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_scheduled_at TIMESTAMPTZ, -- Para manutenções recorrentes
  
  -- Fonte do registro
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'voice', 'automatic')),
  source_message_id TEXT, -- ID da mensagem WhatsApp se aplicável
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_world_events_entity ON world_events(entity_id);
CREATE INDEX idx_world_events_type ON world_events(event_type);
CREATE INDEX idx_world_events_date ON world_events(occurred_at);

-- RLS
ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own events"
  ON world_events
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Tabela de Templates: `world_templates`

```sql
CREATE TABLE world_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'apartment', 'house', 'office', 'association'
  
  -- Estrutura do template
  structure JSONB NOT NULL, -- Árvore de entidades pré-definidas
  
  -- Metadados
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  locale TEXT DEFAULT 'pt-BR',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplo de estrutura:
-- {
--   "type": "space",
--   "name": "Apartamento 2 Quartos",
--   "icon": "🏠",
--   "children": [
--     {"type": "space", "name": "Sala de Estar", "icon": "🛋️", "children": [...]},
--     {"type": "space", "name": "Cozinha", "icon": "🍳", "children": [...]},
--     {"type": "space", "name": "Quarto Principal", "icon": "🛏️", "children": [...]},
--     {"type": "space", "name": "Quarto 2", "icon": "🛏️", "children": [...]},
--     {"type": "space", "name": "Banheiro Social", "icon": "🚿", "children": [...]}
--   ]
-- }
```

---

## 📱 Estrutura de Atributos por Tipo

### Space (Espaços)

```typescript
interface SpaceAttributes {
  // Imóvel
  property_type?: 'house' | 'apartment' | 'commercial' | 'land' | 'room'
  area_m2?: number
  floors?: number
  
  // Endereço (se for imóvel raiz)
  address?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zip: string
    country: string
  }
  
  // Cômodo
  room_type?: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'garage' | 'balcony' | 'office' | 'storage'
  
  // Controle
  access_code?: string
  wifi_password?: string
  
  // Documentação
  registration_number?: string // Matrícula do imóvel
  iptu_code?: string
}
```

### Object (Objetos)

```typescript
interface ObjectAttributes {
  // Identificação
  category: 'furniture' | 'appliance' | 'electronics' | 'decor' | 'tool' | 'vehicle' | 'art'
  brand?: string
  model?: string
  serial_number?: string
  
  // Aquisição
  purchase_date?: string
  purchase_price?: number
  purchase_location?: string
  receipt_url?: string
  
  // Garantia
  warranty_until?: string
  warranty_provider?: string
  warranty_document_url?: string
  
  // Estado
  condition: 'new' | 'good' | 'fair' | 'needs_repair' | 'broken'
  
  // Manutenção
  maintenance_interval_days?: number
  last_maintenance_date?: string
  next_maintenance_date?: string
  
  // Para equipamentos
  power_watts?: number
  voltage?: '110' | '220' | 'bivolt'
  
  // Dimensões
  dimensions?: {
    width_cm: number
    height_cm: number
    depth_cm: number
    weight_kg: number
  }
}
```

### Person (Pessoas - Prestadores)

```typescript
interface PersonAttributes {
  // Contato
  phone: string
  phone_whatsapp?: string
  email?: string
  
  // Profissional
  specialties: string[] // ['eletricista', 'encanador', 'pintor']
  company_name?: string
  cnpj?: string
  
  // Avaliação
  rating: number // 1-5
  total_services: number
  
  // Disponibilidade
  working_hours?: string
  service_area?: string[] // Bairros que atende
  
  // Pagamento
  payment_methods: string[] // ['pix', 'dinheiro', 'cartao']
  pix_key?: string
  
  // Histórico (calculado)
  first_service_date?: string
  last_service_date?: string
  total_spent?: number
}
```

### Organization (Organizações)

```typescript
interface OrganizationAttributes {
  // Tipo
  org_type: 'association' | 'company' | 'group' | 'family' | 'community'
  
  // Dados legais
  cnpj?: string
  legal_name?: string
  
  // Contato
  address?: object
  phone?: string
  email?: string
  website?: string
  
  // Gestão
  current_president?: string
  board_members?: string[]
  
  // Para associações
  total_members?: number
  monthly_fee?: number
  meeting_schedule?: string
  
  // Comunicação
  whatsapp_group_id?: string
  notification_preferences?: object
}
```

---

## 🔄 Integração com Módulos Existentes

### Atlas (Tarefas)

```sql
-- Adicionar coluna em work_items
ALTER TABLE work_items ADD COLUMN world_entity_id UUID REFERENCES world_entities(id);
ALTER TABLE work_items ADD COLUMN world_space_context UUID REFERENCES world_entities(id);

-- Exemplos de uso:
-- "Trocar torneira" → world_entity_id = torneira_id, world_space_context = banheiro_id
-- "Reunião da associação" → world_entity_id = associacao_id
```

### Connections (Contatos)

```sql
-- Migração de connection_members para world_entities
-- Prestadores viram entities do tipo 'person' com specialties

-- Link bidirecional
ALTER TABLE connection_members ADD COLUMN world_entity_id UUID REFERENCES world_entities(id);
```

### Finance (Financeiro)

```sql
-- Vincular transações a entidades
ALTER TABLE finance_transactions ADD COLUMN world_entity_id UUID REFERENCES world_entities(id);

-- Exemplos:
-- Gasto com "Conserto torneira" → vinculado ao objeto torneira
-- Gasto com "Taxa condomínio" → vinculado à organização
```

### Journey (Momentos)

```sql
-- Momentos podem ter contexto espacial
ALTER TABLE moment_entries ADD COLUMN world_space_id UUID REFERENCES world_entities(id);

-- "Hoje reformei o escritório" → registrado com contexto do espaço
```

---

## 📲 Integração WhatsApp (Tia Sabiá)

### Fluxos de Input

#### 1. Registro de Problema/Manutenção

```
Usuário: "A torneira do banheiro 2 tá pingando"

Tia Sabiá: "Eita! 😅 Deixa eu anotar aqui...
           
           📍 Casa TAF95 > Banheiro 2 > Torneira
           ⚠️ Problema: Vazamento/pingando
           
           Quer que eu procure a Maria Encanadora que 
           consertou da última vez? Ela teve nota 4.8 ⭐"

Usuário: "Sim"

Tia Sabiá: "Mandei mensagem pra ela! 📱
           Criei uma tarefa também: 'Consertar torneira banheiro 2'
           Te aviso quando ela responder!"
```

#### 2. Cadastro de Novo Objeto

```
Usuário: [envia foto de uma TV nova]
         "Comprei essa TV pro quarto"

Tia Sabiá: "Que linda! 📺 Deixa eu registrar:
           
           🏷️ TV (parece ser 55 polegadas)
           📍 Quarto Principal
           💰 Quanto custou? (posso vincular no financeiro)
           📋 Tem nota fiscal pra eu guardar?"

Usuário: "4500, depois mando a nota"

Tia Sabiá: "Anotado! R$4.500 ✅
           TV cadastrada no quarto principal.
           Quando tiver a nota, é só mandar que eu arquivo!
           
           Ah, e daqui a 1 ano te lembro de limpar o filtro 😉"
```

#### 3. Consulta de Prestador

```
Usuário: "Quem faz serviço de pintura na TAF95?"

Tia Sabiá: "Achei 2 pintores que já trabalharam aí:
           
           🎨 Carlos Pintor
           ⭐ 4.9 (3 serviços)
           📱 21 99999-1111
           💬 'Excelente acabamento' - você, março/24
           
           🎨 Zé das Tintas  
           ⭐ 4.2 (1 serviço)
           📱 21 98888-2222
           
           Quer que eu mande mensagem pra algum deles?"
```

#### 4. Registro de Manutenção Realizada

```
Usuário: "O João eletricista veio hoje, trocou os disjuntores, 
         cobrou 350"

Tia Sabiá: "Registrado! ⚡
           
           ✅ Manutenção: Troca de disjuntores
           👷 João Eletricista
           📍 Casa TAF95 > Quadro elétrico
           💰 R$350
           📅 Hoje
           
           Quer avaliar o serviço dele? (1-5 estrelas)"

Usuário: "5"

Tia Sabiá: "Nota 5 pro João! ⭐⭐⭐⭐⭐
           Ele agora tem média 4.7 com 8 serviços.
           
           Vinculei esse gasto na categoria 'Manutenção Casa'.
           Esse mês você já gastou R$890 com manutenção."
```

### Parser de Contexto

```typescript
interface WhatsAppMessageContext {
  // Entidades detectadas
  detected_spaces: WorldEntity[]
  detected_objects: WorldEntity[]
  detected_people: WorldEntity[]
  
  // Intenção
  intent: 
    | 'report_problem'
    | 'register_object'
    | 'query_provider'
    | 'log_maintenance'
    | 'schedule_task'
    | 'general_question'
  
  // Confiança
  confidence: number
  
  // Sugestões de ação
  suggested_actions: Action[]
}
```

---

## 🎮 Interface Visual - Módulo Habitat

### Telas Principais

#### 1. World Map (Visão Geral)

```
┌─────────────────────────────────────────────────────┐
│  🏠 Meus Espaços                           [+ Novo] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ 🏡              │  │ 🏢              │          │
│  │ Casa TAF95      │  │ Gavea Parque    │          │
│  │                 │  │                 │          │
│  │ 12 cômodos      │  │ 45 membros      │          │
│  │ 47 objetos      │  │ 8 prestadores   │          │
│  │                 │  │                 │          │
│  │ ⚠️ 2 pendências │  │ ✅ Em dia       │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  ┌─────────────────┐                               │
│  │ 🚗              │                               │
│  │ Carro           │                               │
│  │                 │                               │
│  │ Revisão em 15d  │                               │
│  └─────────────────┘                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 2. Space Detail (Drill-down)

```
┌─────────────────────────────────────────────────────┐
│  ← Casa TAF95                              [⚙️] [📷] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📍 Rua Exemplo, 95 - Gávea                        │
│  📐 180m² • 3 quartos • 2 banheiros                │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  🏠 Cômodos                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🛋️     │ │ 🍳     │ │ 🛏️     │ │ 🚿     │      │
│  │ Sala   │ │Cozinha │ │Quarto 1│ │Banho 1 │      │
│  │ 8 itens│ │12 itens│ │ 6 itens│ │⚠️ 1    │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ⚠️ Pendências                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔧 Torneira pingando • Banheiro 2           │   │
│  │    Há 3 dias • Maria Encanadora contactada  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  📅 Próximas Manutenções                           │
│  • Limpeza caixa d'água (em 45 dias)               │
│  • Dedetização (em 60 dias)                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 3. Object Detail

```
┌─────────────────────────────────────────────────────┐
│  ← Geladeira Brastemp                      [✏️] [🗑️] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [        📷 Foto do objeto        ]               │
│                                                     │
│  📍 Cozinha • Casa TAF95                           │
│  🏷️ Brastemp Frost Free 400L                       │
│  📋 Série: BRM44HB                                 │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  💰 Aquisição                                       │
│  • Comprado em: 15/03/2022                         │
│  • Valor: R$3.200                                  │
│  • Local: Magazine Luiza                           │
│  • [📄 Ver nota fiscal]                            │
│                                                     │
│  🛡️ Garantia                                       │
│  • Até: 15/03/2024 (expirada)                      │
│  • Garantia estendida: Não                         │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📜 Histórico                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔧 10/01/2024 • Troca do termostato         │   │
│  │    João Refrigeração • R$280                │   │
│  ├─────────────────────────────────────────────┤   │
│  │ 📷 15/03/2022 • Instalação                  │   │
│  │    Entrega Magazine Luiza                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [+ Registrar manutenção]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Plano de Implementação

### Fase 1: Foundation (2-3 semanas)

**Objetivo**: Estrutura base do World Graph

- [ ] Criar tabelas `world_entities`, `world_relations`, `world_events`
- [ ] Implementar RLS e políticas de segurança
- [ ] Criar tipos TypeScript e serviços base
- [ ] Implementar CRUD básico de entidades
- [ ] Criar componente de árvore hierárquica

**Entregável**: Cadastro básico de espaços funcionando

### Fase 2: Spaces & Objects (2-3 semanas)

**Objetivo**: Gestão completa de imóveis e objetos

- [ ] Tela de listagem de espaços (World Map)
- [ ] Tela de detalhe de espaço com drill-down
- [ ] Cadastro de objetos com atributos
- [ ] Upload de fotos e documentos
- [ ] Templates de espaços comuns

**Entregável**: Usuário consegue cadastrar Casa TAF95 completa

### Fase 3: Maintenance & History (2 semanas)

**Objetivo**: Registro de manutenções e histórico

- [ ] Tela de registro de eventos/manutenções
- [ ] Timeline de histórico por entidade
- [ ] Alertas de manutenção programada
- [ ] Integração com módulo Finance (gastos)

**Entregável**: Histórico completo de manutenções

### Fase 4: Providers & Relations (2 semanas)

**Objetivo**: CRM de prestadores integrado

- [ ] Cadastro de prestadores como entities
- [ ] Sistema de avaliação e rating
- [ ] Busca por especialidade e localização
- [ ] Histórico de serviços por prestador

**Entregável**: Base de prestadores da Casa TAF95

### Fase 5: WhatsApp Integration (3-4 semanas)

**Objetivo**: Input via WhatsApp com Tia Sabiá

- [ ] Parser de contexto para mensagens
- [ ] Detecção de entidades mencionadas
- [ ] Fluxos conversacionais de cadastro
- [ ] Registro de manutenção via WhatsApp
- [ ] Consulta de prestadores via WhatsApp

**Entregável**: Gestão completa via WhatsApp

### Fase 6: Organizations (2-3 semanas)

**Objetivo**: Módulo Guilds para associações

- [ ] Cadastro de organizações
- [ ] Gestão de membros
- [ ] Lista compartilhada de prestadores
- [ ] Fluxos de trabalho básicos

**Entregável**: Gavea Parque cadastrada e funcional

---

## 📊 Métricas de Sucesso

### Adoção
- Espaços cadastrados por usuário
- Objetos registrados por espaço
- Eventos de manutenção logados

### Engagement
- Consultas de prestadores por semana
- Manutenções agendadas vs realizadas
- Mensagens WhatsApp processadas

### Valor
- Economia estimada (manutenção preventiva)
- Tempo médio para encontrar prestador
- Satisfação com prestadores (rating médio)

---

## 🔐 Considerações de Segurança

### Dados Sensíveis
- Endereços completos
- Códigos de acesso
- Senhas WiFi
- Documentos de imóveis

### Medidas
- RLS em todas as tabelas
- Criptografia de campos sensíveis (access_code, wifi_password)
- Audit log de acessos
- Backup automático de documentos

---

## 💡 Ideias Futuras

### v2.0
- Integração com apps de smart home
- QR codes em objetos para acesso rápido
- Realidade aumentada para inventário
- Marketplace de prestadores entre usuários

### v3.0
- IA preditiva para manutenção
- Comparação de preços de prestadores
- Integração com seguradoras
- Gestão de múltiplos imóveis (Airbnb)

---

*Documento criado em: Janeiro 2026*
*Versão: 1.0*
*Autor: Lucas + Claude*
