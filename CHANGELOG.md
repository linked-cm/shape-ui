# @\_linked/ui

## 2.2.0

### Minor Changes

- [#11](https://github.com/linked-cm/shape-ui/pull/11) [`979e444`](https://github.com/linked-cm/shape-ui/commit/979e4442504ed6118a2e3b258a8fbc3b91b580ac) Thanks [@flyon](https://github.com/flyon)! - Absorb the shape-driven CRUD surfaces from `@create-now/data-manager`.

  The editors here render one control for one property. What was missing was everything you build
  out of them: a table over any shape's instances, a form derived from its property list, a
  read-only view, a relation picker, and the shape domain underneath — column derivation,
  property visibility, validation, and the read and write paths through the Linked Query DSL.

  Those lived in a private package on the assumption that shape-driven CRUD was a product. It is
  not. It renders any shape, knows nothing about projects, and is worth nothing without shapes to
  render — the product is the studio that authors them. Keeping it private also meant a second
  package in this exact layer, which is how `@_linked/ui` came to be bypassed in the first place:
  it was built for this job, then an application grew its own form field, value editor and
  relation picker rather than extending it.

  Also fixes the editors' binding types. They declared `of: Shape` and `property: PropertyShape`
  — live instances — while reading `property.label` and `property.in`, which exist on the
  metamodel and not on those classes. That was 24 type errors, invisible because the build script
  ended in `|| echo`, so a failing `tsc` still published. The build now fails on a type error, and
  the types say what the code has always done: plain data keyed by property label.

## 2.0.0

### Major Changes

- [#7](https://github.com/linked-cm/ui/pull/7) [`be0c4ef`](https://github.com/linked-cm/ui/commit/be0c4ef095d30cd1388517f7d13383eb26b4926c) Thanks [@flyon](https://github.com/flyon)! - Rename from `@_linked/ui` to `@_linked/shape-ui`.

  `ui` said only "not backend", which is the least informative name available for the layer
  most in need of one that states its contract. Every component here takes a shape and a
  property shape and renders a control for it, working on any shape rather than a known one.
  `shape-ui` says that.

  Renaming now because it is nearly free: the package has three consumers. It becomes
  expensive as soon as it has more, and this layer should have more.

  Also removes nine compiled CommonJS files that had been committed into `src/` alongside their
  `.tsx` sources, and a dead `ShapeTable.tsx.old`.

## 1.0.3

### Patch Changes

- [#3](https://github.com/linked-cm/ui/pull/3) [`24d8c4b`](https://github.com/linked-cm/ui/commit/24d8c4bdd0e97d01dacdda8dcc94b17cfad84ca8) Thanks [@flyon](https://github.com/flyon)! - loadData: ESM-only JSON import — drop the dead CJS branch, add the `{ with: { type: 'json' } }` import attribute.

## 1.0.2

### Patch Changes

- [`56ee32e`](https://github.com/linked-cm/ui/commit/56ee32ef1e709b8b6841870c53a73e285c68b6c7) - Initial release under the new publishing setup.
