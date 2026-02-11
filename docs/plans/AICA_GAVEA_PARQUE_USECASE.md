# 🏘️ Caso de Uso: Associação de Moradores Gavea Parque

## Contexto

A Associação de Moradores e Amigos do Gavea Parque é uma organização comunitária com necessidades específicas de:
- Gestão de membros/moradores
- Lista de prestadores de serviço confiáveis
- Comunicação centralizada
- Fluxos de trabalho administrativos
- Reserva de espaços comuns

Este documento detalha como o AICA World Graph pode atender essas necessidades.

---

## 🎯 Problemas a Resolver

### 1. Lista de Prestadores Fragmentada
**Situação atual**: Recomendações de prestadores espalhadas em grupos de WhatsApp, difíceis de buscar depois.

**Solução AICA**:
- Base centralizada de prestadores com avaliações
- Busca por especialidade
- Histórico de serviços na comunidade
- Recomendações com contexto

### 2. Comunicação Desorganizada
**Situação atual**: Múltiplos grupos de WhatsApp, informações se perdem, quem entra depois não tem contexto.

**Solução AICA**:
- Canal oficial via Tia Sabiá
- Arquivo searchable de decisões e comunicados
- Onboarding automático de novos moradores

### 3. Fluxos Administrativos Manuais
**Situação atual**: Reserva de salão, solicitação de manutenção, etc. feitos informalmente.

**Solução AICA**:
- Templates de fluxos de trabalho
- Aprovações automatizadas
- Histórico de solicitações

---

## 📊 Modelo de Dados para Associação

### Estrutura de Entidades

```
Associação Gavea Parque (Organization)
│
├── 👥 Moradores (People)
│   ├── Lucas Silva (Admin)
│   │   └── Casa TAF95 (linked Space)
│   ├── Maria Santos
│   │   └── Casa 42
│   └── João Oliveira
│       └── Casa 78
│
├── 👷 Prestadores Aprovados (People)
│   ├── Carlos Eletricista ⭐4.8
│   │   ├── Especialidade: Elétrica
│   │   ├── Serviços na comunidade: 15
│   │   └── Recomendado por: Lucas, Maria
│   │
│   ├── Ana Jardinagem ⭐4.9
│   │   ├── Especialidade: Paisagismo
│   │   ├── Serviços na comunidade: 8
│   │   └── Recomendado por: João
│   │
│   └── Zé Encanador ⭐4.5
│       ├── Especialidade: Hidráulica
│       └── Serviços na comunidade: 12
│
├── 🏛️ Espaços Comuns (Spaces)
│   ├── Salão de Festas
│   │   ├── Capacidade: 80 pessoas
│   │   └── Taxa: R$200
│   ├── Churrasqueira
│   │   ├── Capacidade: 20 pessoas
│   │   └── Taxa: R$100
│   └── Quadra Esportiva
│       └── Taxa: Gratuito
│
├── 📋 Fluxos de Trabalho
│   ├── Reserva de Espaço
│   ├── Indicação de Prestador
│   ├── Solicitação de Manutenção
│   └── Comunicado Oficial
│
└── 📜 Documentos
    ├── Estatuto
    ├── Regimento Interno
    └── Atas de Reunião
```

### Schema Específico

```sql
-- Membros da organização (extensão de world_relations)
CREATE VIEW organization_members AS
SELECT 
  wr.id,
  org.id as organization_id,
  org.name as organization_name,
  person.id as member_id,
  person.name as member_name,
  wr.metadata->>'role' as role,
  wr.metadata->>'joined_at' as joined_at,
  wr.metadata->>'unit' as unit_number,
  space.id as residence_id,
  space.name as residence_name
FROM world_relations wr
JOIN world_entities org ON wr.to_entity_id = org.id AND org.entity_type = 'organization'
JOIN world_entities person ON wr.from_entity_id = person.id AND person.type = 'person'
LEFT JOIN world_relations residence_rel ON person.id = residence_rel.from_entity_id 
  AND residence_rel.relation_type = 'owns'
LEFT JOIN world_entities space ON residence_rel.to_entity_id = space.id
WHERE wr.relation_type = 'member_of';

-- Prestadores aprovados pela comunidade
CREATE VIEW community_providers AS
SELECT 
  provider.id,
  provider.name,
  provider.attributes->>'specialties' as specialties,
  provider.attributes->>'phone_whatsapp' as whatsapp,
  provider.attributes->>'rating' as rating,
  COUNT(DISTINCT we.id) as total_community_services,
  AVG((we.metadata->>'rating')::numeric) as community_rating,
  org.id as organization_id,
  org.name as organization_name
FROM world_entities provider
JOIN world_relations wr ON provider.id = wr.from_entity_id 
  AND wr.relation_type = 'serves'
JOIN world_entities org ON wr.to_entity_id = org.id 
  AND org.entity_type = 'organization'
LEFT JOIN world_events we ON we.performed_by = provider.id
WHERE provider.entity_type = 'person'
  AND provider.attributes->>'specialties' IS NOT NULL
GROUP BY provider.id, org.id, org.name;
```

