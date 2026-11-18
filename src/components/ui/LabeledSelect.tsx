/** 带标签下拉框：field-row 内联形态的 select（页面尺寸 / 入场转场 / 退场风格等场景） */
interface LabeledSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export const LabeledSelect = ({ label, value, options, onChange }: LabeledSelectProps) => (
  <div className="mc-field-row">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);
