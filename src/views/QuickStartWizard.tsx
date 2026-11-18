import { useEffect, useMemo, useRef, useState } from "react";
import type { Page, Project, Ratio } from "../model/project";
import { createPage, estimatePageDuration, loadProject, totalDuration } from "../model/project";
import { drawProjectFrame } from "../engine/renderer";
import { useExport } from "../hooks/useExport";
import { AspectRatioPicker } from "../components/ui/AspectRatioPicker";
import type { RatioCardText } from "../components/ui/AspectRatioPicker";
import "./quick-start.css";

type WizardProps = {
  /** 生成完成，进入高级编辑器 */
  onFinish: (project: Project, options: { save: boolean }) => void;
  /** 跳过向导，直接打开本地草稿 / 默认项目 */
  onSkip: () => void;
};

const SCENES: { ratio: Ratio; title: string; desc: string; tag: string }[] = [
  { ratio: "9:16", title: "短视频 / 信息流", desc: "抖音、视频号、Reels，竖屏满屏播放", tag: "最常用" },
  { ratio: "16:9", title: "横版演示 / 官网", desc: "发布会、官网首屏、PPT 内嵌", tag: "演示" },
  { ratio: "1:1", title: "方形海报 / 朋友圈", desc: "信息流广告、社群分享、封面图", tag: "轻量" },
];

/** 场景卡渲染顺序与文案（SCENES 数据派生，供 AspectRatioPicker cards 变体消费） */
const SCENE_RATIOS = SCENES.map((scene) => scene.ratio);
const SCENE_CARDS: Partial<Record<Ratio, RatioCardText>> = Object.fromEntries(
  SCENES.map((scene): [Ratio, RatioCardText] => [
    scene.ratio,
    { title: scene.title, desc: scene.desc, tag: scene.tag },
  ])
);

const STEP_LABELS = ["填写内容", "选择场景", "生成视频"];

