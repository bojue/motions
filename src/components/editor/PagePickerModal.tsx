import type { SceneLayout } from "../../model/project";
import { Modal } from "../ui/Modal";
import { IconButton } from "../ui/IconButton";
import { Icon } from "../ui/Icon";
import { TEMPLATES } from "./editorConstants";

interface PagePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** 当前页面名：用于提示新页面的插入位置 */
  activePageName: string;
  /** 悬停/聚焦时在画布上叠加预览该版式，移开传 null */
  onPreviewLayout: (layout: SceneLayout | null) => void;
  /** 选中版式：插入页面（关闭浮窗由调用方决定时机） */
  onPick: (layout: SceneLayout) => void;
}

/** 添加页面浮窗：从分镜版式库选择，插入到当前页面之后（Esc / 点击遮罩关闭由 Modal 提供） */
export const PagePickerModal = ({ open, onClose, activePageName, onPreviewLayout, onPick }: PagePickerModalProps) => (
  <Modal open={open} onClose={onClose} label="添加页面" zIndex={60}
    backdropClassName="picker-backdrop" panelClassName="picker-modal">
    <div className="picker-heading">
      <div><h2>添加页面</h2><p>选择一个分镜版式，将插入到「{activePageName}」之后，作为时间轴上的新分镜</p></div>
      <IconButton variant="small" icon="close" size={15} label="关闭" onClick={onClose}/>
    </div>
    <div className="picker-grid">
      {TEMPLATES.map((template) => (
        <button key={template.layout} className="picker-card"
          onMouseEnter={() => onPreviewLayout(template.layout)} onMouseLeave={() => onPreviewLayout(null)}
          onFocus={() => onPreviewLayout(template.layout)} onBlur={() => onPreviewLayout(null)}
          onClick={() => onPick(template.layout)}>
          <span className={`template-icon ${template.layout}`}><Icon name="page"/></span>
          <span><strong>{template.name}</strong><small>{template.description}</small></span>
        </button>
      ))}
    </div>
    <p className="picker-hint">悬停在画布中实时预览 · 点击插入 · Esc 关闭</p>
  </Modal>
);
