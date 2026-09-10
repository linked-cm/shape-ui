import {describe, expect, test} from '@jest/globals';
import type {
  NodeShapeWire,
  PropertyShapeWire,
} from '@_linked/core/shapes/nodeShapeWire';
import {columnsFor, displayableProperties} from './columns.js';

/**
 * Regression guard for review finding 13.
 *
 * The first version of `columnsFor` treated every context like a narrow cell: a property
 * with a `valueShape`, a `maxCount` other than 1, or a long-text datatype was excluded
 * outright. Wired into the CMS table that silently deleted every relation column (author,
 * category, tags — the ones `NodeBadge` and the click-through exist to render), every
 * multi-valued column, and every long-text column.
 *
 * The rule these tests pin: **what fits depends on how much room there is.** A cell shows
 * one short scalar. A table can show a badge for a related node and a list of them. `full`
 * shows everything the shape does not hide.
 */

const base = 'https://example.org/';

function prop(
  label: string,
  extra: Partial<PropertyShapeWire> = {},
): PropertyShapeWire {
  return {
    id: `${base}shape/Article/${label}`,
    label,
    path: {id: `${base}vocab#${label}`},
    ...extra,
  } as PropertyShapeWire;
}

const article = (): NodeShapeWire =>
  ({
    id: `${base}shape/Article`,
    label: 'Article',
    targetClass: {id: `${base}vocab#Article`},
    propertyShapes: [
      prop('title'),
      prop('author', {valueShape: {id: `${base}shape/Person`}}),
      prop('category', {class: {id: `${base}vocab#Category`}}),
      prop('tags', {maxCount: 0}),
      prop('body', {
        datatype: {id: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML'},
      }),
      prop('status', {in: [{id: `${base}vocab#Draft`}, {id: `${base}vocab#Live`}]}),
      prop('internal', {displayHidden: true}),
    ],
  }) as NodeShapeWire;

describe('finding 13 — a table keeps the columns a cell cannot hold', () => {
  test('relation columns survive in a table', () => {
    const keys = columnsFor(article(), 'table', Infinity).map((c) => c.key);
    expect(keys).toContain('author'); // sh:node
    expect(keys).toContain('category'); // sh:class
  });

  test('multi-valued columns survive in a table', () => {
    expect(columnsFor(article(), 'table', Infinity).map((c) => c.key)).toContain(
      'tags',
    );
  });

  test('long-text columns survive in `full`, which is what a detail view uses', () => {
    expect(columnsFor(article(), 'full').map((c) => c.key)).toContain('body');
  });

  test('enum columns survive', () => {
    expect(columnsFor(article(), 'table', Infinity).map((c) => c.key)).toContain(
      'status',
    );
  });

  test('a hidden property is still excluded everywhere', () => {
    for (const context of ['cell', 'card', 'table', 'full'] as const) {
      expect(columnsFor(article(), context, Infinity).map((c) => c.key)).not.toContain(
        'internal',
      );
    }
  });

  test('a cell still shows one short scalar, not a relation or a blob', () => {
    // The narrow case is the one the original rule was written for, and it stays.
    const cell = columnsFor(article(), 'cell');
    expect(cell).toHaveLength(1);
    expect(cell[0].key).toBe('title');
  });

  test('a cell-sized label is never a relation, even when nothing else qualifies', () => {
    const relationsOnly = {
      id: `${base}shape/Only`,
      label: 'Only',
      targetClass: {id: `${base}vocab#Only`},
      propertyShapes: [prop('author', {valueShape: {id: `${base}shape/Person`}})],
    } as NodeShapeWire;
    expect(columnsFor(relationsOnly, 'cell')).toHaveLength(0);
  });

  test('displayableProperties is context-aware, not one fixed answer', () => {
    // An enum is a short scalar, so it fits a cell too.
    expect(displayableProperties(article(), 'cell').map((p) => p.label)).toEqual([
      'title',
      'status',
    ]);
    expect(displayableProperties(article(), 'full').map((p) => p.label)).toEqual([
      'title',
      'author',
      'category',
      'tags',
      'body',
      'status',
    ]);
  });
});

describe('finding 16 — the declared comparator is well defined', () => {
  test('two properties that declare nothing compare as equal, not NaN', () => {
    // `Infinity - Infinity` is NaN, which makes a comparator inconsistent. V8 happens to
    // treat NaN as "equal", so this passed by luck rather than by definition.
    const shape = {
      id: `${base}shape/Plain`,
      label: 'Plain',
      targetClass: {id: `${base}vocab#Plain`},
      propertyShapes: [prop('b'), prop('a')],
    } as NodeShapeWire;
    const keys = columnsFor(shape, 'full').map((c) => c.key);
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(expect.arrayContaining(['a', 'b']));
  });

  test('a declared rank still beats an undeclared one', () => {
    const shape = {
      id: `${base}shape/Mixed`,
      label: 'Mixed',
      targetClass: {id: `${base}vocab#Mixed`},
      propertyShapes: [prop('plain'), prop('ranked', {displayRank: 5})],
    } as NodeShapeWire;
    expect(columnsFor(shape, 'full').map((c) => c.key)).toEqual(['ranked', 'plain']);
  });
});