/** 用三步向导把「输入文案 → 选画幅 → 出片」串起来，降低视频动画的制作门槛 */
export function QuickStartWizard({ onFinish, onSkip }: WizardProps) {
  const [step, setStep] = useState(0);
  const [draft] = useState(() => loadProject());
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("让团队\n告别手动流程");
  const [subtitle, setSubtitle] = useState("零代码搭建自动化流程，10 分钟上线，团队从此只做有价值的事。");
  const [cta, setCta] = useState("免费开始");
  const [pointsText, setPointsText] = useState("30+ 自动化模板\n无需代码\n一键导出");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const { exporting, exportProgress, runExport } = useExport();
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const project = useMemo<Project>(() => {
    const points = pointsText.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 3);
    const safeTitle = title.trim() || "现在开始\n做一支宣传片";
    const closeTitle = `现在开始\n${cta.trim() || "免费试用"}`;
    const pages: Page[] = [
      createPage({
        name: "开场标题",
        role: "钩子",
        layout: "hero",
        preset: "spring",
        duration: 3.2,
        content: {
          brand: brand.trim() || undefined,
          kicker: "NEW RELEASE",
          title: safeTitle,
          subtitle: subtitle.trim(),
          cta: cta.trim(),
          points,
        },
      }),
      createPage({
        name: "核心卖点",
        role: "卖点",
        layout: "cta",
        preset: "slide",
        easing: "easeOut",
        duration: 3.6,
        content: {
          brand: brand.trim() || undefined,
          kicker: "WHY US",
          title: "为什么\n选择我们",
          subtitle: subtitle.trim(),
          cta: cta.trim(),
          points,
        },
      }),
      createPage({
        name: "行动号召",
        role: "转化",
        layout: "cta",
        preset: "zoom",
        easing: "easeOut",
        duration: 2.8,
        content: {
          brand: brand.trim() || undefined,
          kicker: "GET STARTED",
          title: closeTitle,
          subtitle: subtitle.trim(),
          cta: cta.trim(),
          points: [],
        },
      }),
    ].map((page) => ({ ...page, duration: estimatePageDuration(page) }));
    return {
      version: 2,
      layerUnit: "absolute",
      title: brand.trim() ? `${brand.trim()} 宣传片` : "我的宣传片",
      ratio,
      loop: false,
      pages,
    };
  }, [brand, title, subtitle, cta, pointsText, ratio]);

  // 向导内实时预览第一页的定格画面（canvas 仅在第 3 步挂载，step 变化时需补绘）
  useEffect(() => {
    const canvas = previewRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawProjectFrame(ctx, project, Math.max(0.8, project.pages[0].duration - 0.4));
  }, [project, step]);

  const duration = totalDuration(project);

  const finish = () => onFinish(project, { save: true });

  const handleExport = () => {
    setError(null);
    runExport(project, { onError: (message) => setError(message) });
  };

  return (
    <div className="quickstart">
      <header className="qs-topbar">
        <span className="qs-brand"><i/>MotionCraft</span>
        <button className="qs-skip" onClick={onSkip}>
          {draft ? `继续上次草稿「${draft.title}」` : "跳过向导，直接打开编辑器"}
        </button>
      </header>

      <main className="qs-card">
        <aside className="qs-steps">
          <p className="qs-steps-title">三步做出宣传视频</p>
          {STEP_LABELS.map((label, index) => (
            <button key={label} className={`qs-step ${step === index ? "is-active" : ""} ${step > index ? "is-done" : ""}`}
              onClick={() => setStep(index)}>
              <span>{step > index ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <div><strong>{label}</strong>
                <small>{["只填文案，不用排版", "选画幅自动套版式", "预览并导出成片"][index]}</small>
              </div>
            </button>
          ))}
          <p className="qs-steps-note">需要精细调整？进入编辑器后，所有页面、图层与动画都可继续编辑。</p>
        </aside>

        <section className="qs-body">
          {step === 0 && (
            <div className="qs-panel">
              <h1>先写下你想说的话</h1>
              <p className="qs-lead">标题支持换行，系统会自动排版成竖屏大字报。</p>
              <div className="qs-form">
                <label>品牌名（可选）<input value={brand} placeholder="例如：星澜科技" onChange={(event) => setBrand(event.target.value)}/></label>
                <label>主标题<textarea rows={3} value={title} onChange={(event) => setTitle(event.target.value)}/></label>
                <label>副标题<textarea rows={2} value={subtitle} onChange={(event) => setSubtitle(event.target.value)}/></label>
                <label>按钮文案<input value={cta} onChange={(event) => setCta(event.target.value)}/></label>
                <label>核心卖点<textarea rows={3} placeholder="每行一条，最多三条" value={pointsText}
                  onChange={(event) => setPointsText(event.target.value)}/></label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="qs-panel">
              <h1>这支视频用在哪里？</h1>
              <p className="qs-lead">选择画幅后，系统会自动适配版式与字号。</p>
              <AspectRatioPicker variant="cards" value={ratio} onChange={setRatio} ratios={SCENE_RATIOS} cards={SCENE_CARDS}/>
              <p className="qs-hint">之后可在编辑器「项目设置」中随时切换画幅。</p>
            </div>
          )}

          {step === 2 && (
            <div className="qs-panel qs-result">
              <div className="qs-preview">
                <canvas ref={previewRef} width={1080} height={1920} aria-label="生成效果预览"/>
              </div>
              <div className="qs-summary">
                <h1>可以出片了</h1>
                <ul>
                  <li><span>页面</span><strong>{project.pages.length} 页</strong></li>
                  <li><span>画幅</span><strong>{ratio}</strong></li>
                  <li><span>时长</span><strong>{duration.toFixed(1)} 秒</strong></li>
                  <li><span>内容</span><strong>{title.trim().split("\n")[0] || "未命名"}…</strong></li>
                </ul>
                <div className="qs-result-actions">
                  <button className="qs-primary" onClick={finish}>进入编辑器继续调整</button>
                  <button className="qs-secondary" onClick={handleExport} disabled={exporting}>
                    {exporting ? `导出中 ${Math.round(exportProgress * 100)}%` : "直接导出视频"}
                  </button>
                </div>
                {error && <p className="qs-error">{error}</p>}
                <p className="qs-hint">导出使用浏览器实时录制，时长约等于视频时长，请保持页面在前台。</p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="qs-footer">
        <button className="qs-back" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>上一步</button>
        <span className="qs-progress">{step + 1} / 3</span>
        {step < 2
          ? <button className="qs-primary" onClick={() => setStep((value) => Math.min(2, value + 1))}>下一步</button>
          : <button className="qs-primary" onClick={finish}>进入编辑器</button>}
      </footer>
    </div>
  );
}
