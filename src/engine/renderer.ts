import type {
  AnimationPreset,
  EasingKind,
  Project,
  Page,
  Layer,
  Ratio,
  Scene,
  SceneTheme,
} from "../model/project";
import { RATIO_SIZE, sceneIndexAt, sceneStart } from "../model/project";
import { clamp01, ease } from "./easing";

type Ctx = CanvasRenderingContext2D;
type NextAnim = (role?: string) => Anim;

export const FONT_STACK =
  '"Plus Jakarta Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const MONO_STACK = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

interface Anim {
  local: number;
  alpha: number;
  dx: number;
  dy: number;
  scale: number;
  scaleX: number;
  rotate: number;
  blur: number;
  wipe: number;
  progress: number;
  delay: number;
  layer?: Layer;
  bounds?: Record<string, Box>;
}

interface Typing {
  active: boolean;
  local: number;
  cursor: number;
  rate: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DesignSpec {
  W: number;
  H: number;
  padX: number;
  padTop: number;
  /** 非竖屏画幅空间更紧凑，文案与间距同步收缩 */
  compact: boolean;
}

/** 不同画幅使用各自的设计尺寸，避免把 9:16 版式直接塞进横屏造成大面积留白 */
const DESIGNS: Record<Ratio, DesignSpec> = {
  "9:16": { W: 1080, H: 1920, padX: 67, padTop: 62, compact: false },
  "16:9": { W: 1920, H: 1080, padX: 110, padTop: 52, compact: true },
  "1:1": { W: 1080, H: 1080, padX: 67, padTop: 48, compact: true },
};

const withAlpha = (hex: string, alpha: number) => {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** 相对亮度（0-1）：用于深色主题下的可读性判定 */
const luminanceOf = (hex: string) => {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** 亮底配深墨字、暗底配白字：深色主题下浅色表面（浅 ink 卡片、金色按钮）也能保持可读 */
const readableTextOn = (hex: string) => (luminanceOf(hex) > 0.55 ? "#141210" : "#ffffff");

/** 深色主题判定：按背景亮度切换表面色（数据卡底、轨道等） */
const isDarkTheme = (theme: SceneTheme) => luminanceOf(theme.bg) < 0.4;

/* ---------- 图片 / 视频素材缓存 ---------- */

interface MediaEntry {
  el: HTMLImageElement | HTMLVideoElement;
  kind: "image" | "video";
  ready: Promise<void>;
  loaded: boolean;
  failed: boolean;
}

const mediaCache = new Map<string, MediaEntry>();
const mediaListeners = new Set<() => void>();

/** 素材加载完成时通知视图重绘（编辑器暂停时也能立即显示图片）。 */
export function subscribeMedia(listener: () => void) {
  mediaListeners.add(listener);
  return () => {
    mediaListeners.delete(listener);
  };
}

const notifyMedia = () => mediaListeners.forEach((listener) => listener());

function ensureMedia(src: string, kind: "image" | "video"): MediaEntry | null {
  if (typeof document === "undefined" || !src) return null;
  const cached = mediaCache.get(src);
  if (cached) return cached;
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  if (kind === "video") {
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const entry: MediaEntry = { el: video, kind, ready, loaded: false, failed: false };
    video.addEventListener("loadeddata", () => {
      entry.loaded = true;
      resolveReady();
      notifyMedia();
    }, { once: true });
    video.addEventListener("error", () => {
      entry.failed = true;
      resolveReady();
      notifyMedia();
    }, { once: true });
    video.load();
    mediaCache.set(src, entry);
    return entry;
  }
  const image = new Image();
  const entry: MediaEntry = { el: image, kind, ready, loaded: false, failed: false };
  image.onload = () => {
    entry.loaded = true;
    resolveReady();
    notifyMedia();
  };
  image.onerror = () => {
    entry.failed = true;
    resolveReady();
    notifyMedia();
  };
  image.src = src;
  mediaCache.set(src, entry);
  return entry;
}

/** 预载项目中所有图片 / 视频，导出前调用，避免首帧空白。 */
export async function preloadProjectMedia(project: Project): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const page of project.pages) {
    for (const layer of page.layers) {
      if (!layer.src || (layer.kind !== "image" && layer.kind !== "video")) continue;
      const entry = ensureMedia(layer.src, layer.kind);
      if (entry) jobs.push(entry.ready);
    }
  }
  await Promise.all(jobs);
}

/** 将页内视频定位到当前时间（导出逐帧渲染时保证画面同步）。 */
export async function syncVideoTime(project: Project, time: number): Promise<void> {
  const index = sceneIndexAt(project, time);
  const page = project.pages[index];
  if (!page) return;
  const local = Math.max(0, Math.min(page.duration, time - sceneStart(project, index)));
  const jobs: Promise<void>[] = [];
  for (const layer of page.layers) {
    if (layer.kind !== "video" || !layer.src) continue;
    const entry = ensureMedia(layer.src, "video");
    if (!entry) continue;
    const video = entry.el as HTMLVideoElement;
    if (!entry.loaded) {
      jobs.push(entry.ready);
      continue;
    }
    const duration = Number.isFinite(video.duration) ? video.duration : local;
    const target = Math.min(Math.max(0, local), Math.max(0, duration - 0.04));
    if (Math.abs(video.currentTime - target) < 0.02) continue;
    jobs.push(new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      window.setTimeout(done, 240);
      try {
        video.currentTime = target;
      } catch {
        done();
      }
    }));
  }
  await Promise.all(jobs);
}

