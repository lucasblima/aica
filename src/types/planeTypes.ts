// Type definitions for Plane.so API responses
// Documentation: https://developers.plane.so/api-reference/introduction

export interface PlaneProject {
    id: string;
    identifier: string;
    name: string;
    description: string;
    description_html: string;
    network: number;
    created_at: string;
    updated_at: string;
    is_favorite: boolean;
    total_members: number;
    total_cycles: number;
    total_modules: number;
    is_member: boolean;
    member_role: number | null;
    emoji: string | null;
    icon_prop: any | null;
    logo_props: any | null;
    cover_image: string | null;
    archive_in: number;
    close_in: number;
}

export interface PlaneIssue {
    id: string;
    name: string;
    description: string;
    description_html: string;
    priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
    start_date: string | null;
    target_date: string | null;
    sequence_id: number;
    project: string;
    project_detail: {
        id: string;
        identifier: string;
        name: string;
    };
    state: string;
    state_detail: PlaneState;
    estimate_point: number | null;
    assignees: string[];
    labels: string[];
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    archived_at: string | null;
    is_draft: boolean;
}

export interface PlaneState {
    id: string;
    name: string;
    group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
    color: string;
    description: string;
    sequence: number;
    project: string;
}

export interface PlaneModule {
    id: string;
    name: string;
    description: string;
    description_html: string;
    start_date: string | null;
    target_date: string | null;
    status: 'backlog' | 'planned' | 'in-progress' | 'paused' | 'completed' | 'cancelled';
    lead: string | null;
    members: string[];
    project: string;
    created_at: string;
    updated_at: string;
}

export interface PlaneCycle {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    project: string;
    status: 'current' | 'upcoming' | 'completed' | 'draft';
    progress_snapshot: {
        total_issues: number;
        completed_issues: number;
        cancelled_issues: number;
    };
    created_at: string;
    updated_at: string;
}

export interface PlaneWorkspaceMember {
    id: string;
    member: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        display_name: string;
        avatar: string;
    };
    role: number;
    created_at: string;
}

// API Response wrappers
export interface PlaneListResponse<T> {
    results: T[];
    count: number;
    next: string | null;
    previous: string | null;
}

// State group mapping
export type StateGroup = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export const PLANE_STATE_GROUP_MAP: Record<string, StateGroup> = {
    'backlog': 'backlog',
    'unstarted': 'todo',
    'started': 'in_progress',
    'completed': 'done',
    'cancelled': 'review', // Map cancelled to review or adjust as needed
};
