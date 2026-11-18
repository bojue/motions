/** 颜色选择器：control（快捷条方框）/ field（字段行内联）/ swatch（主题色网格）三种 DOM 结构保留为变体 */
interface ColorFieldProps {
  variant: "control" | "field" | "swatch";
  value: string;
  fallback?: string;
  label?: string;
  ariaLabel?: string;
  title?: string;
  onChange: (value: string) => void;
}

export const ColorField = ({ variant, value, fallback, label, ariaLabel, title, onChange }: ColorFieldProps) => {
  /** value 为空时用 fallback 提交显示（不主动写回）；均缺省时兜底为黑色，避免非法色值 */
  const shown = value || fallback || "#000000";
  if (variant === "control") {
    return (
      <label className="mc-color-control" title={title}>
        <input type="color" value={shown} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)}/>
      </label>
    );
  }
  if (variant === "field") {
    return (
      <input
        className="mc-color-field"
        type="color"
        value={shown}
        aria-label={ariaLabel}
        title={title}
        onChange={(event) => onChange(event.target.value)}/>
    );
  }
  return (
    <label className="mc-color-swatch" title={title}>
      <input type="color" value={shown} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)}/>
      <span>{label}</span>
    </label>
  );
};
