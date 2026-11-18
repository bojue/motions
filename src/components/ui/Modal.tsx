/** 通用浮层：backdrop 点击关闭 + Esc 关闭，面板骨架类由调用方通过 panelClassName 附加 */
import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  zIndex?: number;
  backdropClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}

export const Modal = ({ open, onClose, label, zIndex = 60, backdropClassName, panelClassName, children }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className={backdropClassName ? `mc-modal-backdrop ${backdropClassName}` : "mc-modal-backdrop"}
      style={{ zIndex }}
      role="presentation"
      onClick={onClose}>
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
