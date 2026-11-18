import type { Layer } from "../../model/project";
import type { IconName } from "../ui/Icon";
import type { SidebarTab } from "./editorConstants";

export type ComponentKind = "titleGroup" | "statCard" | "ctaGroup" | "quoteGroup" | "listGroup" | "barChart" | "progressBar";

/**
 * 素材目录（参考 Canva 元素侧栏：搜索 + 最近使用 + 分类浏览）。
 * 单层目录：分类卡片网格（如「文本组合 / 图表 / 形状」），点入后直接展示该分类下的素材。
 */
export type AssetEntry = {
  kind: "component" | "asset";
  id: string;
  label: string;
  desc: string;
  icon: IconName;
  color: string;
  /** 基础素材的单图层配置；动态组件不使用 */
  spec?: Partial<Layer>;
};
/** 素材分类：点入后直接展示 items 里的素材列表 */
export type AssetCategory = {
  id: string;
  label: string;
  desc: string;
  icon: IconName;
  color: string;
  items: AssetEntry[];
};
/** 上传素材：图片/视频文件注册项，url 为本地预览地址（object URL） */
export type UploadItem = { id: string; name: string; size: number; url?: string; kind?: "image" | "video" };
export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: "text-group", label: "文本组合", desc: "多图层文本组合，自带入场动效", icon: "text", color: "violet", items: [
    { kind: "component", id: "titleGroup", label: "标题组", desc: "标签 + 主副标题，错落入场", icon: "text", color: "violet" },
    { kind: "component", id: "quoteGroup", label: "引言卡", desc: "引号 + 客户评价 + 署名", icon: "template", color: "blue" },
  ] },
  { id: "charts", label: "图表", desc: "数据卡片、柱状图与进度条", icon: "grid", color: "teal", items: [
    { kind: "component", id: "statCard", label: "数据卡片", desc: "色块 + 数字 + 说明，数字滚动", icon: "shape", color: "blue" },
    { kind: "component", id: "barChart", label: "柱状图", desc: "三根数据柱，错落增长", icon: "grid", color: "green" },
    { kind: "component", id: "progressBar", label: "进度条", desc: "轨道 + 进度 + 百分比滚动", icon: "check", color: "violet" },
  ] },
  { id: "cta", label: "行动引导", desc: "行动按钮 + 辅助文案", icon: "button", color: "orange", items: [
    { kind: "component", id: "ctaGroup", label: "按钮组", desc: "行动按钮 + 辅助文案", icon: "button", color: "orange" },
  ] },
  { id: "shapes", label: "形状", desc: "矩形、胶囊、色块等单图层素材", icon: "shape", color: "blue", items: [
    { kind: "asset", id: "shape-rect", label: "圆角矩形", desc: "基础圆角色块", icon: "shape", color: "blue",
      spec: { kind: "shape", name: "圆角矩形", content: undefined, width: 520, height: 260, color: "#8055d9" } },
    { kind: "asset", id: "shape-pill", label: "胶囊背景", desc: "扁长条色块", icon: "button", color: "violet",
      spec: { kind: "shape", name: "胶囊背景", content: undefined, width: 420, height: 96, color: "#ff8a5c" } },
    { kind: "asset", id: "shape-banner", label: "横幅色条", desc: "通栏宽幅色块", icon: "shape", color: "blue",
      spec: { kind: "shape", name: "横幅色条", content: undefined, width: 1080, height: 160, color: "#2f6fe4" } },
    { kind: "asset", id: "shape-panel", label: "色块面板", desc: "大尺寸卡片底板", icon: "folder", color: "orange",
      spec: { kind: "shape", name: "色块面板", content: undefined, width: 640, height: 420, color: "#e0742c" } },
    { kind: "asset", id: "shape-dot", label: "装饰色块", desc: "小尺寸点缀色块", icon: "shape", color: "orange",
      spec: { kind: "shape", name: "装饰色块", content: undefined, width: 160, height: 160, color: "#009e74" } },
  ] },
  { id: "buttons", label: "按钮", desc: "CTA、迷你与横幅按钮素材", icon: "button", color: "pink", items: [
    { kind: "asset", id: "button-cta", label: "CTA 按钮", desc: "标准行动号召按钮", icon: "button", color: "violet",
      spec: { kind: "button", name: "CTA 按钮", content: "立即开始", width: 420, height: 112, fontSize: 38, color: "#8055d9" } },
    { kind: "asset", id: "button-mini", label: "迷你按钮", desc: "小型辅助按钮", icon: "button", color: "blue",
      spec: { kind: "button", name: "迷你按钮", content: "了解更多", width: 260, height: 84, fontSize: 30, color: "#2f6fe4" } },
    { kind: "asset", id: "button-banner", label: "横幅按钮", desc: "通栏大尺寸按钮", icon: "button", color: "orange",
      spec: { kind: "button", name: "横幅按钮", content: "开启限时优惠通道", width: 900, height: 132, fontSize: 44, color: "#e0742c" } },
  ] },
  { id: "lists", label: "列表要点", desc: "要点列表与步骤标签素材", icon: "alignCenter", color: "magenta", items: [
    { kind: "component", id: "listGroup", label: "要点列表", desc: "圆点标记三条要点，逐行入场", icon: "alignCenter", color: "magenta" },
    { kind: "asset", id: "list-step", label: "步骤标签", desc: "步骤序号文字标签", icon: "text", color: "magenta",
      spec: { kind: "text", name: "步骤标签", content: "STEP 01", width: 360, height: 56, fontSize: 34, color: "#c13dc9" } },
    { kind: "asset", id: "list-check", label: "检查清单", desc: "带勾选标记的要点文字", icon: "check", color: "green",
      spec: { kind: "text", name: "检查清单", content: "✓ 要点一\n✓ 要点二", width: 520, height: 120, fontSize: 40, color: "#141210" } },
  ] },
  { id: "tags", label: "标签徽章", desc: "眉题、促销角标等小徽章", icon: "sparkle", color: "indigo", items: [
    { kind: "asset", id: "tag-new", label: "眉题标签", desc: "NEW 小徽章", icon: "button", color: "indigo",
      spec: { kind: "button", name: "眉题标签", content: "NEW", width: 220, height: 64, fontSize: 26, color: "#4f5fe0" } },
    { kind: "asset", id: "tag-sale", label: "促销角标", desc: "-50% 促销徽章", icon: "button", color: "pink",
      spec: { kind: "button", name: "促销角标", content: "-50%", width: 190, height: 64, fontSize: 30, color: "#e5397f" } },
    { kind: "asset", id: "tag-index", label: "序号徽章", desc: "圆形序号徽章", icon: "button", color: "teal",
      spec: { kind: "button", name: "序号徽章", content: "01", width: 120, height: 120, fontSize: 40, color: "#0fa3a0" } },
    { kind: "asset", id: "tag-launch", label: "上新角标", desc: "「新品」小徽章", icon: "bulb", color: "orange",
      spec: { kind: "button", name: "上新角标", content: "新品", width: 160, height: 64, fontSize: 28, color: "#ef7a2a" } },
  ] },
  { id: "decorations", label: "装饰点缀", desc: "色点、线条等装饰素材", icon: "shape", color: "green", items: [
    { kind: "asset", id: "deco-line", label: "细分隔线", desc: "通栏细线装饰", icon: "shape", color: "green",
      spec: { kind: "shape", name: "细分隔线", content: undefined, width: 1080, height: 14, color: "#b9a8f2" } },
    { kind: "asset", id: "deco-bar", label: "竖向色条", desc: "竖向点缀色条", icon: "shape", color: "orange",
      spec: { kind: "shape", name: "竖向色条", content: undefined, width: 120, height: 480, color: "#ffb35c" } },
    { kind: "asset", id: "deco-dot", label: "迷你色点", desc: "小型点缀色点", icon: "shape", color: "pink",
      spec: { kind: "shape", name: "迷你色点", content: undefined, width: 96, height: 96, color: "#f789b9" } },
    { kind: "asset", id: "deco-strip", label: "装饰色带", desc: "中等宽度的装饰条", icon: "shape", color: "blue",
      spec: { kind: "shape", name: "装饰色带", content: undefined, width: 880, height: 40, color: "#6cb0fa" } },
  ] },
  { id: "motion-text", label: "动效文字", desc: "滚动数字、打字机等动态文字", icon: "play", color: "cyan", items: [
    { kind: "asset", id: "mt-count", label: "滚动数字", desc: "数字从 0 滚动到目标值", icon: "play", color: "cyan",
      spec: { kind: "text", name: "滚动数字", content: "128,600+", width: 700, height: 200, fontSize: 112, color: "#08a8cf", countUp: true } },
    { kind: "asset", id: "mt-typing", label: "打字机", desc: "文字逐字打出", icon: "pause", color: "cyan",
      spec: { kind: "text", name: "打字机文本", content: "正在逐字输入的文案…", width: 760, height: 90, fontSize: 64, color: "#141210", textEffect: "typewriter" } },
    { kind: "asset", id: "mt-accent", label: "强调大字", desc: "大号强调文字", icon: "text", color: "orange",
      spec: { kind: "text", name: "强调大字", content: "限时 5 折", width: 900, height: 200, fontSize: 120, color: "#ef7a2a" } },
  ] },
  { id: "backgrounds", label: "背景图块", desc: "全屏底色与色带背景", icon: "fullscreen", color: "amber", items: [
    { kind: "asset", id: "bg-full", label: "全屏底色", desc: "整页柔和底色", icon: "fullscreen", color: "amber",
      spec: { kind: "shape", name: "全屏底色", content: undefined, width: 1080, height: 1920, color: "#f2ecff" } },
    { kind: "asset", id: "bg-top", label: "顶部色带", desc: "页面顶部宽色带", icon: "shape", color: "blue",
      spec: { kind: "shape", name: "顶部色带", content: undefined, width: 1080, height: 320, color: "#e6f0ff" } },
    { kind: "asset", id: "bg-bottom", label: "底部色带", desc: "页面底部宽色带", icon: "shape", color: "orange",
      spec: { kind: "shape", name: "底部色带", content: undefined, width: 1080, height: 380, color: "#ffe8ce" } },
    { kind: "asset", id: "bg-panel", label: "中央色板", desc: "居中大尺寸色板", icon: "folder", color: "green",
      spec: { kind: "shape", name: "中央色板", content: undefined, width: 760, height: 760, color: "#d8f6e6" } },
  ] },
];

