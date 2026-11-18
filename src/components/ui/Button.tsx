/** 通用按钮：primary/soft/outline/ghost/danger 五种变体，吸收编辑器与向导里重复的按钮样式 */
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface ButtonProps {
  variant: "primary" | "soft" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: IconName;
  iconSize?: number;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export const Button = ({ variant, size = "md", icon, iconSize = 14, disabled, title, onClick, className, children }: ButtonProps) => {
  const classes = ["mc-button", `mc-button--${variant}`, `mc-button--${size}`];
  if (className) classes.push(className);
  return (
    <button type="button" className={classes.join(" ")} title={title} disabled={disabled} onClick={onClick}>
      {icon != null && <Icon name={icon} size={iconSize}/>}
      {children}
    </button>
  );
};
