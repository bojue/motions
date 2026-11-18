/** 图标按钮：tool/small/context/play 四种变体，吸收编辑器顶栏、图层面板与播放坞的图标按钮样式 */
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface IconButtonProps {
  variant: "tool" | "small" | "context" | "play";
  icon: IconName;
  size?: number;
  label: string;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  onClick?: () => void;
  className?: string;
}

export const IconButton = ({ variant, icon, size = 16, label, disabled, active, title, onClick, className }: IconButtonProps) => {
  const classes = ["mc-icon-button", `mc-icon-button--${variant}`];
  if (active) classes.push("is-active");
  if (className) classes.push(className);
  return (
    <button
      type="button"
      className={classes.join(" ")}
      aria-label={label}
      title={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}>
      <Icon name={icon} size={size}/>
    </button>
  );
};
