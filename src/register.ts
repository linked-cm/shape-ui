/**
 * Side-effect registration, kept out of the barrel.
 *
 * Importing this registers the ontology and every editor as linked components, so they can be
 * resolved dynamically by name rather than by import.
 *
 * It is a separate entry point because the barrel must not have side effects. The ontology
 * module self-imports (`import * as _this from './lincd-ui.js'`) so that `linkedOntology` can
 * enumerate its own exports — a deliberate circular import, and one that breaks when it is
 * pulled in as a side effect of importing something unrelated: a shape class ends up extending
 * a `Shape` that has not finished initialising, and you get "Class extends value undefined is
 * not a constructor or null" from a call stack that mentions none of this.
 *
 * So: `import '@_linked/shape-ui/register'` if you need dynamic component resolution. Importing
 * a component directly, or anything from the barrel, needs nothing.
 */
import './ontologies/lincd-ui.js';
import './components/TextfieldEditor.js';
import './components/RadioButtonEditor.js';
import './components/TextareaEditor.js';
import './components/DateEditor.js';
import './components/SwitchEditor.js';
import './components/CheckboxEditor.js';
import './components/ToggleEditor.js';
import './components/SelectEditor.js';
import './components/AvatarEditor.js';
