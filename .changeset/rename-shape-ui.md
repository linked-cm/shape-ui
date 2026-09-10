---
'@_linked/shape-ui': major
---

Rename from `@_linked/ui` to `@_linked/shape-ui`.

`ui` said only "not backend", which is the least informative name available for the layer
most in need of one that states its contract. Every component here takes a shape and a
property shape and renders a control for it, working on any shape rather than a known one.
`shape-ui` says that.

Renaming now because it is nearly free: the package has three consumers. It becomes
expensive as soon as it has more, and this layer should have more.

Also removes nine compiled CommonJS files that had been committed into `src/` alongside their
`.tsx` sources, and a dead `ShapeTable.tsx.old`.
