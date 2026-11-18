/** 标签切换器：rail（左侧图标栏）/ segmented（灰底胶囊，sm 为时间轴小尺寸）/ underline（检查器下划线）/ pills（播放坞比例切换） */
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface TabsProps {
  variant: "rail" | "segmented" | "underline" | "pills";
  items: {
    id: string;
    label: string;
    icon?: IconName;
    active?: boolean;
    disabled?: boolean;
    onSelect?: (id: string) => void;
  }[];
  onSelect: (id: string) => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export const Tabs = ({ variant, items, onSelect, ariaLabel, size = "md", className }: TabsProps) => {
  const classes = ["mc-tabs", `mc-tabs--${variant}`];
  if (size === "sm") classes.push("mc-tabs--sm");
  if (className) classes.push(className);
  return (
    <div className={classes.join(" ")} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.active ?? false}
          className={item.active ? "is-active" : ""}
          title={item.label}
          disabled={item.disabled}
          onClick={() => (item.onSelect ? item.onSelect(item.id) : onSelect(item.id))}
        >
          {item.icon != null && <Icon name={item.icon} size={14} />}
          {item.label}
        </button>
      ))}
    </div>
  );
};