/** 按 cover / contain 绘制图片或视频，未就绪时绘制占位提示。 */
function paintMedia(ctx: Ctx, layer: Layer, box: Box, theme: SceneTheme) {
  const entry = ensureMedia(layer.src ?? "", layer.kind === "video" ? "video" : "image");
  if (!entry || !entry.loaded) {
    ctx.save();
    ctx.fillStyle = withAlpha(theme.ink, 0.08);
    roundedPath(ctx, box.x, box.y, box.w, box.h, 24);
    ctx.fill();
    ctx.fillStyle = withAlpha(theme.ink, 0.4);
    ctx.font = `600 30px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entry?.failed ? "素材加载失败" : "素材加载中…", box.x + box.w / 2, box.y + box.h / 2);
    ctx.restore();
    return;
  }
  const el = entry.el;
  const naturalW =
    entry.kind === "video" ? (el as HTMLVideoElement).videoWidth : (el as HTMLImageElement).naturalWidth;
  const naturalH =
    entry.kind === "video" ? (el as HTMLVideoElement).videoHeight : (el as HTMLImageElement).naturalHeight;
  if (!naturalW || !naturalH) return;
  const scale =
    layer.fit === "contain"
      ? Math.min(box.w / naturalW, box.h / naturalH)
      : Math.max(box.w / naturalW, box.h / naturalH);
  const drawW = naturalW * scale;
  const drawH = naturalH * scale;
  ctx.save();
  roundedPath(ctx, box.x, box.y, box.w, box.h, 24);
  ctx.clip();
  try {
    ctx.drawImage(el, box.x + (box.w - drawW) / 2, box.y + (box.h - drawH) / 2, drawW, drawH);
  } catch {
    /* 视频尚未解码出首帧时跳过 */
  }
  ctx.restore();
}

function roundedPath(ctx: Ctx, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function animFor(
  local: number,
  delay: number,
  duration: number,
  preset: AnimationPreset,
  easing: EasingKind
): Anim {
  const progress = clamp01((local - delay) / Math.max(0.01, duration));
  const eased = ease(easing, progress);
  const fade = clamp01(progress * 2.2);
  const base: Anim = {
    local,
    progress,
    delay,
    alpha: fade,
    dx: 0,
    dy: 0,
    scale: 1,
    scaleX: 1,
    rotate: 0,
    blur: 0,
    wipe: 1,
  };
  switch (preset) {
    case "spring":
      return { ...base, dy: (1 - eased) * 90, scale: 0.72 + 0.28 * eased };
    case "slide":
      return { ...base, dy: (1 - eased) * 140 };
    case "slideLeft":
      return { ...base, dx: (1 - eased) * -170 };
    case "slideRight":
      return { ...base, dx: (1 - eased) * 170 };
    case "drop":
      return { ...base, dy: (1 - eased) * -180, scale: 1.04 - 0.04 * eased };
    case "wipe":
      return { ...base, alpha: progress > 0 ? 1 : 0, wipe: eased };
    case "zoom":
      return { ...base, scale: 1.16 - 0.16 * eased };
    case "rotate":
      return {
        ...base,
        dy: (1 - eased) * 40,
        scale: 0.84 + 0.16 * eased,
        rotate: (1 - eased) * -0.34,
      };
    case "blur":
      return { ...base, blur: (1 - eased) * 18, scale: 1.04 - 0.04 * eased };
    case "flip":
      return { ...base, scaleX: 0.06 + 0.94 * eased, scale: 0.94 + 0.06 * eased };
  }
}

/** 退场动画：在可见窗口结束前的 duration 秒内，把入场位移 / 缩放反向叠加并淡出 */
function withExit(
  anim: Anim,
  local: number,
  end: number,
  preset: AnimationPreset | "none" | undefined,
  easing: EasingKind,
  duration: number
): Anim {
  if (!preset || preset === "none") return anim;
  const progress = clamp01((local - (end - duration)) / Math.max(0.01, duration));
  if (progress <= 0) return anim;
  const eased = ease(easing, progress);
  const fade = clamp01(progress * 1.8);
  const base: Anim = { ...anim, alpha: anim.alpha * (1 - fade) };
  switch (preset) {
    case "spring":
      return { ...base, dy: anim.dy + eased * 80, scale: anim.scale * (1 - 0.2 * eased) };
    case "slide":
      return { ...base, dy: anim.dy + eased * 130 };
    case "slideLeft":
      return { ...base, dx: anim.dx - eased * 160 };
    case "slideRight":
      return { ...base, dx: anim.dx + eased * 160 };
    case "drop":
      return { ...base, dy: anim.dy + eased * 170, scale: anim.scale * (1 - 0.03 * eased) };
    case "wipe":
      return { ...base, alpha: anim.alpha, wipe: anim.wipe * (1 - eased) };
    case "zoom":
      return { ...base, scale: anim.scale * (1 + 0.16 * eased) };
    case "rotate":
      return {
        ...base,
        dy: anim.dy + eased * 40,
        scale: anim.scale * (1 - 0.16 * eased),
        rotate: anim.rotate + eased * 0.34,
      };
    case "blur":
      return { ...base, blur: anim.blur + eased * 18, scale: anim.scale * (1 + 0.04 * eased) };
    case "flip":
      return { ...base, scaleX: anim.scaleX * (1 - 0.94 * eased), scale: anim.scale * (1 - 0.06 * eased) };
  }
}

function animated(ctx: Ctx, anim: Anim, box: Box, paint: () => void) {
  const layer = anim.layer;
  if (layer?.visible === false) return;
  if (layer && anim.local > layer.enterDelay + layer.duration) return;
  const { x, y, w, h } = box;
  const layerScaleX = layer?.scaleX ?? 1;
  const layerScaleY = layer?.scaleY ?? 1;
  if (layer && anim.bounds) {
    const scaledW = w * Math.abs(layerScaleX);
    const scaledH = h * Math.abs(layerScaleY);
    const centerX = x + w / 2 + layer.x;
    const centerY = y + h / 2 + layer.y;
    const next = { x: centerX - scaledW / 2, y: centerY - scaledH / 2, w: scaledW, h: scaledH };
    const previous = anim.bounds[layer.id];
    anim.bounds[layer.id] = previous
      ? {
          x: Math.min(previous.x, next.x),
          y: Math.min(previous.y, next.y),
          w: Math.max(previous.x + previous.w, next.x + next.w) - Math.min(previous.x, next.x),
          h: Math.max(previous.y + previous.h, next.y + next.h) - Math.min(previous.y, next.y),
        }
      : next;
  }
  if (anim.alpha <= 0 || layer?.opacity === 0) return;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.globalAlpha *= clamp01(anim.alpha * (layer?.opacity ?? 1));
  ctx.translate(cx + anim.dx + (layer?.x ?? 0), cy + anim.dy + (layer?.y ?? 0));
  if (anim.rotate || layer?.rotation) ctx.rotate(anim.rotate + (layer?.rotation ?? 0) * Math.PI / 180);
  ctx.scale(anim.scale * anim.scaleX * layerScaleX, anim.scale * layerScaleY);
  ctx.translate(-cx, -cy);
  if (anim.wipe < 1) {
    ctx.beginPath();
    ctx.rect(x - 2, y - 8, Math.max(0, (w + 4) * anim.wipe), h + 16);
    ctx.clip();
  }
  if (anim.blur > 0.2) ctx.filter = `blur(${anim.blur.toFixed(2)}px)`;
  paint();
  ctx.restore();
}

const typingRate = (scene: Scene) => Math.min(0.09, Math.max(0.02, scene.stagger * 0.45));

/** 打字机逐字显示；多个文本元素共用游标，保证按绘制顺序依次打完 */
function typedCount(typing: Typing, delay: number, length: number) {
  if (!typing.active) return length;
  const start = Math.max(delay, typing.cursor);
  const shown = Math.floor(Math.max(0, typing.local - start) / typing.rate);
  typing.cursor = start + length * typing.rate;
  return Math.min(length, Math.max(0, shown));
}

/** 打字机模式下文字只做逐字显示，不再叠加预设的位移/缩放/淡入 */
const typedAnim = (anim: Anim): Anim => ({
  ...anim,
  alpha: 1,
  dx: 0,
  dy: 0,
  scale: 1,
  scaleX: 1,
  rotate: 0,
  blur: 0,
  wipe: 1,
});

/** 让字符串里的第一段数字按进度滚动，其余字符（¥、%、单位等）保持不变 */
function formatCount(raw: string, progress: number): string {
  const match = raw.match(/\d+(?:\.\d+)?/);
  if (!match) return raw;
  const start = match.index ?? 0;
  const decimals = match[0].includes(".") ? match[0].split(".")[1].length : 0;
  const text = (Number(match[0]) * clamp01(progress)).toFixed(decimals);
  return raw.slice(0, start) + text + raw.slice(start + match[0].length);
}

function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const char of paragraph) {
      const test = line + char;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function paintRichLine(
  ctx: Ctx,
  line: string,
  accent: string | undefined,
  x: number,
  y: number,
  color: string,
  accentColor: string,
  maxChars = Number.POSITIVE_INFINITY
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const parts: { text: string; color: string }[] = [];
  const index = accent ? line.indexOf(accent) : -1;
  if (!accent || index < 0) {
    parts.push({ text: line, color });
  } else {
    parts.push({ text: line.slice(0, index), color });
    parts.push({ text: accent, color: accentColor });
    parts.push({ text: line.slice(index + accent.length), color });
  }
  let remaining = maxChars;
  let cursor = x;
  for (const part of parts) {
    if (remaining <= 0) break;
    const text = part.text.slice(0, remaining);
    remaining -= text.length;
    if (!text) continue;
    ctx.fillStyle = part.color;
    ctx.fillText(text, cursor, y);
    cursor += ctx.measureText(text).width;
  }
}

/** 版式固定图层的样式覆盖：未显式设置时回退到版式默认值 */
const roleLayer = (page: Page, role: string) =>
  page.layers.find((item) => item.role === role);

/** 版式固定文本图层未设置字号时的渲染基准值（供编辑器展示与自适应缩放使用） */
export function baseFontSize(page: Page, role: string): number {
  switch (role) {
    case "kicker": return 27;
    case "title": return page.layout === "hero" ? 106 : page.layout === "price" ? 96 : page.layout === "quote" ? 92 : 104;
    case "subtitle": return 32;
    case "cta": return page.layout === "cta" ? 36 : 33;
    case "points": return 30;
    case "quote": return 56;
    default: return 64;
  }
}

function paintKicker(
  ctx: Ctx,
  page: Page,
  x: number,
  y: number,
  nextAnim: NextAnim,
  centered = false
): number {
  const label = page.content.kicker;
  if (!label) return 0;
  const layer = roleLayer(page, "kicker");
  const size = layer?.fontSize ?? 27;
  const textColor = layer?.color ?? page.theme.ink;
  ctx.font = `700 ${size}px ${FONT_STACK}`;
  const height = 58;
  const width = ctx.measureText(label).width + 78;
  const drawX = centered ? x - width / 2 : x;
  animated(ctx, nextAnim("kicker"), { x: drawX, y, w: width, h: height }, () => {
    ctx.fillStyle = withAlpha(page.theme.ink, 0.07);
    roundedPath(ctx, drawX, y, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = page.theme.accent;
    ctx.beginPath();
    ctx.arc(drawX + 27, y + height / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, drawX + 48, y + height / 2 + 1);
  });
  return height;
}

function paintTitleLines(
  ctx: Ctx,
  page: Page,
  x: number,
  y: number,
  opts: { size: number; lineHeight: number; maxWidth: number; align?: "left" | "center" },
  nextAnim: NextAnim,
  typing: Typing
): number {
  const lines = page.content.title.split("\n");
  const layer = roleLayer(page, "title");
  const size = layer?.fontSize ?? opts.size;
  const lineHeight = (size * opts.lineHeight) / opts.size;
  const color = layer?.color ?? page.theme.ink;
  ctx.font = `800 ${size}px ${FONT_STACK}`;
  let cursor = y;
  for (const line of lines) {
    const anim = nextAnim("title");
    const shown = typedCount(typing, anim.delay, line.length);
    const width = ctx.measureText(line).width;
    const drawX =
      opts.align === "center" ? x - width / 2 : x;
    animated(
      ctx,
      typing.active ? typedAnim(anim) : anim,
      { x: drawX, y: cursor, w: width, h: size * 1.08 },
      () =>
        paintRichLine(
          ctx,
          line,
          page.content.accent,
          drawX,
          cursor,
          color,
          page.theme.accent,
          shown
        )
    );
    cursor += lineHeight;
  }
  return cursor;
}

function paintSubtitle(
  ctx: Ctx,
  page: Page,
  x: number,
  y: number,
  maxWidth: number,
  nextAnim: NextAnim,
  opts: { size?: number; align?: "left" | "center"; color?: string } = {},
  typing?: Typing
): number {
  const text = page.content.subtitle;
  if (!text) return y;
  const layer = roleLayer(page, "subtitle");
  const size = layer?.fontSize ?? opts.size ?? 32;
  const color = layer?.color ?? opts.color ?? page.theme.muted;
  ctx.font = `400 ${size}px ${FONT_STACK}`;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = size * 1.6;
  let cursor = y;
  for (const line of lines) {
    const anim = nextAnim("subtitle");
    const shown = typing ? typedCount(typing, anim.delay, line.length) : line.length;
    const width = ctx.measureText(line).width;
    const drawX = opts.align === "center" ? x - width / 2 : x;
    animated(
      ctx,
      typing?.active ? typedAnim(anim) : anim,
      { x: drawX, y: cursor, w: width, h: size * 1.2 },
      () => {
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(line.slice(0, shown), drawX, cursor);
      }
    );
    cursor += lineHeight;
  }
  return cursor;
}

function paintCta(
  ctx: Ctx,
  page: Page,
  x: number,
  y: number,
  nextAnim: NextAnim,
  opts: { size?: number; height?: number; centered?: boolean } = {}
): number {
  const label = page.content.cta;
  if (!label) return 0;
  const layer = roleLayer(page, "cta");
  const size = layer?.fontSize ?? opts.size ?? 33;
  const height = Math.round((size / (opts.size ?? 33)) * (opts.height ?? 103));
  const background = layer?.color ?? page.theme.ink;
  ctx.font = `700 ${size}px ${FONT_STACK}`;
  const width = ctx.measureText(label).width + 118;
  const drawX = opts.centered ? x - width / 2 : x;
  animated(ctx, nextAnim("cta"), { x: drawX, y, w: width, h: height }, () => {
    ctx.fillStyle = background;
    roundedPath(ctx, drawX, y, width, height, height / 2);
    ctx.fill();
    const onCta = readableTextOn(background);
    ctx.fillStyle = onCta;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, drawX + 46, y + height / 2 + 1);
    const ax = drawX + width - 58;
    const ay = y + height / 2;
    ctx.strokeStyle = onCta;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(ax - 12, ay);
    ctx.lineTo(ax + 6, ay);
    ctx.moveTo(ax - 2, ay - 8);
    ctx.lineTo(ax + 6, ay);
    ctx.lineTo(ax - 2, ay + 8);
    ctx.stroke();
  });
  return height;
}

function paintPoints(
  ctx: Ctx,
  page: Page,
  x: number,
  y: number,
  maxWidth: number,
  nextAnim: NextAnim,
  opts: { size?: number; centered?: boolean } = {}
): number {
  const items = page.content.points ?? [];
  if (!items.length) return y;
  const layer = roleLayer(page, "points");
  const size = layer?.fontSize ?? opts.size ?? 30;
  const textColor = layer?.color ?? page.theme.muted;
  const dot = 34;
  const gapX = 28;
  const gapY = 22;
  ctx.font = `600 ${size}px ${FONT_STACK}`;

  interface RowItem {
    label: string;
    width: number;
  }
  const rows: RowItem[][] = [];
  let row: RowItem[] = [];
  let rowWidth = 0;
  for (const item of items) {
    const width = dot + 14 + ctx.measureText(item).width;
    if (row.length && rowWidth + gapX + width > maxWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    row.push({ label: item, width });
    rowWidth += (row.length > 1 ? gapX : 0) + width;
  }
  if (row.length) rows.push(row);

  let cursorY = y;
  for (const current of rows) {
    const totalWidth = current.reduce(
      (sum, item, index) => sum + item.width + (index ? gapX : 0),
      0
    );
    let cursorX = opts.centered ? x + (maxWidth - totalWidth) / 2 : x;
    for (const item of current) {
      const itemX = cursorX;
      animated(ctx, nextAnim("points"), { x: itemX, y: cursorY, w: item.width, h: dot }, () => {
        ctx.fillStyle = withAlpha(page.theme.accent, 0.14);
        ctx.beginPath();
        ctx.arc(itemX + dot / 2, cursorY + dot / 2, dot / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = page.theme.accent;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label, itemX + dot + 14, cursorY + dot / 2 + 1);
      });
      cursorX += item.width + gapX;
    }
    cursorY += dot + gapY;
  }
  return cursorY - gapY;
}

function paintCard(
  ctx: Ctx,
  scene: Scene,
  x: number,
  y: number,
  width: number,
  local: number,
  nextAnim: NextAnim
) {
  const card = scene.content.card;
  if (!card) return;
  const height = 156;
  const grow = ease("easeOut", clamp01((local - scene.enterDelay - 0.15) / 1.1));
  const value = scene.countUp !== false ? formatCount(card.value, grow) : card.value;
  animated(ctx, nextAnim("card"), { x, y, w: width, h: height }, () => {
    const dark = isDarkTheme(scene.theme);
    ctx.save();
    ctx.shadowColor = "rgba(20, 18, 16, 0.16)";
    ctx.shadowBlur = 38;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = dark ? withAlpha(scene.theme.ink, 0.06) : "rgba(255, 255, 255, 0.88)";
    roundedPath(ctx, x, y, width, height, 32);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = withAlpha(scene.theme.ink, dark ? 0.14 : 0.08);
    ctx.lineWidth = 2;
    roundedPath(ctx, x, y, width, height, 32);
    ctx.stroke();

    ctx.font = `700 26px ${FONT_STACK}`;
    ctx.fillStyle = scene.theme.muted;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(card.label, x + 36, y + 47);
    ctx.font = `500 30px ${MONO_STACK}`;
    ctx.fillStyle = scene.theme.ink;
    ctx.textAlign = "right";
    ctx.fillText(value, x + width - 36, y + 47);

    const barX = x + 36;
    const barY = y + 92;
    const barW = width - 72;
    const barH = 16;
    ctx.fillStyle = withAlpha(scene.theme.ink, 0.09);
    roundedPath(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
    const fillW = Math.max(barH, barW * (card.percent / 100) * grow);
    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    gradient.addColorStop(0, scene.theme.accent);
    gradient.addColorStop(1, scene.theme.accent2);
    ctx.fillStyle = gradient;
    roundedPath(ctx, barX, barY, fillW, barH, barH / 2);
    ctx.fill();
    ctx.textAlign = "left";
  });
}

function paintPriceCard(
  ctx: Ctx,
  scene: Scene,
  x: number,
  y: number,
  width: number,
  nextAnim: NextAnim
) {
  const price = scene.content.price;
  if (!price) return 0;
  const height = 300;
  const anim = nextAnim("price");
  const amount =
    scene.countUp !== false ? formatCount(price.amount, ease("easeOut", anim.progress)) : price.amount;
  animated(ctx, anim, { x, y, w: width, h: height }, () => {
    ctx.fillStyle = scene.theme.ink;
    roundedPath(ctx, x, y, width, height, 38);
    ctx.fill();

    ctx.save();
    roundedPath(ctx, x, y, width, height, 38);
    ctx.clip();
    const glow = ctx.createRadialGradient(x + width - 20, y + 20, 0, x + width - 20, y + 20, 320);
    glow.addColorStop(0, withAlpha(scene.theme.accent, 0.55));
    glow.addColorStop(1, withAlpha(scene.theme.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    ctx.font = `700 24px ${FONT_STACK}`;
    const badgeW = ctx.measureText(price.badge).width + 44;
    ctx.fillStyle = withAlpha(scene.theme.accent2, 0.95);
    roundedPath(ctx, x + 36, y + 32, badgeW, 46, 23);
    ctx.fill();
    ctx.fillStyle = readableTextOn(scene.theme.accent2);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(price.badge, x + 58, y + 56);

    // ink 反转卡片：浅色主题为深卡白字，深色主题为浅卡深字
    const onCard = readableTextOn(scene.theme.ink);
    ctx.font = `800 56px ${FONT_STACK}`;
    ctx.fillStyle = onCard;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("¥", x + 38, y + 196);

    ctx.font = `800 168px ${FONT_STACK}`;
    ctx.fillText(amount, x + 88, y + 214);
    // 用最终金额的宽度定位单位，避免滚动过程中数字位数变化导致抖动
    const amountWidth = ctx.measureText(price.amount).width;

    ctx.font = `500 34px ${FONT_STACK}`;
    ctx.fillStyle = withAlpha(onCard, 0.62);
    ctx.fillText(price.unit, x + 108 + amountWidth, y + 214);

    ctx.font = `500 26px ${FONT_STACK}`;
    ctx.fillStyle = withAlpha(onCard, 0.48);
    const originalWidth = ctx.measureText(price.original).width;
    ctx.fillText(price.original, x + 38, y + 262);
    ctx.strokeStyle = withAlpha(onCard, 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 254);
    ctx.lineTo(x + 40 + originalWidth, y + 254);
    ctx.stroke();
    ctx.textAlign = "left";
  });
  return height;
}

function drawHero(
  ctx: Ctx,
  page: Page,
  local: number,
  nextAnim: NextAnim,
  H: number,
  padX: number,
  padTop: number,
  contentW: number,
  typing: Typing,
  compact: boolean
) {
  let y = padTop + 42 + (compact ? 64 : 92);
  y += paintKicker(ctx, page, padX, y, nextAnim) + (compact ? 24 : 34);
  y = paintTitleLines(
    ctx,
    page,
    padX,
    y,
    { size: compact ? 86 : 106, lineHeight: compact ? 92 : 112, maxWidth: contentW },
    nextAnim,
    typing
  );
  y = paintSubtitle(ctx, page, padX, y + (compact ? 14 : 20), contentW * (compact ? 0.8 : 0.68), nextAnim, {}, typing) + (compact ? 18 : 24);
  y += paintCta(ctx, page, padX, y, nextAnim, compact ? { size: 30, height: 88 } : {});

  paintPoints(ctx, page, padX, y + (compact ? 44 : 76), contentW, nextAnim, compact ? { size: 26 } : {});
  paintCard(ctx, page, padX, H - (compact ? 36 : 54) - (compact ? 132 : 156), contentW, local, nextAnim);
}

function drawPrice(
  ctx: Ctx,
  page: Page,
  nextAnim: NextAnim,
  padX: number,
  padTop: number,
  contentW: number,
  typing: Typing,
  compact: boolean
) {
  let y = padTop + 42 + (compact ? 56 : 92);
  y += paintKicker(ctx, page, padX, y, nextAnim) + (compact ? 20 : 32);
  y = paintTitleLines(
    ctx,
    page,
    padX,
    y,
    { size: compact ? 80 : 96, lineHeight: compact ? 88 : 104, maxWidth: contentW },
    nextAnim,
    typing
  );
  y = paintSubtitle(ctx, page, padX, y + (compact ? 12 : 18), contentW * 0.8, nextAnim, {}, typing) + (compact ? 16 : 28);
  y += paintPriceCard(ctx, page, padX, y, contentW, nextAnim) + (compact ? 18 : 30);
  y = paintPoints(ctx, page, padX, y, contentW, nextAnim, compact ? { size: 26 } : {}) + (compact ? 20 : 34);
  paintCta(ctx, page, padX, y, nextAnim, compact ? { size: 30, height: 88 } : {});
}

function drawQuote(
  ctx: Ctx,
  page: Page,
  nextAnim: NextAnim,
  padX: number,
  padTop: number,
  contentW: number,
  typing: Typing,
  compact: boolean
) {
  const quote = page.content.quote;
  let y = padTop + 42 + (compact ? 56 : 92);
  y += paintKicker(ctx, page, padX, y, nextAnim) + (compact ? 20 : 32);
  y = paintTitleLines(
    ctx,
    page,
    padX,
    y,
    { size: compact ? 76 : 92, lineHeight: compact ? 84 : 100, maxWidth: contentW },
    nextAnim,
    typing
  );

  y += compact ? 28 : 54;
  const markLayer = roleLayer(page, "quoteMark");
  animated(ctx, nextAnim("quoteMark"), { x: padX, y: y - 30, w: 130, h: 150 }, () => {
    ctx.font = `800 ${compact ? 150 : 220}px ${FONT_STACK}`;
    ctx.fillStyle = withAlpha(markLayer?.color ?? page.theme.accent, 0.22);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("“", padX + 6, y - (compact ? 34 : 54));
  });
  y += compact ? 64 : 96;

  if (quote) {
    const quoteLayer = roleLayer(page, "quote");
    const size = quoteLayer?.fontSize ?? (compact ? 42 : 56);
    const quoteColor = quoteLayer?.color ?? page.theme.ink;
    ctx.font = `600 ${size}px ${FONT_STACK}`;
    const lines = wrapText(ctx, quote.text, contentW * 0.92);
    const lineHeight = size * 1.55;
    for (const line of lines) {
      const anim = nextAnim("quote");
      const shown = typedCount(typing, anim.delay, line.length);
      animated(
        ctx,
        typing.active ? typedAnim(anim) : anim,
        { x: padX, y, w: contentW, h: size * 1.3 },
        () => {
          ctx.fillStyle = quoteColor;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(line.slice(0, shown), padX, y);
        }
      );
      y += lineHeight;
    }
  }

  y += compact ? 20 : 42;
  animated(ctx, nextAnim("rating"), { x: padX, y, w: 260, h: 44 }, () => {
    ctx.font = `700 ${compact ? 28 : 34}px ${FONT_STACK}`;
    ctx.fillStyle = "#efa32c";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("★★★★★", padX, y);
  });
  y += compact ? 58 : 84;

  if (quote) {
    const avatar = compact ? 68 : 84;
    animated(ctx, nextAnim("author"), { x: padX, y, w: contentW, h: avatar }, () => {
      ctx.fillStyle = withAlpha(page.theme.accent, 0.14);
      ctx.beginPath();
      ctx.arc(padX + avatar / 2, y + avatar / 2, avatar / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = page.theme.accent;
      ctx.font = `800 38px ${FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(quote.author.slice(0, 1), padX + avatar / 2, y + avatar / 2 + 2);
      ctx.textAlign = "left";
      ctx.fillStyle = page.theme.ink;
      ctx.font = `700 34px ${FONT_STACK}`;
      ctx.fillText(quote.author, padX + avatar + 24, y + 28);
      ctx.fillStyle = page.theme.muted;
      ctx.font = `500 26px ${FONT_STACK}`;
      ctx.fillText(quote.role, padX + avatar + 24, y + 64);
    });
  }
}

