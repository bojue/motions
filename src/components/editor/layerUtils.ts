import type { Layer, Page } from "../../model/project";
import type { IconName } from "../ui/Icon";

/** 版式中由文字构成的固定图层：缩放时改为驱动字号，而不是拉伸变换 */
const FIXED_TEXT_ROLES = new Set(["title", "subtitle", "kicker", "quote", "cta", "points"]);

export const isAdaptiveTextLayer = (layer: Layer) =>
  layer.role === "custom" ? layer.kind !== "shape" : FIXED_TEXT_ROLES.has(layer.role);

/** 画布内联编辑：可双击直接改文字的图层（自定义文本/按钮 + 版式固定文本角色） */
const EDITABLE_TEXT_ROLES = new Set(["title", "subtitle", "kicker", "quote", "cta", "points", "brand", "author", "price", "card"]);
export const isEditableTextLayer = (layer: Layer) =>
  (layer.role === "custom" && (layer.kind === "text" || layer.kind === "button")) ||
  EDITABLE_TEXT_ROLES.has(layer.role);

/** 顶部快捷配置条：支持调节字号的图层角色（版式固定文本 + 自定义文本/按钮） */
const TEXT_STYLE_ROLES = ["title", "subtitle", "kicker", "quote", "points", "cta"];
export const supportsTextStyle = (layer: Layer) =>
  (layer.role === "custom" && (layer.kind === "text" || layer.kind === "button")) ||
  TEXT_STYLE_ROLES.includes(layer.role);

/** 字号未显式设置时，回退到该版式角色的渲染默认值，保证配置条显示与画布一致 */
export const defaultLayerFontSize = (layer: Layer, page: Page) => {
  if (layer.role === "title") {
    return page.layout === "price" ? 96 : page.layout === "quote" ? 92 : page.layout === "cta" ? 104 : 106;
  }
  if (layer.role === "cta") return page.layout === "cta" ? 36 : 33;
  if (layer.role === "subtitle") return 32;
  if (layer.role === "kicker") return 27;
  if (layer.role === "quote") return 56;
  if (layer.role === "points") return 30;
  return layer.kind === "button" ? 40 : 64;
};

export const defaultLayerColor = (layer: Layer, page: Page) => {
  if (layer.role === "subtitle" || layer.role === "points") return page.theme.muted;
  if (layer.kind === "shape" || (layer.role === "custom" && layer.kind === "button")) return page.theme.accent;
  return page.theme.ink;
};

/** 图层类型对应图标：图片 / 视频使用专属图标，避免在时间轴与图层面板中混淆 */
export const layerIcon = (layer: Layer): IconName => {
  if (layer.kind === "text") return "text";
  if (layer.kind === "button") return "button";
  if (layer.kind === "shape") return "shape";
  if (layer.kind === "image") return "image";
  if (layer.kind === "video") return "play";
  return "layers";
};
