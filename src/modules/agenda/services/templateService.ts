/**
 * Template Service
 * Manages routine templates for creating batches of recurring work_items.
 * System templates are built-in; user templates can be added in the future.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('TemplateService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoutineTemplateItem {
  title: string;
  scheduledTime: string;       // "HH:mm" format
  estimatedDuration: number;   // minutes
  recurrenceRule: string;      // RRULE string
  category?: string;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  icon: string;                // Emoji
  description: string;
  items: RoutineTemplateItem[];
  isSystem: boolean;
}

// ---------------------------------------------------------------------------
// System Templates (built-in)
// ---------------------------------------------------------------------------

const SYSTEM_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'morning-routine',
    name: 'Rotina Matinal',
    icon: '\u{1F305}',
    description: 'Meditacao, exercicio e journaling para comecar o dia',
    isSystem: true,
    items: [
      { title: 'Meditacao', scheduledTime: '07:00', estimatedDuration: 10, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      { title: 'Exercicio', scheduledTime: '07:15', estimatedDuration: 30, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      { title: 'Journaling', scheduledTime: '07:45', estimatedDuration: 15, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
    ],
  },
  {
    id: 'work-day',
    name: 'Dia de Trabalho',
    icon: '\u{1F4BC}',
    description: 'Estrutura para dias uteis produtivos',
    isSystem: true,
    items: [
      { title: 'Revisar emails e planejar o dia', scheduledTime: '09:00', estimatedDuration: 30, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
      { title: 'Deep Work', scheduledTime: '09:30', estimatedDuration: 120, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
      { title: 'Review do dia', scheduledTime: '17:00', estimatedDuration: 15, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
    ],
  },
  {
    id: 'health-basics',
    name: 'Saude Basica',
    icon: '\u{1F4AA}',
    description: 'Hidratacao, pausas e alimentacao consciente',
    isSystem: true,
    items: [
      { title: 'Beber agua (500ml)', scheduledTime: '08:00', estimatedDuration: 5, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      { title: 'Pausa para alongamento', scheduledTime: '11:00', estimatedDuration: 10, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
      { title: 'Almoco consciente', scheduledTime: '12:00', estimatedDuration: 60, recurrenceRule: 'FREQ=DAILY;INTERVAL=1' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return all available system templates.
 */
export function getSystemTemplates(): RoutineTemplate[] {
  return SYSTEM_TEMPLATES;
}

/**
 * Retrieve a single template by id.
 */
export function getTemplateById(id: string): RoutineTemplate | undefined {
  return SYSTEM_TEMPLATES.find(t => t.id === id);
}

/**
 * Apply a template: creates work_items for the user based on the template items.
 * Returns the number of work_items created.
 *
 * @throws Error if the Supabase insert fails.
 */
export async function applyTemplate(userId: string, template: RoutineTemplate): Promise<number> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const rows = template.items.map(item => ({
    user_id: userId,
    title: item.title,
    status: 'pending',
    scheduled_time: `${todayStr}T${item.scheduledTime}:00`,
    estimated_duration: item.estimatedDuration,
    recurrence_rule: item.recurrenceRule,
    is_completed: false,
    archived: false,
  }));

  log.debug('Applying template:', { templateId: template.id, itemCount: rows.length });

  const { data, error } = await supabase
    .from('work_items')
    .insert(rows)
    .select('id');

  if (error) {
    log.error('Error applying template:', { error, templateId: template.id });
    throw error;
  }

  const count = data?.length ?? 0;
  log.debug('Template applied successfully:', { templateId: template.id, created: count });
  return count;
}