function drawCta(
  ctx: Ctx,
  page: Page,
  nextAnim: NextAnim,
  W: number,
  H: number,
  padTop: number,
  contentW: number,
  typing: Typing,
  compact: boolean
) {
  const centerX = W / 2;
  let y = compact ? Math.max(padTop + 120, H * 0.16) : Math.max(padTop + 300, H * 0.24);
  y += paintKicker(ctx, page, centerX, y, nextAnim, true) + (compact ? 30 : 44);
  y = paintTitleLines(
    ctx,
    page,
    centerX,
    y,
    { size: compact ? 86 : 104, lineHeight: compact ? 92 : 112, maxWidth: contentW, align: "center" },
    nextAnim,
    typing
  );
  y = paintSubtitle(
    ctx,
    page,
    centerX,
    y + (compact ? 16 : 22),
    contentW * 0.7,
    nextAnim,
    { align: "center", size: compact ? 27 : 32 },
    typing
  );
  y += compact ? 30 : 44;
  y += paintCta(ctx, page, centerX, y, nextAnim, compact ? { size: 32, height: 100, centered: true } : { size: 36, height: 120, centered: true });
  paintPoints(ctx, page, centerX - contentW / 2, y + (compact ? 46 : 70), contentW, nextAnim, {
    centered: true,
    size: compact ? 26 : 30,
  });
}

