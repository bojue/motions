/** 画幅选择器：chips（项目面板）/ switch（播放坞）/ cards（向导三卡片）三套画幅 UI 保留为变体 */
import type { Ratio } from "../../model/project";
import { RATIOS, RATIO_LABEL, RATIO_SIZE } from "../../model/project";

/** cards 变体单卡自定义文案（标题 / 描述 / 角标），缺省回退 RATIO_LABEL / 画幅尺寸 / 比例值 */
export interface RatioCardText {
  title: string;
  desc: string;
  tag: string;
}

interface AspectRatioPickerProps {
  variant: "chips" | "switch" | "cards";
  value: Ratio;
  onChange: (ratio: Ratio) => void;
  ratios?: Ratio[];
  /** cards 变体按画幅覆盖卡片文案（向导三步流程的标题 / 描述 / 角标） */
  cards?: Partial<Record<Ratio, RatioCardText>>;
}

export const AspectRatioPicker = ({ variant, value, onChange, ratios = RATIOS, cards }: AspectRatioPickerProps) => {
  if (variant === "chips") {
    return (
      <div className="mc-chip-row">
        {ratios.map((ratio) => (
          <button
            key={ratio}
            type="button"
            className={value === ratio ? "is-active" : ""}
            onClick={() => onChange(ratio)}>
            {RATIO_LABEL[ratio]}
          </button>
        ))}
      </div>
    );
  }
  if (variant === "switch") {
    return (
      <div className="mc-tabs mc-tabs--pills" role="tablist" aria-label="画幅比例">
        {ratios.map((ratio) => (
          <button
            key={ratio}
            type="button"
            role="tab"
            aria-selected={value === ratio}
            className={value === ratio ? "is-active" : ""}
            title={RATIO_LABEL[ratio]}
            onClick={() => onChange(ratio)}>
            {RATIO_LABEL[ratio]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="mc-ratio-cards">
      {ratios.map((ratio) => {
        const card = cards?.[ratio];
        return (
          <button
            key={ratio}
            type="button"
            className={value === ratio ? "mc-ratio-card is-active" : "mc-ratio-card"}
            onClick={() => onChange(ratio)}>
            <span className={`mc-ratio-frame mc-ratio-frame--${ratio.replace(":", "-")}`}/>
            <strong>{card?.title ?? RATIO_LABEL[ratio]}</strong>
            <small>{card?.desc ?? `${RATIO_SIZE[ratio].width} × ${RATIO_SIZE[ratio].height}`}</small>
            <em>{card ? `${card.tag} · ${ratio}` : ratio}</em>
          </button>
        );
      })}
    </div>
  );
};
