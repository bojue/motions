import { FONT_STACK } from "../engine/renderer";

/** 按钮胶囊文字测宽：与渲染端同款字体/字重/内边距（measureText + 118），保证测量结果和画布一致 */
const PILL_TEXT_PAD = 118;
export const MAX_PILL_WIDTH = 1040;
const measureCanvas = document.createElement("canvas");
export const measurePillTextWidth = (content: string, fontSize: number) => {
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  const lines = content.split("\n");
  return Math.max(...lines.map((line) => ctx.measureText(line).width)) + PILL_TEXT_PAD;
};
