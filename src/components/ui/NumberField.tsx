/** 数字输入框：右对齐并隐藏原生上下箭头；onInput 原样透传输入文本，钳制由调用方处理 */
interface NumberFieldProps {
  value: string | number;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  onInput: (raw: string) => void;
  className?: string;
}

export const NumberField = ({ value, min, max, step, ariaLabel, onInput, className }: NumberFieldProps) => (
  <input
    type="number"
    className={className ? `mc-number-field ${className}` : "mc-number-field"}
    value={value}
    min={min}
    max={max}
    step={step}
    aria-label={ariaLabel}
    onChange={(event) => onInput(event.target.value)}/>
);
