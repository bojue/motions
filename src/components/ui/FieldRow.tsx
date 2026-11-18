/** 检查器字段行：label + 控件 + 单位的横排布局，children 为裸 input/select（原生属性透传） */
import type { ReactNode } from "react";

interface FieldRowProps {
  label: ReactNode;
  unit?: string;
  children: ReactNode;
}

export const FieldRow = ({ label, unit, children }: FieldRowProps) => (
  <div className="mc-field-row">
    <span>{label}</span>
    {children}
    {unit != null && <em>{unit}</em>}
  </div>
);
