/** 空状态占位：面板无内容时的居中灰字提示 */
import type { ReactNode } from "react";

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="mc-empty">{children}</div>
);
