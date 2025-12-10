/**
 * Pauta Persistence Service
 *
 * Gerencia persistencia de pautas geradas no banco de dados Supabase.
 * Suporta:
 * - Versionamento automatico
 * - Salvamento completo (pauta + outline + questions + sources)
 * - Recuperacao de pautas ativas e historico de versoes
 * - Exclusao de pautas
 *
 * Utiliza as tabelas:
 * - podcast_generated_pautas (main table)
 * - podcast_pauta_outline_sections
 * - podcast_pauta_questions
 * - podcast_pauta_sources
 */

import { supabase } from '@/services/supabaseClient'
import type { GeneratedPauta, PautaQuestion, OutlineSection, SourceCitation, Controversy } from './pautaGeneratorService'

// =====================================================
// TYPES
// =====================================================

export interface SavedPauta {
  id: string
  project_id: string
  guest_name: string
  theme: string
  version: number
  is_active: boolean
  research_summary: string | null
  biography: string | null
  key_facts: string[] | null
  controversies: any[] | null
  technical_sheet: any | null
  outline_title: string | null
  estimated_duration: number | null
  confidence_score: number | null
  tone: string | null
  depth: string | null
  focus_areas: string[] | null
  ice_breakers: string[] | null
  additional_context: string | null
  created_at: string
  updated_at: string
}

export interface CompleteSavedPauta {
  pauta: SavedPauta
  outline_sections: OutlineSectionRow[]
  questions: QuestionRow[]
  sources: SourceRow[]
}

export interface OutlineSectionRow {
  id: string
  pauta_id: string
  section_type: 'introduction' | 'main' | 'conclusion'
  section_order: number
  title: string
  description: string | null
  duration: number | null
  key_points: string[] | null
  suggested_transition: string | null
  created_at: string
  updated_at: string
}

export interface QuestionRow {
  id: string
  pauta_id: string
  question_text: string
  question_order: number
  category: 'abertura' | 'desenvolvimento' | 'aprofundamento' | 'fechamento' | 'quebra-gelo'
  priority: 'high' | 'medium' | 'low'
  follow_ups: string[] | null
  context: string | null
  source_refs: number[] | null
  estimated_duration: number | null
  created_at: string
  updated_at: string
}

export interface SourceRow {
  id: number
  pauta_id: string
  source_type: 'url' | 'text' | 'file'
  title: string
  url: string | null
  snippet: string | null
  reliability: 'high' | 'medium' | 'low'
  date: string | null
  is_user_provided: boolean
  created_at: string
}

export interface PautaVersion {
  id: string
  version: number
  is_active: boolean
  confidence_score: number | null
  created_at: string
}

// =====================================================
// SERVICE CLASS
// =====================================================

