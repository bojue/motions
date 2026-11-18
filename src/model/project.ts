export type Ratio = "9:16" | "16:9" | "1:1";

export const RATIOS: Ratio[] = ["9:16", "16:9", "1:1"];

export const RATIO_LABEL: Record<Ratio, string> = {
  "9:16": "9:16 竖版",
  "16:9": "16:9 横版",
  "1:1": "1:1 方形",
};

export const RATIO_SIZE: Record<Ratio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

export type AnimationPreset =
  | "spring"
  | "slide"
  | "slideLeft"
  | "slideRight"
  | "drop"
  | "wipe"
  | "zoom"
  | "rotate"
  | "blur"
  | "flip";
export type EasingKind = "elastic" | "linear" | "easeOut";
export type TextEffect = "none" | "typewriter";
export type SceneLayout = "hero" | "price" | "quote" | "cta";
export type PageTransition = "none" | "fade" | "slide";
export type LayerKind = "text" | "shape" | "button" | "card" | "group" | "image" | "video";
export type MediaFit = "cover" | "contain";

export interface SceneTheme {
  bg: string;
  bg2: string;
  accent: string;
  accent2: string;
  ink: string;
  muted: string;
}

export interface SceneContent {
  kicker: string;
  title: string;
  accent?: string;
  subtitle?: string;
  cta?: string;
  points?: string[];
  /** 左上角品牌名，留空时使用默认品牌。 */
  brand?: string;
  card?: { label: string; value: string; percent: number };
  price?: { amount: string; unit: string; original: string; badge: string };
  quote?: { text: string; author: string; role: string };
}

/** v1 场景字段保留在 Page 上，作为固定版式渲染的兼容数据。 */
export interface Scene {
  id: string;
  name: string;
  role: string;
  layout: SceneLayout;
  duration: number;
  preset: AnimationPreset;
  easing: EasingKind;
  stagger: number;
  enterDelay: number;
  textEffect: TextEffect;
  countUp: boolean;
  thumb: string;
  theme: SceneTheme;
  content: SceneContent;
}

export interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  role: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  /** 图层不再单独配置动画风格，入场动画统一继承页面设置；旧草稿中的残留值仅作兼容保留。 */
  preset?: AnimationPreset;
  easing?: EasingKind;
  stagger?: number;
  enterDelay: number;
  textEffect: TextEffect;
  /** 数字滚动（动态累加）：内容中的第一段数字按进度滚动，需显式开启。 */
  countUp: boolean;
  content?: string;
  color?: string;
  fontSize?: number;
  /** 图片 / 视频图层的素材地址（data URL 或 object URL）。 */
  src?: string;
  /** 素材填充方式，默认 cover（裁切铺满）。 */
  fit?: MediaFit;
  /** 视频图层是否静音播放（导出始终静音，背景音乐单独配置）。 */
  muted?: boolean;
}

export interface Page extends Scene {
  transition: PageTransition;
  /** 单次入场 / 退场动画时长（秒），默认 0.72。 */
  animDuration: number;
  /** 退场动画风格，none 表示页面结束时不播放退场。 */
  exitPreset: AnimationPreset | "none";
  layers: Layer[];
}

export interface ProjectAudio {
  src: string;
  name: string;
  /** 0~1，默认 0.6。 */
  volume: number;
}

export interface Project {
  version: 2;
  title: string;
  ratio: Ratio;
  loop: boolean;
  pages: Page[];
  /** 自定义图层坐标单位：absolute 表示 y 为画布绝对坐标（旧草稿迁移后写入）。 */
  layerUnit?: "absolute";
  /** 背景音乐，导出时与画布视频流混音。 */
  audio?: ProjectAudio;
}

interface LegacyProject {
  version: 1;
  title: string;
  ratio: Ratio;
  loop: boolean;
  scenes: Scene[];
}

const THEMES: Record<SceneLayout, SceneTheme> = {
  hero: {
    bg: "#fbf9f6",
    bg2: "#f2ecff",
    accent: "#8055d9",
    accent2: "#ff8a5c",
    ink: "#141210",
    muted: "#6c665c",
  },
  price: {
    bg: "#f7f9ff",
    bg2: "#e6f0ff",
    accent: "#2f6fe4",
    accent2: "#22b8a6",
    ink: "#111827",
    muted: "#5b6472",
  },
  quote: {
    bg: "#fffaf3",
    bg2: "#ffe8ce",
    accent: "#e0742c",
    accent2: "#8055d9",
    ink: "#1c1917",
    muted: "#786a5b",
  },
  cta: {
    bg: "#f4fdf8",
    bg2: "#d8f6e6",
    accent: "#009e74",
    accent2: "#8055d9",
    ink: "#0f1f19",
    muted: "#5c6b64",
  },
};