function drawChrome(
  ctx: Ctx,
  scene: Scene,
  nextAnim: NextAnim,
  padX: number,
  padTop: number,
  contentW: number
) {
  animated(ctx, nextAnim("brand"), { x: padX, y: padTop, w: contentW, h: 44 }, () => {
    ctx.fillStyle = scene.theme.ink;
    roundedPath(ctx, padX, padTop + 2, 40, 40, 13);
    ctx.fill();
    ctx.fillStyle = scene.theme.ink;
    ctx.font = `700 29px ${FONT_STACK}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText((scene.content.brand || "MOTIONCRAFT").toUpperCase(), padX + 54, padTop + 23);
  });
  animated(ctx, nextAnim("brand"), { x: padX, y: padTop, w: contentW, h: 44 }, () => {
    ctx.font = `500 26px ${MONO_STACK}`;
    ctx.fillStyle = scene.theme.muted;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("2026", padX + contentW, padTop + 23);
    ctx.textAlign = "left";
  });
}

function paintBackdrop(ctx: Ctx, scene: Scene, local: number, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, scene.theme.bg);
  gradient.addColorStop(1, scene.theme.bg2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const size = Math.min(w, h);
  const blobA = {
    x: w * 0.9 + Math.sin(local * 0.7) * 12,
    y: h * 0.28 + Math.cos(local * 0.5) * 14,
    r: size * 0.3,
  };
  const blobB = {
    x: w * 0.08 + Math.cos(local * 0.6) * 12,
    y: h * 0.84 + Math.sin(local * 0.45) * 14,
    r: size * 0.26,
  };
  paintBlob(ctx, blobA.x, blobA.y, blobA.r, scene.theme.accent, 0.4);
  paintBlob(ctx, blobB.x, blobB.y, blobB.r, scene.theme.accent2, 0.32);
}

function paintBlob(ctx: Ctx, cx: number, cy: number, radius: number, color: string, alpha: number) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(0.55, withAlpha(color, alpha * 0.42));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCustomLayers(
  ctx: Ctx,
  page: Page,
  local: number,
  bounds: Record<string, Box>,
  designW: number,
  designH: number
) {
  const customLayers = page.layers.filter((layer) => layer.role === "custom");
  // 自定义图层以 9:16 设计稿坐标保存；非竖屏画幅按高度比例映射，避免内容跑出画布
  const yScale = designH / 1920;
  customLayers.forEach((layer) => {
    const drawLayer = yScale === 1 ? layer : { ...layer, y: Math.round(layer.y * yScale) };
    // 图层动画风格统一继承页面配置，图层自身只保留时序（enterDelay/duration）与内容动态效果
    const typing = layer.textEffect === "typewriter";
    const animDuration = page.animDuration ?? 0.72;
    const visibleEnd = Math.min(page.duration, layer.enterDelay + layer.duration);
    let anim: Anim = {
      ...animFor(local, layer.enterDelay, animDuration, page.preset, page.easing),
      layer: drawLayer,
      bounds,
    };
    if (typing) anim = typedAnim(anim);
    anim = withExit(anim, local, visibleEnd, page.exitPreset, page.easing, animDuration);
    // y 为画布绝对坐标（旧草稿已在 loadProject 中迁移）；x 仍以水平中心为基准偏移
    const box = {
      x: (designW - layer.width) / 2,
      y: 0,
      w: layer.width,
      h: layer.height,
    };
    /** 内容动态效果：数字滚动按入场进度累加，打字机按时间逐字显示 */
    const dynamicText = (raw: string) => {
      let text = raw;
      if (typing) {
        const rate = typingRate(page);
        const shown = Math.floor(Math.max(0, local - layer.enterDelay) / rate);
        text = text.slice(0, Math.min(text.length, shown));
      }
      if (layer.countUp) text = formatCount(text, ease("easeOut", anim.progress));
      return text;
    };
    animated(ctx, anim, box, () => {
      if (layer.kind === "image" || layer.kind === "video") {
        paintMedia(ctx, layer, box, page.theme);
        return;
      }
      if (layer.kind === "shape") {
        ctx.fillStyle = layer.color ?? page.theme.accent;
        roundedPath(ctx, box.x, box.y, box.w, box.h, 28);
        ctx.fill();
        return;
      }
      if (layer.kind === "button") {
        const buttonBg = layer.color ?? page.theme.accent;
        ctx.fillStyle = buttonBg;
        roundedPath(ctx, box.x, box.y, box.w, box.h, box.h / 2);
        ctx.fill();
        ctx.fillStyle = readableTextOn(buttonBg);
        ctx.font = `700 ${layer.fontSize ?? 40}px ${FONT_STACK}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(dynamicText(layer.content ?? "按钮"), box.x + box.w / 2, box.y + box.h / 2);
        return;
      }
      const size = layer.fontSize ?? 64;
      ctx.font = `700 ${size}px ${FONT_STACK}`;
      ctx.fillStyle = layer.color ?? page.theme.ink;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const lines = wrapText(ctx, dynamicText(layer.content ?? ""), box.w);
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, box.x, box.y + lineIndex * size * 1.25);
      });
    });
  });
}

