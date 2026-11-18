/** 高级属性单元格：label + 输入框（prop-grid 布局的单元格），children 存在时以插槽内容替代生成的 input */
import type { ReactNode } from "react";

interface LabeledInputProps {
  label: string;
  children?: ReactNode;
  value?: string | number;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  onInput?: (raw: string) => void;
}

export const LabeledInput = ({ label, children, value, type = "text", min, max, step, ariaLabel, onInput }: LabeledInputProps) => (
  <label className="mc-labeled-input">
    {label}
    {children ?? (
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onChange={(event) => onInput?.(event.target.value)}/>
    )}
  </label>
);
