import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrantTaskGenerator, type GrantTask } from '../grantTaskGenerator';
import type { GrantProject, GrantOpportunity } from '../../types';

// ============================================================================
// HELPERS: Create test fixtures
// ============================================================================

function makeOpportunity(overrides: Partial<GrantOpportunity> = {}): GrantOpportunity {
  return {
    id: 'opp-1',
    user_id: 'user-1',
    title: 'Edital de Teste',
    funding_agency: 'FAPESP',
    submission_deadline: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days from now
    eligible_themes: ['AI', 'Education'],
    eligibility_requirements: {},
    evaluation_criteria: [],
    form_fields: [],
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as GrantOpportunity;
}

function makeProject(overrides: Record<string, unknown> = {}): GrantProject {
  return {
    id: 'proj-1',
    user_id: 'user-1',
    opportunity_id: 'opp-1',
    project_name: 'Test Project',
    status: 'draft',
    completion_percentage: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as GrantProject;
}

// ============================================================================
// generateTasksForProject
// ============================================================================

describe('GrantTaskGenerator.generateTasksForProject', () => {
  it('generates briefing task for draft project', () => {
    const project = makeProject({ status: 'draft' });
    const opportunity = makeOpportunity();
    const tasks = GrantTaskGenerator.generateTasksForProject(project, opportunity);

    const briefingTask = tasks.find(t => t.task_type === 'briefing');
    expect(briefingTask).toBeDefined();
    expect(briefingTask!.priority).toBe('high');
    expect(briefingTask!.status).toBe('pending');
  });

  it('generates briefing task for briefing status', () => {
    const project = makeProject({ status: 'briefing' });
    const tasks = GrantTaskGenerator.generateTasksForProject(project, makeOpportunity());

    expect(tasks.some(t => t.task_type === 'briefing')).toBe(true);
  });

  it('does not generate briefing task for review status', () => {
    const project = makeProject({ status: 'review' });
    const tasks = GrantTaskGenerator.generateTasksForProject(project, makeOpportunity());

    expect(tasks.some(t => t.task_type === 'briefing')).toBe(false);
  });

  it('generates upload_doc task when no documents and status is briefing/generating/review', () => {
    for (const status of ['briefing', 'generating', 'review']) {
      const project = makeProject({ status });
      const tasks = GrantTaskGenerator.generateTasksForProject(project, makeOpportunity(), []);

      expect(tasks.some(t => t.task_type === 'upload_doc')).toBe(true);
    }
  });

  it('does not generate upload_doc task when documents exist', () => {
    const project = makeProject({ status: 'briefing' });
    const tasks = GrantTaskGenerator.generateTasksForProject(
      project,
      makeOpportunity(),
      [{ id: 'doc-1' }]
    );

    expect(tasks.some(t => t.task_type === 'upload_doc')).toBe(false);
  });

  it('generates review_field task for generating status', () => {
    const project = makeProject({ status: 'generating' });
    const tasks = GrantTaskGenerator.generateTasksForProject(project, makeOpportunity());

    const reviewTask = tasks.find(t => t.task_type === 'review_field');
    expect(reviewTask).toBeDefined();
    expect(reviewTask!.priority).toBe('high');
    expect(reviewTask!.status).toBe('pending');
  });

  it('generates review_field task with critical priority for review status', () => {
    const project = makeProject({ status: 'review' });
    const tasks = GrantTaskGenerator.generateTasksForProject(project, makeOpportunity());

    const reviewTask = tasks.find(t => t.task_type === 'review_field');
    expect(reviewTask).toBeDefined();
    expect(reviewTask!.priority).toBe('critical');
    expect(reviewTask!.status).toBe('in_progress');
  });

  it('generates external_submit task for submitted status', () => {
    const project = makeProject({ status: 'submitted' });
    const tasks = GrantTaskGenerator.generateTasksForProject(project, makeOpportunity());

    expect(tasks.some(t => t.task_type === 'external_submit')).toBe(true);
  });

  it('generates deadline_reminder when <= 7 days remain', () => {
    const deadline = new Date(Date.now() + 5 * 86400000).toISOString(); // 5 days from now
    const tasks = GrantTaskGenerator.generateTasksForProject(
      makeProject({ status: 'draft' }),
      makeOpportunity({ submission_deadline: deadline })
    );

    const deadlineTask = tasks.find(t => t.task_type === 'deadline_reminder');
    expect(deadlineTask).toBeDefined();
    expect(deadlineTask!.priority).toBe('high');
  });

  it('generates critical deadline_reminder when <= 3 days remain', () => {
    const deadline = new Date(Date.now() + 2 * 86400000).toISOString(); // 2 days from now
    const tasks = GrantTaskGenerator.generateTasksForProject(
      makeProject({ status: 'draft' }),
      makeOpportunity({ submission_deadline: deadline })
    );

    const deadlineTask = tasks.find(t => t.task_type === 'deadline_reminder');
    expect(deadlineTask).toBeDefined();
    expect(deadlineTask!.priority).toBe('critical');
    expect(deadlineTask!.metadata.is_urgent).toBe(true);
  });

  it('does not generate deadline_reminder when > 7 days remain', () => {
    const deadline = new Date(Date.now() + 30 * 86400000).toISOString();
    const tasks = GrantTaskGenerator.generateTasksForProject(
      makeProject({ status: 'draft' }),
      makeOpportunity({ submission_deadline: deadline })
    );

    expect(tasks.some(t => t.task_type === 'deadline_reminder')).toBe(false);
  });

  it('does not generate deadline_reminder when deadline has passed', () => {
    const deadline = new Date(Date.now() - 1 * 86400000).toISOString(); // 1 day ago
    const tasks = GrantTaskGenerator.generateTasksForProject(
      makeProject({ status: 'draft' }),
      makeOpportunity({ submission_deadline: deadline })
    );

    expect(tasks.some(t => t.task_type === 'deadline_reminder')).toBe(false);
  });

  it('handles null deadline gracefully', () => {
    const tasks = GrantTaskGenerator.generateTasksForProject(
      makeProject({ status: 'draft' }),
      makeOpportunity({ submission_deadline: null as unknown as string })
    );

    // Should not throw and should not have deadline task
    expect(tasks.some(t => t.task_type === 'deadline_reminder')).toBe(false);
  });

  it('assigns correct project_id and opportunity_id to all tasks', () => {
    const tasks = GrantTaskGenerator.generateTasksForProject(
      makeProject({ id: 'proj-42', status: 'draft' }),
      makeOpportunity({ id: 'opp-42' })
    );

    for (const task of tasks) {
      expect(task.project_id).toBe('proj-42');
      expect(task.opportunity_id).toBe('opp-42');
    }
  });
});

// ============================================================================
// generateTasksFromEditalSteps
// ============================================================================

describe('GrantTaskGenerator.generateTasksFromEditalSteps', () => {
  it('returns empty array when no custom steps', () => {
    const opp = makeOpportunity();
    const proj = makeProject();
    const tasks = GrantTaskGenerator.generateTasksFromEditalSteps(opp, proj);
    expect(tasks).toEqual([]);
  });

  it('generates tasks from custom steps', () => {
    const opp = makeOpportunity({
      metadata: {
        steps: [
          { id: 'step-1', title: 'Cadastro', description: 'Cadastre-se', order: 1, required: true },
          { id: 'step-2', title: 'Upload', description: 'Envie docs', order: 2, required: false },
        ],
      },
    } as Partial<GrantOpportunity>);

    const tasks = GrantTaskGenerator.generateTasksFromEditalSteps(opp, makeProject());
    expect(tasks).toHaveLength(2);
    expect(tasks[0].task_type).toBe('custom_step');
    expect(tasks[0].title).toBe('1. Cadastro');
    expect(tasks[0].priority).toBe('high'); // required step
    expect(tasks[1].priority).toBe('medium'); // non-required step
  });

  it('sorts steps by order', () => {
    const opp = makeOpportunity({
      metadata: {
        steps: [
          { id: 's3', title: 'Third', description: '', order: 3, required: false },
          { id: 's1', title: 'First', description: '', order: 1, required: false },
          { id: 's2', title: 'Second', description: '', order: 2, required: false },
        ],
      },
    } as Partial<GrantOpportunity>);

    const tasks = GrantTaskGenerator.generateTasksFromEditalSteps(opp, makeProject());
    expect(tasks[0].title).toBe('1. First');
    expect(tasks[1].title).toBe('2. Second');
    expect(tasks[2].title).toBe('3. Third');
  });

  it('computes due_date from deadline offset', () => {
    const deadline = '2026-12-31T00:00:00.000Z';
    const opp = makeOpportunity({
      submission_deadline: deadline,
      metadata: {
        steps: [
          { id: 's1', title: 'Step', description: '', order: 1, required: true, due_date_offset_days: 10 },
        ],
      },
    } as Partial<GrantOpportunity>);

    const tasks = GrantTaskGenerator.generateTasksFromEditalSteps(opp, makeProject());
    expect(tasks[0].due_date).toBeDefined();
    // Deadline is Dec 31, offset is 10 days before => Dec 21
    const dueDate = new Date(tasks[0].due_date!);
    expect(dueDate.getUTCDate()).toBe(21);
    expect(dueDate.getUTCMonth()).toBe(11); // December = 11
  });

  it('has no due_date when offset is not provided', () => {
    const opp = makeOpportunity({
      metadata: {
        steps: [
          { id: 's1', title: 'Step', description: '', order: 1, required: true },
        ],
      },
    } as Partial<GrantOpportunity>);

    const tasks = GrantTaskGenerator.generateTasksFromEditalSteps(opp, makeProject());
    expect(tasks[0].due_date).toBeUndefined();
  });
});

// ============================================================================
// generateAllTasks
// ============================================================================

describe('GrantTaskGenerator.generateAllTasks', () => {
  it('combines automatic and custom step tasks', () => {
    const opp = makeOpportunity({
      metadata: {
        steps: [
          { id: 's1', title: 'Custom Step', description: 'desc', order: 1, required: true },
        ],
      },
    } as Partial<GrantOpportunity>);

    const project = makeProject({ status: 'draft' });
    const tasks = GrantTaskGenerator.generateAllTasks(project, opp);

    const types = tasks.map(t => t.task_type);
    expect(types).toContain('briefing');
    expect(types).toContain('custom_step');
  });
});

// ============================================================================
// getActiveTasks
// ============================================================================

describe('GrantTaskGenerator.getActiveTasks', () => {
  const baseTasks: GrantTask[] = [
    {
      id: 't1', project_id: 'p1', opportunity_id: 'o1',
      task_type: 'briefing', title: 'Briefing', description: '',
      priority: 'medium', status: 'pending', metadata: {}, created_at: '',
    },
    {
      id: 't2', project_id: 'p1', opportunity_id: 'o1',
      task_type: 'deadline_reminder', title: 'Deadline', description: '',
      priority: 'critical', status: 'pending', metadata: {}, created_at: '',
    },
    {
      id: 't3', project_id: 'p1', opportunity_id: 'o1',
      task_type: 'upload_doc', title: 'Upload', description: '',
      priority: 'high', status: 'completed', metadata: {}, created_at: '',
    },
    {
      id: 't4', project_id: 'p1', opportunity_id: 'o1',
      task_type: 'review_field', title: 'Review', description: '',
      priority: 'low', status: 'skipped', metadata: {}, created_at: '',
    },
  ];

  it('filters out completed and skipped tasks', () => {
    const active = GrantTaskGenerator.getActiveTasks(baseTasks);
    expect(active).toHaveLength(2);
    expect(active.every(t => t.status !== 'completed' && t.status !== 'skipped')).toBe(true);
  });

  it('sorts by priority (critical first)', () => {
    const active = GrantTaskGenerator.getActiveTasks(baseTasks);
    expect(active[0].priority).toBe('critical');
    expect(active[1].priority).toBe('medium');
  });

  it('sorts by due_date when priorities are equal', () => {
    const tasks: GrantTask[] = [
      {
        id: 't1', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'Later', description: '',
        due_date: '2026-12-31T00:00:00.000Z',
        priority: 'high', status: 'pending', metadata: {}, created_at: '',
      },
      {
        id: 't2', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'Sooner', description: '',
        due_date: '2026-06-15T00:00:00.000Z',
        priority: 'high', status: 'pending', metadata: {}, created_at: '',
      },
    ];

    const active = GrantTaskGenerator.getActiveTasks(tasks);
    expect(active[0].title).toBe('Sooner');
    expect(active[1].title).toBe('Later');
  });

  it('tasks with due_date come before tasks without when same priority', () => {
    const tasks: GrantTask[] = [
      {
        id: 't1', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'No date', description: '',
        priority: 'high', status: 'pending', metadata: {}, created_at: '',
      },
      {
        id: 't2', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'Has date', description: '',
        due_date: '2026-06-15T00:00:00.000Z',
        priority: 'high', status: 'pending', metadata: {}, created_at: '',
      },
    ];

    const active = GrantTaskGenerator.getActiveTasks(tasks);
    expect(active[0].title).toBe('Has date');
  });

  it('returns empty for all completed tasks', () => {
    const tasks: GrantTask[] = [
      {
        id: 't1', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'Done', description: '',
        priority: 'high', status: 'completed', metadata: {}, created_at: '',
      },
    ];
    expect(GrantTaskGenerator.getActiveTasks(tasks)).toHaveLength(0);
  });
});

// ============================================================================
// getNextStep
// ============================================================================

describe('GrantTaskGenerator.getNextStep', () => {
  it('returns the highest priority active task', () => {
    const tasks: GrantTask[] = [
      {
        id: 't1', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'Low priority', description: '',
        priority: 'low', status: 'pending', metadata: {}, created_at: '',
      },
      {
        id: 't2', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'deadline_reminder', title: 'Critical', description: '',
        priority: 'critical', status: 'pending', metadata: {}, created_at: '',
      },
    ];

    const next = GrantTaskGenerator.getNextStep(tasks);
    expect(next).not.toBeNull();
    expect(next!.title).toBe('Critical');
  });

  it('returns null when no active tasks', () => {
    const tasks: GrantTask[] = [
      {
        id: 't1', project_id: 'p1', opportunity_id: 'o1',
        task_type: 'briefing', title: 'Done', description: '',
        priority: 'high', status: 'completed', metadata: {}, created_at: '',
      },
    ];
    expect(GrantTaskGenerator.getNextStep(tasks)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(GrantTaskGenerator.getNextStep([])).toBeNull();
  });
});
