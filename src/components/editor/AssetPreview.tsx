/**
 * 素材缩略图预览：按素材类型渲染等比缩小的内容示意
 * （形状→色块、按钮→胶囊、文字→文字样张、组合→彩色图标），参考 Canva 素材缩略图。
 */
import type React from "react";
import { Icon } from "../ui/Icon";
import type { AssetEntry } from "./assetCatalog";

export const AssetPreview: React.FC<{ entry: AssetEntry }> = ({ entry }) => {
  const spec = entry.spec;
  if (spec?.kind === "shape") {
    const scale = Math.min(58 / (spec.width ?? 100), 36 / (spec.height ?? 60));
    const width = Math.max(14, (spec.width ?? 100) * scale);
    const height = Math.max(10, (spec.height ?? 60) * scale);
    return <span className="preview-shape" style={{ width, height, background: spec.color ?? "#8055d9", borderRadius: Math.min(10, height * 0.4) }}/>;
  }
  if (spec?.kind === "button") {
    const scale = Math.min(58 / (spec.width ?? 200), 34 / (spec.height ?? 60));
    const height = Math.max(16, (spec.height ?? 60) * scale);
    return <span className="preview-pill" style={{ width: Math.max(30, (spec.width ?? 200) * scale), height, background: spec.color ?? "#8055d9", borderRadius: height / 2 }}>
      {(spec.content ?? "").slice(0, 6)}
    </span>;
  }
  if (spec?.kind === "text") {
    return <span className="preview-text" style={{ color: spec.color ?? "#141210" }}>{spec.content ?? entry.label}</span>;
  }
  return <span className={`category-icon ${entry.color}`}><Icon name={entry.icon} size={20}/></span>;
};
