// ============================================
// ENUMS & LITERAL TYPES
// ============================================

export type ParQRiskLevel = 'low' | 'intermediate' | 'high';

export type ParQClearanceStatus = 'pending' | 'cleared' | 'cleared_with_restrictions' | 'blocked' | 'expired';

export type MedicalDocumentType =
  | 'atestado_medico'
  | 'exame_cardiologico'
  | 'laudo_medico'
  | 'exame_laboratorial'
  | 'receita_medica'
  | 'liberacao_atividade'
  | 'outros';

export type ParQWizardStep = 'intro' | 'classic' | 'followup' | 'result' | 'sign' | 'upload';

export type FollowUpCategory =
  | 'cardiovascular'
  | 'respiratory'
  | 'musculoskeletal'
  | 'neurological'
  | 'metabolic'
  | 'mental_health'
  | 'spinal'
  | 'cancer'
  | 'pregnancy'
  | 'other';

// ============================================
// DATA MODELS (DB)
// ============================================

export interface ParQClassicQuestion {
  id: string; // q1 through q7
  text: string;
  answer: boolean;
}

export interface FollowUpQuestion {
  id: string;
  text: string;
  answer: boolean;
}

export interface FollowUpCategoryBlock {
  category: FollowUpCategory;
  label: string;
  questions: FollowUpQuestion[];
}

export interface ParQResponse {
  id: string;
  athlete_id: string;
  filled_by: string;
  filled_by_role: 'athlete' | 'coach';
  version: string;

  // Classic answers
  q1_cardiac_condition: boolean;
  q2_chest_pain_activity: boolean;
  q3_chest_pain_rest: boolean;
  q4_dizziness_balance: boolean;
  q5_bone_joint_problem: boolean;
  q6_blood_pressure_meds: boolean;
  q7_other_physical_reason: boolean;

  // Follow-ups
  followup_answers: Record<FollowUpCategory, Record<string, boolean>> | null;

  // Result
  risk_level: ParQRiskLevel;
  clearance_status: 'cleared' | 'cleared_with_restrictions' | 'blocked';
  restrictions: string[];

  // Signature
  signed_at: string | null;
  signature_text: string | null;

  // Validity
  expires_at: string;
  superseded_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface AthleteDocument {
  id: string;
  athlete_id: string;
  uploaded_by: string;
  parq_response_id: string | null;

  document_type: MedicalDocumentType;
  title: string;
  description: string | null;

  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;

  issued_at: string | null;
  expires_at: string | null;

  reviewed_by: string | null;
  reviewed_at: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================
// WIZARD STATE
// ============================================

export interface ParQWizardState {
  step: ParQWizardStep;
  classicAnswers: boolean[]; // 7 items, index 0-6
  followUpAnswers: Record<FollowUpCategory, Record<string, boolean>>;
  activeFollowUpCategories: FollowUpCategory[];
  calculatedRisk: ParQRiskLevel | null;
  calculatedClearance: 'cleared' | 'cleared_with_restrictions' | 'blocked' | null;
  restrictions: string[];
  signatureText: string;
  signedAt: string | null;
  isSubmitting: boolean;
  submitError: string | null;
}

// ============================================
// DTOs / API RESPONSES
// ============================================

export interface ParQStatus {
  has_parq: boolean;
  clearance_status: ParQClearanceStatus;
  risk_level: ParQRiskLevel | null;
  expires_at: string | null;
  is_expired: boolean;
  has_clearance_document: boolean;
}

export interface WorkoutClearanceResult {
  cleared: boolean;
  reason: string | null;
  parq_status: ParQClearanceStatus;
  missing_documents: string[];
}

// ============================================
// SERVICE INPUT TYPES
// ============================================

export interface SubmitParQInput {
  athlete_id: string;
  filled_by_role: 'athlete' | 'coach';
  classic_answers: boolean[]; // 7 items
  followup_answers: Record<FollowUpCategory, Record<string, boolean>> | null;
  risk_level: ParQRiskLevel;
  clearance_status: 'cleared' | 'cleared_with_restrictions' | 'blocked';
  restrictions: string[];
  signature_text: string;
}

export interface UploadDocumentInput {
  athlete_id: string;
  file: File;
  document_type: MedicalDocumentType;
  title: string;
  description?: string;
  parq_response_id?: string;
  issued_at?: string;
  expires_at?: string;
}
