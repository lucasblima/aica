// handlers/finance-temp.ts — Finance module handlers (temporary — until gemini-finance Edge Function)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS } from '../../_shared/gemini-helpers.ts'
import { extractJSON } from '../../_shared/model-router.ts'
import type { ParseStatementPayload, CategorizeTransactionsPayload } from '../../_shared/gemini-types.ts'

// ============================================================================
// HANDLERS
// ============================================================================

export async function handleParseStatement(genAI: GoogleGenerativeAI, payload: ParseStatementPayload): Promise<any> {
  const { rawText } = payload || {}

  console.log(`[parse_statement] Starting. rawText length: ${rawText?.length || 0}`)

  // Validate input — rawText is required and must have meaningful content
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 50) {
    throw new Error('Campo "rawText" e obrigatorio e deve ter pelo menos 50 caracteres de texto extraido do PDF.')
  }

  // Use gemini-2.5-flash with HIGH maxOutputTokens — thinking tokens are included
  // in the budget, and bank statements can produce large JSON (100+ transactions).
  // Previously 4096 caused truncated JSON → extractJSON failure → 500.
  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 65536,
    },
  })

  const prompt = `Voce e um assistente especializado em extrair dados de extratos bancarios brasileiros.

Analise o texto e extraia as informacoes em formato JSON:

{
  "bankName": "nome do banco (ex: Nubank, Inter, Itau, Bradesco, Santander, C6 Bank)",
  "accountType": "checking|savings|credit_card|investment|other",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "openingBalance": numero,
  "closingBalance": numero,
  "currency": "BRL",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descricao limpa sem caracteres especiais",
      "amount": numero (positivo=receita, negativo=despesa),
      "type": "income|expense",
      "category": "food|transport|housing|health|education|entertainment|shopping|bills|salary|freelance|investment|subscription|pets|personal_care|travel|transfer|other"
    }
  ]
}

REGRAS:
- Despesas devem ser NEGATIVAS
- Receitas devem ser POSITIVAS
- Categorias em ingles
- Detecte o banco pelo cabecalho, logo ou formato do extrato
- PIX recebidos sao "income", PIX enviados sao "expense"
- Retorne APENAS o JSON, sem explicacao

CATEGORIAS - REGRAS DE CLASSIFICACAO:
- iFood, restaurante, padaria, supermercado, mercado, cafe = food
- Uber, 99, combustivel, posto, estacionamento, pedagio = transport
- Aluguel, condominio, IPTU, imobiliaria = housing
- Luz, agua, gas, internet, telefone, Vivo, Claro, Tim = bills
- Farmacia, medico, plano saude, exame = health
- Netflix, Spotify, Disney+, YouTube Premium, iCloud, Google One = subscription
- Cinema, show, bar, lazer = entertainment
- Roupa, eletronico, Mercado Livre, Amazon, Shopee = shopping
- Pet shop, veterinario, racao = pets
- Academia, barbearia, estetica = personal_care
- Hotel, passagem aerea, Booking, Airbnb = travel
- Escola, faculdade, curso, livro = education
- Salario, pagamento = salary
- Freelance, servico prestado = freelance
- Rendimento, CDB, CDI = investment

PIX - REGRAS CRITICAS:
- PIX enviado para pessoa ou empresa = CATEGORIZAR pela finalidade, NAO como "transfer"
- PIX com nome de empresa/loja = categorizar pela empresa (food, shopping, etc)
- PIX recorrente de valor alto para mesma pessoa = bills ou housing (provavelmente aluguel, servico, pensao)
- PIX de valor medio (R$100-1000) para pessoa fisica = bills ou shopping
- PIX de valor baixo (< R$100) = food ou shopping
- "transfer" usar SOMENTE para transferencia entre contas PROPRIAS (ex: "TED ENTRE CONTAS", "TRANSF CC/POUP")
- NUNCA categorizar PIX para terceiros como "transfer"
- EVITE "other" — tente sempre inferir a melhor categoria

TEXTO:
${rawText.substring(0, 15000).trim()}`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const usageMetadata = response.usageMetadata

    console.log(`[parse_statement] Gemini response received. Usage:`, JSON.stringify(usageMetadata))

    // Check for blocked/empty response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      console.error(`[parse_statement] No candidates in response. finishReason may be safety block.`)
      throw new Error('Gemini retornou resposta vazia — possivelmente bloqueado por filtro de seguranca.')
    }

    const finishReason = candidates[0].finishReason
    console.log(`[parse_statement] finishReason: ${finishReason}`)

    if (finishReason === 'MAX_TOKENS') {
      console.warn(`[parse_statement] Response truncated by MAX_TOKENS. Usage: ${JSON.stringify(usageMetadata)}`)
    }

    const text = response.text()
    console.log(`[parse_statement] Response text length: ${text?.length || 0}`)

    if (!text || text.trim().length === 0) {
      throw new Error('Gemini retornou texto vazio para parse_statement.')
    }

    const data = extractJSON(text)
    console.log(`[parse_statement] JSON parsed successfully. Transactions: ${data?.transactions?.length || 0}`)

    return {
      ...data,
      __usageMetadata: usageMetadata
    }
  } catch (err) {
    const error = err as Error
    console.error(`[parse_statement] FAILED:`, error.message)
    console.error(`[parse_statement] Stack:`, error.stack)
    throw error
  }
}