class PautaPersistenceService {
  /**
   * Salva uma pauta gerada completa no banco de dados
   *
   * Cria registros em todas as tabelas relacionadas:
   * - podcast_generated_pautas
   * - podcast_pauta_outline_sections
   * - podcast_pauta_questions
   * - podcast_pauta_sources
   *
   * O versionamento e automatico via trigger.
   */
  async savePauta(
    projectId: string,
    pauta: GeneratedPauta,
    guestName: string,
    theme: string,
    additionalContext?: string,
    tone?: string,
    depth?: string,
    focusAreas?: string[]
  ): Promise<{ success: boolean; pautaId?: string; error?: string }> {
    console.log('[savePauta] Iniciando salvamento de pauta:', {
      projectId,
      guestName,
      theme,
      hasOutline: !!pauta.outline,
      hasQuestions: !!pauta.questions,
      hasSources: !!pauta.sources
    })

    try {
      // 1. Insert main pauta record
      console.log('[savePauta] Step 1: Inserindo registro principal...')
      const { data: pautaRecord, error: pautaError } = await supabase
        .from('podcast_generated_pautas')
        .insert([
          {
            project_id: projectId,
            guest_name: guestName,
            theme: theme,
            is_active: true, // Nova pauta sempre e ativa
            research_summary: pauta.researchSummary || null,
            biography: pauta.biography || null,
            key_facts: pauta.keyFacts || null,
            controversies: pauta.controversies || null,
            technical_sheet: pauta.technicalSheet || null,
            outline_title: pauta.outline.title || null,
            estimated_duration: pauta.estimatedDuration || null,
            confidence_score: pauta.confidenceScore || null,
            tone: tone || 'casual',
            depth: depth || 'medium',
            focus_areas: focusAreas || null,
            ice_breakers: pauta.iceBreakers || null,
            additional_context: additionalContext || null,
          },
        ])
        .select()
        .single()

      if (pautaError) {
        console.error('[savePauta] ERRO ao inserir pauta:', pautaError)
        console.error('[savePauta] Detalhes do erro:', {
          code: pautaError.code,
          message: pautaError.message,
          details: pautaError.details,
          hint: pautaError.hint
        })
        return { success: false, error: pautaError.message }
      }

      if (!pautaRecord) {
        console.error('[savePauta] ERRO: pautaRecord é null após insert')
        return { success: false, error: 'Failed to create pauta record' }
      }

      console.log('[savePauta] ✅ Registro principal criado com ID:', pautaRecord.id)
      const pautaId = pautaRecord.id

      // 2. Insert outline sections
      console.log('[savePauta] Step 2: Inserindo outline sections...')
      const outlineSections = this.buildOutlineSections(pauta.outline, pautaId)
      console.log('[savePauta] Sections a inserir:', outlineSections.length)
      if (outlineSections.length > 0) {
        const { error: sectionsError } = await supabase
          .from('podcast_pauta_outline_sections')
          .insert(outlineSections)

        if (sectionsError) {
          console.error('Error inserting outline sections:', sectionsError)
          // Continue mesmo com erro - outline nao e critico
        }
      }

      // 3. Insert questions
      const questions = this.buildQuestions(pauta.questions, pautaId)
      if (questions.length > 0) {
        const { error: questionsError } = await supabase
          .from('podcast_pauta_questions')
          .insert(questions)

        if (questionsError) {
          console.error('Error inserting questions:', questionsError)
          // Continue mesmo com erro
        }
      }

      // 4. Insert sources
      const sources = this.buildSources(pauta.sources, pautaId)
      if (sources.length > 0) {
        const { error: sourcesError } = await supabase
          .from('podcast_pauta_sources')
          .insert(sources)

        if (sourcesError) {
          console.error('Error inserting sources:', sourcesError)
          // Continue mesmo com erro
        }
      }

      console.log('[savePauta] ✅✅✅ SUCESSO! Pauta salva com ID:', pautaId)
      return { success: true, pautaId }
    } catch (error) {
      console.error('[savePauta] ❌❌❌ ERRO FATAL ao salvar pauta:', error)
      console.error('[savePauta] Stack trace:', error instanceof Error ? error.stack : 'No stack')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Busca a pauta ativa para um projeto
   */
  async getActivePauta(projectId: string): Promise<CompleteSavedPauta | null> {
    try {
      // Busca pauta ativa
      const { data: pauta, error: pautaError } = await supabase
        .from('podcast_generated_pautas')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle()

      if (pautaError) {
        throw pautaError
      }

      if (!pauta) return null

      // Busca outline sections
      const { data: sections, error: sectionsError } = await supabase
        .from('podcast_pauta_outline_sections')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('section_order', { ascending: true })

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError)
      }

      // Busca questions
      const { data: questions, error: questionsError } = await supabase
        .from('podcast_pauta_questions')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('category, question_order', { ascending: true })

      if (questionsError) {
        console.error('Error fetching questions:', questionsError)
      }

      // Busca sources
      const { data: sources, error: sourcesError } = await supabase
        .from('podcast_pauta_sources')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('id', { ascending: true })

      if (sourcesError) {
        console.error('Error fetching sources:', sourcesError)
      }

      return {
        pauta: pauta as SavedPauta,
        outline_sections: (sections || []) as OutlineSectionRow[],
        questions: (questions || []) as QuestionRow[],
        sources: (sources || []) as SourceRow[],
      }
    } catch (error) {
      console.error('Error getting active pauta:', error)
      return null
    }
  }

