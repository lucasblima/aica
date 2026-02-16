/**
 * Athlete Document Service
 *
 * Manages medical document uploads, retrieval, and coach review.
 * Uses Supabase Storage (medical-documents bucket) + athlete_documents table.
 */

import { supabase } from '@/services/supabaseClient';
import type { AthleteDocument, MedicalDocumentType, UploadDocumentInput } from '../types/parq';

export class AthleteDocumentService {
  private static BUCKET = 'medical-documents';

  /**
   * Upload a medical document
   */
  static async uploadDocument(input: UploadDocumentInput): Promise<{
    data: AthleteDocument | null;
    error: any;
  }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const userId = userData.user.id;
      const fileExt = input.file.name.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}_${input.document_type}.${fileExt}`;
      const storagePath = `${userId}/medical/${input.athlete_id}/${fileName}`;

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(AthleteDocumentService.BUCKET)
        .upload(storagePath, input.file, {
          contentType: input.file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('[AthleteDocumentService] Storage upload error:', uploadError);
        return { data: null, error: uploadError };
      }

      // 2. Insert DB record
      const { data, error: dbError } = await supabase
        .from('athlete_documents')
        .insert({
          athlete_id: input.athlete_id,
          uploaded_by: userId,
          parq_response_id: input.parq_response_id || null,
          document_type: input.document_type,
          title: input.title,
          description: input.description || null,
          storage_path: storagePath,
          file_name: input.file.name,
          file_size_bytes: input.file.size,
          mime_type: input.file.type,
          issued_at: input.issued_at || null,
          expires_at: input.expires_at || null,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from(AthleteDocumentService.BUCKET).remove([storagePath]);
        return { data: null, error: dbError };
      }

      return { data, error: null };
    } catch (error) {
      console.error('[AthleteDocumentService] Error uploading document:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all documents for an athlete
   */
  static async getDocumentsByAthlete(athleteId: string): Promise<{
    data: AthleteDocument[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('athlete_documents')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[AthleteDocumentService] Error fetching documents:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a signed URL for document download (60min expiry)
   */
  static async getDocumentUrl(doc: AthleteDocument): Promise<{
    url: string | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase.storage
        .from(AthleteDocumentService.BUCKET)
        .createSignedUrl(doc.storage_path, 3600); // 60 minutes

      if (error) return { url: null, error };
      return { url: data.signedUrl, error: null };
    } catch (error) {
      console.error('[AthleteDocumentService] Error getting signed URL:', error);
      return { url: null, error };
    }
  }

  /**
   * Coach reviews a document (approve/reject)
   */
  static async reviewDocument(
    docId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<{ data: AthleteDocument | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('athlete_documents')
        .update({
          review_status: status,
          reviewed_by: userData.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[AthleteDocumentService] Error reviewing document:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a document (storage + DB)
   */
  static async deleteDocument(docId: string): Promise<{ error: any }> {
    try {
      // Get the document first to know the storage path
      const { data: doc, error: fetchError } = await supabase
        .from('athlete_documents')
        .select('storage_path')
        .eq('id', docId)
        .single();

      if (fetchError) return { error: fetchError };

      // Delete from storage
      if (doc?.storage_path) {
        await supabase.storage
          .from(AthleteDocumentService.BUCKET)
          .remove([doc.storage_path]);
      }

      // Delete DB record
      const { error } = await supabase
        .from('athlete_documents')
        .delete()
        .eq('id', docId);

      return { error };
    } catch (error) {
      console.error('[AthleteDocumentService] Error deleting document:', error);
      return { error };
    }
  }
}