---

## 📲 Fluxos WhatsApp para Associação

### 1. Consulta de Prestador

```
Morador: "Alguém conhece um bom eletricista?"

Tia Sabiá (no grupo ou privado):
"Oi! 👋 Temos 3 eletricistas aprovados pela comunidade:

⚡ Carlos Eletricista
⭐ 4.8 (15 serviços no Gavea Parque)
📱 21 99999-1111
💬 'Muito profissional' - Maria, casa 42

⚡ Pedro Luz
⭐ 4.6 (8 serviços)
📱 21 98888-2222

⚡ Zé Elétrica  
⭐ 4.3 (3 serviços)
📱 21 97777-3333

Quer que eu mande mensagem pra algum deles?"
```

### 2. Indicação de Novo Prestador

```
Morador: "Pessoal, indico o Marcos Pintor, fez um ótimo 
         serviço aqui em casa. 21 96666-4444"

Tia Sabiá: "Opa! Vou cadastrar o Marcos na nossa lista! 🎨

📝 Cadastrando:
• Nome: Marcos Pintor
• Especialidade: Pintura
• WhatsApp: 21 96666-4444
• Indicado por: [Morador], casa XX
• Primeira avaliação: ⭐⭐⭐⭐⭐

Mais alguém já usou os serviços dele? 
Respondam pra eu atualizar a avaliação!"
```

### 3. Reserva de Espaço Comum

```
Morador: "Quero reservar o salão pro dia 15/02"

Tia Sabiá: "Deixa eu ver a agenda! 📅

🏛️ Salão de Festas - 15/02/2026

✅ Disponível!

📋 Detalhes:
• Capacidade: 80 pessoas
• Taxa: R$200
• Horário: 10h às 22h
• Limpeza inclusa: Sim

Confirma a reserva? Preciso de:
1. Seu nome completo
2. Número da casa
3. Tipo de evento (festa, reunião, etc)
4. Estimativa de convidados"

Morador: "Lucas Silva, TAF95, aniversário, 40 pessoas"

Tia Sabiá: "Reserva confirmada! ✅

🎉 Aniversário
📅 15/02/2026 (sábado)
👤 Lucas Silva - Casa TAF95
👥 ~40 pessoas
💰 Taxa: R$200

PIX para pagamento: [chave da associação]
Prazo: até 10/02

Envio o comprovante aqui quando pagar!
Bom evento! 🎊"
```

### 4. Comunicado Oficial (Admin)

```
Admin: "/comunicado Reunião ordinária dia 20/01 às 19h no salão"

Tia Sabiá: "Comunicado registrado! 📢

Vou enviar para todos os moradores:

---
📢 COMUNICADO - Gavea Parque

Reunião Ordinária
📅 20/01/2026 (segunda)
🕖 19h
📍 Salão de Festas

Pauta:
• Prestação de contas 2025
• Planejamento 2026
• Assuntos gerais

Confirme presença respondendo ✅
---

Confirma o envio?"
```

### 5. Solicitação de Manutenção (Área Comum)

```
Morador: "A lâmpada do poste 3 queimou"

Tia Sabiá: "Anotado! 💡

📍 Área comum - Poste 3
⚠️ Problema: Lâmpada queimada
📅 Reportado: Hoje
👤 Por: [Morador]

Vou avisar a administração e abrir uma tarefa.
O Carlos Eletricista geralmente resolve isso em 2-3 dias.

Quer que eu já mande mensagem pra ele?"
```

---

## 🖥️ Interface Web para Administração

### Dashboard da Associação

