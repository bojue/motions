import { useRef } from "react";
import type { PointerEvent } from "react";
import type { Layer, Page, Project } from "../model/project";
import type { Box } from "../engine/renderer";
import { defaultLayerFontSize, isAdaptiveTextLayer } from "../components/editor/layerUtils";

interface LayerDragOptions {
  project: Project;
  active: Page;
  layerBounds: Record<string, Box>;
  natural: { width: number; height: number };
  designScale: number;
  screenScale: number;
  customYScale: number;
  /** 拖拽期间的直接写入（不记历史） */
  updateLayerDirect: (layerId: string, patch: Partial<Layer>) => void;
  /** 拖拽结束补历史：传入拖拽开始前的项目快照 */
  commitBefore: (before: Project) => void;
  pause: () => void;
  setSelectedLayerId: (id: string | null) => void;
}

/** 画布图层拖拽：移动 / 缩放 / 旋转，按下记录起点与图元，拖拽中直接写入，结束时补一次历史 */
export function useLayerDrag(options: LayerDragOptions) {
  const {
    project, active, layerBounds, natural,
    designScale, screenScale, customYScale,
    updateLayerDirect, commitBefore, pause, setSelectedLayerId,
  } = options;
  const dragRef = useRef<{
    id: string; mode: "move" | "resize" | "rotate"; handle?: string;
    startX: number; startY: number; layerX: number; layerY: number;
    scaleX: number; scaleY: number; rotation: number; bounds: Box;
    width: number; height: number; fontSize: number; adaptFont: boolean;
    custom: boolean; centered: boolean; baseY: number;
    centerClientX: number; centerClientY: number; startAngle: number;
    before: Project; moved: boolean;
  } | null>(null);

  const startLayerInteraction = (
    event: PointerEvent<HTMLElement>,
    layer: Layer,
    mode: "move" | "resize" | "rotate",
    handle?: string
  ) => {
    event.stopPropagation();
    event.preventDefault();
    pause();
    setSelectedLayerId(layer.id);
    if (layer.locked) return;
    const rect = (event.currentTarget.closest(".layer-hitbox") ?? event.currentTarget).getBoundingClientRect();
    const centerClientX = rect.left + rect.width / 2;
    const centerClientY = rect.top + rect.height / 2;
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = layerBounds[layer.id] ?? { x: 0, y: 0, w: layer.width, h: layer.height };
    dragRef.current = {
      id: layer.id,
      mode,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      layerX: layer.x,
      layerY: layer.y,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      rotation: layer.rotation,
      bounds,
      width: layer.width,
      height: layer.height,
      // 以当前视觉有效字号为基准（兼容旧数据中已被 scaleX/scaleY 拉伸过的图层）
      fontSize: (layer.fontSize ?? defaultLayerFontSize(layer, active)) * Math.sqrt(Math.abs(layer.scaleX * layer.scaleY)),
      adaptFont: isAdaptiveTextLayer(layer),
      custom: layer.role === "custom",
      // cta 版式的文本居中排布，水平方向不按边缘锚定
      centered: layer.role !== "quote" && active.layout === "cta",
      // 自定义图层的绘制基准顶部（y=0），用于按边缘锚定反推 y 偏移
      baseY: layer.role === "custom"
        ? bounds.y - layer.y * customYScale - layer.height / 2 + (layer.height * layer.scaleY) / 2
        : bounds.y - layer.y - layer.height / 2 + (layer.height * layer.scaleY) / 2,
      centerClientX,
      centerClientY,
      startAngle: Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX),
      before: project,
      moved: false,
    };
  };

  const dragLayer = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const factor = designScale * screenScale;
    let patch: Partial<Layer>;
    if (drag.mode === "rotate") {
      const angle = Math.atan2(event.clientY - drag.centerClientY, event.clientX - drag.centerClientX);
      patch = { rotation: Math.round((drag.rotation + (angle - drag.startAngle) * 180 / Math.PI) * 10) / 10 };
    } else if (drag.mode === "resize") {
      const dx = (event.clientX - drag.startX) / factor;
      const dy = (event.clientY - drag.startY) / factor;
      const signX = drag.handle?.includes("w") ? -1 : 1;
      const signY = drag.handle?.includes("n") ? -1 : 1;
      if (drag.adaptFont) {
        // 文本类图层：拖拽直接驱动字号，换行与行距随新区域自适应，避免文字被拉伸变形
        const baseW = Math.max(1, drag.bounds.w);
        const baseH = Math.max(1, drag.bounds.h);
        const nextW = Math.max(80, drag.bounds.w + dx * signX);
        const nextH = Math.max(40, drag.bounds.h + dy * signY);
        const factor2 = Math.sqrt((nextW / baseW) * (nextH / baseH));
        const nextFontSize = Math.min(400, Math.max(12, drag.fontSize * factor2));
        const fontFactor = nextFontSize / drag.fontSize;
        if (drag.custom) {
          // 自定义图层：宽高与字号同步改写，按拖拽对侧边缘锚定反推 x/y 偏移
          const nextWidth = Math.max(40, drag.width * drag.scaleX * (nextW / baseW));
          const nextHeight = Math.max(40, drag.height * drag.scaleY * (nextH / baseH));
          const baseX = (natural.width - nextWidth) / 2;
          const nextX = drag.handle?.includes("w")
            ? drag.bounds.x + drag.bounds.w - nextWidth - baseX
            : drag.bounds.x - baseX;
          const nextY = (drag.handle?.includes("n")
            ? drag.bounds.y + drag.bounds.h - nextHeight - drag.baseY
            : drag.bounds.y - drag.baseY) / customYScale;
          patch = {
            width: Math.round(nextWidth),
            height: Math.round(nextHeight),
            fontSize: Math.round(nextFontSize),
            scaleX: 1,
            scaleY: 1,
            x: Math.round(nextX),
            y: Math.round(nextY),
          };
        } else {
          // 版式固定文本：字号驱动排版（行距按字号自适应），拖拽对侧边缘保持不动
          const growW = drag.bounds.w * fontFactor - drag.bounds.w;
          const growH = drag.bounds.h * fontFactor - drag.bounds.h;
          patch = {
            fontSize: Math.round(nextFontSize),
            scaleX: 1,
            scaleY: 1,
            x: drag.handle?.includes("w") && !drag.centered ? Math.round(drag.layerX - growW) : drag.layerX,
            y: drag.handle?.includes("n") ? Math.round(drag.layerY - growH) : drag.layerY,
          };
        }
      } else {
        patch = {
          scaleX: Math.max(0.1, drag.scaleX * (drag.bounds.w + dx * signX) / Math.max(1, drag.bounds.w)),
          scaleY: Math.max(0.1, drag.scaleY * (drag.bounds.h + dy * signY) / Math.max(1, drag.bounds.h)),
        };
      }
    } else {
      patch = {
        x: drag.layerX + (event.clientX - drag.startX) / factor,
        y: drag.layerY + (event.clientY - drag.startY) / factor / (drag.custom ? customYScale : 1),
      };
    }
    drag.moved = true;
    updateLayerDirect(drag.id, patch);
  };

  const endLayerDrag = () => {
    const drag = dragRef.current;
    if (drag?.moved) {
      commitBefore(drag.before);
    }
    dragRef.current = null;
  };

  return { startLayerInteraction, dragLayer, endLayerDrag };
}