function drawComposition(
  ctx: Ctx,
  page: Page,
  local: number,
  bounds: Record<string, Box>,
  design: DesignSpec
) {
  const { W, H, padX, padTop, compact } = design;
  const contentW = W - padX * 2;

  let step = 0;
  const nextAnim: NextAnim = (role) => {
    const layer = role ? page.layers.find((item) => item.role === role) : undefined;
    const order = step++;
    const animDuration = page.animDuration ?? 0.72;
    const end = layer ? Math.min(page.duration, layer.enterDelay + layer.duration) : page.duration;
    const anim = withExit(
      animFor(
        local,
        (layer?.enterDelay ?? page.enterDelay) + order * (layer?.stagger ?? page.stagger),
        animDuration,
        layer?.preset ?? page.preset,
        layer?.easing ?? page.easing
      ),
      local,
      end,
      page.exitPreset,
      page.easing,
      animDuration
    );
    if (role && page.layers.length && !layer) anim.alpha = 0;
    return { ...anim, layer, bounds };
  };

  const typing: Typing = {
    active: page.textEffect === "typewriter",
    local,
    cursor: 0,
    rate: typingRate(page),
  };

  drawChrome(ctx, page, nextAnim, padX, padTop, contentW);

  switch (page.layout) {
    case "hero":
      drawHero(ctx, page, local, nextAnim, H, padX, padTop, contentW, typing, compact);
      break;
    case "price":
      drawPrice(ctx, page, nextAnim, padX, padTop, contentW, typing, compact);
      break;
    case "quote":
      drawQuote(ctx, page, nextAnim, padX, padTop, contentW, typing, compact);
      break;
    case "cta":
      drawCta(ctx, page, nextAnim, W, H, padTop, contentW, typing, compact);
      break;
  }

  drawCustomLayers(ctx, page, local, bounds, W, H);
}

export function drawProjectFrame(
  ctx: Ctx,
  project: Project,
  time: number
): Record<string, Box> {
  const { width, height } = RATIO_SIZE[project.ratio];
  if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
    ctx.canvas.width = width;
    ctx.canvas.height = height;
  }

  const index = sceneIndexAt(project, time);
  const page = project.pages[index];
  const local = Math.max(0, Math.min(page.duration, time - sceneStart(project, index)));
  const bounds: Record<string, Box> = {};

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  paintBackdrop(ctx, page, local, width, height);

  // 每种画幅使用独立设计尺寸与紧凑排版，不再把 9:16 版式整体缩进横屏造成两侧留白
  const design = DESIGNS[project.ratio];

  ctx.save();
  if (page.transition === "fade") ctx.globalAlpha = clamp01(local / 0.35);
  if (page.transition === "slide") {
    ctx.translate((1 - ease("easeOut", clamp01(local / 0.45))) * 120, 0);
  }
  drawComposition(ctx, page, local, bounds, design);
  ctx.restore();
  return bounds;
}
