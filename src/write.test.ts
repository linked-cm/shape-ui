import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import type {NodeShapeWire} from '@_linked/core/shapes/nodeShapeWire';

/**
 * The DSL write path.
 *
 * The read moved to the DSL a while ago; the write was still a control-plane RPC that took
 * a project id. These pin the two things that made that a problem: the write names no
 * project, and it goes through the same builder — and therefore the same routing — as the
 * read. A read routed one way and a write routed another is how a form saves into the
 * wrong dataset without anyone noticing.
 *
 * The builders are mocked. What is asserted is the shape of the call; core's own suite
 * covers the SPARQL.
 */

const createFrom = jest.fn();
const createWithId = jest.fn();
const createSet = jest.fn();
const updateFrom = jest.fn();
const updateFor = jest.fn();
const updateSet = jest.fn();

jest.unstable_mockModule('@_linked/core/queries/CreateBuilder', () => ({
  CreateBuilder: {
    from: (...args: unknown[]) => {
      createFrom(...args);
      const b: Record<string, unknown> = {};
      b.withId = (id: unknown) => (createWithId(id), b);
      b.set = (data: unknown) => (createSet(data), b);
      b.exec = async () => undefined;
      return b;
    },
  },
}));

jest.unstable_mockModule('@_linked/core/queries/UpdateBuilder', () => ({
  UpdateBuilder: {
    from: (...args: unknown[]) => {
      updateFrom(...args);
      const b: Record<string, unknown> = {};
      b.for = (id: unknown) => (updateFor(id), b);
      b.set = (data: unknown) => (updateSet(data), b);
      b.exec = async () => undefined;
      return b;
    },
  },
}));

const {createInstanceWithDsl, updateInstanceWithDsl, mintInstanceIri} = await import(
  './write.js'
);

const shape: NodeShapeWire = {
  id: 'https://id.linked.cm/app/vocab#Article',
  label: 'Article',
  propertyShapes: [
    {id: 'p1', label: 'title', path: {id: 'http://schema.org/name'}},
    {id: 'p2', label: 'author', path: {id: 'http://schema.org/author'}},
    {id: 'p3', label: 'tags', path: {id: 'http://schema.org/keywords'}},
  ],
} as NodeShapeWire;

beforeEach(() => {
  [createFrom, createWithId, createSet, updateFrom, updateFor, updateSet].forEach((m) =>
    m.mockClear(),
  );
});

describe('creating', () => {
  test('names the shape and no project', async () => {
    await createInstanceWithDsl(shape, {title: 'Dune'}, {dataRoot: 'https://ex.org/data'});
    expect(createFrom).toHaveBeenCalledWith(shape.id);
    // The portability claim, asserted rather than asserted-in-prose: nothing in the call
    // carries a project, a branch or a dataset.
    expect(JSON.stringify(createSet.mock.calls)).not.toMatch(/project|branch|dataset/i);
  });

  test('mints an id under the host dataRoot', async () => {
    const {id} = await createInstanceWithDsl(
      shape,
      {title: 'Dune'},
      {dataRoot: 'https://ex.org/data/'},
    );
    // Trailing slash on dataRoot must not produce a double slash.
    expect(id).toMatch(/^https:\/\/ex\.org\/data\/article\/[0-9a-f-]{36}$/);
    expect(createWithId).toHaveBeenCalledWith(id);
  });

  test('refuses to invent a namespace when dataRoot is missing', async () => {
    // A node created under a guessed IRI is worse than a failed create: it is unreachable
    // and it is already written.
    await expect(createInstanceWithDsl(shape, {title: 'Dune'})).rejects.toThrow(/dataRoot/);
  });

  test('drops empty values instead of writing empty literals', async () => {
    await createInstanceWithDsl(
      shape,
      {title: 'Dune', author: '', tags: undefined},
      {dataRoot: 'https://ex.org/data'},
    );
    expect(createSet).toHaveBeenCalledWith({title: 'Dune'});
  });

  test('drops fields the shape does not declare', async () => {
    await createInstanceWithDsl(
      shape,
      {title: 'Dune', removedLastWeek: 'x'},
      {dataRoot: 'https://ex.org/data'},
    );
    expect(createSet).toHaveBeenCalledWith({title: 'Dune'});
  });

  test('writes a relation as a reference, without its display label', async () => {
    // The form carries {id, label} so a draft can show a name. The label is display state;
    // writing it would put a second, immediately stale copy of it in the graph.
    await createInstanceWithDsl(
      shape,
      {author: {id: 'https://ex.org/person/1', label: 'Ada'}},
      {dataRoot: 'https://ex.org/data'},
    );
    expect(createSet).toHaveBeenCalledWith({author: {id: 'https://ex.org/person/1'}});
  });

  test('does the same for every member of a multi-valued relation', async () => {
    await createInstanceWithDsl(
      shape,
      {tags: [{id: 'urn:t/1', label: 'alpha'}, {id: 'urn:t/2', label: 'beta'}]},
      {dataRoot: 'https://ex.org/data'},
    );
    expect(createSet).toHaveBeenCalledWith({tags: [{id: 'urn:t/1'}, {id: 'urn:t/2'}]});
  });

  test('accepts a caller-supplied id', async () => {
    const {id} = await createInstanceWithDsl(
      shape,
      {title: 'Dune'},
      {id: 'https://ex.org/data/article/fixed'},
    );
    expect(id).toBe('https://ex.org/data/article/fixed');
  });
});

describe('updating', () => {
  test('targets the instance by id and names no project', async () => {
    await updateInstanceWithDsl(shape, 'https://ex.org/data/article/1', {title: 'Dune'});
    expect(updateFrom).toHaveBeenCalledWith(shape.id);
    expect(updateFor).toHaveBeenCalledWith('https://ex.org/data/article/1');
  });

  test('clears an emptied field rather than dropping it', async () => {
    // The opposite of create, and deliberately so: clearing a field the viewer emptied is
    // the whole point of an edit form.
    await updateInstanceWithDsl(shape, 'urn:a/1', {title: '', author: undefined});
    expect(updateSet).toHaveBeenCalledWith({title: null, author: null});
  });

  test('is a no-op when nothing in the payload is recognisable', async () => {
    await updateInstanceWithDsl(shape, 'urn:a/1', {goneFromTheShape: 'x'});
    expect(updateFrom).not.toHaveBeenCalled();
  });
});

describe('mintInstanceIri', () => {
  test('uses the shape label as the path segment, lowercased', () => {
    expect(mintInstanceIri(shape, 'https://ex.org/d')).toContain('/article/');
  });

  test('falls back to a generic segment for a shape with no label', () => {
    expect(mintInstanceIri({id: 'urn:s'} as NodeShapeWire, 'https://ex.org/d')).toContain(
      '/instance/',
    );
  });
});
