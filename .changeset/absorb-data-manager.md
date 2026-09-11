---
'@_linked/shape-ui': minor
---

Absorb the shape-driven CRUD surfaces from `@create-now/data-manager`.

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
