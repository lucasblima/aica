export interface TaskInput {
    title: string;
    description?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
    status: string; // Ex: "todo", "in_progress", "done"
    start_date?: string;
    target_date?: string;
}

export interface AtlasTask extends TaskInput {
    id: string; // UUID or temp_ identifier
    isOptimistic?: boolean; // Flag for UI to know if still syncing
    created_at?: string;
    updated_at?: string;
}
