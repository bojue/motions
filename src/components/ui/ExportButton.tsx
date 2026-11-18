/** 导出按钮：吸收顶栏与项目面板两处「导出视频 / 导出中 N%」的重复文案与进度逻辑 */
import { Icon } from "./Icon";

interface ExportButtonProps {
  variant: "bar" | "panel";
  exporting: boolean;
  progress: number;
  onClick: () => void;
}

export const ExportButton = ({ variant, exporting, progress, onClick }: ExportButtonProps) => (
  <button
    type="button"
    className={variant === "panel" ? "mc-export-button mc-export-button--panel" : "mc-export-button"}
    onClick={onClick}
    disabled={exporting}>
    <Icon name="export"/>
    {exporting ? `导出中 ${Math.round(progress * 100)}%` : "导出视频"}
  </button>
);
