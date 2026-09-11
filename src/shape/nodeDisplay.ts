import { Prefix } from '@_linked/core/utils/Prefix';

/**
 * Centralized label resolution for any node/value in the CMS.
 * Handles NamedNode objects, Literal values, and plain strings consistently.
 * Never returns [object Object].
 */
export function getNodeDisplay(value: any): string {
  if (value == null) return '';

  // Primitives: string, number, boolean
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // Object with label/name/identifier fields (Shape, QResult, etc.)
  if (typeof value === 'object') {
    if (value.label) return String(value.label);
    if (value.name) return String(value.name);
    if (value.identifier) return String(value.identifier);

    // NamedNode with URI — try prefixed form, else last URI segment
    const uri = value.uri || value.id;
    if (typeof uri === 'string' && uri.length > 0) {
      return toPrefixedOrSegment(uri);
    }

    // Literal with .value
    if (value.value != null) return String(value.value);
  }

  // Final fallback — never [object Object]
  return String(value);
}

/**
 * Convert a raw enum value label into a human-readable string.
 * - camelCase → "Camel Case" (e.g., "inPerson" → "In Person")
 * - already spaced/titled → unchanged
 * - short lowercase → capitalized (e.g., "home" → "Home")
 */
export function humanizeEnumLabel(raw: string): string {
  if (!raw) return '';
  // If it already contains spaces, just ensure first letter is capitalized
  if (raw.includes(' ')) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  // Split on camelCase boundaries: "inPerson" → ["in", "Person"]
  const parts = raw.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Try to get a prefixed URI (e.g., "irlcg:Team"), else extract the last path segment.
 */
function toPrefixedOrSegment(uri: string): string {
  try {
    const prefixed = Prefix.toPrefixedIfPossible(uri);
    if (prefixed !== uri) return prefixed;
  } catch {
    // Prefix resolution not available
  }
  // Extract last path segment or fragment
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx >= 0) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx >= 0) return uri.slice(slashIdx + 1);
  return uri;
}

/** The part of an IRI a person reads: everything after the last `#` or `/`. */
function localPart(iri: string): string {
  const hash = iri.lastIndexOf('#');
  if (hash >= 0) return iri.slice(hash + 1);
  const slash = iri.lastIndexOf('/');
  return slash >= 0 ? iri.slice(slash + 1) : iri;
}

/**
 * The choices for an enumerated property, as `{id, label}` pairs.
 *
 * `sh:in` holds its members as the metamodel does — an IRI stays a reference, a literal stays
 * a literal — and carries **no label**. The DTO this package used to take carried `inValues`
 * with a label attached, but that label was never in the graph: it was the IRI's local part,
 * derived at projection time. Deriving it here instead is the same answer from one place, and
 * it is what lets the components drop the DTO.
 *
 * Three call sites needed it — the filter drawer, the form field, and validation — and each
 * had its own idea of how to unwrap a member. One rule now.
 */
export function enumOptions(property: {
  in?: unknown[];
  /** The DTO's spelling, still accepted so a host holding one is not turned away. */
  inValues?: {id: string; label?: string}[];
}): {id: string; label: string}[] {
  const members = property.in ?? property.inValues;
  if (!Array.isArray(members) || members.length === 0) return [];
  return members.map((member) => {
    if (member !== null && typeof member === 'object') {
      const {id, label} = member as {id?: unknown; label?: unknown};
      const value = String(id ?? '');
      return {
        id: value,
        label: typeof label === 'string' ? label : humanizeEnumLabel(localPart(value)),
      };
    }
    // A literal enumeration — `sh:in ("red" "green")`. Its own value is its identity, and
    // there is no IRI to take a local part of.
    const value = String(member);
    return {id: value, label: humanizeEnumLabel(value)};
  });
}
