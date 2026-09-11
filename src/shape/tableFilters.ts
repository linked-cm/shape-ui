import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { humanizeEnumLabel } from './nodeDisplay.js';
import { getPropertyUiType, type PropertyUiType } from './propertyTypes.js';

// ─── Filter operators ────────────────────────────────────────────────
export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'before'
  | 'after'
  | 'is'
  | 'isNot'
  | 'in'; // multi-select enum

export interface FilterOperatorOption {
  value: FilterOperator;
  label: string;
}

// ─── Internal filter model (decoupled from TanStack) ─────────────────
export interface TableFilter {
  id: string; // unique filter ID
  columnId: string;
  columnLabel: string;
  operator: FilterOperator;
  /** Single value or array of values for multi-select (enum OR) */
  value: string | string[];
  isActive: boolean;
}

// ─── Operator sets by UI type ────────────────────────────────────────
const STRING_OPERATORS: FilterOperatorOption[] = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'equals' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
];

const NUMBER_OPERATORS: FilterOperatorOption[] = [
  { value: 'equals', label: '=' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
];

const DATE_OPERATORS: FilterOperatorOption[] = [
  { value: 'equals', label: 'equals' },
  { value: 'before', label: 'before' },
  { value: 'after', label: 'after' },
];

const BOOLEAN_OPERATORS: FilterOperatorOption[] = [
  { value: 'is', label: 'is' },
  { value: 'isNot', label: 'is not' },
];

const IRI_OPERATORS: FilterOperatorOption[] = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'equals' },
];

const ENUM_OPERATORS: FilterOperatorOption[] = [
  { value: 'in', label: 'is one of' },
  { value: 'equals', label: 'equals' },
];

/**
 * Returns the available filter operators for a property based on its SHACL type.
 */
export function getOperatorsForProperty(property: PropertyShapeWire): FilterOperatorOption[] {
  const uiType = getPropertyUiType(property);
  return getOperatorsForUiType(uiType);
}

export function getOperatorsForUiType(uiType: PropertyUiType | null): FilterOperatorOption[] {
  switch (uiType) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
    case 'datetime':
      return DATE_OPERATORS;
    case 'boolean':
      return BOOLEAN_OPERATORS;
    case 'iri-single':
    case 'iri-multi':
      return IRI_OPERATORS;
    case 'enum-literal':
    case 'enum-iri':
      return ENUM_OPERATORS;
    case 'text':
    case 'url':
    default:
      return STRING_OPERATORS;
  }
}

/**
 * Apply a filter to a cell value. Returns true if the row should be included.
 */
export function applyFilter(cellValue: any, filter: TableFilter): boolean {
  if (!filter.isActive) return true;

  const { operator, value } = filter;

  // Multi-select enum: "in" operator
  if (operator === 'in' && Array.isArray(value)) {
    if (value.length === 0) return true;
    const cellStr = extractStringValue(cellValue);
    return value.some((v) => cellStr.toLowerCase() === v.toLowerCase());
  }

  const filterVal = typeof value === 'string' ? value : String(value);
  if (!filterVal) return true;

  const cellStr = extractStringValue(cellValue);

  switch (operator) {
    case 'contains':
      return cellStr.toLowerCase().includes(filterVal.toLowerCase());
    case 'equals':
      return cellStr.toLowerCase() === filterVal.toLowerCase();
    case 'startsWith':
      return cellStr.toLowerCase().startsWith(filterVal.toLowerCase());
    case 'endsWith':
      return cellStr.toLowerCase().endsWith(filterVal.toLowerCase());

    case 'gt':
      return toNumber(cellStr) > toNumber(filterVal);
    case 'lt':
      return toNumber(cellStr) < toNumber(filterVal);
    case 'gte':
      return toNumber(cellStr) >= toNumber(filterVal);
    case 'lte':
      return toNumber(cellStr) <= toNumber(filterVal);

    case 'before':
      return new Date(cellStr) < new Date(filterVal);
    case 'after':
      return new Date(cellStr) > new Date(filterVal);

    case 'is':
      return cellStr.toLowerCase() === filterVal.toLowerCase();
    case 'isNot':
      return cellStr.toLowerCase() !== filterVal.toLowerCase();

    default:
      return true;
  }
}

/**
 * Apply all active filters to a row. Returns true if the row passes all filters (AND logic).
 * Same-column filters with 'in' operator use OR within the column.
 */
export function applyAllFilters(
  row: Record<string, any>,
  filters: TableFilter[]
): boolean {
  const activeFilters = filters.filter((f) => f.isActive);
  if (activeFilters.length === 0) return true;

  // Group filters by column for same-column OR handling
  const byColumn = new Map<string, TableFilter[]>();
  for (const f of activeFilters) {
    const group = byColumn.get(f.columnId) || [];
    group.push(f);
    byColumn.set(f.columnId, group);
  }

  // Each column group must pass (AND across columns)
  for (const [columnId, columnFilters] of byColumn) {
    const cellValue = row[columnId];
    // Within a column, ANY filter passing counts (OR within column)
    const columnPasses = columnFilters.some((f) => applyFilter(cellValue, f));
    if (!columnPasses) return false;
  }

  return true;
}

/**
 * Generate a unique filter ID.
 */
let filterCounter = 0;
export function generateFilterId(): string {
  return `filter-${++filterCounter}-${Date.now()}`;
}

/**
 * Format a filter for display as a badge label.
 */
export function formatFilterLabel(filter: TableFilter): string {
  const { columnLabel, operator, value } = filter;
  if (operator === 'in' && Array.isArray(value)) {
    return `${columnLabel}: ${value.map(humanizeEnumLabel).join(', ')}`;
  }
  const opLabel = [...STRING_OPERATORS, ...NUMBER_OPERATORS, ...DATE_OPERATORS, ...BOOLEAN_OPERATORS, ...ENUM_OPERATORS]
    .find((o) => o.value === operator)?.label || operator;
  return `${columnLabel} ${opLabel} ${value}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function extractStringValue(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return val.label || val.name || val.id || String(val);
  }
  return String(val);
}

function toNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
