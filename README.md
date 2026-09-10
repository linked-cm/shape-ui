# `@_linked/shape-ui`

UI driven by a shape.

Each component takes a `Shape` and a property shape and renders a control for it — a text
field, a select, a date picker, an avatar. It works on *any* shape, not a known one, which is
the whole point: an application that adds a property gets an editor for it without writing
one.

```tsx
<TextfieldEditor of={person} property={givenName} />
```

## Where it sits

| Layer | Package | Knows about |
|---|---|---|
| Design tokens | `@_linked/css` | nothing |
| Headless components | `@_linked/primitives` | the DOM and the tokens |
| Data binding | `@_linked/react` | shapes and queries; ships no components |
| **Shape-driven UI** | **`@_linked/shape-ui`** | how to render an arbitrary shape |
| Product surfaces | applications | one product's domain vocabulary |

Everything here renders a `@_linked/primitives` control and adds the shape binding. Nothing
here knows about a specific product.

**Consume this layer rather than rebuilding it.** A product that needs a shape-driven form
field extends what is here; growing a second implementation inside an application is how the
same component ends up existing three times, and then drifting.

## Why the name changed

This package was `@_linked/ui`. That name said only "not backend" — the least informative
label available for the layer most in need of one that states its contract. `shape-ui` says
what it is.
