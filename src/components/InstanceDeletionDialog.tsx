import { useEffect, useMemo, useState } from 'react';
import type {
  InstanceDeletionExecuteInput,
  InstanceDeletionPreview,
  InstanceDeletionPreviewInput,
  InstanceDeletionResult,
  InstanceDeletionTarget,
} from '../shape/contracts.js';
import { ConfirmDialog } from '@_linked/primitives/components/ConfirmDialog';
import { Spinner } from '@_linked/primitives/components/Spinner';
import style from './InstanceDeletionDialog.module.css';

type PreviewDeletion = (input: InstanceDeletionPreviewInput) => Promise<InstanceDeletionPreview>;
type ExecuteDeletion = (input: InstanceDeletionExecuteInput) => Promise<InstanceDeletionResult>;
// No module-level defaults. They used to be
// `(input) => Project.previewInstanceDeletion(input)`, which meant this organism carried a
// control-plane dependency even for callers that injected their own — and made the
// injection look optional when it is the whole seam.

export interface InstanceDeletionDialogProps {
  isOpen: boolean;
  projectId: string;
  targets: InstanceDeletionTarget[];
  labels?: Record<string, string>;
  onClose: () => void;
  onDeleted: (result: InstanceDeletionResult) => void;
  /** How to preview the cascade. Required: the organism has no opinion on where data lives. */
  previewDeletion: PreviewDeletion;
  /** How to perform it. */
  executeDeletion: ExecuteDeletion;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function replacementPreview(error: unknown): InstanceDeletionPreview | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: string; preview?: InstanceDeletionPreview };
  return candidate.code === 'impact-changed' ? candidate.preview : undefined;
}

export function InstanceDeletionDialog({
  isOpen,
  projectId,
  targets,
  labels = {},
  onClose,
  onDeleted,
  previewDeletion,
  executeDeletion,
}: InstanceDeletionDialogProps) {
  const [preview, setPreview] = useState<InstanceDeletionPreview>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [impactChanged, setImpactChanged] = useState(false);
  const targetKey = useMemo(
    () => targets.map(({ instanceId, shapeIri }) => `${shapeIri}\u0000${instanceId}`).join('\u0001'),
    [targets],
  );

  useEffect(() => {
    if (!isOpen || !projectId || targets.length === 0) return;
    let active = true;
    setPreview(undefined);
    setError(undefined);
    setImpactChanged(false);
    setIsLoading(true);
    previewDeletion({ projectId, targets })
      .then((next) => {
        if (active) setPreview(next);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [isOpen, projectId, targetKey, previewDeletion]);

  const confirm = async () => {
    if (!preview || isDeleting) return;
    setIsDeleting(true);
    setError(undefined);
    setImpactChanged(false);
    try {
      const result = await executeDeletion({
        projectId,
        targets,
        expectedImpactHash: preview.impactHash,
      });
      onDeleted(result);
      onClose();
    } catch (reason) {
      const replacement = replacementPreview(reason);
      if (replacement) {
        setPreview(replacement);
        setImpactChanged(true);
      } else {
        setError(errorMessage(reason));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const message = (
    <div className={style.summary}>
      <p className={style.intro}>
        Review references and document provenance before deleting. This preview is checked again when you confirm.
      </p>
      {isLoading && <div role="status"><Spinner size="small" /> Checking current impact…</div>}
      {impactChanged && (
        <p className={style.changed} role="alert">
          The impact changed since the previous preview. Review the updated details, then confirm again.
        </p>
      )}
      {error && <p className={style.error} role="alert">{error}</p>}
      {preview && (
        <div className={style.targets}>
          {preview.targets.map((target) => {
            const hasImpact = target.inboundReferences.length > 0 || target.sourceDocuments.length > 0;
            return (
              <section className={style.target} key={`${target.shapeIri}:${target.instanceId}`}>
                <strong>{labels[target.instanceId] || target.instanceId}</strong>
                <small>{target.instanceId}</small>
                {!hasImpact && <p className={style.empty}>No inbound references or source documents found.</p>}
                {target.sourceDocuments.length > 0 && (
                  <ul className={style.impactList} aria-label="Source documents">
                    {target.sourceDocuments.map((documentId) => (
                      <li key={documentId}>Produced from document {documentId}</li>
                    ))}
                  </ul>
                )}
                {target.inboundReferences.length > 0 && (
                  <ul className={style.impactList} aria-label="Inbound references">
                    {target.inboundReferences.map((reference) => (
                      <li key={`${reference.subjectId}:${reference.propertyIri}`}>
                        Referenced by {reference.subjectId} through {reference.propertyIri}
                      </li>
                    ))}
                  </ul>
                )}
                {target.pendingRecreation && (
                  <p className={style.warning}>
                    This instance came from Document Studio. Deleting it also suppresses automatic recreation until it is explicitly restored.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      onConfirm={confirm}
      title={targets.length === 1 ? 'Delete this instance?' : `Delete ${targets.length} instances?`}
      message={message}
      confirmText={targets.length === 1 ? 'Delete instance' : `Delete ${targets.length} instances`}
      tone="danger"
      isLoading={isDeleting}
      confirmDisabled={!preview || isLoading}
      loadingContent={<><Spinner size="small" /> Deleting</>}
    />
  );
}
