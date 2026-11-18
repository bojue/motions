/** 滑杆：echo 时右侧显示数值回显（音量形态），ticks 时下方显示两端刻度（时长形态） */
interface RangeFieldProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  ariaLabel?: string;
  echo?: string;
  ticks?: [string, string];
  onInput: (raw: string) => void;
}

export const RangeField = ({ value, min, max, step, ariaLabel, echo, ticks, onInput }: RangeFieldProps) => {
  const input = (className: string) => (
    <input
      type="range"
      className={className}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onInput(event.target.value)}/>
  );
  if (echo != null) {
    return (
      <div className="mc-range-echo">
        {input("mc-range-native")}
        <em>{echo}</em>
      </div>
    );
  }
  return (
    <>
      {input("mc-range")}
      {ticks && (
        <div className="mc-range-labels"><span>{ticks[0]}</span><span>{ticks[1]}</span></div>
      )}
    </>
  );
};
