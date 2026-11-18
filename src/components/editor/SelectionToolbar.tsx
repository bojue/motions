import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/Icon";

export interface SelectionToolbarAction {
  icon: IconName;
  /** 无障碍名（如「隐藏 图层名」） */
  label: string;
  title: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}

interface SelectionToolbarProps {
  /** 工具条左侧的名称文案（图层名 + 字号/缩放） */
  label: ReactNode;
  actions: SelectionToolbarAction[];
}

/**
 * 选中元素的悬浮工具条：名称 + 隐藏 / 锁定 / 复制 / 删除，悬浮在元素上方。
 * 四个动作共用同一套键盘处理（Enter/Space 触发）与事件冒泡拦截。
 */
export const SelectionToolbar = ({ label, actions }: SelectionToolbarProps) => (
  <span className="selection-toolbar">
    <span className="selection-label-text">{label}</span>
    <span className="selection-actions">
      {actions.map((action) => (
        <i key={action.label} role="button" tabIndex={0} aria-label={action.label} title={action.title}
          className={action.danger ? "danger" : action.active ? "is-active" : ""}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); action.onClick(); } }}
          onClick={(event) => { event.stopPropagation(); action.onClick(); }}>
          <Icon name={action.icon} size={13}/>
        </i>
      ))}
    </span>
  </span>
);
