/**
 * 页面缩略图：用真实渲染器在「动画播完」的定格时刻绘制该页面，所见即所得。
 * 先在离屏画布按设计稿分辨率渲染，再缩到小画布，避免每个缩略图占用整张画布内存。
 */
import { useEffect, useRef } from "react";
import type { Project } from "../../model/project";
import { pageSettleTime } from "../../model/project";
import { drawProjectFrame } from "../../engine/renderer";

export function PageThumb({ project, index, fontsReady, className }: {
  project: Project;
  index: number;
  fontsReady: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const target = canvas?.getContext("2d");
    if (!canvas || !target) return;
    const page = project.pages[index];
    if (!page) return;
    const previewProject: Project = { ...project, pages: [page] };
    const off = document.createElement("canvas");
    const ctx = off.getContext("2d");
    if (!ctx) return;
    drawProjectFrame(ctx, previewProject, pageSettleTime(previewProject, 0));
    canvas.width = Math.round(off.width / 6);
    canvas.height = Math.round(off.height / 6);
    target.clearRect(0, 0, canvas.width, canvas.height);
    target.drawImage(off, 0, 0, canvas.width, canvas.height);
  }, [project, index, fontsReady]);
  return <canvas ref={ref} className={className} aria-hidden="true"/>;
}