/** 按版式返回默认主题（拷贝一份，避免调用方修改内置常量）。 */
export function defaultTheme(layout: SceneLayout): SceneTheme {
  return { ...THEMES[layout] };
}

/** 预制主题模版：用户默认只做选择，不手动调色。 */
export interface ThemePreset {
  id: string;
  name: string;
  theme: SceneTheme;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "cream-violet", name: "奶油紫", theme: THEMES.hero },
  { id: "business-blue", name: "商务蓝", theme: THEMES.price },
  { id: "sunny-orange", name: "暖阳橙", theme: THEMES.quote },
  { id: "fresh-green", name: "清新绿", theme: THEMES.cta },
  {
    id: "neon-night",
    name: "暗夜霓虹",
    theme: { bg: "#16112b", bg2: "#251b45", accent: "#9a6bff", accent2: "#2ee6d6", ink: "#f4f1ff", muted: "#a79fc9" },
  },
  {
    id: "black-gold",
    name: "黑金奢华",
    theme: { bg: "#121110", bg2: "#262016", accent: "#d9a441", accent2: "#f0dda4", ink: "#faf6ec", muted: "#a99f8a" },
  },
  {
    id: "mint-ice",
    name: "薄荷冰蓝",
    theme: { bg: "#f2fbfa", bg2: "#d9f2ef", accent: "#0fa3a3", accent2: "#3b82f6", ink: "#0e2624", muted: "#5f7a76" },
  },
  {
    id: "sakura",
    name: "樱花粉紫",
    theme: { bg: "#fff6f8", bg2: "#ffe1ec", accent: "#e4487f", accent2: "#9b5de5", ink: "#2a1018", muted: "#8a6674" },
  },
  {
    id: "deep-sea",
    name: "深海蓝",
    theme: { bg: "#0d1b2a", bg2: "#13293d", accent: "#3ea8ff", accent2: "#6ee7b7", ink: "#eaf3fb", muted: "#8ba3ba" },
  },
  {
    id: "mono",
    name: "极简黑白",
    theme: { bg: "#ffffff", bg2: "#ececec", accent: "#111111", accent2: "#7a7a7a", ink: "#111111", muted: "#8a8a8a" },
  },
];

/** 判断当前主题命中的预制模版（用于选中态高亮）。 */
export function matchThemePreset(theme: SceneTheme): ThemePreset | undefined {
  const keys = Object.keys(THEME_PRESETS[0].theme) as (keyof SceneTheme)[];
  return THEME_PRESETS.find((preset) => keys.every((key) => preset.theme[key].toLowerCase() === theme[key].toLowerCase()));
}

const THUMBS = ["th-a", "th-b", "th-c", "th-d"];
let seed = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seed++).toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

export function createLayer(patch: Partial<Layer> = {}): Layer {
  return {
    id: nextId("layer"),
    name: "文本图层",
    kind: "text",
    role: "custom",
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 720,
    height: 150,
    duration: 3,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    enterDelay: 0.2,
    textEffect: "none",
    countUp: false,
    content: "双击文本直接编辑",
    color: "#141210",
    fontSize: 64,
    ...patch,
  };
}

function fixedLayer(
  scene: Scene,
  role: string,
  name: string,
  kind: LayerKind,
  width = 900,
  height = 120
): Layer {
  return createLayer({
    name,
    kind,
    role,
    width,
    height,
    duration: Math.max(0.1, scene.duration - scene.enterDelay),
    enterDelay: scene.enterDelay,
    content: undefined,
    color: undefined,
    fontSize: undefined,
  });
}

/** 将旧固定版式中的视觉元素拆成可选择、移动和独立设置动效的图层。 */
export function createPageLayers(scene: Scene): Layer[] {
  const layers = [
    fixedLayer(scene, "brand", "品牌栏", "group", 946, 44),
    fixedLayer(scene, "kicker", " eyebrow 标签", "group", 500, 58),
    fixedLayer(scene, "title", "主标题", "text", 900, 360),
  ];
  if (scene.content.subtitle) {
    layers.push(fixedLayer(scene, "subtitle", "副标题", "text", 760, 160));
  }
  if (scene.layout === "quote" && scene.content.quote) {
    layers.push(
      fixedLayer(scene, "quoteMark", "引号装饰", "shape", 130, 150),
      fixedLayer(scene, "quote", "评价正文", "text", 850, 400),
      fixedLayer(scene, "rating", "评分", "group", 260, 44),
      fixedLayer(scene, "author", "作者信息", "group", 700, 84)
    );
  } else {
    if (scene.content.cta) layers.push(fixedLayer(scene, "cta", "行动按钮", "button", 400, 110));
    if (scene.content.points?.length) {
      layers.push(fixedLayer(scene, "points", "卖点列表", "group", 900, 90));
    }
    if (scene.content.card) layers.push(fixedLayer(scene, "card", "数据卡片", "card", 946, 156));
    if (scene.content.price) layers.push(fixedLayer(scene, "price", "价格卡片", "card", 946, 300));
  }
  return layers;
}

