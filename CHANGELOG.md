# @\_linked/ui

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
