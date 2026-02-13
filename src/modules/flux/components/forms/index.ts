/**
 * Flux Forms - Barrel Export
 *
 * Centralized export for all template form components.
 */

// V2 Components (preferred)
export { default as TemplateFormDrawer } from './TemplateFormDrawer';
export { default as AthleteFormDrawer } from './AthleteFormDrawer';
export { default as SeriesEditor } from './SeriesEditor';
export { default as TimelineVisual } from './TimelineVisual';

// V1 Components (deprecated, kept for backward compatibility)
export { default as TemplateFormModal } from './TemplateFormModal';
export { default as AthleteFormModal } from './AthleteFormModal';
export { default as BasicInfoSection } from './BasicInfoSection';
export { default as IntensitySection } from './IntensitySection';
export { default as ExerciseStructureSection } from './ExerciseStructureSection';
export { default as OrganizationSection } from './OrganizationSection';
export { default as SetsRepsEditor } from './SetsRepsEditor';
export { default as IntervalsEditor } from './IntervalsEditor';
export { default as DistanceTimeEditor } from './DistanceTimeEditor';

// Form state management
export { useTemplateForm } from './useTemplateForm';
export type { TemplateFormState } from './useTemplateForm';
