import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  Layer,
  MediaFit,
  Page,
  PageTransition,
  Project,
  SceneLayout,
  SceneTheme,
} from "../model/project";
import {
  LAYER_BASE_Y,
  LAYER_GAP,
  RATIOS,
  RATIO_LABEL,
  RATIO_SIZE,
  THEME_PRESETS,
  createDefaultProject,
  createLayer,
  defaultTheme,
  estimatePageDuration,
  matchThemePreset,
  pageSettleTime,
  pageStart,
  totalDuration,
} from "../model/project";
import { drawProjectFrame } from "../engine/renderer";
import type { Box } from "../engine/renderer";
import { usePlayback } from "../hooks/usePlayback";
import { useToast } from "../hooks/useToast";
import { useExport } from "../hooks/useExport";
import { useUploads } from "../hooks/useUploads";
import { loadInitialProject, useDraftSync } from "../hooks/useDraftSync";
import { useProjectMedia } from "../hooks/useProjectMedia";
import { useCanvasLayout } from "../hooks/useCanvasLayout";
import { useProjectHistory } from "../hooks/useProjectHistory";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { ExportButton } from "../components/ui/ExportButton";
import { BrandMark } from "../components/ui/BrandMark";
import { Section } from "../components/ui/Section";
import { PanelHeading } from "../components/ui/PanelHeading";
import { PanelRowHeading } from "../components/ui/PanelRowHeading";
import { EmptyState } from "../components/ui/EmptyState";
import { FieldRow } from "../components/ui/FieldRow";
import { NumberField } from "../components/ui/NumberField";
import { LabeledInput } from "../components/ui/LabeledInput";
import { LabeledSelect } from "../components/ui/LabeledSelect";
import { ChipRow } from "../components/ui/ChipRow";
import { ColorField } from "../components/ui/ColorField";
import { RangeField } from "../components/ui/RangeField";
import { Stepper } from "../components/ui/Stepper";
import { Tabs } from "../components/ui/Tabs";
import { Toast } from "../components/ui/Toast";
import { UploadDrop } from "../components/ui/UploadDrop";
import { AspectRatioPicker } from "../components/ui/AspectRatioPicker";
import { createTextLayerSpec } from "../components/editor/layerFactories";
import { AssetPreview } from "../components/editor/AssetPreview";
import { CategoryArt } from "../components/editor/CategoryArt";
import { PageThumb } from "../components/editor/PageThumb";
import { AnimationControls } from "../components/editor/AnimationControls";
import { SelectionToolbar } from "../components/editor/SelectionToolbar";
import { PagePickerModal } from "../components/editor/PagePickerModal";
import { FullPreviewModal } from "../components/editor/FullPreviewModal";
import { useInlineEdit } from "../hooks/useInlineEdit";
import { useLayerDrag } from "../hooks/useLayerDrag";
import { useTimelineDrag } from "../hooks/useTimelineDrag";
import { useEditorShortcuts } from "../hooks/useEditorShortcuts";
import {
  defaultLayerColor,
  defaultLayerFontSize,
  isAdaptiveTextLayer,
  isEditableTextLayer,
  layerIcon,
  supportsTextStyle,
} from "../components/editor/layerUtils";
import {
  AI_WRITING_SAMPLES,
  APP_ENTRIES,
  ASSET_CATEGORIES,
  RECOMMENDED_ENTRIES,
  TEXT_EFFECT_ENTRIES,
  TEXT_STYLE_PRESETS,
} from "../components/editor/assetCatalog";
import type { AssetEntry, ComponentKind, UploadItem } from "../components/editor/assetCatalog";
import { RAIL_TABS, STORY_CARDS, STORY_TEMPLATES, TEMPLATES } from "../components/editor/editorConstants";
import type { SidebarTab } from "../components/editor/editorConstants";
import { copyText } from "../lib/clipboard";
import { newId } from "../lib/id";
import { fileToUrl } from "../lib/mediaFile";
import { MAX_PILL_WIDTH, measurePillTextWidth } from "../lib/pillText";
import { fromPercentUI, toPercentUI } from "../lib/number";
import "./canva-editor.css";

const formatTime = (seconds: number) => `00:${seconds.toFixed(1).padStart(4, "0")}`;

type TimelineMode = "pages" | "layers";

interface CanvaEditorViewProps {
  /** 向导生成的项目；为空时读取本地草稿或默认项目。 */
  initialProject?: Project | null;
  /** 返回三步向导（高级模式仍完整保留编辑器）。 */
  onStartWizard?: () => void;
}

