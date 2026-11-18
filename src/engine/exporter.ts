import type { Project } from "../model/project";
import { RATIO_SIZE, totalDuration } from "../model/project";
import { drawProjectFrame, preloadProjectMedia, syncVideoTime } from "./renderer";

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function exportProject(
  project: Project,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; extension: string }> {
  const mime = pickMimeType();
  if (!mime) {
    throw new Error("当前浏览器不支持视频录制，请使用 Chrome 或 Edge。");
  }

  await document.fonts?.ready;
  // 先预载图片 / 视频，避免导出首帧空白
  await preloadProjectMedia(project);

  const { width, height } = RATIO_SIZE[project.ratio];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建渲染画布");

  const fps = 30;
  const stream = canvas.captureStream(fps);

  // 背景音乐混流：AudioBufferSource → MediaStreamDestination → 加入录制流
  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  if (project.audio?.src) {
    try {
      audioCtx = new AudioContext();
      const response = await fetch(project.audio.src);
      const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
      const destination = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = Math.min(1, Math.max(0, project.audio.volume ?? 0.6));
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = buffer;
      audioSource.loop = true;
      audioSource.connect(gain).connect(destination);
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      await audioCtx.resume();
      audioSource.start();
    } catch (error) {
      console.warn("背景音乐加载失败，将导出无声视频", error);
      audioSource?.stop();
      audioSource = null;
      await audioCtx?.close();
      audioCtx = null;
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 16_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);

  const duration = Math.max(0.1, totalDuration(project));
  const frames = Math.max(1, Math.ceil(duration * fps));
  const frameInterval = 1000 / fps;

  for (let frame = 0; frame <= frames; frame += 1) {
    const frameStart = performance.now();
    const time = Math.min(duration, frame / fps);
    if (project.pages.some((page) => page.layers.some((layer) => layer.kind === "video" && layer.src))) {
      await syncVideoTime(project, time);
    }
    drawProjectFrame(ctx, project, time);
    onProgress?.(frame / frames);
    const elapsed = performance.now() - frameStart;
    await sleep(Math.max(0, frameInterval - elapsed));
  }

  // 给编码器留出最后一帧的缓冲时间
  await sleep(200);
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  audioSource?.stop();
  await audioCtx?.close();

  return {
    blob: new Blob(chunks, { type: mime }),
    extension: mime.includes("mp4") ? "mp4" : "webm",
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
