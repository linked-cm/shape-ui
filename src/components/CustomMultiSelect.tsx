import { Button } from '@_linked/primitives/components/Button';
import { Command } from '@_linked/primitives/components/Command';
import { Dialog } from '@_linked/primitives/components/Dialog';
import { Popover } from '@_linked/primitives/components/Popover';
import type { PropertyShapeWire, NodeShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { Shape } from '@_linked/core/shapes/Shape';
import { cl } from '@_linked/react/utils/ClassNames';
import { getNodeDisplay } from '../shape/nodeDisplay.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataManagerHost } from '../hostContext.js';
import { formatShapeLabel } from '../shape/naming.js';
import { Icons } from '@_linked/icons';
import { InlineImageThumb } from '@_linked/primitives/components/ImageThumb';
import { Spinner } from '@_linked/primitives/components/Spinner';
import style from './CustomMultiSelect.module.css';

interface CustomMultiSelectProps {
  values?;
  property?: PropertyShapeWire;
  /**
   * The shape whose instance is being edited — the OWNER of `property`, not the shape being
   * picked from. Needed for the pick-mode round-trip, which has to know where to return to.
   *
   * Supply these instead of letting the component read the route: it used to derive both
   * from `useParams().shape_uri` plus CN's settings context, which assumed CN's URL layout
   * for a value every caller already holds.
   */
  sourceShape?: NodeShapeWire;
  sourceShapeUri?: string;
  onShowAsTable?: () => void;
  onChange?: (values: { id: string; label: string; image?: string }[]) => void;
  onBeforeNavigate?: () => Promise<string | void> | string | void;
  narrowedIds?: string[] | null;
  isNarrowing?: boolean;
}

const CustomMultiSelect = ({
  values,
  property,
  sourceShape,
  sourceShapeUri,
  onShowAsTable,
  onChange,
  onBeforeNavigate,
  narrowedIds,
  isNarrowing,
}: CustomMultiSelectProps) => {
  const [comboboxValues, setComboboxValues] = useState<
    { id: string; label: string; image?: string }[]
  >([]);
  const [isComboboxExpanded, setIsComboboxExpanded] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxInputValue, setComboboxInputValue] = useState('');
  const [createNewInstanceFor, setCreateNewInstanceFor] = useState(null);
  const [maxVisibleOptions, setMaxVisibleOptions] = useState(5);
  const [searchResults, setSearchResults] = useState<{ id: string; label: string; image?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialOptions, setInitialOptions] = useState<{ id: string; label: string; image?: string }[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [browseOffset, setBrowseOffset] = useState(0);
  const [searchOffset, setSearchOffset] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The shape being edited arrives as a prop. It used to be read from the route
  // (`useParams().shape_uri` + `getShapeFromParams(..., projectConfig)`), which assumed
  // CN's URL layout AND CN's settings context — two couplings for one value every caller
  // already has in hand.
  const shape_uri = sourceShapeUri ?? sourceShape?.id;
  // The host supplies searching, inline creation and navigation. The picker used to reach
  // for `Project.searchInstances` + `useSettings` + the router directly, and to import
  // `AddInstanceForms` — a molecule importing an organism, which is both a cycle and the
  // one thing that made this component unextractable.
  const host = useDataManagerHost();
  const nodeShape = sourceShape as NodeShapeWire;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const valueArray = (Array.isArray(values) ? values : [values]).filter(Boolean);

  const isInitialMount = useRef(true);

  const renderText = (shape: Shape) => {
    return getNodeDisplay(shape);
  };

  /** Extract an image URL from a shape value (for initial values from props) */
  const getImageFromValue = (val: any): string | undefined => {
    if (!val) return undefined;
    // Direct contentUrl (ImageObject)
    if (val.contentUrl) return String(val.contentUrl);
    // schema:image → contentUrl
    const img = val.image;
    if (img) {
      if (typeof img === 'string') return img;
      if (Array.isArray(img)) {
        const first = img[0];
        return typeof first === 'string' ? first : first?.contentUrl ? String(first.contentUrl) : undefined;
      }
      if (img.contentUrl) return String(img.contentUrl);
    }
    return undefined;
  };

  // Init selected values from props
  useEffect(() => {
    const alreadySelectedValues =
      valueArray.length > 0
        ? valueArray.map((el) => ({
            id: el.id,
            label: renderText(el),
            image: getImageFromValue(el),
          }))
        : [];
    setComboboxValues(alreadySelectedValues);
  }, []);

  // The return leg of the pick round trip.
  //
  // This field sent the viewer away to choose and was unmounted while they did, so the
  // answer cannot arrive through a callback — it has to be collected on the way back in.
  // Where it was kept is the host's business; this used to read CN's sessionStorage
  // directly, which is why the component only worked inside Create Now.
  useEffect(() => {
    if (!property?.label) return;
    const pickedItems = host.picking?.takeResult({
      propertyLabel: property.label,
      sourceShapeIri: shape_uri,
    });
    if (!pickedItems || pickedItems.length === 0) return;
    setComboboxValues((prev) => {
      let next = [...prev];
      for (const picked of pickedItems) {
        if (next.some((v) => v.id === picked.id)) continue;
        if (property?.maxCount === 1) return [picked];
        if (property?.maxCount && next.length >= property.maxCount) break;
        next.push(picked);
      }
      return next;
    });
  }, []);

  // Propagate comboboxValues changes to parent via onChange
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChange?.(comboboxValues);
  }, [comboboxValues]);

  // Debounced backend search — resets offset on new search text
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const valueShapeId = property?.valueShape?.id;
    if (!comboboxInputValue || !host.searchInstances || !valueShapeId) {
      setSearchResults([]);
      setSearchOffset(0);
      setHasMore(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setSearchOffset(0);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await host.searchInstances(valueShapeId, {
          query: comboboxInputValue,
          limit: 20,
          offset: 0,
          narrowedIds: narrowedIds || undefined,
        });
        setSearchResults(response?.results || []);
        setHasMore(response?.hasMore ?? false);
      } catch {
        setSearchResults([]);
        setHasMore(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [comboboxInputValue, host, property?.valueShape?.id, narrowedIds]);

  // Load initial options when popover opens or narrowing changes (browse mode)
  useEffect(() => {
    if (!isComboboxOpen) return;
    // Capture trigger width for popover alignment
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
    }
    const valueShapeId = property?.valueShape?.id;
    if (!host.searchInstances || !valueShapeId) return;
    setIsLoadingInitial(true);
    setBrowseOffset(0);
    host
      .searchInstances(valueShapeId, {
        query: '',
        limit: 20,
        offset: 0,
        narrowedIds: narrowedIds || undefined,
      })
      .then((response) => {
        setInitialOptions(response?.results || []);
        setHasMore(response?.hasMore ?? false);
      })
      .catch(() => {
        setInitialOptions([]);
        setHasMore(false);
      })
      .finally(() => setIsLoadingInitial(false));
  }, [isComboboxOpen, narrowedIds]);

  // Load more results (infinite scroll) for both browse and search modes
  const loadMore = useCallback(async () => {
    const valueShapeId = property?.valueShape?.id;
    if (!host.searchInstances || !valueShapeId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const isSearchMode = !!comboboxInputValue;
    const currentOffset = isSearchMode ? searchOffset : browseOffset;
    const nextOffset = currentOffset + 20;

    try {
      const response = await host.searchInstances(valueShapeId, {
        query: isSearchMode ? comboboxInputValue : '',
        limit: 20,
        offset: nextOffset,
        narrowedIds: narrowedIds || undefined,
      });
      const newResults = response?.results || [];
      setHasMore(response?.hasMore ?? false);

      if (isSearchMode) {
        setSearchResults((prev) => [...prev, ...newResults]);
        setSearchOffset(nextOffset);
      } else {
        setInitialOptions((prev) => [...prev, ...newResults]);
        setBrowseOffset(nextOffset);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [host, property?.valueShape?.id, comboboxInputValue, isLoadingMore, hasMore, searchOffset, browseOffset]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Responsive max visible chips
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) setMaxVisibleOptions(3);
      else if (window.innerWidth < 1024) setMaxVisibleOptions(4);
      else setMaxVisibleOptions(5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const multiselect = property.maxCount > 1;
  const onUpdateCombobox = (item: { id: string; label: string; image?: string }) => {
    if (multiselect) {
      if (comboboxValues?.some((v) => v.id === item.id)) {
        setComboboxValues((prev) => prev.filter((e) => e.id !== item.id));
      } else {
        // Enforce maxCount limit
        if (property?.maxCount && comboboxValues.length >= property.maxCount) return;
        setComboboxValues((prev) => [...prev, item]);
      }
    } else {
      // Single select: toggle — if already selected, deselect; otherwise select
      if (comboboxValues?.some((v) => v.id === item.id)) {
        setComboboxValues([]);
      } else {
        setComboboxValues([item]);
      }
    }
  };

  /** Dedicated removal handler for the X button on chips — always removes regardless of multiselect */
  const onRemoveValue = (e: React.MouseEvent, item: { id: string; label: string; image?: string }) => {
    e.stopPropagation();
    e.preventDefault();
    setComboboxValues((prev) => prev.filter((v) => v.id !== item.id));
  };

  const onClickTable = async () => {
    if (onShowAsTable) {
      onShowAsTable();
    } else if (property?.valueShape?.id) {
      // Flush draft to server before navigating away — returns the draftId
      const flushedDraftId = await onBeforeNavigate?.();
      // How "browse all of these" is presented is the host's decision — Create Now
      // navigates to the overview in pick mode; another host might open a sheet. The
      // flushed draft id rides along as the resume token so the half-filled form survives
      // whatever round trip the host chooses.
      host.picking?.open({
        shapeIri: property.valueShape.id,
        propertyLabel: property.label,
        sourceShapeIri: shape_uri,
        maxCount: property.maxCount,
        minCount: property.minCount,
        alreadySelected: comboboxValues,
        resumeToken: flushedDraftId || undefined,
      });
    }
  };

  const dropdownOptions: { id: string; label: string; image?: string }[] = comboboxInputValue
    ? searchResults
    : initialOptions.length > 0
      ? initialOptions
      : valueArray.map((el) => ({ id: el.id, label: renderText(el), image: getImageFromValue(el) }));

  const openCreateNew = () => {
    setCreateNewInstanceFor(nodeShape);
    setIsComboboxOpen(false); // close popover first — avoids z-index overlap
    setIsDialogOpen(true);
  };

  return (
    <div className={style.Root}>
      <Popover.Root
        open={isComboboxOpen}
        onOpenChange={setIsComboboxOpen}
      >
        <Popover.Trigger asChild>
          <div ref={triggerRef} className={style.selectedOptionsAndChevronIconContainer}>
            <div
              className={cl(
                style.selectedOptionsContainer,
                isComboboxExpanded ? style.expanded : ''
              )}
            >
              <div
                className={cl(
                  style.noBorderContainer,
                  isComboboxExpanded ? style.expanded : ''
                )}
              >
                {comboboxValues.length > 0 ? (
                  comboboxValues.slice(0, maxVisibleOptions).map((val, i) => (
                    <Button key={i} size="small" className={style.optionButton}>
                      {val.image && <InlineImageThumb src={val.image} />}
                      {val.label}
                      <Icons.Cross2
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => onRemoveValue(e, val)}
                      />
                    </Button>
                  ))
                ) : (
                  <p className={style.selectorButton}>Select value</p>
                )}
                {comboboxValues.length > maxVisibleOptions &&
                  (isComboboxExpanded ? (
                    comboboxValues
                      .slice(maxVisibleOptions)
                      .map((val, i) => (
                        <Button key={i} size="small" className={style.optionButton}>
                          {val.image && <InlineImageThumb src={val.image} />}
                          {val.label}
                          <Icons.Cross2
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => onRemoveValue(e, val)}
                          />
                        </Button>
                      ))
                  ) : (
                    <Button
                      size="small"
                      className={style.optionButton}
                      onClick={() => setIsComboboxExpanded(true)}
                    >
                      ... {comboboxValues.slice(maxVisibleOptions).length} more
                    </Button>
                  ))}
              </div>
            </div>
            <Icons.ChevronDown
              className={cl(
                style.chevronDownIcon,
                isComboboxOpen ? style.open : ''
              )}
            />
            {isComboboxExpanded && (
              <p
                className={style.viewLessText}
                onClick={() => setIsComboboxExpanded(false)}
              >
                View Less
              </p>
            )}
          </div>
        </Popover.Trigger>

        <Popover.Content
          className={style.options}
          style={triggerWidth ? { width: triggerWidth } : undefined}
          align="start"
        >
          <Command.Root shouldFilter={false}>
            {/* Search input row */}
            <div className={style.searchWrapper}>
              <Command.Input
                value={comboboxInputValue}
                onValueChange={setComboboxInputValue}
                placeholder="Search..."
              />
              {comboboxInputValue && (
                <Icons.Cross2
                  className={style.resetSearchInputIcon}
                  onClick={() => setComboboxInputValue('')}
                />
              )}
            </div>

            {/* Options list */}
            <Command.List className={style.commandRoot}>
              <Command.Empty className={style.emptyResult}>
                {isLoadingInitial || isSearching
                  ? <Spinner size="small" />
                  : comboboxInputValue
                    ? `No results for "${comboboxInputValue}"`
                    : 'No options available'}
              </Command.Empty>
              <Command.Group className={style.commandGroup}>
                {dropdownOptions.map((option) => {
                  const selected = comboboxValues.some((v) => v.id === option.id);
                  return (
                    <Command.Item
                      key={option.id}
                      value={option.id}
                      onSelect={(currentValue) => {
                        const item = dropdownOptions.find(o => o.id === currentValue);
                        if (item) onUpdateCombobox(item);
                      }}
                      className={cl(style.option, selected ? style.optionSelected : '')}
                    >
                      {option.image && <InlineImageThumb src={option.image} />}
                      <span className={style.optionLabel}>{option.label}</span>
                      {selected && <Icons.Check width="16" height="16" className={style.optionCheck} />}
                    </Command.Item>
                  );
                })}
              </Command.Group>
              {/* Infinite scroll sentinel + loading indicator */}
              {hasMore && (
                <div ref={sentinelRef} className={style.loadMoreSentinel}>
                  <Spinner active={isLoadingMore} size="small" />
                </div>
              )}
            </Command.List>
          </Command.Root>

          {/* "Create New" sits at the bottom of the popover, outside Command.List */}
          <div className={style.createNewContainer}>
            <button
              type="button"
              className={style.modalButton}
              onClick={openCreateNew}
            >
              <Icons.Plus width="14" height="14" />
              <span>Create New</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Root>

      {/* Dialog is a sibling of Popover — prevents portal/z-index layering conflict */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content className={style.dialogRoot}>
          <Dialog.Header className={style.dialogHeader}>
            <Dialog.Title>
              Create New {nodeShape?.label ? formatShapeLabel(nodeShape.label) : ''}
            </Dialog.Title>
            <Dialog.Description>
              Fill the form to create a new {nodeShape?.label ? formatShapeLabel(nodeShape.label) : ''}
            </Dialog.Description>
          </Dialog.Header>
          <div className={style.dialogContent}>
            {/*
              The host decides what "create one of these" looks like. This component used
              to import `AddInstanceForms` and call `Project.createShapeInstance` itself —
              a molecule reaching up into an organism and into the control plane. Now it
              only decides WHEN to ask.
            */}
            {host.inlineCreate?.({
              shapeIri: (createNewInstanceFor || nodeShape)?.id,
              onCreated: (created) => {
                setIsDialogOpen(false);
                if (created?.id) onUpdateCombobox(created);
              },
              onCancel: () => setIsDialogOpen(false),
            })}
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <div onClick={onClickTable} className={style.tableIcon}>
        <Icons.Table width="25" height="25" />
      </div>
    </div>
  );
};

export default CustomMultiSelect;