export const CanvaEditorView: React.FC<CanvaEditorViewProps> = ({ initialProject, onStartWizard }) => {
  const [initial] = useState(() => loadInitialProject(initialProject));
  const { project, canUndo, canRedo, applyProject, updatePage, updateLayerInPage, updateLayerDirectInPage, commitBefore, undo, redo } =
    useProjectHistory(initial.project, { onRestore: () => setSelectedLayerId(null) });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("pages");
  /** 模板面板子标签：整支故事线（替换全部页面）与单页积木（插入单页）彻底分流 */
  const [templateTab, setTemplateTab] = useState<"story" | "block">("story");
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("pages");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  /** 页面级检查器子标签：页面（基础信息 + 主题）与动画（入场 / 退场 / 节奏 / 特效） */
  const [inspectorTab, setInspectorTab] = useState<"page" | "anim">("page");
  const [layerBounds, setLayerBounds] = useState<Record<string, Box>>({});
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const { exporting, exportProgress, runExport } = useExport();
  const [safeArea, setSafeArea] = useState(false);
  /** 图层剪贴板（Cmd/Ctrl+C / V） */
  const clipboardRef = useRef<Layer | null>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceLayerIdRef = useRef<string | null>(null);
  /** 素材面板拖拽状态：文件拖入面板时高亮上传落点 */
  const [assetDragActive, setAssetDragActive] = useState(false);
  const [assetQuery, setAssetQuery] = useState("");
  const [textQuery, setTextQuery] = useState("");
  const [recentAssets, setRecentAssets] = useState<AssetEntry[]>([]);
  const [showAllRecent, setShowAllRecent] = useState(false);
  /** 素材目录导航：当前已进入的分类 id；null 表示停留在分类浏览首页 */
  const [assetCategoryId, setAssetCategoryId] = useState<string | null>(null);
  const [ratioLocked, setRatioLocked] = useState(true);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<SceneLayout | null>(null);
  /** 顶栏「预览 / 发布 / 分享」：全片预览浮层、模拟发布流程、分享链接与轻提示 */
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [shareId] = useState(() => newId("share"));
  const { message: toast, notify } = useToast();
  const { uploads, setUploads, uploadInputRef, buildUploadItems, addUploadFiles, handleUploadInputChange } = useUploads({ notify });
  const fullPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const total = useMemo(() => totalDuration(project), [project]);
  const { time, playing, play, pause, toggle, seek } = usePlayback({ total, loop: project.loop, initialTime: initial.startTime });
  /** 全片预览浮层使用独立播放实例，避免与编辑时间轴互相干扰 */
  const fullPreview = usePlayback({ total, loop: true });
  const { fontsReady, mediaTick, audioRef } = useProjectMedia(project, time, playing);
  const activeIndex = project.pages.findIndex((page, index) => time < pageStart(project, index) + page.duration);
  const currentIndex = activeIndex < 0 ? project.pages.length - 1 : activeIndex;
  const active = project.pages[currentIndex] ?? project.pages[0];
  /** 素材目录：当前进入的分类对象（id 失效时回退到浏览首页） */
  const activeAssetCategory = ASSET_CATEGORIES.find((category) => category.id === assetCategoryId) ?? null;
  const activeStart = pageStart(project, currentIndex);
  const local = Math.min(active.duration, Math.max(0, time - activeStart));
  const selectedLayer = active.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const natural = RATIO_SIZE[project.ratio];
  const { stageRef, zoom, setZoom, fitScale, displayWidth, displayHeight, designScale, screenScale, customYScale, boxStyle } = useCanvasLayout(natural);

  /** 图层更新只作用于激活页：按当前渲染闭包绑定 active.id（与原内联实现的闭包语义一致） */
  const updateLayer = (layerId: string, patch: Partial<Layer>, record = true) =>
    updateLayerInPage(active.id, layerId, patch, record);
  const updateLayerDirect = (layerId: string, patch: Partial<Layer>) =>
    updateLayerDirectInPage(active.id, layerId, patch);

  const selectPage = (index: number) => {
    pause();
    setSelectedLayerId(null);
    seek(pageSettleTime(project, index));
  };

  /** 打开结构化分镜模板库浮窗（替代直接插入默认版式） */
  const openPagePicker = () => setShowPagePicker(true);
  const closePagePicker = () => {
    setShowPagePicker(false);
    setPreviewLayout(null);
  };
  const previewTemplate = (layout: SceneLayout | null) => setPreviewLayout(layout);

  const selectLayer = (layer: Layer) => {
    pause();
    setSelectedLayerId(layer.id);
    setTimelineMode("layers");
    seek(activeStart + Math.min(active.duration - 0.01, layer.enterDelay + Math.min(0.8, layer.duration / 2)));
  };

  const { startLayerInteraction, dragLayer, endLayerDrag } = useLayerDrag({
    project, active, layerBounds, natural,
    designScale, screenScale, customYScale,
    updateLayerDirect, commitBefore, pause, setSelectedLayerId,
  });
  const { startTimelineDrag, dragTimelineLayer, endTimelineDrag } = useTimelineDrag({
    project, active, selectLayer, updateLayerDirect, commitBefore,
  });

  const previewAnimation = (callback: () => void) => {
    callback();
    pause();
    seek(activeStart + 0.001);
    play();
  };

  /** 退场动画预览：跳到页面结束前，直接看到图层退出过程 */
  const previewExitAnimation = (callback: () => void) => {
    callback();
    pause();
    seek(activeStart + Math.max(0.01, active.duration - Math.max(0.3, active.animDuration ?? 0.72)));
    play();
  };

  const addPage = (layout: SceneLayout = "hero") => {
    const template = createDefaultProject().pages.find((page) => page.layout === layout)!;
    const page = { ...template, id: newId("page"), name: TEMPLATES.find((item) => item.layout === layout)?.name ?? template.name };
    const pages = [...project.pages];
    pages.splice(currentIndex + 1, 0, page);
    const next = { ...project, pages };
    applyProject(next);
    pause();
    seek(pageSettleTime(next, currentIndex + 1));
    setSelectedLayerId(null);
  };

  /** 应用主题：图层颜色多为创建时按旧主题固化，需按色槽映射到新主题，避免深色主题下文字不可读 */
  const applyPageTheme = (page: Page, theme: SceneTheme) => {
    const colorMap = new Map((Object.keys(theme) as (keyof SceneTheme)[]).map((key) => [page.theme[key].toLowerCase(), theme[key]]));
    updatePage(page.id, {
      theme,
      layers: page.layers.map((layer) => {
        if (!layer.color) return layer;
        const mapped = colorMap.get(layer.color.toLowerCase());
        return mapped ? { ...layer, color: mapped } : layer;
      }),
    });
  };

  const duplicatePage = () => {
    const copy: Page = {
      ...structuredClone(active),
      id: newId("page"),
      name: `${active.name} 副本`,
      layers: active.layers.map((layer) => ({ ...structuredClone(layer), id: newId("layer") })),
    };
    const pages = [...project.pages];
    pages.splice(currentIndex + 1, 0, copy);
    const next = { ...project, pages };
    applyProject(next);
    selectPageWith(next, currentIndex + 1);
    notify(`已复制「${active.name}」`);
  };

  const selectPageWith = (next: Project, index: number) => {
    pause();
    setSelectedLayerId(null);
    seek(pageSettleTime(next, index));
  };

  const removePage = () => {
    if (project.pages.length <= 1) return;
    const pages = project.pages.filter((_, index) => index !== currentIndex);
    const next = { ...project, pages };
    applyProject(next);
    selectPageWith(next, Math.min(currentIndex, pages.length - 1));
  };

  const addAsset = (spec: Partial<Layer>) => {
    // 自定义图层使用画布绝对坐标：新元素从默认排布基准之后开始堆叠
    const customCount = active.layers.filter((layer) => layer.role === "custom").length;
    const baseY = LAYER_BASE_Y + customCount * LAYER_GAP;
    const layer = createLayer({
      ...spec,
      role: spec.role ?? "custom",
      y: baseY + (spec.y ?? 0),
      enterDelay: active.enterDelay,
      duration: Math.max(0.1, active.duration - active.enterDelay),
    });
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === active.id ? { ...page, layers: [...page.layers, layer] } : page),
    }));
    setSelectedLayerId(layer.id);
    setTimelineMode("layers");
  };

  /** 把上传素材插入画布：position 为设计稿坐标系中的落点（拖拽到画布时使用） */
  const addMediaLayer = (item: UploadItem, position?: { x: number; y: number }) => {
    if (!item.url) return;
    const isVideo = item.kind === "video";
    const width = Math.min(900, Math.round(1080 * 0.72));
    const height = isVideo ? Math.round(width * 0.5625) : Math.round(width * 0.72);
    const customCount = active.layers.filter((layer) => layer.role === "custom").length;
    const layer = createLayer({
      name: item.name.replace(/\.[^.]+$/, "") || (isVideo ? "视频" : "图片"),
      kind: isVideo ? "video" : "image",
      role: "custom",
      src: item.url,
      fit: "cover",
      content: undefined,
      color: undefined,
      fontSize: undefined,
      width,
      height,
      x: position ? Math.round(position.x - natural.width / 2) : 0,
      y: position
        ? Math.round((position.y - height / 2) / customYScale)
        : LAYER_BASE_Y + customCount * LAYER_GAP,
      enterDelay: active.enterDelay,
      duration: Math.max(0.1, active.duration - active.enterDelay),
    });
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === active.id ? { ...page, layers: [...page.layers, layer] } : page),
    }));
    setSelectedLayerId(layer.id);
    setTimelineMode("layers");
    notify(`${isVideo ? "视频" : "图片"}已添加到画布`);
  };

  /** 套用场景模板：用整套故事线替换现有页面（可撤销） */
  const applyStoryTemplate = (template: (typeof STORY_TEMPLATES)[number]) => {
    if (!window.confirm(`将用「${template.name}」（${template.pages.length} 个页面）替换当前 ${project.pages.length} 个页面，可通过撤销恢复。确定套用？`)) return;
    const base = createDefaultProject();
    const pages = template.pages.map((spec) => {
      const source = structuredClone(base.pages.find((page) => page.layout === spec.layout)!);
      return { ...source, id: newId("page"), name: spec.name, layers: source.layers.map((layer) => ({ ...layer, id: newId("layer") })) };
    });
    const next = { ...project, pages };
    applyProject(next);
    pause();
    setSelectedLayerId(null);
    seek(pageSettleTime(next, 0));
  };

  /** 插入动态组件：一组搭配好排版与错落动效的图层 */
  const addComponent = (kind: ComponentKind) => {
    const theme = active.theme;
    const specs: Partial<Layer>[] = (() => {
      switch (kind) {
        case "titleGroup":
          return [
            { name: "eyebrow 标签", kind: "text", content: "NEW · 全新升级", width: 500, height: 44, fontSize: 30, color: theme.accent, x: -170 },
            { name: "主标题", kind: "text", content: "让创作快人一步", width: 840, height: 110, fontSize: 84, color: theme.ink, y: -70 },
            { name: "副标题", kind: "text", content: "一句话说清产品价值主张", width: 760, height: 64, fontSize: 40, color: "#63666f", x: -40, y: -80 },
          ];
        case "statCard":
          return [
            { name: "数据卡片背景", kind: "shape", content: undefined, width: 640, height: 280, color: theme.accent },
            { name: "数据数值", kind: "text", content: "12.8万+", width: 480, height: 120, fontSize: 96, color: "#ffffff", x: -64, y: -126 },
            { name: "数据说明", kind: "text", content: "累计用户使用", width: 480, height: 48, fontSize: 34, color: "#ffffff", x: -64, y: -180 },
          ];
        case "ctaGroup":
          return [
            { name: "行动按钮", kind: "button", content: "立即开始", width: 420, height: 112, fontSize: 38, color: theme.accent },
            { name: "按钮说明", kind: "text", content: "限时优惠 · 随时取消", width: 500, height: 42, fontSize: 30, color: "#9ca0aa", y: -50 },
          ];
        case "quoteGroup":
          return [
            { name: "引号装饰", kind: "shape", content: undefined, width: 120, height: 140, color: theme.accent2, x: -240, y: -120 },
            { name: "引言正文", kind: "text", content: "上线两周，团队效率翻了一倍，彻底改变了我们的协作方式。", width: 800, height: 260, fontSize: 46, color: theme.ink, x: 100, y: -130 },
            { name: "引言署名", kind: "text", content: "— 林溪 · 产品负责人", width: 480, height: 44, fontSize: 30, color: theme.muted, x: -60, y: -20 },
          ];
        case "listGroup":
          return [
            { name: "要点圆点 1", kind: "shape", content: undefined, width: 24, height: 24, color: theme.accent, x: -288, y: -34 },
            { name: "要点文本 1", kind: "text", content: "30+ 开箱即用模板", width: 660, height: 60, fontSize: 36, color: theme.ink, x: 90, y: -236 },
            { name: "要点圆点 2", kind: "shape", content: undefined, width: 24, height: 24, color: theme.accent, x: -288, y: -304 },
            { name: "要点文本 2", kind: "text", content: "所见即所得零门槛编辑", width: 660, height: 60, fontSize: 36, color: theme.ink, x: 90, y: -506 },
            { name: "要点圆点 3", kind: "shape", content: undefined, width: 24, height: 24, color: theme.accent, x: -288, y: -574 },
            { name: "要点文本 3", kind: "text", content: "一键导出高清视频", width: 660, height: 60, fontSize: 36, color: theme.ink, x: 90, y: -776 },
          ];
        case "barChart":
          return [
            { name: "数据柱 1", kind: "shape", content: undefined, width: 140, height: 230, color: theme.accent2, x: -210, y: 190 },
            { name: "数据柱 2", kind: "shape", content: undefined, width: 140, height: 350, color: theme.accent, x: 0, y: -120 },
            { name: "数据柱 3", kind: "shape", content: undefined, width: 140, height: 470, color: theme.accent, x: 210, y: -430 },
            { name: "图表标注", kind: "text", content: "2023 → 2025 增长趋势", width: 480, height: 50, fontSize: 30, color: theme.muted, x: 0, y: -290 },
          ];
        case "progressBar":
          return [
            { name: "进度标签", kind: "text", content: "目标完成率 72%", width: 500, height: 56, fontSize: 36, color: theme.ink, countUp: true, x: -130, y: 30 },
            { name: "进度轨道", kind: "shape", content: undefined, width: 760, height: 36, color: theme.muted, x: 0, y: -70 },
            { name: "进度填充", kind: "shape", content: undefined, width: 545, height: 36, color: theme.accent, x: -108, y: -260 },
          ];
      }
    })();
    /** 自定义图层使用绝对坐标：组件内部 y 以基准位置为原点，按已有图层数整体下移保持相对排版 */
    const customCount = active.layers.filter((layer) => layer.role === "custom").length;
    const baseY = LAYER_BASE_Y + customCount * LAYER_GAP;
    const layers = specs.map((spec, index) => {
      const enterDelay = active.enterDelay + index * 0.12;
      return createLayer({
        ...spec,
        y: baseY + (spec.y ?? 0),
        enterDelay,
        duration: Math.max(0.1, active.duration - enterDelay),
      });
    });
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === active.id ? { ...page, layers: [...page.layers, ...layers] } : page),
    }));
    setSelectedLayerId(layers[0].id);
    setTimelineMode("layers");
  };

  /** 从素材面板添加：插入图层并记入「最近使用」 */
  const addCatalogItem = (entry: AssetEntry) => {
    if (entry.kind === "component") addComponent(entry.id as ComponentKind);
    else addAsset(entry.spec ?? {});
    setRecentAssets((current) =>
      [entry, ...current.filter((item) => !(item.kind === entry.kind && item.id === entry.id))].slice(0, 6));
  };

  const removeLayer = (layerId: string) => {
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === active.id
        ? { ...page, layers: page.layers.filter((layer) => layer.id !== layerId) }
        : page),
    }));
    setSelectedLayerId(null);
  };

  /** 复制图层：副本错位插入到原图层之后并选中（参考 Canva 顶部工具栏的复制） */
  const duplicateLayer = (layer: Layer) => {
    const copy: Layer = { ...structuredClone(layer), id: newId("layer"), name: `${layer.name} 副本`, x: layer.x + 24, y: layer.y + 24 };
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== active.id) return page;
        const index = page.layers.findIndex((item) => item.id === layer.id);
        if (index < 0) return page;
        const layers = [...page.layers];
        layers.splice(index + 1, 0, copy);
        return { ...page, layers };
      }),
    }));
    setSelectedLayerId(copy.id);
  };

  /** 粘贴图层：与复制一致，副本错位插入并选中 */
  const pasteLayer = () => {
    const source = clipboardRef.current;
    if (!source) return;
    const copy: Layer = {
      ...structuredClone(source),
      id: newId("layer"),
      name: `${source.name} 副本`,
      x: source.x + 24,
      y: source.y + 24,
    };
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === active.id ? { ...page, layers: [...page.layers, copy] } : page),
    }));
    setSelectedLayerId(copy.id);
    setTimelineMode("layers");
  };

  const layerText = (layer: Layer): string => {
    const content = active.content;
    if (layer.role === "custom") return layer.content ?? "";
    if (layer.role === "title") return content.title;
    if (layer.role === "subtitle") return content.subtitle ?? "";
    if (layer.role === "kicker") return content.kicker;
    if (layer.role === "cta") return content.cta ?? "";
    if (layer.role === "quote") return content.quote?.text ?? "";
    if (layer.role === "points") return (content.points ?? []).join("\n");
    if (layer.role === "brand") return content.brand ?? "";
    if (layer.role === "author") return content.quote ? `${content.quote.author}\n${content.quote.role}` : "";
    if (layer.role === "card") return content.card?.value ?? "";
    if (layer.role === "price") return content.price?.amount ?? "";
    return "";
  };

  const updateLayerText = (layer: Layer, value: string) => {
    if (layer.role === "custom") {
      if (layer.kind === "button") {
        // 按钮文字编辑后自动扩展宽度，避免文字溢出胶囊（渲染端按钮按宽度水平居中，改宽度不会偏移）
        const fontSize = layer.fontSize ?? 40;
        const fitted = measurePillTextWidth(value, fontSize);
        updateLayer(layer.id, {
          content: value,
          width: Math.min(MAX_PILL_WIDTH, Math.max(layer.width, Math.round(fitted))),
        });
        return;
      }
      updateLayer(layer.id, { content: value });
      return;
    }
    const content = { ...active.content };
    if (layer.role === "title") content.title = value;
    if (layer.role === "subtitle") content.subtitle = value;
    if (layer.role === "kicker") content.kicker = value;
    if (layer.role === "cta") content.cta = value;
    if (layer.role === "quote" && content.quote) content.quote = { ...content.quote, text: value };
    if (layer.role === "points") {
      content.points = value.split("\n").map((line) => line.trim()).filter(Boolean);
    }
    if (layer.role === "brand") content.brand = value;
    if (layer.role === "author" && content.quote) {
      const [author, role] = value.split("\n");
      content.quote = {
        ...content.quote,
        author: author?.trim() ?? content.quote.author,
        role: role?.trim() ?? content.quote.role,
      };
    }
    if (layer.role === "card" && content.card) content.card = { ...content.card, value };
    if (layer.role === "price" && content.price) content.price = { ...content.price, amount: value };
    updatePage(active.id, { content });
  };

  const { editingId, setEditingId, editDraft, setEditDraft, editBox, setEditBox, editInputRef, beginEdit, commitEdit, cancelEdit, editorStyle } = useInlineEdit({
    designScale,
    screenScale,
    boxStyle,
    enterSelect: (layerId) => {
      pause();
      setSelectedLayerId(layerId);
    },
    getLayerText: layerText,
    commitLayerText: updateLayerText,
    getEditingLayer: () => editingLayer,
  });
  const editingLayer = active.layers.find((layer) => layer.id === editingId && isEditableTextLayer(layer)) ?? null;

  /** 顶部快捷配置条：字号 / 透明度 / 水平居中 */
  const currentFontSize = selectedLayer
    ? selectedLayer.fontSize ?? defaultLayerFontSize(selectedLayer, active)
    : 0;
  const setLayerFontSize = (size: number) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, { fontSize: Math.min(400, Math.max(12, Math.round(size))) });
  };
  const bumpLayerOpacity = (delta: number) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, {
      opacity: Math.min(1, Math.max(0, Math.round((selectedLayer.opacity + delta) * 10) / 10)),
    });
  };
  const centerSelectedLayer = () => {
    if (!selectedLayer) return;
    const box = layerBounds[selectedLayer.id];
    if (!box) return;
    updateLayer(selectedLayer.id, { x: Math.round(selectedLayer.x + (540 - (box.x + box.w / 2))) });
  };

  useDraftSync(project);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // 内联编辑期间在渲染副本中隐藏原图层文字，避免与输入框双重渲染
    const renderProject = editingLayer
      ? {
          ...project,
          pages: project.pages.map((page) =>
            page.id === active.id
              ? { ...page, layers: page.layers.map((layer) => (layer.id === editingLayer.id ? { ...layer, visible: false } : layer)) }
              : page
          ),
        }
      : project;
    setLayerBounds(drawProjectFrame(ctx, renderProject, time));
  }, [project, time, fontsReady, editingId, mediaTick]);

  /** 内容输入框自适应高度：草稿换行超出容器时向下扩展 */
  useEffect(() => {
    const input = contentInputRef.current;
    if (!input || !selectedLayer) return;
    input.style.height = "auto";
    // scrollHeight 不含边框，补上上下边框宽度避免末行被裁掉 1-2px
    const borders = input.offsetHeight - input.clientHeight;
    input.style.height = `${Math.ceil(input.scrollHeight) + borders}px`;
  }, [selectedLayer?.id, selectedLayer ? layerText(selectedLayer) : ""]);

  /** 悬停版式时，在画布上叠加绘制该版式的半透明预览帧 */
  useEffect(() => {
    if (!previewLayout) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const template = structuredClone(createDefaultProject().pages.find((page) => page.layout === previewLayout)!);
    const previewProject: Project = { ...project, pages: [template] };
    drawProjectFrame(ctx, previewProject, pageSettleTime(previewProject, 0));
  }, [previewLayout, project.ratio, fontsReady]);

  useEffect(() => {
    setSelectedLayerId(null);
    setEditingId(null);
    setEditBox(null);
  }, [active.id]);

  useEditorShortcuts({
    undo, redo, selectedLayer, clipboardRef, notify,
    pasteLayer, duplicateLayer, removeLayer, updateLayer,
    setSelectedLayerId, setEditingId,
  });

  const handleExport = () => runExport(project, {
    before: pause,
    onError: (message) => window.alert(message),
  });

  /** 从系统拖拽图片 / 视频到画布：落点即图层中心 */
  const handleStageDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * natural.width,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * natural.height,
    };
    const files = event.dataTransfer.files;
    if (!files?.length) return;
    const items = await buildUploadItems(files);
    if (!items.length) {
      notify("仅支持图片与视频格式的文件");
      return;
    }
    setUploads((current) => [...current, ...items]);
    items.forEach((item, index) => addMediaLayer(item, { x: point.x, y: point.y + index * 40 }));
  };

  /** 替换选中图片 / 视频图层的素材 */
  const handleReplaceMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const layerId = replaceLayerIdRef.current;
    event.target.value = "";
    replaceLayerIdRef.current = null;
    if (!file || !layerId) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      notify("仅支持图片与视频格式的文件");
      return;
    }
    const kind = file.type.startsWith("video/") ? "video" as const : "image" as const;
    const src = await fileToUrl(file);
    updateLayer(layerId, { src, kind });
    notify("素材已替换");
  };

  /** 全片预览：打开浮层并从头循环播放 */
  const openFullPreview = () => {
    pause();
    setSelectedLayerId(null);
    setFullPreviewOpen(true);
    fullPreview.seek(0);
    fullPreview.play();
  };
  const closeFullPreview = () => {
    fullPreview.pause();
    setFullPreviewOpen(false);
  };
  /** 全片预览浮层：随独立播放进度渲染整支视频画面 */
  useEffect(() => {
    const canvas = fullPreviewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !fullPreviewOpen) return;
    drawProjectFrame(ctx, project, fullPreview.time);
  }, [fullPreviewOpen, project, fullPreview.time, fontsReady, mediaTick]);

  /** 模拟发布：生成分享链接并给出成功反馈 */
  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    setPublishing(false);
    setPublished(true);
    notify("发布成功！任何人都可以通过分享链接观看");
  };

  /** 分享：复制分享链接到剪贴板 */
  const shareLink = `https://motioncraft.app/s/${shareId}`;
  const handleShare = async () => {
    const copied = await copyText(shareLink);
    notify(copied ? "分享链接已复制到剪贴板" : `复制失败，请手动复制：${shareLink}`);
  };

  return (
    <div className="canva-editor">
      <header className="topbar">
        <div className="brand">
          <BrandMark/>
          <strong>MotionCraft</strong><span className="top-divider"/>
          <input className="project-title" value={project.title} aria-label="项目名称"
            onChange={(event) => applyProject({ ...project, title: event.target.value })}/>
          <span className="save-state"><span/>草稿已保存</span>
        </div>
        <div className="top-actions">
          <IconButton variant="tool" icon="undo" label="撤销" title="撤销" disabled={!canUndo} onClick={undo}/>
          <IconButton variant="tool" icon="redo" label="重做" title="重做" disabled={!canRedo} onClick={redo}/>
          <span className="ratio-chip">{RATIO_LABEL[project.ratio]}</span>
          <Button variant="outline" icon="play" iconSize={14} title="全片预览" onClick={openFullPreview}>预览</Button>
          <Button variant="outline" className="mc-button--publish" icon={published ? "check" : "globe"} iconSize={14} title="发布到分享链接" onClick={handlePublish} disabled={publishing}>
            {published ? "已发布" : publishing ? "发布中…" : "发布"}
          </Button>
          <Button variant="outline" icon="share" iconSize={14} title="复制分享链接" onClick={handleShare}>分享</Button>
          <ExportButton variant="bar" exporting={exporting} progress={exportProgress} onClick={handleExport}/>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <Tabs variant="rail" className="sidebar-rail"
            items={RAIL_TABS.map((tab) => ({ id: tab.id, label: tab.label, icon: tab.icon, active: sidebarTab === tab.id }))}
            onSelect={(id) => setSidebarTab(id as SidebarTab)}/>

          <div className="sidebar-panel">
          {sidebarTab === "pages" && <div className="sidebar-content">
            <PanelHeading title="视频页面" sub={<>{project.pages.length} 个分镜 · 共 {total.toFixed(1)} 秒</>}/>
            <div className="page-list">
              {project.pages.map((page, index) => <div key={page.id} className={`page-list-item ${index === currentIndex ? "is-active" : ""}`}>
                <button className="page-select" onClick={() => selectPage(index)}>
                  <span className="page-mini-thumb">
                    <PageThumb project={project} index={index} fontsReady={fontsReady} className="page-thumb-canvas"/>
                    <i>{String(index + 1).padStart(2, "0")}</i>
                  </span>
                  <span><strong>{page.name}</strong><small>{page.layers.length} 个图层 · {page.duration.toFixed(1)}s</small></span>
                </button>
                {index === currentIndex && <span className="active-dot"/>}
              </div>)}
            </div>
            <button className="add-page-entry" onClick={openPagePicker}><Icon name="plus" size={14}/>添加页面 · 从版式库选择</button>
          </div>}

          {sidebarTab === "layers" && <div className="sidebar-content">
            <PanelHeading title="页面图层" sub={<>{active.name} · {active.layers.length} 个图层</>}
              action={<IconButton variant="small" icon="plus" label="添加文本图层"
                onClick={() => addAsset(createTextLayerSpec(active.theme.ink))}/>}/>
            <div className="layer-list">
              {[...active.layers].reverse().map((layer) => <div key={layer.id} className={`layer-list-item ${selectedLayerId === layer.id ? "is-active" : ""} ${!layer.visible ? "is-hidden" : ""}`}>
                <button className="layer-select" onClick={() => selectLayer(layer)}>
                  <Icon name={layerIcon(layer)}/>
                  <span>{layer.name}</span>
                </button>
                <button aria-label={layer.visible ? "隐藏图层" : "显示图层"} onClick={() => updateLayer(layer.id, { visible: !layer.visible })}><Icon name="eye" size={14}/></button>
                <button aria-label={layer.locked ? "解锁图层" : "锁定图层"} onClick={() => updateLayer(layer.id, { locked: !layer.locked })}><Icon name={layer.locked ? "lock" : "unlock"} size={14}/></button>
              </div>)}
            </div>
          </div>}

          {sidebarTab === "templates" && <div className="sidebar-content">
            <PanelHeading title="模板" sub="整支故事线与单页版式"/>
            <Tabs variant="segmented" ariaLabel="模板类型"
              items={[
                { id: "story", label: "整支故事线", active: templateTab === "story" },
                { id: "block", label: "单页积木", active: templateTab === "block" },
              ]}
              onSelect={(id) => setTemplateTab(id as "story" | "block")}/>
            {templateTab === "story" ? <>
              <div className="panel-hint"><Icon name="bulb" size={13}/>提示：点击将<strong>替换</strong>整条故事线</div>
              <div className="story-list">
                {STORY_CARDS.map((template) => <button key={template.id} onClick={() => applyStoryTemplate(template)}>
                  <strong>{template.name}</strong>
                  <small className="story-flow">
                    {template.description.split("→").map((step, stepIndex) => <React.Fragment key={stepIndex}>
                      {stepIndex > 0 && <i aria-hidden="true">→</i>}{step.trim()}
                    </React.Fragment>)}
                  </small>
                  <em>{template.pages.length} 页 · {template.duration.toFixed(1)}s</em>
                </button>)}
              </div>
            </> : <>
              <div className="panel-hint"><Icon name="bulb" size={13}/>提示：点击将<strong>插入</strong>到当前页面之后</div>
              <div className="template-list">
                {TEMPLATES.map((template) => <button key={template.layout}
                  onMouseEnter={() => previewTemplate(template.layout)} onMouseLeave={() => previewTemplate(null)}
                  onFocus={() => previewTemplate(template.layout)} onBlur={() => previewTemplate(null)}
                  onClick={() => addPage(template.layout)}>
                  <span className={`template-icon ${template.layout}`}><Icon name="page"/></span>
                  <span><strong>{template.name}</strong><small>{template.description}</small></span><Icon name="plus" size={14}/>
                </button>)}
              </div>
            </>}
          </div>}

          {sidebarTab === "assets" && <div className="sidebar-content asset-drop-zone"
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer.types).includes("Files")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setAssetDragActive(true);
            }}
            onDragLeave={(event) => {
              const target = event.relatedTarget;
              if (target instanceof Node && event.currentTarget.contains(target)) return;
              setAssetDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setAssetDragActive(false);
              const files = event.dataTransfer?.files;
              if (files?.length) addUploadFiles(files);
            }}>
            {assetDragActive && <div className="asset-drop-overlay" aria-hidden="true">
              <Icon name="upload" size={22}/><strong>松开鼠标上传素材</strong><small>支持图片与视频格式</small>
            </div>}
            <div className="asset-search">
              <Icon name="search" size={15}/>
              <input value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)}
                placeholder="搜索文本组合 / 图表 / 按钮 / 形状…"/>
            </div>
            {(() => {
              const query = assetQuery.trim();
              const match = (item: AssetEntry) => !query || item.label.includes(query) || item.desc.includes(query);
              const renderTiles = (items: AssetEntry[], keyPrefix = "") => (
                <div className="asset-strip">
                  {items.map((entry) => (
                    <button key={`${keyPrefix}${entry.kind}-${entry.id}`} className="asset-tile" onClick={() => addCatalogItem(entry)} title={entry.desc}>
                      <span className="asset-thumb"><AssetPreview entry={entry}/></span>
                      <strong>{entry.label}</strong>
                    </button>
                  ))}
                </div>);

              /* 搜索模式：跨所有分类检索，结果按分类分组呈现 */
              if (query) {
                const results = ASSET_CATEGORIES
                  .map((category) => ({ category, items: category.items.filter(match) }))
                  .filter((result) => result.items.length > 0);
                return <>
                  {results.map(({ category, items }) => <React.Fragment key={category.id}>
                    <PanelRowHeading title={category.label}/>
                    {renderTiles(items)}
                  </React.Fragment>)}
                  {results.length === 0 && <EmptyState>没有找到与「{query}」相关的素材</EmptyState>}
                </>;
              }

              /* 分类详情视图：直接展示当前分类下的素材 */
              if (activeAssetCategory) {
                return <>
                  <PanelRowHeading title={activeAssetCategory.label} count={`${activeAssetCategory.items.length} 个素材`}/>
                  <button className="asset-back" onClick={() => setAssetCategoryId(null)}>
                    <Icon name="chevron" size={13}/><span>返回浏览</span>
                  </button>
                  {renderTiles(activeAssetCategory.items)}
                </>;
              }

              /* 分类首页（参考 Canva 素材面板）：最近使用 → 为我推荐 → 浏览类别 */
              const recent = recentAssets;
              return <>
                {recent.length > 0 && <>
                  <PanelRowHeading title="最近使用"
                    action={recent.length > 4 && <button onClick={() => setShowAllRecent(!showAllRecent)}>{showAllRecent ? "收起" : "查看全部"}</button>}/>
                  {renderTiles(showAllRecent ? recent : recent.slice(0, 4), "recent-")}
                </>}
                {uploads.length > 0 && <>
                  <PanelRowHeading title="我的上传" action={<button onClick={() => setSidebarTab("uploads")}>查看全部</button>}/>
                  <div className="asset-strip">
                    {uploads.map((file) => (
                      <button key={file.id} className="asset-tile upload-asset-tile" title={`插入「${file.name}」`} onClick={() => addMediaLayer(file)}>
                        <span className="asset-thumb upload-thumb">
                          {file.kind === "image" && file.url
                            ? <img src={file.url} alt={file.name}/>
                            : <span className="upload-thumb-video"><Icon name="play" size={16}/></span>}
                        </span>
                        <strong>{file.name}</strong>
                      </button>
                    ))}
                  </div>
                </>}
                <PanelRowHeading title="为我推荐"/>
                {renderTiles(RECOMMENDED_ENTRIES, "rec-")}
                <PanelRowHeading title="浏览类别"/>
                <div className="category-grid category-browse">
                  {ASSET_CATEGORIES.map((category) => (
                    <button key={category.id} className="category-card category-tile" onClick={() => setAssetCategoryId(category.id)} title={category.desc}>
                      <span className={`tile-art ${category.color}`}>
                        <span className="tile-back"/>
                        <span className="tile-front"><CategoryArt id={category.id}/></span>
                      </span>
                      <strong>{category.label}</strong>
                    </button>
                  ))}
                </div>
              </>;
            })()}
          </div>}

          {sidebarTab === "text" && <div className="sidebar-content">
            <PanelHeading title="文本" sub={`添加到「${active.name}」`}/>
            <div className="asset-search">
              <Icon name="search" size={15}/>
              <input value={textQuery} onChange={(event) => setTextQuery(event.target.value)}
                placeholder="搜索文字组合"/>
            </div>
            <div className="text-cta-row">
              <button className="text-primary-cta"
                onClick={() => addAsset(createTextLayerSpec(active.theme.ink))}>
                <Icon name="text" size={16}/>添加文本框
              </button>
              <button className="text-ai-cta" title="随机插入一句营销文案"
                onClick={() => addAsset({ kind: "text", name: "AI 文案", content: AI_WRITING_SAMPLES[Math.floor(Math.random() * AI_WRITING_SAMPLES.length)], width: 800, height: 150, fontSize: 64, color: active.theme.ink })}>
                <Icon name="sparkle" size={16}/>AI写作
              </button>
            </div>
            {(() => {
              const query = textQuery.trim();
              const match = (item: AssetEntry) => !query || item.label.includes(query) || item.desc.includes(query);
              const recent = query ? [] : recentAssets.filter((item) => item.id.startsWith("text-")).slice(0, 6);
              const presets = TEXT_STYLE_PRESETS.filter((preset) => match(preset.entry));
              const effects = TEXT_EFFECT_ENTRIES.filter(match);
              return <>
                {recent.length > 0 && <>
                  <PanelRowHeading title="最近使用"/>
                  <div className="category-grid">
                    {recent.map((entry) => (
                      <button key={`recent-${entry.kind}-${entry.id}`} className="category-card" onClick={() => addCatalogItem(entry)} title={entry.desc}>
                        <span className={`category-icon ${entry.color}`}><Icon name={entry.icon} size={20}/></span>
                        <strong>{entry.label}</strong>
                      </button>
                    ))}
                  </div>
                </>}
                {presets.length > 0 && <PanelRowHeading title="默认文字样式"/>}
                <div className="text-style-list">
                  {presets.map((preset) => (
                    <button key={preset.entry.id} className="text-style-row" onClick={() => addCatalogItem(preset.entry)} title={preset.entry.desc}>
                      <span style={{ fontSize: preset.previewSize, fontWeight: preset.previewWeight }}>{preset.entry.label}</span>
                    </button>
                  ))}
                </div>
                {effects.length > 0 && <>
                  <PanelRowHeading title="文字效果"/>
                  <div className="category-grid">
                    {effects.map((entry) => (
                      <button key={`${entry.kind}-${entry.id}`} className="category-card" onClick={() => addCatalogItem(entry)} title={entry.desc}>
                        <span className={`category-icon ${entry.color}`}><Icon name={entry.icon} size={20}/></span>
                        <strong>{entry.label}</strong>
                      </button>
                    ))}
                  </div>
                </>}
                {query && presets.length === 0 && effects.length === 0 && <EmptyState>没有找到与「{query}」相关的文字组合</EmptyState>}
                <p className="mc-section-note">添加后双击画布中的文字，可直接在画布上修改内容。</p>
              </>;
            })()}
          </div>}

          {sidebarTab === "uploads" && <div className="sidebar-content">
            <PanelHeading title="上传" sub={uploads.length ? `${uploads.length} 个文件` : "上传图片或视频素材"}/>
            <UploadDrop title="点击上传素材" hint="支持图片与视频格式" iconSize={20}
              onClick={() => uploadInputRef.current?.click()}/>
            <input ref={uploadInputRef} type="file" hidden multiple accept="image/*,video/*"
              onChange={handleUploadInputChange}/>
            {uploads.length > 0 && <div className="upload-list">
              {uploads.map((file) => <div key={file.id} className="upload-item">
                <span className="upload-item-thumb">
                  {file.kind === "image" && file.url ? <img src={file.url} alt=""/> : <Icon name="play" size={11}/>}
                </span>
                <span>{file.name}</span><small>{file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}</small>
                <button className="upload-insert" onClick={() => addMediaLayer(file)}>插入</button>
              </div>)}
            </div>}
          </div>}

          {sidebarTab === "project" && <div className="sidebar-content">
            <PanelHeading title="项目设置" sub={<>{project.pages.length} 个页面 · {total.toFixed(1)}s · {RATIO_LABEL[project.ratio]}</>}/>
            <label className="stack-field">项目名称<input value={project.title} aria-label="项目名称"
              onChange={(event) => applyProject({ ...project, title: event.target.value })}/></label>
            <div className="subsection-heading">画幅比例</div>
            <AspectRatioPicker variant="chips" value={project.ratio} onChange={(ratio) => applyProject({ ...project, ratio })}/>
            <div className="subsection-heading">播放</div>
            <div className="toggle-row"><span>循环播放</span><button className={`switch ${project.loop ? "is-on" : ""}`}
              onClick={() => applyProject({ ...project, loop: !project.loop })}><i/></button></div>
            <div className="subsection-heading">背景音乐</div>
            <input ref={bgmInputRef} type="file" hidden accept="audio/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (!file.type.startsWith("audio/")) {
                  notify("请选择音频文件");
                  return;
                }
                const src = await fileToUrl(file);
                applyProject({ ...project, audio: { src, name: file.name, volume: 0.6 } });
                notify("背景音乐已添加，导出时自动混音");
              }}/>
            {project.audio ? (
              <div className="bgm-card">
                <span className="bgm-name"><Icon name="music" size={14}/>{project.audio.name}</span>
                <RangeField value={project.audio.volume} min={0} max={1} step={0.05} ariaLabel="背景音乐音量"
                  echo={`${Math.round(project.audio.volume * 100)}%`}
                  onInput={(raw) => applyProject({ ...project, audio: { ...project.audio!, volume: Number(raw) } })}/>
                <div className="bgm-actions">
                  <button onClick={() => bgmInputRef.current?.click()}>替换</button>
                  <button className="danger" onClick={() => applyProject({ ...project, audio: undefined })}>移除</button>
                </div>
              </div>
            ) : (
              <UploadDrop compact icon="music" title="添加背景音乐" hint="导出视频时自动与画面混音"
                onClick={() => bgmInputRef.current?.click()}/>
            )}
            {onStartWizard && <button className="wizard-return" onClick={onStartWizard}><Icon name="sparkle" size={14}/>返回三步向导</button>}
            <ExportButton variant="panel" exporting={exporting} progress={exportProgress} onClick={handleExport}/>
          </div>}

          {sidebarTab === "apps" && <div className="sidebar-content">
            <PanelHeading title="来自 MotionCraft 的更多内容" sub="访问更多内容，创建绝佳设计"/>
            <div className="app-grid">
              {APP_ENTRIES.map((app) => (
                <button key={app.name} className="app-tile" type="button" title={app.desc}
                  onClick={() => {
                    if (app.target) { setSidebarTab(app.target); notify(`已打开「${app.name}」`); }
                    else notify(`「${app.name}」即将上线`);
                  }}>
                  <span className="app-tile-icon"><Icon name={app.icon} size={24}/></span>
                  <span className="app-tile-name">{app.name}</span>
                </button>
              ))}
            </div>
          </div>}
          </div>
        </aside>

        <main className="stage">
          <div className="stage-toolbar">
            {selectedLayer ? (
              /* 参考 Canva：选中元素后，快捷配置条出现在中间画布区域顶部，而不是整个页面顶栏 */
              <div className="context-bar" role="toolbar" aria-label="元素快捷配置">
                <span className="context-target">
                  <Icon name={layerIcon(selectedLayer)} size={15}/>
                  <strong>{selectedLayer.name}</strong>
                </span>
                {supportsTextStyle(selectedLayer) && <>
                  <Stepper label="字号" ariaLabel="字体大小" value={currentFontSize} min={12} max={400}
                    onStep={(delta) => setLayerFontSize(currentFontSize + delta * 2)}
                    onInput={(raw) => setLayerFontSize(Number(raw) || currentFontSize)}/>
                  <ColorField variant="control" value={selectedLayer.color ?? defaultLayerColor(selectedLayer, active)}
                    ariaLabel={selectedLayer.kind === "button" ? "按钮颜色" : "文字颜色"}
                    title={selectedLayer.kind === "button" ? "按钮颜色" : "文字颜色"}
                    onChange={(value) => updateLayer(selectedLayer.id, { color: value })}/>
                </>}
                <Stepper className="opacity-block" label="透明度" ariaLabel="透明度" value={toPercentUI(selectedLayer.opacity)}
                  min={0} max={100} unit="%"
                  onStep={(delta) => bumpLayerOpacity(delta / 10)}
                  onInput={(raw) => updateLayer(selectedLayer.id, { opacity: fromPercentUI(Number(raw) || 0) })}/>
                <span className="toolbar-divider"/>
                <IconButton variant="context" icon="alignCenter" size={15} label="水平居中" title="水平居中"
                  disabled={!layerBounds[selectedLayer.id]} onClick={centerSelectedLayer}/>
              </div>
            ) : (
              <div className="breadcrumb"><span>{String(currentIndex + 1).padStart(2, "0")}</span>{active.name}<Icon name="chevron" size={12}/><strong>页面</strong></div>
            )}
            <div className="zoom-tools">
              <button className={`safe-area-toggle ${safeArea ? "is-active" : ""}`} title="显示 / 隐藏安全区参考线" onClick={() => setSafeArea((value) => !value)}>安全区</button>
              <button onClick={() => setZoom((value) => Math.max(40, value - 10))}>−</button>
              <button className="zoom-value" onClick={() => setZoom(100)}>{zoom}%</button><button onClick={() => setZoom((value) => Math.min(180, value + 10))}>+</button></div>
          </div>
          <div className="stage-canvas" ref={stageRef} onDragOver={(event) => event.preventDefault()} onDrop={handleStageDrop}>
            <div className="canvas-shell" style={{ width: displayWidth, height: displayHeight }}>
              <canvas ref={canvasRef} className="board" width={natural.width} height={natural.height}
                style={{ width: displayWidth, height: displayHeight }} aria-label="视频画面预览"
                onPointerDown={() => setSelectedLayerId(null)}/>
              {safeArea && <div className="safe-area-guide" aria-hidden="true"><span/></div>}
              {previewLayout ? <>
                <canvas ref={previewCanvasRef} className="board preview-board" width={natural.width} height={natural.height}
                  style={{ width: displayWidth, height: displayHeight }} aria-hidden="true"/>
                <div className="preview-frame">
                  <span className="preview-badge">预览「{TEMPLATES.find((item) => item.layout === previewLayout)?.name}」· 将插入到「{active.name}」之后</span>
                </div>
              </> : <>
              <div className="selection-layer">
                {active.layers.map((layer) => {
                  const box = layerBounds[layer.id];
                  if (!box || !layer.visible) return null;
                  return <button key={layer.id} className={`layer-hitbox ${selectedLayerId === layer.id ? "is-selected" : ""}`}
                    style={boxStyle(box, layer)} aria-label={`选择 ${layer.name}`}
                    title={isEditableTextLayer(layer) && !layer.locked ? "双击编辑文字" : undefined}
                    onPointerDown={(event) => startLayerInteraction(event, layer, "move")} onPointerMove={dragLayer}
                    onPointerUp={endLayerDrag} onPointerCancel={endLayerDrag}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (!layer.locked) beginEdit(layer, layerBounds[layer.id]);
                    }}>
                    {selectedLayerId === layer.id && editingId !== layer.id && <>
                      {/* 选中元素的悬浮工具条：名称 + 隐藏 / 锁定 / 复制 / 删除，悬浮在元素上方 */}
                      <SelectionToolbar
                        label={`${layer.name} · ${isAdaptiveTextLayer(layer) ? `${Math.round(layer.fontSize ?? defaultLayerFontSize(layer, active))}px` : `${Math.round(layer.scaleX * 100)}%`}`}
                        actions={[
                          { icon: layer.visible ? "eye" : "eyeOff", label: layer.visible ? `隐藏 ${layer.name}` : `显示 ${layer.name}`,
                            title: layer.visible ? "隐藏图层" : "显示图层", active: !layer.visible,
                            onClick: () => updateLayer(layer.id, { visible: !layer.visible }) },
                          { icon: layer.locked ? "lock" : "unlock", label: layer.locked ? `解锁 ${layer.name}` : `锁定 ${layer.name}`,
                            title: layer.locked ? "解锁图层" : "锁定图层", active: layer.locked,
                            onClick: () => updateLayer(layer.id, { locked: !layer.locked }) },
                          { icon: "copy", label: `复制 ${layer.name}`, title: "复制图层",
                            onClick: () => duplicateLayer(layer) },
                          { icon: "trash", label: `删除 ${layer.name}`, title: "删除图层", danger: true,
                            onClick: () => removeLayer(layer.id) },
                        ]}/>
                      <span className="rotate-stem"/><i className="rotate-handle" aria-label="旋转图层"
                        onPointerDown={(event) => startLayerInteraction(event, layer, "rotate")}/>
                      {(["nw", "ne", "sw", "se"] as const).map((handle) => <i key={handle} className={`handle ${handle}`}
                        aria-label={`${handle} 缩放`} onPointerDown={(event) => startLayerInteraction(event, layer, "resize", handle)}/>)}
                    </>}
                  </button>;
                })}
                {editingLayer && editBox && (
                  <textarea
                    ref={editInputRef}
                    className={`layer-text-editor ${editingLayer.role === "cta" || (editingLayer.role === "custom" && editingLayer.kind === "button") ? "is-pill" : ""}`}
                    style={editorStyle(editingLayer, editBox, active)}
                    value={editDraft}
                    spellCheck={false}
                    aria-label={`编辑 ${editingLayer.name} 文本`}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onBlur={commitEdit}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        commitEdit();
                      }
                    }}/>
                )}
              </div>
              </>}
            </div>
            <div className="playback-dock">
              <button className="play-button" aria-label={playing ? "暂停" : "播放"} onClick={toggle}><Icon name={playing ? "pause" : "play"} size={15}/></button>
              <span className="timecode">{formatTime(time)} <i>/</i> {formatTime(total)}</span><span className="dock-divider"/>
              <AspectRatioPicker variant="switch" value={project.ratio} onChange={(ratio) => applyProject({ ...project, ratio })}/>
              <span className="dock-divider"/><button className="fullscreen-button" aria-label="全屏" onClick={() => stageRef.current?.requestFullscreen?.()}><Icon name="fullscreen" size={14}/></button>
            </div>
          </div>
        </main>

        <aside className="inspector">
          <Tabs variant="underline"
            items={[
              { id: "page", label: "页面", active: !selectedLayer && inspectorTab === "page" },
              { id: "anim", label: "动画", active: !selectedLayer && inspectorTab === "anim" },
              { id: "element", label: "元素", active: selectedLayer != null, disabled: !selectedLayer, onSelect: () => {} },
            ]}
            onSelect={(id) => { setSelectedLayerId(null); setInspectorTab(id === "anim" ? "anim" : "page"); }}/>
          {selectedLayer ? <>
            <div className="inspector-heading"><div><h2>{selectedLayer.name}</h2><p>{selectedLayer.kind.toUpperCase()} · {selectedLayer.role === "custom" ? "自定义图层" : "版式图层"}</p></div></div>
            <div className="inspector-body">
              {(selectedLayer.kind === "image" || selectedLayer.kind === "video") && (
                <Section title="素材">
                  <div className={`media-thumb ${selectedLayer.kind}`}>
                    {selectedLayer.kind === "image" && selectedLayer.src
                      ? <img src={selectedLayer.src} alt={selectedLayer.name}/>
                      : <span><Icon name={selectedLayer.kind === "video" ? "play" : "image"} size={22}/>
                          {selectedLayer.src ? "视频素材已加载" : "暂无素材"}</span>}
                  </div>
                  <ChipRow
                    items={[
                      { id: "replace", label: "替换素材" },
                      { id: "cover", label: "裁切铺满", active: selectedLayer.fit !== "contain" },
                      { id: "contain", label: "完整显示", active: selectedLayer.fit === "contain" },
                    ]}
                    onSelect={(id) => {
                      if (id === "replace") {
                        replaceLayerIdRef.current = selectedLayer.id;
                        replaceInputRef.current?.click();
                      } else if (id === "cover") {
                        previewAnimation(() => updateLayer(selectedLayer.id, { fit: "cover" satisfies MediaFit }));
                      } else {
                        previewAnimation(() => updateLayer(selectedLayer.id, { fit: "contain" satisfies MediaFit }));
                      }
                    }}/>
                  <p className="mc-section-note">从系统拖入图片 / 视频到画布，可直接按落点添加素材。</p>
                  {selectedLayer.kind === "video" && <p className="mc-section-note">视频素材暂不随草稿持久化，刷新后需重新选择。</p>}
                </Section>
              )}
              {layerText(selectedLayer) !== "" || ["title", "subtitle", "kicker", "cta", "quote", "card", "price", "custom", "points", "brand", "author"].includes(selectedLayer.role) && selectedLayer.kind !== "shape" ? <Section title="内容">
                <textarea className="content-input" ref={contentInputRef}
                  value={layerText(selectedLayer)} onChange={(event) => updateLayerText(selectedLayer, event.target.value)}/>
              </Section> : null}
              {selectedLayer.role === "price" && active.content.price && (
                <Section title="价格字段" note="价格数字直接在画布上双击修改。">
                  <div className="prop-grid">
                    <LabeledInput label="单位" value={active.content.price.unit}
                      onInput={(raw) => updatePage(active.id, { content: { ...active.content, price: { ...active.content.price!, unit: raw } } })}/>
                    <LabeledInput label="原价" value={active.content.price.original}
                      onInput={(raw) => updatePage(active.id, { content: { ...active.content, price: { ...active.content.price!, original: raw } } })}/>
                    <LabeledInput label="角标" value={active.content.price.badge}
                      onInput={(raw) => updatePage(active.id, { content: { ...active.content, price: { ...active.content.price!, badge: raw } } })}/>
                  </div>
                </Section>
              )}
              {selectedLayer.role === "card" && active.content.card && (
                <Section title="数据字段" note="数据值直接在画布上双击修改。">
                  <div className="prop-grid">
                    <LabeledInput label="标签" value={active.content.card.label}
                      onInput={(raw) => updatePage(active.id, { content: { ...active.content, card: { ...active.content.card!, label: raw } } })}/>
                    <LabeledInput label="百分比" type="number" min={0} max={100} value={active.content.card.percent}
                      onInput={(raw) => updatePage(active.id, { content: { ...active.content, card: { ...active.content.card!, percent: Math.min(100, Math.max(0, Number(raw) || 0)) } } })}/>
                  </div>
                </Section>
              )}
              <Section title="高级">
                <div className="prop-grid">
                  <LabeledInput label="宽度" type="number" min={40} value={selectedLayer.width}
                    onInput={(raw) => {
                      const width = Math.max(40, Number(raw) || 40);
                      updateLayer(selectedLayer.id, ratioLocked
                        ? { width, height: Math.max(40, Math.round(width * selectedLayer.height / selectedLayer.width)) }
                        : { width });
                    }}/>
                  <LabeledInput label="高度" type="number" min={40} value={selectedLayer.height}
                    onInput={(raw) => {
                      const height = Math.max(40, Number(raw) || 40);
                      updateLayer(selectedLayer.id, ratioLocked
                        ? { height, width: Math.max(40, Math.round(height * selectedLayer.width / selectedLayer.height)) }
                        : { height });
                    }}/>
                  <label>比例<button className={`prop-lock ${ratioLocked ? "is-on" : ""}`} onClick={() => setRatioLocked(!ratioLocked)}
                    title={ratioLocked ? "解锁宽高比例" : "锁定宽高比例"}><Icon name={ratioLocked ? "lock" : "unlock"} size={14}/></button></label>
                  <LabeledInput label="X" type="number" value={Math.round(selectedLayer.x)} onInput={(raw) => updateLayer(selectedLayer.id, { x: Number(raw) || 0 })}/>
                  <LabeledInput label="Y" type="number" value={Math.round(selectedLayer.y)} onInput={(raw) => updateLayer(selectedLayer.id, { y: Number(raw) || 0 })}/>
                  <LabeledInput label="旋转" type="number" value={selectedLayer.rotation} onInput={(raw) => updateLayer(selectedLayer.id, { rotation: Number(raw) || 0 })}/>
                  <LabeledInput label="横向缩放" type="number" min={0.1} step={0.1} value={selectedLayer.scaleX} onInput={(raw) => updateLayer(selectedLayer.id, { scaleX: Math.max(0.1, Number(raw) || 0.1) })}/>
                  <LabeledInput label="纵向缩放" type="number" min={0.1} step={0.1} value={selectedLayer.scaleY} onInput={(raw) => updateLayer(selectedLayer.id, { scaleY: Math.max(0.1, Number(raw) || 0.1) })}/>
                  <LabeledInput label="透明度" type="number" min={0} max={100} step={1}
                    value={toPercentUI(selectedLayer.opacity)}
                    onInput={(raw) => updateLayer(selectedLayer.id, { opacity: fromPercentUI(Number(raw) || 0) })}/>
                </div>
                <FieldRow label="可见时长" unit="s">
                  <NumberField min={0.1} max={active.duration} step={0.1} value={Number(selectedLayer.duration.toFixed(1))}
                    onInput={(raw) => updateLayer(selectedLayer.id, { duration: Math.max(0.1, Number(raw) || 0.1) })}/>
                </FieldRow>
                {selectedLayer.role === "custom" && <FieldRow label="颜色">
                  <ColorField variant="field" value={selectedLayer.color ?? active.theme.accent}
                    onChange={(value) => updateLayer(selectedLayer.id, { color: value })}/>
                </FieldRow>}
              </Section>
              {selectedLayer.role === "custom" && (selectedLayer.kind === "text" || selectedLayer.kind === "button") && (
                <Section title="动态内容" note="入场动画统一跟随页面设置，无需单独配置。">
                  <ChipRow
                    items={[
                      { id: "countUp", label: "数字滚动", title: "内容中的第一段数字随播放进度动态累加", active: selectedLayer.countUp },
                      { id: "typewriter", label: "逐字打字机", active: selectedLayer.textEffect === "typewriter" },
                    ]}
                    onSelect={(id) => {
                      if (id === "countUp") previewAnimation(() => updateLayer(selectedLayer.id, { countUp: !selectedLayer.countUp }));
                      else previewAnimation(() => updateLayer(selectedLayer.id, { textEffect: selectedLayer.textEffect === "typewriter" ? "none" : "typewriter" }));
                    }}/>
                </Section>
              )}
            </div>
          </> : <>
            <div className="inspector-heading"><div>
              <h2>{inspectorTab === "page" ? "页面设置" : "动画设置"}</h2>
              <p>第 {String(currentIndex + 1).padStart(2, "0")} 页 · {active.role}</p>
            </div></div>
            <div className="inspector-body">
              {inspectorTab === "page" ? <>
                <Section title="页面基础信息" note="页面尺寸作用于整支视频；双击画布上的文字即可直接修改。">
                  <label className="stack-field">页面名称<input value={active.name} onChange={(event) => updatePage(active.id, { name: event.target.value })}/></label>
                  <FieldRow label="页面时长" unit="s">
                    <NumberField value={active.duration} min={1} max={10} step={0.1}
                      onInput={(raw) => updatePage(active.id, { duration: Math.min(10, Math.max(1, Number(raw) || 1)) })}/>
                  </FieldRow>
                  <RangeField value={active.duration} min={1} max={10} step={0.1} ticks={["1.0s", "10.0s"]}
                    onInput={(raw) => updatePage(active.id, { duration: Number(raw) })}/>
                  <button className="estimate-button" title="根据文案量与入场动画自动推荐时长"
                    onClick={() => updatePage(active.id, { duration: estimatePageDuration(active) })}>
                    <Icon name="sparkle" size={13}/>按内容自动估算：{estimatePageDuration(active).toFixed(1)}s
                  </button>
                  <LabeledSelect label="页面尺寸" value={project.ratio}
                    options={RATIOS.map((ratio) => ({ value: ratio, label: RATIO_LABEL[ratio] }))}
                    onChange={(value) => applyProject({ ...project, ratio: value as Project["ratio"] })}/>
                  <LabeledSelect label="入场转场" value={active.transition}
                    options={[{ value: "none", label: "无转场" }, { value: "fade", label: "淡入" }, { value: "slide", label: "右侧滑入" }]}
                    onChange={(value) => updatePage(active.id, { transition: value as PageTransition })}/>
                </Section>
                <Section title="页面主题"
                  action={<button className="theme-reset" title="恢复该版式的默认配色" onClick={() => applyPageTheme(active, defaultTheme(active.layout))}>恢复默认</button>}>
                  <div className="theme-presets">
                    {THEME_PRESETS.map((preset) => {
                      const selected = matchThemePreset(active.theme)?.id === preset.id;
                      return <button key={preset.id} className={`theme-preset ${selected ? "is-active" : ""}`} title={preset.name}
                        onClick={() => applyPageTheme(active, { ...preset.theme })}>
                        <span className="theme-preset-canvas" style={{ background: `linear-gradient(135deg, ${preset.theme.bg}, ${preset.theme.bg2})` }}>
                          <i style={{ background: preset.theme.accent }}/>
                          <i style={{ background: preset.theme.accent2 }}/>
                          <i style={{ background: preset.theme.ink }}/>
                        </span>
                        <strong>{preset.name}</strong>
                      </button>;
                    })}
                  </div>
                </Section>
              </> : <AnimationControls page={active} onPatch={(patch) => updatePage(active.id, patch)}
                onPreviewEnter={previewAnimation} onPreviewExit={previewExitAnimation}/>}
            </div>
            <div className="inspector-footer"><button onClick={duplicatePage}><Icon name="copy"/>复制页面</button><button className="danger" disabled={project.pages.length <= 1} onClick={removePage}><Icon name="trash"/>删除页面</button></div>
          </>}
        </aside>
      </div>

      <footer className="timeline">
        <div className="timeline-header">
          <Tabs variant="segmented" size="sm"
            items={[
              { id: "pages", label: "页面", icon: "page", active: timelineMode === "pages" },
              { id: "layers", label: "图层", icon: "layers", active: timelineMode === "layers" },
            ]}
            onSelect={(id) => setTimelineMode(id as TimelineMode)}/>
          <input className="timeline-scrub" type="range" min="0" max={total} step="0.01" value={time} aria-label="播放时间"
            onChange={(event) => { pause(); seek(Number(event.target.value)); }}/>
          <div className="timeline-meta"><span>{timelineMode === "pages" ? `${project.pages.length} 个页面` : `${active.layers.length} 个图层`}</span><strong>{total.toFixed(1)}s</strong>
            <button onClick={timelineMode === "pages" ? openPagePicker : () => addAsset(createTextLayerSpec(active.theme.ink))}><Icon name="plus" size={14}/>{timelineMode === "pages" ? "添加页面" : "添加图层"}</button></div>
        </div>
        {timelineMode === "pages" ? <div className="page-track">
          {project.pages.map((page, index) => {
            const progress = index < currentIndex ? 1 : index === currentIndex ? Math.min(1, local / page.duration) : 0;
            return <button key={page.id} className={`page-segment ${index === currentIndex ? "is-active" : ""}`} onClick={() => selectPage(index)}>
              <span className="segment-head"><i>{String(index + 1).padStart(2, "0")}</i><em>{page.duration.toFixed(1)}s</em></span>
              <span className={`segment-preview ${page.thumb}`}><Icon name="page" size={18}/></span>
              <strong>{page.name}</strong><small>{page.role} · {page.layers.length} 图层</small><span className="segment-progress"><i style={{ width: `${progress * 100}%` }}/></span>
            </button>;
          })}
          <button className="add-segment" onClick={openPagePicker}><Icon name="plus"/><span>添加页面</span></button>
        </div> : <div className="layer-track">
          <div className="layer-ruler"><span>0s</span><span>{(active.duration / 2).toFixed(1)}s</span><span>{active.duration.toFixed(1)}s</span></div>
          {[...active.layers].reverse().map((layer) => <div key={layer.id} className={`layer-track-row ${selectedLayerId === layer.id ? "is-active" : ""}`}>
            <button className="track-layer-name" onClick={() => selectLayer(layer)}><Icon name={layerIcon(layer)} size={13}/>{layer.name}</button>
            <span className="track-rail">
              <div className={`track-block ${layer.kind}`} role="button" aria-label={`${layer.name} 时间范围`}
                style={{ left: `${layer.enterDelay / active.duration * 100}%`, width: `${layer.duration / active.duration * 100}%` }}
                onPointerDown={(event) => startTimelineDrag(event, layer, "move")} onPointerMove={dragTimelineLayer}
                onPointerUp={endTimelineDrag} onPointerCancel={endTimelineDrag}>
                <i className="timeline-trim left" aria-label="裁剪开始时间" onPointerDown={(event) => startTimelineDrag(event, layer, "start")}/>
                <em>{layer.role === "custom" && layer.textEffect === "typewriter" ? "打字机" : layer.role === "custom" && layer.countUp ? "数字滚动" : ""}</em><b>{layer.duration.toFixed(1)}s</b>
                <i className="timeline-trim right" aria-label="裁剪结束时间" onPointerDown={(event) => startTimelineDrag(event, layer, "end")}/>
              </div>
            </span>
          </div>)}
        </div>}
      </footer>

      <PagePickerModal open={showPagePicker} onClose={closePagePicker} activePageName={active.name}
        onPreviewLayout={previewTemplate}
        onPick={(layout) => { addPage(layout); closePagePicker(); }}/>

      <FullPreviewModal open={fullPreviewOpen} onClose={closeFullPreview}
        playing={fullPreview.playing} onTogglePlay={fullPreview.toggle}
        timecode={formatTime(fullPreview.time)} totalTimecode={formatTime(total)}
        title={project.title || "未命名项目"}
        canvasWidth={natural.width} canvasHeight={natural.height}
        canvasRef={fullPreviewCanvasRef}/>

      <input ref={replaceInputRef} type="file" hidden accept="image/*,video/*" onChange={handleReplaceMedia}/>
      <audio ref={audioRef} src={project.audio?.src} loop={project.loop} hidden/>

      <Toast message={toast}/>
    </div>
  );
};
