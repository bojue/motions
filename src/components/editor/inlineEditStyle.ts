import type React from "react";
import type { Layer, Page } from "../../model/project";
import type { Box } from "../../engine/renderer";
import { defaultLayerFontSize } from "./layerUtils";
import { MAX_PILL_WIDTH, measurePillTextWidth } from "../../lib/pillText";

/** 内联编辑输入框的字体样式：字号/字重/行距/对齐与画布渲染规则保持一致（factor = 画布显示缩放） */
export const editFontStyle = (layer: Layer, box: Box, page: Page, factor: number): React.CSSProperties => {
  // 与画布缩放逻辑一致：字号按图层横纵缩放的几何均值换算为屏幕像素
  const size = (layer.fontSize ?? defaultLayerFontSize(layer, page)) * Math.sqrt(Math.abs(layer.scaleX * layer.scaleY)) * factor;
  const centered = page.layout === "cta";
  const boxHeight = `${box.h * factor}px`;
  if (layer.role === "custom" && layer.kind === "button") {
    return { fontSize: size, fontWeight: 700, lineHeight: boxHeight, textAlign: "center", color: "#ffffff", background: layer.color ?? page.theme.accent };
  }
  switch (layer.role) {
    case "title":
      return { fontSize: size, fontWeight: 800, lineHeight: 1.08, textAlign: centered ? "center" : "left", color: layer.color ?? page.theme.ink };
    case "subtitle":
      return { fontSize: size, fontWeight: 400, lineHeight: 1.6, textAlign: centered ? "center" : "left", color: layer.color ?? page.theme.muted };
    case "kicker":
      return { fontSize: size, fontWeight: 700, lineHeight: boxHeight, textAlign: centered ? "center" : "left", color: layer.color ?? page.theme.ink };
    case "quote":
      return { fontSize: size, fontWeight: 600, lineHeight: 1.55, color: layer.color ?? page.theme.ink };
    case "cta":
      return { fontSize: size, fontWeight: 700, lineHeight: boxHeight, textAlign: "center", color: "#ffffff", background: layer.color ?? page.theme.ink };
    default:
      return { fontSize: size, fontWeight: 700, lineHeight: 1.25, color: layer.color ?? page.theme.ink };
  }
};

/** 内联编辑按钮：输入框宽度随草稿文字实时扩展（只增不减），扩展时保持中心对齐 */
export const expandEditBox = (layer: Layer, box: Box, page: Page, draft: string): Box => {
  const isPill = layer.role === "cta" || (layer.role === "custom" && layer.kind === "button");
  if (!isPill) return box;
  const fontSize = layer.fontSize ?? defaultLayerFontSize(layer, page);
  const cap = MAX_PILL_WIDTH * Math.abs(layer.scaleX || 1);
  const fitted = Math.min(cap, measurePillTextWidth(draft, fontSize) * Math.abs(layer.scaleX || 1));
  if (fitted <= box.w) return box;
  return { ...box, x: box.x - (fitted - box.w) / 2, w: fitted };
};
