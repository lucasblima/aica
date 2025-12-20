export type TaskCategory = 'Trabalho' | 'Pessoal' | 'Saúde' | 'Educação' | 'Finanças' | 'Outros';

export interface TaskInput {
    title: string;
    description?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
    status: string; // Ex: "todo", "in_progress", "done"
    start_date?: string;
    target_date?: string;
    category?: TaskCategory;
    // Eisenhower Matrix dimensions
    is_urgent?: boolean; // X-axis: Time-sensitive or deadline-driven
    is_important?: boolean; // Y-axis: Impacts long-term goals or strategic objectives
    // Connection linking - references to connection spaces and archetype-specific entities
    connection_space_id?: string; // Link to connection space
    habitat_property_id?: string; // Habitat-specific reference
    ventures_entity_id?: string; // Ventures-specific reference
    academia_journey_id?: string; // Academia-specific reference
    tribo_ritual_id?: string; // Tribo-specific reference
}

export interface AtlasTask extends TaskInput {
    id: string; // UUID or temp_ identifier
    isOptimistic?: boolean; // Flag for UI to know if still syncing
    created_at?: string;
    updated_at?: string;
    // Eisenhower Matrix quadrant (computed from is_urgent + is_important)
    priority_quadrant?: 'urgent-important' | 'important' | 'urgent' | 'low';
    // Connection space metadata (populated via JOIN when filtering by connection)
    connection_space_name?: string; // Name of linked connection space
}
