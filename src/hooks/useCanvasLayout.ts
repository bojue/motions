import { useEffect, useMemo, useRef, useState } from "react";
import type { Layer } from "../model/project";
import type { Box } from "../engine/renderer";

/** 画布布局：stage 容器测量、适配缩放、zoom 与设计坐标 → 屏幕坐标换算 */
export function useCanvasLayout(natural: { width: number; height: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setAvailable({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = useMemo(() => {
    const width = available.width || 480;
    const height = available.height || 640;
    return Math.min(width / natural.width, height / natural.height, 1);
  }, [available, natural]);
  const displayWidth = natural.width * fitScale * (zoom / 100);
  const displayHeight = natural.height * fitScale * (zoom / 100);
  // 渲染端已按画幅使用独立设计尺寸，画布坐标与设计坐标 1:1 对应
  const designScale = 1;
  const screenScale = displayWidth / natural.width;
  const designOffsetX = 0;
  const designOffsetY = 0;
  /** 自定义图层以 9:16 坐标存储，非竖屏画幅在渲染端按高度比例映射，拖拽时需反向换算 */
  const customYScale = natural.height / 1920;
  const boxStyle = (box: Box, layer: Layer): React.CSSProperties => ({
    left: (designOffsetX + box.x * designScale) * screenScale,
    top: (designOffsetY + box.y * designScale) * screenScale,
    width: box.w * designScale * screenScale,
    height: box.h * designScale * screenScale,
    transform: `rotate(${layer.rotation}deg)`,
  });

  return {
    stageRef, zoom, setZoom, fitScale, displayWidth, displayHeight,
    designScale, screenScale, designOffsetX, designOffsetY, customYScale, boxStyle,
  };
}
