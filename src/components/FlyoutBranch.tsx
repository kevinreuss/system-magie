import { useRef, useState, type ReactNode, type RefObject } from 'react';

/** Shared hover branch, also operable with touch and the keyboard. */
export function FlyoutBranch({ label, id, direction, children, disabled = false, buttonRef }: {
  label: string;
  id: string;
  direction: 'left' | 'right';
  children: ReactNode;
  disabled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const ownButton = useRef<HTMLButtonElement>(null);
  const trigger = buttonRef ?? ownButton;
  const panel = useRef<HTMLDivElement>(null);
  const enterKey = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';
  const leaveKey = direction === 'right' ? 'ArrowLeft' : 'ArrowRight';
  function focusFirst() {
    setOpen(true);
    requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
  }
  return <div className={`flyout-branch flyout-${direction}`}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse' && !disabled) setOpen(true); }}
    onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false); }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} disabled={disabled}
      className="flyout-trigger" aria-expanded={open} aria-controls={id}
      onClick={(event) => {
        // Mouse hover has already opened the branch; a tap opens it too.
        if (event.detail === 0) focusFirst();
        else setOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === enterKey) { event.preventDefault(); focusFirst(); }
      }}>
      <span>{label}</span>
      <svg className="flyout-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>
    </button>
    {open && <div className="flyout-bridge">
      <div className="cascade-panel flyout-panel" id={id} ref={panel} role="group" aria-label={label}
        onKeyDown={(event) => {
          if (event.key === leaveKey || event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation();
            setOpen(false); trigger.current?.focus();
          }
        }}>{children}</div>
    </div>}
  </div>;
}
