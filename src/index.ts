/**
 * `@_linked/shape-ui` — UI driven by a shape.
 *
 * Two halves that grew separately and belong together.
 *
 * The **editors** take a shape and a property and render one control — a text field, a select,
 * a date picker. Import them by path: `@_linked/shape-ui/components/TextfieldEditor`.
 *
 * The **surfaces** are what you build out of those: a table over any shape's instances, a form
 * derived from its property list, a read-only view, a relation picker, and the shape domain
 * underneath — column derivation, property visibility, validation, and the read and write paths
 * through the Linked Query DSL.
 *
 * The surfaces arrived from `@create-now/data-manager`, where they were private on the
 * assumption that shape-driven CRUD was a product. It is not: it renders any shape, knows
 * nothing about projects, and is worth nothing without shapes to render. The product is the
 * studio that authors them. See arch-03 §UI package layering.
 *
 * **No side-effect imports here, and that is a deliberate exception to the house pattern.**
 * Most `@_linked/*` packages import `./package.js` and `./ontologies/*.js` from their entry
 * point so the package registers itself and its ontology. This one has nothing to register:
 * no `@linkedShape`, no `@linkedUtil`, no `@linkedComponent` anywhere in `src`. Its ontology
 * was empty template scaffolding — one export, no terms, a namespace on a domain we no longer
 * use — and has been deleted.
 *
 * Importing `./package.js` from here was not merely redundant, it was breaking: this barrel
 * also pulls the whole component graph, and adding core's package machinery on top of that
 * closed an import cycle that left `Shape` undefined when a runtime shape was registered —
 * surfacing as "Class extends value undefined is not a constructor or null", thrown from
 * inside a query, with a stack naming none of it.
 *
 * A package that gains a shape should import `./package.js` from that shape's module, the way
 * `@_linked/auth` does — not from here.
 */

// Registers this package with the linked package system. The only side effect here, and it
// carries no import cycle.



export type {
  DataManagerHost,
  DataManagerNavigation,
  DataManagerPicking,
  PickRequest,
  InstanceSuggestion,
  SearchInstancesOptions,
} from './host.js';
export {nullHost} from './host.js';

export type {DataManagerHostProviderProps} from './hostContext.js';
export {DataManagerHostProvider, useDataManagerHost} from './hostContext.js';

export type {InstanceQuery, InstanceRows} from './read.js';
export {selectInstance, selectInstances} from './read.js';

export type {InstanceValues} from './write.js';
export {
  createInstanceWithDsl,
  mintInstanceIri,
  updateInstanceWithDsl,
} from './write.js';

export type {Column, DisplayContext, TableMode} from './columns.js';
export {
  columnsFor,
  displayableProperties,
  hasDeclaredRanks,
  labelProperty,
} from './columns.js';

export {narrowSuggestions, searchInstancesWithDsl} from './search.js';

// ─── Components ──────────────────────────────────────────────────────────────
//
// The shape-driven CRUD surfaces. Each one takes shape metadata and instance data and asks
// the host for anything that is specific to the application around it — where a click leads,
// where an IRI is minted, how a picker is opened.
export {default as InstanceOverview} from './components/InstanceOverview.js';
export type {BatchResult} from './components/InstanceOverview.js';
export {default as ReactTable} from './components/ReactTable.js';
export type {ReactTableProps} from './components/ReactTable.js';
export {InstanceView} from './components/InstanceView.js';
export {default as AddInstanceForms} from './components/AddInstanceForms.js';
export {default as EditInstanceForms} from './components/EditInstanceForms.js';
export {InstanceDeletionDialog} from './components/InstanceDeletionDialog.js';
export {default as BatchEditDrawer} from './components/BatchEditDrawer.js';
export {default as CustomMultiSelect} from './components/CustomMultiSelect.js';
export {DynamicForm} from './components/DynamicFormField.js';
export {FormField} from './components/FormField.js';
export {default as NodeValuesEditor} from './components/NodeValuesEditor.js';
export {NodeBadge} from './components/NodeBadge.js';
export {FilterBadge} from './components/FilterBadge.js';

// ─── Shape domain ────────────────────────────────────────────────────────────
export * from './shape/contracts.js';
export * from './shape/naming.js';
export * from './shape/nodeDisplay.js';
export * from './shape/propertyVisibility.js';
