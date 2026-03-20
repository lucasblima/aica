/**
 * Pauta Persistence Service - Studio Module
 *
 * Manages persistence of generated pautas in Supabase database.
 * Supports:
 * - Automatic versioning
 * - Complete save (pauta + outline + questions + sources)
 * - Active pauta retrieval and version history
 * - Pauta deletion
 *
 * Uses database tables:
 * - podcast_generated_pautas (main table)
 * - podcast_pauta_outline_sections
 * - podcast_pauta_questions
 * - podcast_pauta_sources
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/services/pautaPersistenceService.ts
 * Wave 8: Validation & Fixes - Service Migrations
 */

import { supabase } from '@/services/supabaseClient'
import type { GeneratedPauta, PautaQuestion, OutlineSection, SourceCitation, Controversy } from './pautaGeneratorService'
import type { SavedPauta } from '../types'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('pautaPersistenceService');

// =====================================================
// TYPES
// =====================================================

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
   * Saves a complete generated pauta to database
   *
   * Creates records in all related tables:
   * - podcast_generated_pautas
   * - podcast_pauta_outline_sections
   * - podcast_pauta_questions
   * - podcast_pauta_sources
   *
   * Versioning is automatic via trigger.
   */
  async savePauta(
    episodeId: string,
    userId: string,
    pauta: GeneratedPauta,
    guestName: string,
    theme: string,
    additionalContext?: string,
    tone?: string,
    depth?: string,
    focusAreas?: string[]
  ): Promise<{ success: boolean; pautaId?: string; error?: string }> {
    log.debug('[savePauta] Starting pauta save:', {
      episodeId,
      userId,
      guestName,
      theme,
      hasOutline: !!pauta.outline,
      hasQuestions: !!pauta.questions,
      hasSources: !!pauta.sources
    })

    try {
      // 1. Insert main pauta record
      log.debug('[savePauta] Step 1: Inserting main record...')
      const { data: pautaRecord, error: pautaError } = await supabase
        .from('podcast_generated_pautas')
        .insert([
          {
            episode_id: episodeId,
            user_id: userId,
            guest_name: guestName,
            theme: theme,
            is_active: true, // New pauta is always active
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
        log.error('[savePauta] ERROR inserting pauta:', pautaError)
        log.error('[savePauta] Error details:', {
          code: pautaError.code,
          message: pautaError.message,
          details: pautaError.details,
          hint: pautaError.hint
        })
        return { success: false, error: pautaError.message }
      }

      if (!pautaRecord) {
        log.error('[savePauta] ERROR: pautaRecord is null after insert')
        return { success: false, error: 'Failed to create pauta record' }
      }

      log.debug('[savePauta] ✅ Main record created with ID:', pautaRecord.id)
      const pautaId = pautaRecord.id

      // 2. Insert outline sections
      log.debug('[savePauta] Step 2: Inserting outline sections...')
      const outlineSections = this.buildOutlineSections(pauta.outline, pautaId)
      log.debug('[savePauta] Sections to insert:', outlineSections.length)
      if (outlineSections.length > 0) {
        const { error: sectionsError } = await supabase
          .from('podcast_pauta_outline_sections')
          .insert(outlineSections)

        if (sectionsError) {
          log.error('Error inserting outline sections:', sectionsError)
          // Continue even with error - outline is not critical
        }
      }

      // 3. Insert questions
      const questions = this.buildQuestions(pauta.questions, pautaId)
      if (questions.length > 0) {
        const { error: questionsError } = await supabase
          .from('podcast_pauta_questions')
          .insert(questions)

        if (questionsError) {
          log.error('Error inserting questions:', questionsError)
          // Continue even with error
        }
      }

      // 4. Insert sources
      const sources = this.buildSources(pauta.sources, pautaId)
      if (sources.length > 0) {
        const { error: sourcesError } = await supabase
          .from('podcast_pauta_sources')
          .insert(sources)

        if (sourcesError) {
          log.error('Error inserting sources:', sourcesError)
          // Continue even with error
        }
      }

      log.debug('[savePauta] ✅✅✅ SUCCESS! Pauta saved with ID:', pautaId)
      return { success: true, pautaId }
    } catch (error) {
      log.error('[savePauta] ❌❌❌ FATAL ERROR saving pauta:', error)
      log.error('[savePauta] Stack trace:', error instanceof Error ? error.stack : 'No stack')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Fetches the active pauta for an episode
   */
  async getActivePauta(episodeId: string): Promise<CompleteSavedPauta | null> {
    try {
      // Fetch active pauta
      const { data: pauta, error: pautaError } = await supabase
        .from('podcast_generated_pautas')
        .select('*')
        .eq('episode_id', episodeId)
        .eq('is_active', true)
        .maybeSingle()

      if (pautaError) {
        throw pautaError
      }

      if (!pauta) return null

      // Fetch outline sections
      const { data: sections, error: sectionsError } = await supabase
        .from('podcast_pauta_outline_sections')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('section_order', { ascending: true })

      if (sectionsError) {
        log.error('Error fetching sections:', sectionsError)
      }

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('podcast_pauta_questions')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('category, question_order', { ascending: true })

      if (questionsError) {
        log.error('Error fetching questions:', questionsError)
      }

      // Fetch sources
      const { data: sources, error: sourcesError } = await supabase
        .from('podcast_pauta_sources')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('id', { ascending: true })

      if (sourcesError) {
        log.error('Error fetching sources:', sourcesError)
      }

      return {
        pauta: pauta as SavedPauta,
        outline_sections: (sections || []) as OutlineSectionRow[],
        questions: (questions || []) as QuestionRow[],
        sources: (sources || []) as SourceRow[],
      }
    } catch (error) {
      log.error('Error getting active pauta:', error)
      return null
    }
  }

  /**
   * Fetches a specific pauta by ID
   */
  async getPautaById(pautaId: string): Promise<CompleteSavedPauta | null> {
    try {
      // Fetch pauta
      const { data: pauta, error: pautaError } = await supabase
        .from('podcast_generated_pautas')
        .select('*')
        .eq('id', pautaId)
        .maybeSingle()

      if (pautaError || !pauta) return null

      // Fetch outline sections
      const { data: sections } = await supabase
        .from('podcast_pauta_outline_sections')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('section_order', { ascending: true })

      // Fetch questions
      const { data: questions } = await supabase
        .from('podcast_pauta_questions')
        .select('*')
        .eq('pauta_id', pauta.id)
        .order('category, question_order', { ascending: true })

      // Fetch sources
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
      log.error('Error getting pauta by ID:', error)
      return null
    }
  }

  /**
   * Lists all pauta versions for an episode
   */
  async listPautaVersions(episodeId: string): Promise<PautaVersion[]> {
    try {
      const { data, error } = await supabase
        .from('podcast_generated_pautas')
        .select('id, version, is_active, confidence_score, created_at')
        .eq('episode_id', episodeId)
        .order('version', { ascending: false })

      if (error) {
        log.error('Error listing pauta versions:', error)
        return []
      }

      return (data || []) as PautaVersion[]
    } catch (error) {
      log.error('Error listing pauta versions:', error)
      return []
    }
  }

  /**
   * Sets a specific pauta as active
   */
  async setActivePauta(pautaId: string, episodeId: string): Promise<boolean> {
    try {
      // Deactivate all pautas for the episode
      const { error: deactivateError } = await supabase
        .from('podcast_generated_pautas')
        .update({ is_active: false })
        .eq('episode_id', episodeId)

      if (deactivateError) {
        log.error('Error deactivating pautas:', deactivateError)
        return false
      }

      // Activate the selected pauta
      const { error: activateError } = await supabase
        .from('podcast_generated_pautas')
        .update({ is_active: true })
        .eq('id', pautaId)

      if (activateError) {
        log.error('Error activating pauta:', activateError)
        return false
      }

      return true
    } catch (error) {
      log.error('Error setting active pauta:', error)
      return false
    }
  }

  /**
   * Deletes a pauta and all related data
   * (CASCADE delete is automatic)
   */
  async deletePauta(pautaId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('podcast_generated_pautas')
        .delete()
        .eq('id', pautaId)

      if (error) {
        log.error('Error deleting pauta:', error)
        return false
      }

      return true
    } catch (error) {
      log.error('Error deleting pauta:', error)
      return false
    }
  }

  /**
   * Converts CompleteSavedPauta back to GeneratedPauta
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
      stepsFailed: (saved.pauta as Record<string, any>).steps_failed || [],
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
      estimated_duration: null, // Can be calculated later
    }))
  }

  private buildSources(sources: SourceCitation[], pautaId: string): any[] {
    return sources.map((s) => ({
      pauta_id: pautaId,
      source_type: 'url', // Default, can be adjusted
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
      title: intro?.title || 'Introduction',
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
      title: conclusion?.title || 'Conclusion',
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
