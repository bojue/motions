/** 检查器分区卡：标题（可带 action）+ 内容 + 底部备注 */
import type { ReactNode } from "react";

interface SectionProps {
  title?: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

export const Section = ({ title, note, action, children }: SectionProps) => (
  <section className="mc-section">
    {title != null && (
      <div className={action ? "mc-section-title mc-section-title--has-action" : "mc-section-title"}>
        {title}
        {action}
      </div>
    )}
    {children}
    {note != null && <p className="mc-section-note">{note}</p>}
  </section>
);