export async function handleCategorizeTransactions(genAI: GoogleGenerativeAI, payload: CategorizeTransactionsPayload): Promise<any> {
  const { transactions } = payload || {}

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('Campo "transactions" e obrigatorio e deve conter pelo menos uma transacao.')
  }

  console.log(`[categorize_transactions] Starting. Count: ${transactions.length}`)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  })

  // Build compact list for the prompt
  const txList = transactions.map((t, i) =>
    `${i}|${t.type}|${t.amount}|${t.description}`
  ).join('\n')

  const prompt = `Voce e um classificador especialista de transacoes bancarias brasileiras.

Para cada transacao, retorne a categoria mais adequada.

CATEGORIAS VALIDAS: food, transport, housing, health, education, entertainment, shopping, bills, salary, freelance, investment, transfer, pets, personal_care, subscription, travel, other

REGRAS DE CLASSIFICACAO (ORDEM DE PRIORIDADE):

1. RECEITAS (type=income):
   - Salario, pagamento, vencimento, folha = salary
   - Freelance, servico prestado, honorarios = freelance
   - Rendimento, dividendo, CDB, CDI, juros = investment
   - PIX RECEBIDO de empresas = salary ou freelance (inferir pelo valor: >R$1000 provavel salary)
   - PIX RECEBIDO de pessoas fisicas = salary (na duvida, nao usar 'other')

2. DESPESAS (type=expense) - PADROES COMUNS:
   - iFood, Rappi, restaurante, lanchonete, padaria, supermercado, mercado, acougue, hortifruti, cafe = food
   - Uber, 99, Cabify, combustivel, gasolina, Shell, posto, estacionamento, pedagio, IPVA, seguro auto = transport
   - Aluguel, condominio, IPTU, imobiliaria = housing
   - Luz, energia, CEMIG, CPFL, agua, SABESP, gas, Comgas, internet, telefone, celular, Vivo, Claro, Tim = bills
   - Farmacia, drogaria, Droga Raia, medico, consulta, exame, laboratorio, plano saude, Unimed, Amil = health
   - Escola, faculdade, curso, livro, Udemy, Coursera, material escolar = education
   - Netflix, Spotify, Disney+, Amazon Prime, YouTube Premium, HBO, Apple TV, iCloud, Google One = subscription
   - Cinema, teatro, show, ingresso, jogo, lazer, bar, balada, festa = entertainment
   - Roupa, Renner, C&A, Zara, sapato, eletronico, Mercado Livre, Amazon, Magazine Luiza, Shopee = shopping
   - Pet shop, veterinario, racao, Petz, Cobasi = pets
   - Cabelo, barbearia, estetica, manicure, academia, Smart Fit = personal_care
   - Hotel, passagem, Booking, Airbnb, Latam, Gol, Azul, CVC = travel

3. TRANSFER (usar SOMENTE quando):
   - Transferencia entre contas PROPRIAS do usuario (ex: "TED ENTRE CONTAS", "TRANSF CC/POUP")
   - Aplicacao/resgate entre contas proprias
   - NAO usar para PIX de pagamento de servicos ou compras
   - NAO usar para pagamentos a terceiros

4. PIX - REGRAS ESPECIAIS:
   - PIX com nome de empresa/loja = categorizar pela empresa (food, shopping, etc)
   - PIX com valor tipico de compra (R$10-500) = inferir pela descricao ou usar shopping
   - PIX de valor alto sem contexto (>R$1000 expense) = bills (provavelmente conta/servico)
   - "COMPRA CARTAO" ou "PAG*" seguido de nome = categorizar pelo nome do estabelecimento
   - EVITE usar 'transfer' e 'other' — tente sempre inferir a melhor categoria

5. QUANDO EM DUVIDA:
   - Prefira 'shopping' a 'other' para compras genericas
   - Prefira 'bills' a 'other' para pagamentos genericos
   - Use 'other' APENAS como ultimo recurso (<5% das transacoes)
   - NUNCA use 'transfer' como categoria padrao

Retorne APENAS um JSON array com as categorias na mesma ordem:
["category1", "category2", ...]

TRANSACOES (indice|tipo|valor|descricao):
${txList}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const categories = extractJSON(text)

    console.log(`[categorize_transactions] Done. Categories: ${Array.isArray(categories) ? categories.length : 'invalid'}`)

    return { categories: Array.isArray(categories) ? categories : [] }
  } catch (err) {
    const error = err as Error
    console.error(`[categorize_transactions] FAILED:`, error.message)
    return { categories: [] }
  }
}
