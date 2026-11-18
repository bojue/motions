import type { Page } from "../../model/project";
import { Section } from "../ui/Section";
import { ChipRow } from "../ui/ChipRow";
import { FieldRow } from "../ui/FieldRow";
import { NumberField } from "../ui/NumberField";
import { LabeledSelect } from "../ui/LabeledSelect";
import { ANIMATION_RECIPES, EASINGS, PRESETS } from "./editorConstants";

export type AnimationPatch = Pick<Page, "preset" | "easing" | "enterDelay" | "stagger" | "textEffect" | "countUp" | "animDuration" | "exitPreset">;

interface AnimationControlsProps {
  page: Page;
  onPatch: (patch: Partial<AnimationPatch>) => void;
  /** 入场类改动的预览：先应用 patch，再从当前页开头重播 */
  onPreviewEnter: (apply: () => void) => void;
  /** 退场类改动的预览：先应用 patch，再跳到页面结束前播放 */
  onPreviewExit: (apply: () => void) => void;
}

/** 检查器「动画」页签：预设 / 入退场 / 时序 / 缓动 / 特效参数 */
export const AnimationControls = ({ page, onPatch, onPreviewEnter, onPreviewExit }: AnimationControlsProps) => {
  const animDuration = page.animDuration ?? 0.72;
  const isRecipeActive = (recipe: typeof ANIMATION_RECIPES[number]) =>
    page.preset === recipe.preset
    && page.easing === recipe.easing
    && Math.abs(page.stagger - recipe.stagger) < 0.001
    && Math.abs(animDuration - recipe.animDuration) < 0.001;
  return (
    <>
      <Section title="动画预设" note="一键套用入场风格、缓动、层叠间隔与动画时长，下方仍可单独微调。">
        <ChipRow
          items={ANIMATION_RECIPES.map((recipe) => ({ id: recipe.id, label: recipe.label, active: isRecipeActive(recipe) }))}
          onSelect={(id) => {
            const recipe = ANIMATION_RECIPES.find((item) => item.id === id);
            if (recipe) {
              onPreviewEnter(() => onPatch({
                preset: recipe.preset,
                easing: recipe.easing,
                stagger: recipe.stagger,
                animDuration: recipe.animDuration,
              }));
            }
          }}/>
      </Section>
      <Section title="入场动画">
        <div className="effect-grid">
          {PRESETS.map((preset) => (
            <button key={preset.id} className={`effect-tile ${page.preset === preset.id ? "is-active" : ""}`}
              onClick={() => onPreviewEnter(() => onPatch({ preset: preset.id }))}>
              <span className={`effect-thumb ${preset.id}`}><i>Aa</i></span>
              <span className="effect-name">{preset.label}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="退场动画" note="退场发生在页面结束前，时长与下方动画时长一致；切换后自动从退场位置预览。">
        <LabeledSelect label="退场风格" value={page.exitPreset ?? "none"}
          options={[{ value: "none", label: "无退场" }, ...PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))]}
          onChange={(value) => onPreviewExit(() => onPatch({ exitPreset: value as Page["exitPreset"] }))}/>
      </Section>
      <Section title="动画时长">
        <FieldRow label="单次动画" unit="s">
          <NumberField value={Number(animDuration.toFixed(2))} min={0.2} max={2} step={0.05}
            onInput={(raw) => onPatch({ animDuration: Math.min(2, Math.max(0.2, Number(raw) || 0.72)) })}/>
        </FieldRow>
      </Section>
      <Section title="入场时序" note="入场延迟为第一个图层出现前的等待时间；图层间隔控制后续图层依次入场的节奏。">
        <FieldRow label="入场延迟" unit="s">
          <NumberField value={page.enterDelay} min={0} step={0.1}
            onInput={(raw) => onPatch({ enterDelay: Math.max(0, Number(raw) || 0) })}/>
        </FieldRow>
        <FieldRow label="图层间隔" unit="s">
          <NumberField value={page.stagger} min={0} step={0.01}
            onInput={(raw) => onPatch({ stagger: Math.max(0, Number(raw) || 0) })}/>
        </FieldRow>
      </Section>
      <Section title="缓动曲线">
        <ChipRow
          items={EASINGS.map((easing) => ({ id: easing.id, label: easing.label, active: page.easing === easing.id }))}
          onSelect={(id) => {
            const easing = EASINGS.find((item) => item.id === id);
            if (easing) onPreviewEnter(() => onPatch({ easing: easing.id }));
          }}/>
      </Section>
      <Section title="特效参数" note="数字滚动只作用于内容中的第一段数字；自定义图层还可单独开启。">
        <ChipRow
          items={[
            { id: "countUp", label: "数字滚动", active: page.countUp },
            { id: "typewriter", label: "逐字打字机", active: page.textEffect === "typewriter" },
          ]}
          onSelect={(id) => {
            if (id === "countUp") onPreviewEnter(() => onPatch({ countUp: !page.countUp }));
            else onPreviewEnter(() => onPatch({ textEffect: page.textEffect === "typewriter" ? "none" : "typewriter" }));
          }}/>
      </Section>
    </>
  );
};
