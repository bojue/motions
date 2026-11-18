import type { RefObject } from "react";
import { Modal } from "../ui/Modal";
import { Icon } from "../ui/Icon";

interface FullPreviewModalProps {
  open: boolean;
  onClose: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  /** 当前播放时间码（已格式化） */
  timecode: string;
  /** 总时长时间码（已格式化） */
  totalTimecode: string;
  title: string;
  canvasWidth: number;
  canvasHeight: number;
  /** 全片预览画布：由视图持有 ref 并在其 effect 中渲染帧 */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/** 全片预览浮窗：随独立播放进度渲染整支视频画面（Esc / 点击遮罩关闭由 Modal 提供） */
export const FullPreviewModal = ({ open, onClose, playing, onTogglePlay, timecode, totalTimecode, title, canvasWidth, canvasHeight, canvasRef }: FullPreviewModalProps) => (
  <Modal open={open} onClose={onClose} label="全片预览" zIndex={70}
    backdropClassName="fullpreview-backdrop" panelClassName="fullpreview-stage">
    <canvas ref={canvasRef} className="fullpreview-canvas"
      width={canvasWidth} height={canvasHeight} aria-label="全片预览画面"/>
    <div className="fullpreview-dock">
      <button className="play-button" aria-label={playing ? "暂停" : "播放"}
        onClick={onTogglePlay}><Icon name={playing ? "pause" : "play"} size={15}/></button>
      <span className="timecode">{timecode} <i>/</i> {totalTimecode}</span>
      <span className="dock-divider"/>
      <strong className="fullpreview-title">{title}</strong>
      <span className="dock-divider"/>
      <button className="fullscreen-button" aria-label="退出预览" onClick={onClose}><Icon name="close" size={14}/></button>
    </div>
  </Modal>
);
