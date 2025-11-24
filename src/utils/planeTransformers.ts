import type { PlaneProject, PlaneIssue, PlaneState } from '../types/planeTypes';
import type { AssociationDetail, WorkItemB2B, ActivityLog } from '../../types';
import { PLANE_STATE_GROUP_MAP, type StateGroup } from '../types/planeTypes';

// Transform Plane project to AssociationDetail
export const transformPlaneProjectToAssociation = (
    project: PlaneProject,
    planeProjectId: string,
    supabaseAssociation?: any
): AssociationDetail => {
    return {
        id: supabaseAssociation?.id || project.id,
        name: project.name,
        cnpj: supabaseAssociation?.cnpj || '',
        workspaceSlug: project.identifier,
        membersCount: project.total_members,
        syncStatus: 'synced' as const,
        lastSync: new Date().toLocaleString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        healthScore: calculateHealthScore(project),
        projectsCount: 1, // Each association maps to one project
    };
};

// Calculate health score based on project activity
const calculateHealthScore = (project: PlaneProject): number => {
    // Simple heuristic: more recent updates = better health
    const updatedAt = new Date(project.updated_at);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate < 1) return 100;
    if (daysSinceUpdate < 7) return 90;
    if (daysSinceUpdate < 14) return 75;
    if (daysSinceUpdate < 30) return 60;
    return 50;
};

// Transform Plane issue to WorkItemB2B
export const transformPlaneIssueToWorkItem = (
    issue: PlaneIssue,
    projectName: string
): WorkItemB2B => {
    const state = mapPlaneStateToInternal(issue.state_detail.group);
    const isOverdue = issue.target_date
        ? new Date(issue.target_date) < new Date() && !issue.completed_at
        : false;

    return {
        id: issue.id,
        title: issue.name,
        associationName: projectName,
        state,
        priority: issue.priority,
        dueDate: issue.target_date || new Date().toISOString(),
        assigneeName: issue.assignees.length > 0 ? 'Equipe' : 'Não atribuído',
        isOverdue,
        syncStatus: 'synced' as const,
    };
};

// Map Plane state groups to our internal state groups
export const mapPlaneStateToInternal = (planeStateGroup: string): StateGroup => {
    return PLANE_STATE_GROUP_MAP[planeStateGroup] || 'backlog';
};

// Calculate workload distribution from issues
export const calculateWorkloadDistribution = (issues: PlaneIssue[]) => {
    const distribution = {
        backlog: 0,
        todo: 0,
        in_progress: 0,
        review: 0,
        done: 0,
    };

    issues.forEach((issue) => {
        const stateGroup = mapPlaneStateToInternal(issue.state_detail.group);
        distribution[stateGroup]++;
    });

    return distribution;
};

// Calculate priority distribution from issues
export const calculatePriorityDistribution = (issues: PlaneIssue[]) => {
    const distribution = {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    issues.forEach((issue) => {
        if (issue.priority === 'urgent') distribution.urgent++;
        else if (issue.priority === 'high') distribution.high++;
        else if (issue.priority === 'medium') distribution.medium++;
        else if (issue.priority === 'low') distribution.low++;
    });

    return distribution;
};

// Get risk items (overdue + high/urgent priority)
export const extractRiskItems = (
    issues: PlaneIssue[],
    projectName: string,
    limit: number = 10
): WorkItemB2B[] => {
    const now = new Date();

    const riskIssues = issues.filter((issue) => {
        const isHighPriority = issue.priority === 'urgent' || issue.priority === 'high';
        const isOverdue = issue.target_date && new Date(issue.target_date) < now && !issue.completed_at;
        const isNotCompleted = issue.state_detail.group !== 'completed';

        return isNotCompleted && (isHighPriority || isOverdue);
    });

    return riskIssues
        .slice(0, limit)
        .map((issue) => transformPlaneIssueToWorkItem(issue, projectName));
};

// Generate activity log from recent issues
export const generateActivityLog = (
    issues: PlaneIssue[],
    limit: number = 5
): ActivityLog[] => {
    const sortedIssues = [...issues].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return sortedIssues.slice(0, limit).map((issue, index) => {
        const minutesAgo = Math.floor(
            (new Date().getTime() - new Date(issue.updated_at).getTime()) / (1000 * 60)
        );

        let timeAgo: string;
        if (minutesAgo < 60) timeAgo = `${minutesAgo} min atrás`;
        else if (minutesAgo < 1440) timeAgo = `${Math.floor(minutesAgo / 60)}h atrás`;
        else timeAgo = `${Math.floor(minutesAgo / 1440)}d atrás`;

        return {
            id: `log-${issue.id}`,
            user: issue.assignees.length > 0 ? 'Equipe' : 'Sistema',
            action: getActivityAction(issue),
            target: issue.name,
            timestamp: timeAgo,
            type: getActivityType(issue),
        };
    });
};

const getActivityAction = (issue: PlaneIssue): string => {
    if (issue.completed_at) return 'concluiu';
    if (issue.state_detail.group === 'started') return 'iniciou';
    if (issue.state_detail.group === 'unstarted') return 'criou';
    return 'atualizou';
};

const getActivityType = (issue: PlaneIssue): 'success' | 'info' | 'warning' => {
    if (issue.completed_at) return 'success';
    if (issue.priority === 'urgent') return 'warning';
    return 'info';
};