export function createScene(patch: Partial<Scene> = {}): Scene {
  const layout = patch.layout ?? "hero";
  return {
    id: nextId("scene"),
    name: "新页面",
    role: "自定义",
    layout,
    duration: 3,
    preset: "spring",
    easing: "elastic",
    stagger: 0.08,
    enterDelay: 0.2,
    textEffect: "none",
    countUp: true,
    thumb: THUMBS[0],
    theme: THEMES[layout],
    content: {
      kicker: "NEW PAGE",
      title: "新的故事\n从这里开始",
      subtitle: "在右侧编辑页面内容，或从素材库添加新的图层。",
      cta: "了解更多",
      points: ["要点一", "要点二", "要点三"],
    },
    ...patch,
  };
}

export function pageFromScene(scene: Scene): Page {
  return {
    ...scene,
    transition: "none",
    animDuration: 0.72,
    exitPreset: "none",
    layers: createPageLayers(scene),
  };
}

export function createPage(patch: Partial<Scene> = {}): Page {
  return pageFromScene(createScene(patch));
}

export function createDefaultProject(): Project {
  return {
    version: 2,
    layerUnit: "absolute",
    title: "SaaS 新品宣传片",
    ratio: "9:16",
    loop: true,
    pages: [
      createPage({
        name: "开场标题",
        role: "钩子",
        layout: "hero",
        duration: 3.2,
        preset: "spring",
        thumb: "th-a",
        content: {
          kicker: "NEW RELEASE",
          title: "让团队\n告别手动\n流程",
          accent: "手动",
          subtitle: "零代码搭建自动化流程，10 分钟上线，团队从此只做有价值的事。",
          cta: "免费开始",
          points: ["30+ 自动化模板", "无需代码", "一键导出"],
          card: { label: "自动化覆盖率", value: "68%", percent: 68 },
        },
      }),
      createPage({
        name: "价格卡片",
        role: "卖点",
        layout: "price",
        duration: 4,
        preset: "slide",
        easing: "easeOut",
        thumb: "th-b",
        content: {
          kicker: "LIMITED OFFER",
          title: "限时 5 折\n团队版",
          accent: "5 折",
          subtitle: "按年付费立省 40%，含 20 个席位与全部高级动效。",
          cta: "立即升级",
          points: ["20 个团队席位", "200+ 高级动效", "专属客户成功"],
          price: { amount: "99", unit: "/ 月", original: "原价 ¥198", badge: "限时 30 天" },
        },
      }),
      createPage({
        name: "客户评价",
        role: "口碑",
        layout: "quote",
        duration: 3.5,
        preset: "wipe",
        easing: "linear",
        thumb: "th-c",
        content: {
          kicker: "CUSTOMER LOVE",
          title: "客户怎么说",
          subtitle: "",
          quote: {
            text: "上线两周，我们把 60% 的重复工作交给了自动化，团队终于能把时间花在真正重要的创意上。",
            author: "林溪",
            role: "产品负责人 · 星河科技",
          },
        },
      }),
      createPage({
        name: "行动号召",
        role: "转化",
        layout: "cta",
        duration: 2.5,
        preset: "zoom",
        easing: "easeOut",
        thumb: "th-d",
        content: {
          kicker: "GET STARTED",
          title: "现在开始\n免费试用",
          accent: "免费",
          subtitle: "无需信用卡，3 分钟完成第一个自动化流程。",
          cta: "立即免费开始",
          points: ["14 天全功能试用", "随时取消", "中文人工支持"],
        },
      }),
    ],
  };
}

export const totalDuration = (project: Project) =>
  project.pages.reduce((total, page) => total + page.duration, 0);

export const sceneStart = (project: Project, index: number) =>
  project.pages
    .slice(0, Math.max(0, index))
    .reduce((total, page) => total + page.duration, 0);

export const pageStart = sceneStart;

export function sceneIndexAt(project: Project, time: number): number {
  let acc = 0;
  for (let index = 0; index < project.pages.length; index += 1) {
    acc += project.pages[index].duration;
    if (time < acc) return index;
  }
  return Math.max(0, project.pages.length - 1);
}

