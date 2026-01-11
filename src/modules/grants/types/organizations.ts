/**
 * Types para a entidade Organizations
 * Issue #95 - Criar entidade Organizations para modelar instituicoes proponentes e executoras
 */

export type OrganizationType =
  | 'ong'
  | 'empresa'
  | 'instituto'
  | 'associacao'
  | 'cooperativa'
  | 'governo'
  | 'outro';

export type RelationshipType =
  | 'parceria'
  | 'execucao'
  | 'financiamento'
  | 'fiscalizacao'
  | 'apoio'
  | 'afiliacao'
  | 'outro';

export interface BrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export interface Organization {
  id: string;
  user_id: string;

  // Identificacao
  name: string;
  legal_name?: string;
  document_number?: string; // CNPJ
  organization_type: OrganizationType;

  // Contato
  email?: string;
  phone?: string;
  website?: string;

  // Endereco
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;

  // Contextualizacao
  description?: string;
  mission?: string;
  vision?: string;
  values?: string;
  areas_of_activity: string[];
  foundation_year?: number;

  // Recursos visuais
  logo_url?: string;
  cover_image_url?: string;
  brand_colors: BrandColors;
  social_links: SocialLinks;

  // Metadados
  is_active: boolean;
  is_verified: boolean;
  profile_completeness: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface OrganizationRelationship {
  id: string;
  organization_a_id: string;
  organization_b_id: string;
  relationship_type: RelationshipType;
  direction_label_a_to_b?: string;
  direction_label_b_to_a?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Populated via joins
  organization_a?: Organization;
  organization_b?: Organization;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  contact_id: string;
  role?: string;
  department?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// DTOs para criacao/atualizacao
export type CreateOrganizationDTO = Omit<
  Organization,
  'id' | 'user_id' | 'is_verified' | 'profile_completeness' | 'created_at' | 'updated_at'
>;

export type UpdateOrganizationDTO = Partial<CreateOrganizationDTO>;

export type CreateRelationshipDTO = Omit<
  OrganizationRelationship,
  'id' | 'created_at' | 'updated_at' | 'organization_a' | 'organization_b'
>;

export type CreateMemberDTO = Omit<OrganizationMember, 'id' | 'created_at' | 'updated_at'>;

// Constantes para UI
export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  ong: 'ONG',
  empresa: 'Empresa',
  instituto: 'Instituto',
  associacao: 'Associacao',
  cooperativa: 'Cooperativa',
  governo: 'Orgao Governamental',
  outro: 'Outro',
};

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  parceria: 'Parceria',
  execucao: 'Execucao',
  financiamento: 'Financiamento',
  fiscalizacao: 'Fiscalizacao',
  apoio: 'Apoio',
  afiliacao: 'Afiliacao',
  outro: 'Outro',
};

export const AREAS_OF_ACTIVITY_OPTIONS = [
  { value: 'cultura', label: 'Cultura' },
  { value: 'educacao', label: 'Educacao' },
  { value: 'saude', label: 'Saude' },
  { value: 'meio_ambiente', label: 'Meio Ambiente' },
  { value: 'esporte', label: 'Esporte' },
  { value: 'assistencia_social', label: 'Assistencia Social' },
  { value: 'direitos_humanos', label: 'Direitos Humanos' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'pesquisa', label: 'Pesquisa' },
  { value: 'desenvolvimento_comunitario', label: 'Desenvolvimento Comunitario' },
] as const;
