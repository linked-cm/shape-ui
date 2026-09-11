import {describe, expect, test} from '@jest/globals';
import type {
  NodeShapeWire,
  PropertyShapeWire,
} from '@_linked/core/shapes/nodeShapeWire';
import {
  columnsFor,
  displayableProperties,
  hasDeclaredRanks,
  labelProperty,
} from './columns.js';

const base = 'https://example.org/';

function prop(
  label: string,
  extra: Partial<PropertyShapeWire> = {},
): PropertyShapeWire {
  return {
    id: `${base}shape/Thing/${label}`,
    label,
    path: {id: `${base}vocab#${label}`},
    ...extra,
  } as PropertyShapeWire;
}

function shape(props: PropertyShapeWire[]): NodeShapeWire {
  return {
    id: `${base}shape/Thing`,
    label: 'Thing',
    targetClass: {id: `${base}vocab#Thing`},
    propertyShapes: props,
  } as NodeShapeWire;
}

describe('declared metadata wins', () => {
  test('displayRank orders the columns', () => {
    const s = shape([
      prop('zeta', {displayRank: 3}),
      prop('alpha', {displayRank: 1}),
      prop('beta', {displayRank: 2}),
    ]);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual([
      'alpha',
      'beta',
      'zeta',
    ]);
  });

  test('the lowest declared rank is the label column', () => {
    const s = shape([prop('sku', {displayRank: 2}), prop('title', {displayRank: 1})]);
    expect(labelProperty(s)?.label).toBe('title');
    expect(columnsFor(s, 'full')[0]).toMatchObject({key: 'title', isLabel: true});
  });

  test('displayRank beats a conventional label predicate', () => {
    // rdfs:label would otherwise win outright. An explicit rank is a first-party
    // statement and has to outrank a convention.
    const s = shape([
      prop('name', {path: {id: 'http://www.w3.org/2000/01/rdf-schema#label'}}),
      prop('code', {displayRank: 1}),
    ]);
    expect(labelProperty(s)?.label).toBe('code');
  });

  test('displayHidden removes a property entirely, even a required one', () => {
    const s = shape([
      prop('secret', {displayHidden: true, minCount: 1}),
      prop('title'),
    ]);
    expect(displayableProperties(s).map((p) => p.label)).toEqual(['title']);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual(['title']);
  });

  test('sh:order breaks ties between equally ranked properties', () => {
    const s = shape([
      prop('b', {displayRank: 1, order: 2}),
      prop('a', {displayRank: 1, order: 1}),
    ]);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual(['a', 'b']);
  });

  test('unranked properties sort after ranked ones', () => {
    const s = shape([prop('plain'), prop('ranked', {displayRank: 1})]);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual(['ranked', 'plain']);
  });
});

describe('heuristics, only where nothing is declared', () => {
  test('a conventional label predicate is the label', () => {
    const s = shape([
      prop('sku'),
      prop('title', {path: {id: 'http://schema.org/name'}}),
    ]);
    expect(labelProperty(s)?.label).toBe('title');
  });

  test('a name-ish property is the label when no convention matches', () => {
    const s = shape([prop('quantity'), prop('productTitle')]);
    expect(labelProperty(s)?.label).toBe('productTitle');
  });

  test('required properties outrank optional ones', () => {
    const s = shape([prop('optional'), prop('mandatory', {minCount: 1})]);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual([
      'mandatory',
      'optional',
    ]);
  });

  test('hasDeclaredRanks reports which regime applies', () => {
    expect(hasDeclaredRanks(shape([prop('a')]))).toBe(false);
    expect(hasDeclaredRanks(shape([prop('a', {displayRank: 1})]))).toBe(true);
  });
});

describe('what cannot go in a cell', () => {
  // These assert the CELL rule specifically. They used to assert it at `full`, which
  // encoded the bug in review finding 13: applying the narrowest rule everywhere deleted
  // relation, multi-valued and long-text columns from tables too.
  test('a related node is not a cell', () => {
    const s = shape([
      prop('title'),
      prop('author', {valueShape: {id: `${base}shape/Person`}}),
    ]);
    expect(columnsFor(s, 'cell').map((c) => c.key)).toEqual(['title']);
    // …but a table shows it.
    expect(columnsFor(s, 'table').map((c) => c.key)).toContain('author');
  });

  test('an unbounded property is not a cell — a cell cannot show a list', () => {
    const s = shape([prop('title'), prop('tags', {maxCount: 0})]);
    expect(columnsFor(s, 'cell').map((c) => c.key)).toEqual(['title']);
    expect(columnsFor(s, 'table').map((c) => c.key)).toContain('tags');
  });

  test('long-text datatypes are excluded from every context but `full`', () => {
    const s = shape([
      prop('title'),
      prop('body', {
        datatype: {id: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML'},
      }),
    ]);
    expect(columnsFor(s, 'table').map((c) => c.key)).toEqual(['title']);
    expect(columnsFor(s, 'full').map((c) => c.key)).toContain('body');
  });

  test('a property with no label is skipped — the row key would be undefined', () => {
    const s = shape([prop('title'), {...prop('x'), label: ''} as PropertyShapeWire]);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual(['title']);
  });
});

describe('context limits', () => {
  const many = shape(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l, i) =>
      prop(l, {displayRank: i + 1}),
    ),
  );

  test('each context takes the top N by declared precedence', () => {
    expect(columnsFor(many, 'cell')).toHaveLength(1);
    expect(columnsFor(many, 'card')).toHaveLength(3);
    expect(columnsFor(many, 'table')).toHaveLength(6);
    expect(columnsFor(many, 'full')).toHaveLength(8);
  });

  test('the cell context keeps the label', () => {
    expect(columnsFor(many, 'cell')[0]).toMatchObject({key: 'a', isLabel: true});
  });

  test('an explicit limit overrides the context', () => {
    expect(columnsFor(many, 'table', 2).map((c) => c.key)).toEqual(['a', 'b']);
  });
});

describe('degenerate shapes', () => {
  test('a shape with no properties yields no columns and no label', () => {
    const s = shape([]);
    expect(columnsFor(s, 'full')).toEqual([]);
    expect(labelProperty(s)).toBeUndefined();
  });

  test('a shape with nothing showable yields no label rather than guessing', () => {
    const s = shape([prop('author', {valueShape: {id: `${base}shape/Person`}})]);
    expect(labelProperty(s)).toBeUndefined();
  });

  test('a complex path is still a column — it just has no single predicate', () => {
    const s = shape([
      prop('city', {path: {seq: [{id: `${base}vocab#address`}, {id: `${base}vocab#city`}]} as never}),
    ]);
    expect(columnsFor(s, 'full').map((c) => c.key)).toEqual(['city']);
  });

  test('header prefers sh:name over the label key', () => {
    const s = shape([prop('givenName', {name: 'First name'})]);
    expect(columnsFor(s, 'full')[0].header).toBe('First name');
  });
});