  /**
   * Busca uma pauta especifica por ID
   */
  async getPautaById(pautaId: string): Promise<CompleteSavedPauta | null> {
    try {
      // Busca pauta
      const { data: pauta, error: pautaError } = await supabase
        .from('podcast_generated_pautas')
        .select('*')
        .eq('id', pautaId)
        .maybeSingle()

      if (pautaError || !pauta) return null

      // Busca outline sections
      const { data: sections } = await supabase
        .from('podcast_pauta_outline_sections')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('section_order', { ascending: true })

      // Busca questions
      const { data: questions } = await supabase
        .from('podcast_pauta_questions')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('category, question_order', { ascending: true })

      // Busca sources
      const { data: sources } = await supabase
        .from('podcast_pauta_sources')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('id', { ascending: true })

      return {
        pauta: pauta as SavedPauta,
        outline_sections: (sections || []) as OutlineSectionRow[],
        questions: (questions || []) as QuestionRow[],
        sources: (sources || []) as SourceRow[],
      }
    } catch (error) {
      console.error('Error getting pauta by ID:', error)
      return null
    }
  }

  /**
   * Lista todas as versoes de pautas para um projeto
   */
  async listPautaVersions(projectId: string): Promise<PautaVersion[]> {
    try {
      const { data, error } = await supabase
        .from('podcast_generated_pautas')
        .select('id, version, is_active, confidence_score, created_at')
        .eq('project_id', projectId)
        .order('version', { ascending: false })

      if (error) {
        console.error('Error listing pauta versions:', error)
        return []
      }

      return (data || []) as PautaVersion[]
    } catch (error) {
      console.error('Error listing pauta versions:', error)
      return []
    }
  }

