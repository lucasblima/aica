/**
 * AUTO-GENERATED SUPABASE TYPES
 * Generated: 2025-12-04
 *
 * IMPORTANT: This file is the Single Source of Truth for database schema
 * DO NOT edit manually - regenerate using: supabase gen types typescript
 *
 * Usage:
 * import { Database } from './types/database.types'
 * const client = createClient<Database>(URL, KEY)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_reports: {
        Row: {
          actions_identified: number | null
          created_at: string | null
          generated_at: string | null
          id: string
          insights_count: number | null
          report_content: string
          report_date: string
          report_type: string
          user_id: string
        }
        Insert: {
          actions_identified?: number | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          insights_count?: number | null
          report_content: string
          report_date: string
          report_type: string
          user_id: string
        }
        Update: {
          actions_identified?: number | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          insights_count?: number | null
          report_content?: string
          report_date?: string
          report_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // ... outras tabelas omitidas por brevidade
    }
    Functions: {
      check_membership: { Args: { assoc_id: string }; Returns: boolean }
      is_member_of: { Args: { _association_id: string }; Returns: boolean }
      // ... outras funções
    }
  }
}

// Helper types
type DefaultSchema = Omit<Database, "__InternalSupabase">["public"]

export type Tables<TableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][TableName]["Row"]

// Note: No Enums defined in the current schema
export type Enums<EnumName extends string> = never