export const pageIndexAt = sceneIndexAt;

const typedCharCount = (page: Page) =>
  page.content.title.replace(/\n/g, "").length +
  (page.content.subtitle?.length ?? 0) +
  (page.content.quote?.text.length ?? 0);

/** 页面入场结束后的稳定时刻，用于选中页面时展示完整画面。 */
export const sceneSettleTime = (project: Project, index: number) => {
  const page = project.pages[index];
  let preview = Math.max(
    0.05,
    Math.min(page.duration - 0.05, page.enterDelay + 0.72 + page.stagger * 8)
  );
  if (page.textEffect === "typewriter") {
    const rate = Math.min(0.09, Math.max(0.02, page.stagger * 0.45));
    preview = Math.max(
      preview,
      Math.min(page.duration - 0.05, page.enterDelay + typedCharCount(page) * rate)
    );
  }
  return sceneStart(project, index) + preview;
};

export const pageSettleTime = sceneSettleTime;

/**
 * 页面时长估算：按入场动画结束、文字阅读量与整体留白给出建议时长。
 * 作为「自动估算」按钮的依据，不自动覆盖用户手动设置的时长。
 */
export function estimatePageDuration(page: Page): number {
  const titleChars = page.content.title.replace(/\n/g, "").length;
  const readChars =
    titleChars +
    (page.content.subtitle?.length ?? 0) * 0.8 +
    (page.content.quote?.text.length ?? 0) * 0.9 +
    (page.content.points?.join("").length ?? 0) * 0.7;
  const customTextChars = page.layers
    .filter((layer) => layer.role === "custom" && layer.visible !== false && layer.kind === "text")
    .reduce((sum, layer) => sum + (layer.content?.length ?? 0), 0);
  // 入场：延迟 + 单次动画 + 层叠间隔
  const entering = page.enterDelay + (page.animDuration ?? 0.72) + page.stagger * 6;
  // 阅读：中文约 0.055s/字，按 0.6 系数折算，避免时长虚高
  const reading = (readChars + customTextChars * 0.5) * 0.055 * 0.6;
  const typing = page.textEffect === "typewriter" ? readChars * 0.045 : 0;
  return Math.round(Math.min(10, Math.max(1.5, entering + reading + typing + 1.1)) * 10) / 10;
}

const STORAGE_KEY = "motioncraft.project.v2";
const LEGACY_STORAGE_KEY = "motioncraft.project.v1";

function migrateV1(legacy: LegacyProject): Project {
  return {
    version: 2,
    // v1 没有自定义图层，迁移后直接采用绝对坐标，避免下次加载被重复换算
    layerUnit: "absolute",
    title: legacy.title,
    ratio: legacy.ratio,
    loop: legacy.loop,
    pages: legacy.scenes.map(pageFromScene),
  };
}

/** 自定义图层默认纵向排布基准：首层顶部位置与层间距（设计稿 1080×1920 坐标）。 */
export const LAYER_BASE_Y = 760;
export const LAYER_GAP = 190;

function normalizeV2(project: Project): Project {
  // 旧草稿的自定义图层 y 是「相对索引基准的偏移」，迁移为画布绝对坐标，避免增删中间图层时整体位移。
  const absolute = project.layerUnit === "absolute";
  return {
    ...project,
    version: 2,
    layerUnit: "absolute",
    pages: project.pages.map((page) => {
      let customIndex = 0;
      const layers = Array.isArray(page.layers)
        ? page.layers.map((layer) => {
            const next = {
              ...layer,
              duration: layer.duration ?? Math.max(0.1, page.duration - layer.enterDelay),
              scaleX: layer.scaleX ?? 1,
              scaleY: layer.scaleY ?? 1,
              enterDelay: layer.enterDelay ?? 0,
            };
            if (layer.role !== "custom") return next;
            const index = customIndex++;
            if (absolute) return next;
            return { ...next, y: LAYER_BASE_Y + index * LAYER_GAP + (layer.y ?? 0) };
          })
        : createPageLayers(page);
      return {
        ...page,
        transition: page.transition ?? "none",
        animDuration: page.animDuration ?? 0.72,
        exitPreset: page.exitPreset ?? "none",
        layers,
      };
    }),
  };
}

export function loadProject(): Project | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as Project;
      if (parsed?.version === 2 && Array.isArray(parsed.pages) && parsed.pages.length) {
        return normalizeV2(parsed);
      }
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as LegacyProject;
    if (parsed?.version !== 1 || !Array.isArray(parsed.scenes) || !parsed.scenes.length) {
      return null;
    }
    return migrateV1(parsed);
  } catch {
    return null;
  }
}

export function saveProject(project: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}
