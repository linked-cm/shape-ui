import { Button } from '@_linked/primitives/components/Button';
import { Checkbox } from '@_linked/primitives/components/Checkbox';
import { Drawer } from '@_linked/primitives/components/Drawer';
import type { PropertyShapeWire, NodeShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { shacl } from '@_linked/core/ontologies/shacl';
import React from 'react';
import { getPropertyUiType } from '../shape/propertyTypes.js';
import { humanizeEnumLabel, enumOptions } from '../shape/nodeDisplay.js';
import { Icons } from '@_linked/icons';
import { Spinner } from '@_linked/primitives/components/Spinner';
import style from './BatchEditDrawer.module.css';

interface BatchEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shape: NodeShapeWire;
  properties: Record<string, PropertyShapeWire>;
  selectedCount: number;
  onApply: (changes: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
}

interface FieldState {
  enabled: boolean;
  value: any;
}

function BatchEditDrawer({
  isOpen,
  onClose,
  shape,
  properties,
  selectedCount,
  onApply,
  isLoading = false,
}: BatchEditDrawerProps) {
  const [fields, setFields] = React.useState<Record<string, FieldState>>({});
  const [step, setStep] = React.useState<'edit' | 'review'>('edit');

  // Reset state when drawer opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFields({});
      setStep('edit');
    }
  }, [isOpen]);

  // Get editable properties (skip id, rdf:type, and IRI/reference fields for V1)
  const editableProperties = React.useMemo(() => {
    return Object.entries(properties).filter(([label, prop]) => {
      if (label === 'id') return false;
      if (prop.id === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') return false;
      const nodeKind = prop.nodeKind?.id;
      // Skip IRI/reference fields — too complex for batch V1
      if (
        nodeKind === shacl.IRI.id ||
        nodeKind === shacl.BlankNode.id ||
        nodeKind === shacl.BlankNodeOrIRI.id
      ) {
        return false;
      }
      return true;
    });
  }, [properties]);

  const toggleField = (label: string) => {
    setFields((prev) => ({
      ...prev,
      [label]: {
        enabled: !prev[label]?.enabled,
        value: prev[label]?.value ?? '',
      },
    }));
  };

  const updateFieldValue = (label: string, value: any) => {
    setFields((prev) => ({
      ...prev,
      [label]: { enabled: true, value },
    }));
  };

  const enabledFields = Object.entries(fields).filter(([, f]) => f.enabled);
  const hasChanges = enabledFields.length > 0;

  const handleApply = () => {
    const changes: Record<string, any> = {};
    for (const [label, fieldState] of enabledFields) {
      changes[label] = fieldState.value;
    }
    onApply(changes);
  };

  const humanizeLabel = (label: string) =>
    label
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());

  const formatValue = (value: any, prop: PropertyShapeWire) => {
    if (value === '' || value === null || value === undefined) return '(empty)';
    const uiType = getPropertyUiType(prop);
    if (uiType === 'boolean') return value === 'true' || value === true ? 'Yes' : 'No';
    if (uiType === 'enum-literal' || uiType === 'enum-iri') {
      const match = enumOptions(prop).find((v) => v.id === value);
      if (match) return match.label;
    }
    return String(value);
  };

  const renderFieldInput = (label: string, prop: PropertyShapeWire) => {
    const uiType = getPropertyUiType(prop);
    const fieldState = fields[label];
    const value = fieldState?.value ?? '';
    const disabled = !fieldState?.enabled;

    switch (uiType) {
      case 'boolean':
        return (
          <select
            className={style.input}
            disabled={disabled}
            value={value}
            onChange={(e) => updateFieldValue(label, e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'enum-literal':
      case 'enum-iri':
        return (
          <select
            className={style.input}
            disabled={disabled}
            value={value}
            onChange={(e) => updateFieldValue(label, e.target.value)}
          >
            <option value="">— Select —</option>
            {enumOptions(prop).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            className={style.input}
            disabled={disabled}
            value={value}
            placeholder="Enter number..."
            onChange={(e) => updateFieldValue(label, e.target.value ? Number(e.target.value) : '')}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className={style.input}
            disabled={disabled}
            value={value}
            onChange={(e) => updateFieldValue(label, e.target.value)}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            className={style.input}
            disabled={disabled}
            value={value}
            onChange={(e) => updateFieldValue(label, e.target.value)}
          />
        );

      case 'text':
      case 'url':
      default:
        return (
          <input
            type={uiType === 'url' ? 'url' : 'text'}
            className={style.input}
            disabled={disabled}
            value={value}
            placeholder={`Enter ${uiType === 'url' ? 'URL' : 'text'}...`}
            onChange={(e) => updateFieldValue(label, e.target.value)}
          />
        );
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} direction="right" handleOnly>
      <Drawer.Content hideHandle className={style.drawer}>
        <div className={style.drawerContent}>
          <Drawer.Header className={style.header}>
            <Drawer.Title>Edit {selectedCount} {shape?.label || 'item'}{selectedCount > 1 ? 's' : ''}</Drawer.Title>
            <Drawer.Description>
              {step === 'edit'
                ? 'Toggle on the fields you want to change. Only enabled fields will be updated.'
                : 'Review your changes before applying.'}
            </Drawer.Description>
          </Drawer.Header>

          <div className={style.body}>
            {step === 'edit' ? (
              <div className={style.fieldList}>
                {editableProperties.map(([label, prop]) => {
                  const isEnabled = fields[label]?.enabled ?? false;
                  return (
                    <div key={label} className={style.fieldRow}>
                      <div className={style.fieldToggle}>
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={() => toggleField(label)}
                        />
                        <label
                          className={style.fieldLabel}
                          onClick={() => toggleField(label)}
                        >
                          {humanizeLabel(label)}
                        </label>
                      </div>
                      <div className={isEnabled ? style.fieldInput : style.fieldInputDisabled}>
                        {renderFieldInput(label, prop)}
                      </div>
                    </div>
                  );
                })}
                {editableProperties.length === 0 && (
                  <p className={style.noFields}>No editable fields available for batch editing.</p>
                )}
              </div>
            ) : (
              <div className={style.reviewList}>
                <p className={style.reviewIntro}>
                  The following changes will be applied to {selectedCount} item{selectedCount > 1 ? 's' : ''}:
                </p>
                {enabledFields.map(([label]) => {
                  const prop = properties[label];
                  const value = fields[label].value;
                  return (
                    <div key={label} className={style.reviewItem}>
                      <span className={style.reviewField}>{humanizeLabel(label)}</span>
                      <Icons.ChevronRight width={12} height={12} />
                      <span className={style.reviewValue}>
                        {formatValue(value, prop)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={style.footer}>
            {step === 'edit' ? (
              <>
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={() => setStep('review')} disabled={!hasChanges || isLoading}>
                  Review Changes ({enabledFields.length})
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep('edit')} disabled={isLoading}>
                  Back
                </Button>
                <Button onClick={handleApply} disabled={isLoading}>
                  {isLoading ? (
                    <><Spinner size="small" /> Updating {selectedCount} items...</>
                  ) : (
                    `Apply to ${selectedCount} items`
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}

export default BatchEditDrawer;
