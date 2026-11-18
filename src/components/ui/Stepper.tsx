/** 步进器：− / 数字输入 / + 三段式（字号、透明度等），onStep 交由调用方换算实际步长 */
interface StepperProps {
  label?: string;
  ariaLabel: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onStep: (delta: number) => void;
  onInput?: (raw: string) => void;
  className?: string;
}

export const Stepper = ({ label, ariaLabel, value, min, max, unit, onStep, onInput, className }: StepperProps) => {
  const stepper = (
    <div className="mc-stepper" role="group" aria-label={ariaLabel}>
      <button type="button" aria-label={`减小${ariaLabel}`} onClick={() => onStep(-1)}>
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onInput?.(event.target.value)}
      />
      <button type="button" aria-label={`增大${ariaLabel}`} onClick={() => onStep(1)}>
        +
      </button>
      {unit != null && <em>{unit}</em>}
    </div>
  );
  if (label == null) return stepper;
  return (
    <div className={className ? `mc-stepper-block ${className}` : "mc-stepper-block"}>
      <span className="mc-stepper-label">{label}</span>
      {stepper}
    </div>
  );
};
