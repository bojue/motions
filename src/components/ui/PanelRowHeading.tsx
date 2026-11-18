/** 侧栏小节标题：标题 + 数量统计 + 右侧动作按钮 */
import type { ReactNode } from "react";

interface PanelRowHeadingProps {
  title: string;
  count?: string;
  action?: ReactNode;
}

export const PanelRowHeading = ({ title, count, action }: PanelRowHeadingProps) => (
  <div className="mc-panel-row-heading">
    <h2>{title}</h2>
    {count != null && <p className="mc-panel-row-count">{count}</p>}
    {action}
  </div>
);