/** 为我推荐：跨分类精选素材，呈现在素材首页的横向推荐位 */
const RECOMMENDED_IDS = ["titleGroup", "quoteGroup", "statCard", "barChart", "ctaGroup", "button-cta", "progressBar"];
export const RECOMMENDED_ENTRIES: AssetEntry[] = ASSET_CATEGORIES
  .flatMap((category) => category.items)
  .filter((entry) => RECOMMENDED_IDS.includes(entry.id));

/** 文本面板（参考 Canva 文字侧栏）：默认文字样式一键添加，字号分层预览直观区分标题/副标题/正文。 */
export type TextStylePreset = { entry: AssetEntry; previewSize: number; previewWeight: number };
export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  { previewSize: 20, previewWeight: 800, entry: { kind: "asset", id: "text-title", label: "添加标题", desc: "超大号主标题文字", icon: "text", color: "violet",
    spec: { kind: "text", name: "标题", content: "添加标题", width: 900, height: 260, fontSize: 96, color: "#141210" } } },
  { previewSize: 15, previewWeight: 600, entry: { kind: "asset", id: "text-subtitle", label: "添加副标题", desc: "中等字号副标题", icon: "text", color: "violet",
    spec: { kind: "text", name: "副标题", content: "添加副标题", width: 760, height: 150, fontSize: 56, color: "#3d4152" } } },
  { previewSize: 12, previewWeight: 400, entry: { kind: "asset", id: "text-body", label: "添加正文", desc: "说明性段落文字", icon: "text", color: "violet",
    spec: { kind: "text", name: "正文", content: "添加正文", width: 720, height: 180, fontSize: 34, color: "#63666f" } } },
];

