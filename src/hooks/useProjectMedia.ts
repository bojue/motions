import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../model/project";
import { preloadProjectMedia, subscribeMedia, syncVideoTime } from "../engine/renderer";

/** 项目素材与音频同步：字体就绪、媒体加载计数、视频帧定位与背景音乐播放 */
export function useProjectMedia(project: Project, time: number, playing: boolean) {
  const [fontsReady, setFontsReady] = useState(false);
  /** 素材加载完成计数：图片/视频加载后触发画布重绘。 */
  const [mediaTick, setMediaTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) setFontsReady(true); });
    return () => { alive = false; };
  }, []);

  /** 订阅图片 / 视频加载完成事件，暂停状态也能把素材绘制出来 */
  useEffect(() => subscribeMedia(() => setMediaTick((value) => value + 1)), []);

  /** 预载项目内的图片和视频素材 */
  useEffect(() => {
    preloadProjectMedia(project);
  }, [project]);

  const hasVideo = useMemo(
    () => project.pages.some((page) => page.layers.some((layer) => layer.kind === "video" && layer.src)),
    [project]
  );

  /** 视频图层时间同步：拖动进度条或播放时按当前页内时间定位视频帧 */
  useEffect(() => {
    if (!hasVideo) return;
    let alive = true;
    syncVideoTime(project, time).then(() => {
      if (alive) setMediaTick((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, [hasVideo, project, time]);

  /** 背景音乐预览：与编辑时间轴同步播放 / 暂停 */
  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    element.volume = Math.min(1, Math.max(0, project.audio?.volume ?? 0.6));
    if (!project.audio?.src) {
      element.pause();
      return;
    }
    if (!playing) {
      element.pause();
      if (Math.abs(element.currentTime - time) > 0.1) {
        try { element.currentTime = Math.min(time, element.duration || time); } catch { /* 元数据未就绪 */ }
      }
      return;
    }
    if (element.paused) {
      try { element.currentTime = time; } catch { /* 元数据未就绪 */ }
      element.play().catch(() => {});
    } else if (Math.abs(element.currentTime - time) > 0.45) {
      element.currentTime = time;
    }
  }, [playing, project.audio?.src, project.audio?.volume, time]);

  return { fontsReady, mediaTick, audioRef };
}
