/** 胶囊选项行：可换行的 chip 组（画幅 / 缓动 / 特效参数等），is-active 标记选中态 */
interface ChipRowProps {
  items: { id: string; label: string; title?: string; active?: boolean }[];
  onSelect: (id: string) => void;
  className?: string;
}

export const ChipRow = ({ items, onSelect, className }: ChipRowProps) => (
  <div className={className ? `mc-chip-row ${className}` : "mc-chip-row"}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        className={item.active ? "is-active" : ""}
        title={item.title}
        onClick={() => onSelect(item.id)}>
        {item.label}
      </button>
    ))}
  </div>
);