/** 动态文字效果：眉题标签 / 滚动数字 / 打字机 */
export const TEXT_EFFECT_ENTRIES: AssetEntry[] = [
  { kind: "asset", id: "text-eyebrow", label: "眉题标签", desc: "页面顶部的小标签", icon: "text", color: "blue",
    spec: { kind: "text", name: "眉题标签", content: "NEW · 全新升级", width: 500, height: 44, fontSize: 30, color: "#8055d9" } },
  { kind: "asset", id: "text-count", label: "滚动数字", desc: "数字从 0 滚动到目标值", icon: "play", color: "green",
    spec: { kind: "text", name: "滚动数字", content: "128,600+", width: 700, height: 200, fontSize: 112, color: "#2f6fe4", countUp: true } },
  { kind: "asset", id: "text-typing", label: "打字机", desc: "文字逐字打出", icon: "pause", color: "orange",
    spec: { kind: "text", name: "打字机文本", content: "正在逐字输入的文案…", width: 760, height: 90, fontSize: 64, color: "#141210", textEffect: "typewriter" } },
];

/** 「AI 写作」内置文案库：随机抽取一句营销文案直接插入画布 */
export const AI_WRITING_SAMPLES = [
  "让每一次创作，都快人一步",
  "灵感不等人，落地才重要",
  "把复杂留给工具，把简单留给你",
  "好内容，值得被更多人看见",
  "今天，从一页开始讲好你的故事",
];

/**
 * 应用面板入口清单（参考 Canva「来自 Canva 的更多内容」）：64px 图标平铺网格。
 * 已接入的能力（背景音乐）直达对应侧栏面板，其余为预告位，点击给出「即将上线」提示。
 */
export const APP_ENTRIES: { name: string; desc: string; icon: IconName; target?: SidebarTab }[] = [
  { name: "背景音乐", desc: "前往项目面板添加配乐并设置音量", icon: "music", target: "project" },
  { name: "图片素材库", desc: "在线图片素材库，即将上线", icon: "image" },
  { name: "视频背景", desc: "动态背景素材，即将上线", icon: "play" },
  { name: "AI 素材", desc: "AI 生成图片与素材，即将上线", icon: "sparkle" },
  { name: "图表", desc: "数据图表素材，即将上线", icon: "chart" },
  { name: "动态二维码", desc: "可跳转的动态二维码，即将上线", icon: "qr" },
  { name: "字幕", desc: "自动生成与烧录字幕，即将上线", icon: "subtitle" },
  { name: "翻译", desc: "多语言文字翻译，即将上线", icon: "globe" },
  { name: "批量创建", desc: "批量套用模板生成视频，即将上线", icon: "copy" },
  { name: "品牌工具包", desc: "统一品牌字体与配色，即将上线", icon: "folder" },
];
