/**
 * Pairing Code Service
 *
 * Serviço para gerenciar códigos de pareamento WhatsApp.
 *
 * Issue: #87
 */

import { supabase } from './supabaseClient'

export interface PairingCodeResult {
  success: boolean
  code?: string
  expiresAt?: string
  error?: string
}

/**
 * Gera código de pareamento para vincular WhatsApp
 *
 * @param phoneNumber - Número do telefone (formato: 5511987654321)
 * @param instanceName - Nome da instância Evolution (opcional)
 * @returns Resultado com código ou erro
 */
export async function generatePairingCode(
  phoneNumber: string,
  instanceName?: string
): Promise<PairingCodeResult> {
  try {
    // Validar formato do telefone
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'Número de telefone inválido. Use formato: 5511987654321',
      }
    }

    const response = await supabase.functions.invoke('generate-pairing-code', {
      body: {
        phoneNumber: cleanPhone,
        instanceName,
      },
    })

    if (response.error) {
      console.error('[pairingCodeService] Error:', response.error)
      return {
        success: false,
        error: response.error.message || 'Falha ao gerar código',
      }
    }

    const data = response.data as PairingCodeResult

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Falha ao gerar código',
      }
    }

    // Formatar código para exibição
    const formattedCode = data.code?.includes('-')
      ? data.code
      : `${data.code?.slice(0, 4)}-${data.code?.slice(4)}`

    return {
      success: true,
      code: formattedCode,
      expiresAt: data.expiresAt,
    }
  } catch (error) {
    console.error('[pairingCodeService] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro inesperado',
    }
  }
}

/**
 * Verifica status da conexão WhatsApp
 *
 * @param instanceName - Nome da instância Evolution
 * @returns Status da conexão
 */
export async function checkConnectionStatus(
  instanceName?: string
): Promise<{ connected: boolean; state?: string; error?: string }> {
  try {
    const response = await supabase.functions.invoke('check-whatsapp-status', {
      body: { instanceName },
    })

    if (response.error) {
      return { connected: false, error: response.error.message }
    }

    const data = response.data as { connected: boolean; state?: string }
    return data
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Erro ao verificar status',
    }
  }
}