```
┌─────────────────────────────────────────────────────────────┐
│  🏘️ Gavea Parque                              [⚙️ Config]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 👥 45        │ │ 👷 12        │ │ 📋 3         │        │
│  │ Moradores    │ │ Prestadores  │ │ Pendências   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  📅 Próximos Eventos                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🗓️ 15/02 │ Reserva Salão │ Lucas - Aniversário     │   │
│  │ 🗓️ 20/01 │ Reunião       │ Ordinária               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ Manutenções Pendentes                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Poste 3     │ Lâmpada queimada │ Há 2 dias      │   │
│  │ 🚿 Banheiro    │ Torneira         │ Há 5 dias      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  👷 Prestadores Mais Ativos                                 │
│  1. Carlos Eletricista ⭐4.8 (15 serviços)                  │
│  2. Ana Jardinagem ⭐4.9 (8 serviços)                       │
│  3. Zé Encanador ⭐4.5 (12 serviços)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tela de Prestadores

```
┌─────────────────────────────────────────────────────────────┐
│  👷 Prestadores Aprovados                    [+ Adicionar]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [Buscar por nome ou especialidade...]                   │
│                                                             │
│  Filtros: [Todos ▼] [Mais bem avaliados ▼]                 │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  ⚡ ELÉTRICA                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Carlos Eletricista              ⭐ 4.8 (15 serviços)│   │
│  │ 📱 21 99999-1111                                    │   │
│  │ 💬 "Muito profissional, preço justo"               │   │
│  │ 👤 Indicado por: Maria (casa 42), João (casa 78)   │   │
│  │                                                     │   │
│  │ [📞 Ligar] [💬 WhatsApp] [📝 Avaliar]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔧 HIDRÁULICA                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Zé Encanador                    ⭐ 4.5 (12 serviços)│   │
│  │ 📱 21 97777-3333                                    │   │
│  │ 💬 "Resolve rápido, mas às vezes atrasa"           │   │
│  │                                                     │   │
│  │ [📞 Ligar] [💬 WhatsApp] [📝 Avaliar]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Modelo de Permissões

### Papéis na Organização

| Papel | Pode ver membros | Pode ver prestadores | Pode adicionar prestador | Pode aprovar reserva | Pode enviar comunicado |
|-------|-----------------|---------------------|-------------------------|---------------------|----------------------|
| Morador | ✅ Limitado | ✅ | ✅ (com indicação) | ❌ | ❌ |
| Síndico | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

### Implementação RLS

```sql
-- Moradores só veem outros moradores da mesma organização
CREATE POLICY "Members see other members"
  ON world_entities
  FOR SELECT
  USING (
    entity_type = 'person'
    AND EXISTS (
      SELECT 1 FROM world_relations wr1
      JOIN world_relations wr2 ON wr1.to_entity_id = wr2.to_entity_id
      WHERE wr1.from_entity_id = auth.uid()
        AND wr2.from_entity_id = world_entities.id
        AND wr1.relation_type = 'member_of'
        AND wr2.relation_type = 'member_of'
    )
  );

-- Prestadores são visíveis para membros da organização que servem
CREATE POLICY "Members see community providers"
  ON world_entities
  FOR SELECT
  USING (
    entity_type = 'person'
    AND attributes->>'specialties' IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM world_relations wr_provider
      JOIN world_relations wr_member ON wr_provider.to_entity_id = wr_member.to_entity_id
      WHERE wr_provider.from_entity_id = world_entities.id
        AND wr_provider.relation_type = 'serves'
        AND wr_member.from_entity_id = auth.uid()
        AND wr_member.relation_type = 'member_of'
    )
  );
```

---

## 📈 Métricas Específicas

### Para a Associação
- Prestadores cadastrados
- Avaliações por mês
- Reservas de espaço
- Tempo médio de resolução de manutenção
- Engajamento em comunicados

### Para o Lucas (como produto)
- Associações usando o sistema
- Moradores ativos por associação
- Prestadores compartilhados entre comunidades
- NPS dos moradores

---

## 🚀 Próximos Passos

### Semana 1-2
1. Cadastrar Gavea Parque como organização
2. Importar lista de prestadores existente
3. Configurar Tia Sabiá para o grupo

### Semana 3-4
4. Testar fluxo de indicação de prestador
5. Testar fluxo de reserva de espaço
6. Coletar feedback dos moradores

### Mês 2
7. Dashboard de administração
8. Relatórios de uso
9. Onboarding de novos moradores

---

*Este caso de uso serve como piloto para validar o módulo Guilds/Organizations do AICA*
