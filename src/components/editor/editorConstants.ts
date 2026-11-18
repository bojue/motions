import type { AnimationPreset, EasingKind, SceneLayout } from "../../model/project";
import { createDefaultProject } from "../../model/project";
import type { IconName } from "../ui/Icon";

export const PRESETS: { id: AnimationPreset; label: string }[] = [
  { id: "spring", label: "弹簧弹入" },
  { id: "slide", label: "上滑淡入" },
  { id: "slideLeft", label: "左滑入场" },
  { id: "slideRight", label: "右滑入场" },
  { id: "drop", label: "弹跳下落" },
  { id: "wipe", label: "擦除标题" },
  { id: "zoom", label: "柔和缩放" },
  { id: "rotate", label: "旋转弹入" },
  { id: "blur", label: "模糊聚焦" },
  { id: "flip", label: "翻转入场" },
];

export const EASINGS: { id: EasingKind; label: string }[] = [
  { id: "elastic", label: "弹性" },
  { id: "linear", label: "线性" },
  { id: "easeOut", label: "缓出" },
];

/** 页面动画预设：一键套用入场风格 + 缓动 + 层叠间隔 + 动画时长，之后仍可单项微调 */
export const ANIMATION_RECIPES: {
  id: string;
  label: string;
  preset: AnimationPreset;
  easing: EasingKind;
  stagger: number;
  animDuration: number;
}[] = [
  { id: "lively", label: "活力", preset: "spring", easing: "elastic", stagger: 0.08, animDuration: 0.72 },
  { id: "smooth", label: "丝滑", preset: "slide", easing: "easeOut", stagger: 0.06, animDuration: 0.6 },
  { id: "calm", label: "克制", preset: "blur", easing: "easeOut", stagger: 0.04, animDuration: 0.5 },
];

export const TEMPLATES: { layout: SceneLayout; name: string; description: string }[] = [
  { layout: "hero", name: "产品介绍", description: "标题、卖点与数据卡片" },
  { layout: "price", name: "价格促销", description: "价格、权益与行动按钮" },
  { layout: "quote", name: "客户评价", description: "评价、评分与作者信息" },
  { layout: "cta", name: "行动号召", description: "居中标题与转化按钮" },
];

/** 场景模板：整支视频的骨架（多页面完整故事线），套用时替换全部页面 */
export const STORY_TEMPLATES: {
  id: string; name: string; description: string;
  pages: { layout: SceneLayout; name: string }[];
}[] = [
  { id: "full", name: "完整宣传片", description: "钩子 → 亮点 → 价格 → 口碑 → 转化",
    pages: [{ layout: "hero", name: "开场钩子" }, { layout: "hero", name: "产品亮点" }, { layout: "price", name: "价格方案" }, { layout: "quote", name: "用户口碑" }, { layout: "cta", name: "行动号召" }] },
  { id: "app", name: "App 亮点介绍", description: "钩子 → 功能 → 口碑 → 转化",
    pages: [{ layout: "hero", name: "开场钩子" }, { layout: "hero", name: "功能亮点" }, { layout: "quote", name: "用户口碑" }, { layout: "cta", name: "立即下载" }] },
  { id: "promo", name: "促销转化短片", description: "钩子 → 优惠 → 行动",
    pages: [{ layout: "hero", name: "限时活动" }, { layout: "price", name: "专属优惠" }, { layout: "cta", name: "立即抢购" }] },
  { id: "brand", name: "品牌口碑故事", description: "开场 → 理念 → 评价 → 号召",
    pages: [{ layout: "hero", name: "品牌开场" }, { layout: "hero", name: "品牌理念" }, { layout: "quote", name: "真实好评" }, { layout: "cta", name: "了解品牌" }] },
];

export const STORY_CARDS = (() => {
  const base = createDefaultProject();
  return STORY_TEMPLATES.map((template) => ({
    ...template,
    duration: template.pages.reduce((sum, spec) => sum + (base.pages.find((page) => page.layout === spec.layout)?.duration ?? 3), 0),
  }));
})();

export type SidebarTab = "pages" | "layers" | "templates" | "assets" | "text" | "uploads" | "project" | "apps";

export const RAIL_TABS: { id: SidebarTab; label: string; icon: IconName }[] = [
  { id: "templates", label: "模板", icon: "template" },
  { id: "assets", label: "素材", icon: "shape" },
  { id: "text", label: "文本", icon: "text" },
  { id: "pages", label: "页面", icon: "page" },
  { id: "layers", label: "图层", icon: "layers" },
  { id: "uploads", label: "上传", icon: "upload" },
  { id: "project", label: "项目", icon: "folder" },
  { id: "apps", label: "应用", icon: "grid" },
];