  /**
   * Define uma pauta especifica como ativa
   */
  async setActivePauta(pautaId: string, projectId: string): Promise<boolean> {
    try {
      // Desativa todas as pautas do projeto
      const { error: deactivateError } = await supabase
        .from('podcast_generated_pautas')
        .update({ is_active: false })
        .eq('project_id', projectId)

      if (deactivateError) {
        console.error('Error deactivating pautas:', deactivateError)
        return false
      }

      // Ativa a pauta selecionada
      const { error: activateError } = await supabase
        .from('podcast_generated_pautas')
        .update({ is_active: true })
        .eq('id', pautaId)

      if (activateError) {
        console.error('Error activating pauta:', activateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error setting active pauta:', error)
      return false
    }
  }

  /**
   * Exclui uma pauta e todos os dados relacionados
   * (CASCADE delete automatico)
   */
  async deletePauta(pautaId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('podcast_generated_pautas')
        .delete()
        .eq('id', pautaId)

      if (error) {
        console.error('Error deleting pauta:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting pauta:', error)
      return false
    }
  }

  /**
   * Converte CompleteSavedPauta de volta para GeneratedPauta
   */
  savedPautaToGenerated(saved: CompleteSavedPauta): GeneratedPauta {
    // Rebuild outline
    const outline = {
      title: saved.pauta.outline_title || '',
      introduction: this.findIntroduction(saved.outline_sections),
      mainSections: this.findMainSections(saved.outline_sections),
      conclusion: this.findConclusion(saved.outline_sections),
    }

    // Rebuild questions
    const questions: PautaQuestion[] = saved.questions.map((q) => ({
      id: q.id,
      text: q.question_text,
      category: q.category,
      followUps: q.follow_ups || [],
      context: q.context || undefined,
      sourceRefs: q.source_refs || undefined,
      priority: q.priority,
    }))

    // Rebuild sources
    const sources: SourceCitation[] = saved.sources.map((s) => ({
      id: s.id,
      url: s.url || undefined,
      title: s.title,
      snippet: s.snippet || '',
      date: s.date || undefined,
      reliability: s.reliability,
    }))

    // Rebuild controversies
    const controversies: Controversy[] = saved.pauta.controversies || []

    return {
      outline,
      questions,
      iceBreakers: saved.pauta.ice_breakers || [],
      sources,
      researchSummary: saved.pauta.research_summary || '',
      estimatedDuration: saved.pauta.estimated_duration || 60,
      confidenceScore: saved.pauta.confidence_score || 0,
      biography: saved.pauta.biography || '',
      controversies,
      keyFacts: saved.pauta.key_facts || [],
      technicalSheet: saved.pauta.technical_sheet || undefined,
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private buildOutlineSections(
    outline: GeneratedPauta['outline'],
    pautaId: string
  ): any[] {
    const sections: any[] = []

    // Introduction
    sections.push({
      pauta_id: pautaId,
      section_type: 'introduction',
      section_order: 0,
      title: outline.introduction.title,
      description: outline.introduction.description,
      duration: outline.introduction.duration,
      key_points: outline.introduction.keyPoints,
      suggested_transition: outline.introduction.suggestedTransition || null,
    })

    // Main sections
    outline.mainSections.forEach((section, idx) => {
      sections.push({
        pauta_id: pautaId,
        section_type: 'main',
        section_order: idx + 1,
        title: section.title,
        description: section.description,
        duration: section.duration,
        key_points: section.keyPoints,
        suggested_transition: section.suggestedTransition || null,
      })
    })

    // Conclusion
    sections.push({
      pauta_id: pautaId,
      section_type: 'conclusion',
      section_order: outline.mainSections.length + 1,
      title: outline.conclusion.title,
      description: outline.conclusion.description,
      duration: outline.conclusion.duration,
      key_points: outline.conclusion.keyPoints,
      suggested_transition: null,
    })

    return sections
  }

  private buildQuestions(questions: PautaQuestion[], pautaId: string): any[] {
    return questions.map((q, idx) => ({
      pauta_id: pautaId,
      question_text: q.text,
      question_order: idx,
      category: q.category,
      priority: q.priority,
      follow_ups: q.followUps,
      context: q.context || null,
      source_refs: q.sourceRefs || null,
      estimated_duration: null, // Pode ser calculado depois
    }))
  }

  private buildSources(sources: SourceCitation[], pautaId: string): any[] {
    return sources.map((s) => ({
      pauta_id: pautaId,
      source_type: 'url', // Default, pode ser ajustado
      title: s.title,
      url: s.url || null,
      snippet: s.snippet,
      reliability: s.reliability,
      date: s.date || null,
      is_user_provided: false, // AI-generated by default
    }))
  }

  private findIntroduction(sections: OutlineSectionRow[]): OutlineSection {
    const intro = sections.find((s) => s.section_type === 'introduction')
    return {
      title: intro?.title || 'Introducao',
      description: intro?.description || '',
      duration: intro?.duration || 5,
      keyPoints: intro?.key_points || [],
      suggestedTransition: intro?.suggested_transition,
    }
  }

  private findMainSections(sections: OutlineSectionRow[]): OutlineSection[] {
    return sections
      .filter((s) => s.section_type === 'main')
      .sort((a, b) => a.section_order - b.section_order)
      .map((s) => ({
        title: s.title,
        description: s.description || '',
        duration: s.duration || 15,
        keyPoints: s.key_points || [],
        suggestedTransition: s.suggested_transition,
      }))
  }

  private findConclusion(sections: OutlineSectionRow[]): OutlineSection {
    const conclusion = sections.find((s) => s.section_type === 'conclusion')
    return {
      title: conclusion?.title || 'Fechamento',
      description: conclusion?.description || '',
      duration: conclusion?.duration || 5,
      keyPoints: conclusion?.key_points || [],
    }
  }
}

// Singleton export
export const pautaPersistenceService = new PautaPersistenceService()

// Default export
export default pautaPersistenceService
