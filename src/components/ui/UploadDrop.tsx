/** 上传落点：虚线框上传按钮（素材面板大落点 / 项目面板 compact 小落点） */
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface UploadDropProps {
  icon?: IconName;
  iconSize?: number;
  title: string;
  hint?: string;
  compact?: boolean;
  onClick: () => void;
}

export const UploadDrop = ({ icon = "upload", iconSize = 18, title, hint, compact, onClick }: UploadDropProps) => (
  <button
    type="button"
    className={compact ? "mc-upload-drop mc-upload-drop--compact" : "mc-upload-drop"}
    onClick={onClick}
  >
    <Icon name={icon} size={iconSize} />
    <strong>{title}</strong>
    {hint != null && <small>{hint}</small>}
  </button>
);
