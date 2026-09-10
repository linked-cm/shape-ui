import type { NodeShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type PropertyDependency,
  buildDependencyMap,
  computeDependencies,
  extractNarrowingIds,
} from './shapeDependencies.js';
import { getShapeParamsFromUri } from './naming.js';

/**
 * Dependency state for a single child field.
 * Passed down to DynamicFormField via props.
 */
export interface FieldDependencyState {
  /** IDs the child should be narrowed to (null = show all, [] = show none) */
  narrowedIds: string[] | null;
  /** Whether the parent field has a value selected */
  parentHasValue: boolean;
  /** Human-readable parent labels (for "Select X first" hint) */
  parentLabels: string[];
  /** Whether narrowing data is currently being fetched */
  loading: boolean;
}

/**
 * Hook that computes and manages field dependencies for a form.
 * Infers dependency relationships from the shape graph, tracks parent
 * field changes, and fetches narrowing data.
 */
/** Read one instance's data. Injected so this hook holds no control-plane dependency. */
export type ReadInstance = (
  shapeIri: string,
  instanceId: string,
) => Promise<{rows: Record<string, unknown>[]}>;

export function useFormDependencies(
  shape: NodeShapeWire | null,
  allShapes: Record<string, NodeShapeWire> | null,
  projectId: string | null,
  readInstance?: ReadInstance,
) {
  // Compute static dependency graph (only changes when shape changes)
  const dependencies = useMemo(() => {
    if (!shape || !allShapes) return [];
    return computeDependencies(shape, allShapes);
  }, [shape?.id, allShapes]);

  const depMap = useMemo(() => buildDependencyMap(dependencies), [dependencies]);

  // State for narrowing results
  const [narrowedIds, setNarrowedIds] = useState<Map<string, string[] | null>>(
    new Map()
  );
  const [parentHasValue, setParentHasValue] = useState<Map<string, boolean>>(
    new Map()
  );
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());

  // Abort controllers for in-flight fetches
  const fetchControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Called when a parent field value changes.
   * Fetches the parent instance data and extracts narrowing IDs for dependent fields.
   */
  const onParentValueChange = useCallback(
    async (parentLabel: string, parentValue: any) => {
      // Find all dependencies where this property is the parent
      const childDeps = dependencies.filter((d) => d.parentLabel === parentLabel);
      if (childDeps.length === 0) return;

      // Extract parent instance ID
      const parentId = parentValue
        ? typeof parentValue === 'object'
          ? parentValue.id
          : typeof parentValue === 'string'
          ? parentValue
          : null
        : null;

      // Update parentHasValue for all children of this parent
      setParentHasValue((prev) => {
        const next = new Map(prev);
        for (const dep of childDeps) {
          next.set(dep.childLabel, !!parentId);
        }
        return next;
      });

      if (!parentId || !projectId) {
        // Parent cleared — remove narrowing for all children
        setNarrowedIds((prev) => {
          const next = new Map(prev);
          for (const dep of childDeps) {
            next.set(dep.childLabel, null);
          }
          return next;
        });
        return;
      }

      // Cancel any in-flight fetch for this parent
      const existing = fetchControllers.current.get(parentLabel);
      if (existing) existing.abort();
      const controller = new AbortController();
      fetchControllers.current.set(parentLabel, controller);

      // Set loading state
      setLoading((prev) => {
        const next = new Map(prev);
        for (const dep of childDeps) {
          next.set(dep.childLabel, true);
        }
        return next;
      });

      try {
        // Convert parent valueShape URI to package:label format for getInstanceData
        const parentShapeParam = getShapeParamsFromUri(
          childDeps[0].parentValueShapeId
        );
        if (!readInstance) return;
        const result = await readInstance(parentShapeParam, parentId);

        if (controller.signal.aborted) return;

        const instanceData = Array.isArray(result?.rows)
          ? result.rows[0]
          : result?.rows;

        if (!instanceData) {
          // Could not fetch parent data — allow all options
          setNarrowedIds((prev) => {
            const next = new Map(prev);
            for (const dep of childDeps) {
              next.set(dep.childLabel, null);
            }
            return next;
          });
          return;
        }

        // Extract narrowing IDs for each child
        setNarrowedIds((prev) => {
          const next = new Map(prev);
          for (const dep of childDeps) {
            const ids = extractNarrowingIds(
              instanceData,
              dep.linkingPropertyLabel
            );
            next.set(dep.childLabel, ids.length > 0 ? ids : null);
          }
          return next;
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn(
            'Failed to fetch parent instance for narrowing:',
            err
          );
          // On error, don't narrow (show all options)
          setNarrowedIds((prev) => {
            const next = new Map(prev);
            for (const dep of childDeps) {
              next.set(dep.childLabel, null);
            }
            return next;
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => {
            const next = new Map(prev);
            for (const dep of childDeps) {
              next.set(dep.childLabel, false);
            }
            return next;
          });
        }
      }
    },
    [dependencies, projectId]
  );

  /**
   * Initialize dependency state from existing form data (draft restore / edit mode).
   * Call this after loading initial data to set parentHasValue for pre-filled fields.
   */
  const initFromData = useCallback(
    (data: Record<string, any>) => {
      if (!data) return;
      // Find all parent labels and trigger onParentValueChange for each that has a value
      const parentLabels = new Set(dependencies.map((d) => d.parentLabel));
      for (const label of parentLabels) {
        if (data[label] !== undefined && data[label] !== null) {
          onParentValueChange(label, data[label]);
        }
      }
    },
    [dependencies, onParentValueChange]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fetchControllers.current.forEach((c) => c.abort());
    };
  }, []);

  /** Check if a property has any parent dependencies */
  const hasDependency = useCallback(
    (label: string) => depMap.has(label),
    [depMap]
  );

  /** Check if a property is a parent (has children that depend on it) */
  const isParent = useCallback(
    (label: string) => dependencies.some((d) => d.parentLabel === label),
    [dependencies]
  );

  /** Get the parent labels for a given child */
  const getParentLabels = useCallback(
    (childLabel: string) =>
      (depMap.get(childLabel) || []).map((d) => d.parentLabel),
    [depMap]
  );

  /** Build FieldDependencyState for a given property label */
  const getDependencyState = useCallback(
    (label: string): FieldDependencyState | undefined => {
      if (!depMap.has(label)) return undefined;
      return {
        narrowedIds: narrowedIds.get(label) ?? null,
        parentHasValue: parentHasValue.get(label) ?? true,
        parentLabels: getParentLabels(label),
        loading: loading.get(label) ?? false,
      };
    },
    [depMap, narrowedIds, parentHasValue, loading, getParentLabels]
  );

  return {
    dependencies,
    depMap,
    narrowedIds,
    parentHasValue,
    loading,
    onParentValueChange,
    initFromData,
    hasDependency,
    isParent,
    getParentLabels,
    getDependencyState,
  };
}
