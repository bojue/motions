/** 侧栏面板大标题：h2 + 副标题 p + 右侧动作区 */
import type { ReactNode } from "react";

interface PanelHeadingProps {
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
}

export const PanelHeading = ({ title, sub, action }: PanelHeadingProps) => (
  <div className="mc-panel-heading">
    <div>
      <h2>{title}</h2>
      {sub != null && <p>{sub}</p>}
    </div>
    {action}
  </div>
);
