/**
 * DynamicForm — Barrel export for the shared DynamicForm system.
 *
 * Usage:
 *   import DynamicForm from '../Shared/DynamicForm';
 *   or
 *   import { DynamicForm, DynamicField, LookupField } from '../Shared/DynamicForm';
 */

export { default as DynamicForm } from './DynamicForm';
export { default as DynamicField } from './DynamicField';
export { default as LookupField } from './LookupField';
export { default as SelectField } from './SelectField';
export { default as MultiSelectField } from './MultiSelectField';
export { default as FileField } from './FileField';
export { default as ImageField } from './ImageField';

// Default export for convenience
export { default } from './DynamicForm';
