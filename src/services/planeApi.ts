import axios from 'axios';
import type {
    PlaneProject,
    PlaneIssue,
    PlaneState,
    PlaneModule,
    PlaneCycle,
    PlaneWorkspaceMember,
    PlaneListResponse
} from '../types/planeTypes';

const PLANE_BASE_URL = import.meta.env.VITE_PLANE_BASE_URL;
const PLANE_API_KEY = import.meta.env.VITE_PLANE_API_KEY;
const WORKSPACE_SLUG = import.meta.env.VITE_PLANE_WORKSPACE_SLUG;

// Use proxy in development to avoid CORS issues
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? '' : PLANE_BASE_URL;

export const planeApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PLANE_API_KEY,
    },
    timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
planeApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('Plane API Error:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('Plane API Network Error:', error.message);
        }
        return Promise.reject(error);
    }
);

// ==================== WORKSPACE ====================

export const getWorkspaceDetails = async () => {
    try {
        const response = await planeApi.get(`/api/v1/workspaces/${WORKSPACE_SLUG}/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching workspace details:', error);
        throw error;
    }
};

export const getWorkspaceMembers = async (): Promise<PlaneWorkspaceMember[]> => {
    try {
        const response = await planeApi.get<PlaneWorkspaceMember[]>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/members/`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching workspace members:', error);
        throw error;
    }
};

// ==================== PROJECTS ====================

export const getProjects = async (): Promise<PlaneListResponse<PlaneProject>> => {
    try {
        const response = await planeApi.get<PlaneListResponse<PlaneProject>>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
};

export const getProjectById = async (projectId: string): Promise<PlaneProject> => {
    try {
        const response = await planeApi.get<PlaneProject>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching project ${projectId}:`, error);
        throw error;
    }
};

// ==================== ISSUES ====================

export const getIssues = async (projectId: string): Promise<PlaneListResponse<PlaneIssue>> => {
    try {
        const response = await planeApi.get<PlaneListResponse<PlaneIssue>>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/issues/`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching issues for project ${projectId}:`, error);
        throw error;
    }
};

export const getAllIssuesForProjects = async (projectIds: string[]): Promise<PlaneIssue[]> => {
    try {
        const issuePromises = projectIds.map(projectId => getIssues(projectId));
        const results = await Promise.allSettled(issuePromises);

        const allIssues: PlaneIssue[] = [];
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                allIssues.push(...result.value.results);
            }
        });

        return allIssues;
    } catch (error) {
        console.error('Error fetching all issues:', error);
        throw error;
    }
};

// ==================== STATES ====================

export const getStates = async (projectId: string): Promise<PlaneListResponse<PlaneState>> => {
    try {
        const response = await planeApi.get<PlaneListResponse<PlaneState>>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/states/`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching states for project ${projectId}:`, error);
        throw error;
    }
};

// ==================== MODULES ====================

export const getModules = async (projectId: string): Promise<PlaneListResponse<PlaneModule>> => {
    try {
        const response = await planeApi.get<PlaneListResponse<PlaneModule>>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/modules/`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching modules for project ${projectId}:`, error);
        throw error;
    }
};

// ==================== CYCLES ====================

export const getCycles = async (projectId: string): Promise<PlaneListResponse<PlaneCycle>> => {
    try {
        const response = await planeApi.get<PlaneListResponse<PlaneCycle>>(
            `/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${projectId}/cycles/`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching cycles for project ${projectId}:`, error);
        throw error;
    }
};
