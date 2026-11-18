import { useRef } from "react";
import type { PointerEvent } from "react";
import type { Layer, Page, Project } from "../model/project";

interface TimelineDragOptions {
  project: Project;
  active: Page;
  /** 按下轨道时选中图层（含暂停 / 对齐播放头 / 切换轨道视图） */
  selectLayer: (layer: Layer) => void;
  /** 拖拽期间的直接写入（不记历史） */
  updateLayerDirect: (layerId: string, patch: Partial<Layer>) => void;
  /** 拖拽结束补历史：传入拖拽开始前的项目快照 */
  commitBefore: (before: Project) => void;
}

/** 时间轴轨道拖拽：整段移动 / 调整入场 / 调整时长，最小值钳制后直接写入，结束时补一次历史 */
export function useTimelineDrag(options: TimelineDragOptions) {
  const { project, active, selectLayer, updateLayerDirect, commitBefore } = options;
  const timelineDragRef = useRef<{
    id: string; mode: "move" | "start" | "end"; startX: number; trackWidth: number;
    enterDelay: number; duration: number; before: Project; moved: boolean;
  } | null>(null);

  const startTimelineDrag = (
    event: PointerEvent<HTMLElement>,
    layer: Layer,
    mode: "move" | "start" | "end"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    selectLayer(layer);
    const rail = event.currentTarget.closest(".track-rail");
    const trackWidth = rail?.getBoundingClientRect().width ?? 1;
    event.currentTarget.setPointerCapture(event.pointerId);
    timelineDragRef.current = {
      id: layer.id,
      mode,
      startX: event.clientX,
      trackWidth,
      enterDelay: layer.enterDelay,
      duration: layer.duration,
      before: project,
      moved: false,
    };
  };

  const dragTimelineLayer = (event: PointerEvent<HTMLElement>) => {
    const drag = timelineDragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.startX) / drag.trackWidth * active.duration;
    let enterDelay = drag.enterDelay;
    let duration = drag.duration;
    if (drag.mode === "move") {
      enterDelay = Math.min(active.duration - duration, Math.max(0, drag.enterDelay + delta));
    } else if (drag.mode === "start") {
      const end = drag.enterDelay + drag.duration;
      enterDelay = Math.min(end - 0.2, Math.max(0, drag.enterDelay + delta));
      duration = end - enterDelay;
    } else {
      duration = Math.min(active.duration - enterDelay, Math.max(0.2, drag.duration + delta));
    }
    drag.moved = true;
    updateLayerDirect(drag.id, { enterDelay, duration });
  };

  const endTimelineDrag = () => {
    const drag = timelineDragRef.current;
    if (drag?.moved) {
      commitBefore(drag.before);
    }
    timelineDragRef.current = null;
  };

  return { startTimelineDrag, dragTimelineLayer, endTimelineDrag };
}
