import { useEffect } from "react";
import type { Layer } from "../model/project";
import type { RefObject } from "react";

interface ShortcutOptions {
  undo: () => void;
  redo: () => void;
  selectedLayer: Layer | null;
  /** 图层剪贴板（Cmd/Ctrl+C / V） */
  clipboardRef: RefObject<Layer | null>;
  /** 轻提示回调（hook 不直接依赖 UI） */
  notify: (message: string) => void;
  pasteLayer: () => void;
  duplicateLayer: (layer: Layer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, patch: Partial<Layer>, record?: boolean) => void;
  setSelectedLayerId: (id: string | null) => void;
  setEditingId: (id: string | null) => void;
}

/** 全局键盘快捷键：Cmd+Z / Shift+Cmd+Z 撤销重做、Cmd+C / V / D、Esc、删除与方向键微调 */
export function useEditorShortcuts(options: ShortcutOptions) {
  const {
    undo, redo, selectedLayer, clipboardRef, notify,
    pasteLayer, duplicateLayer, removeLayer, updateLayer,
    setSelectedLayerId, setEditingId,
  } = options;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // 输入控件内（含画布内联编辑框）优先走原生编辑行为，例如 textarea 内 Cmd+Z 撤销文字
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "c" && selectedLayer) {
        event.preventDefault();
        clipboardRef.current = structuredClone(selectedLayer);
        notify(`已复制「${selectedLayer.name}」`);
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        if (!clipboardRef.current) return;
        event.preventDefault();
        pasteLayer();
        return;
      }
      if (mod && event.key.toLowerCase() === "d" && selectedLayer) {
        event.preventDefault();
        duplicateLayer(selectedLayer);
        return;
      }
      if (event.key === "Escape") {
        setSelectedLayerId(null);
        setEditingId(null);
        return;
      }
      if (!selectedLayer) return;
      const arrows: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      };
      const direction = arrows[event.key];
      if (direction && !selectedLayer.locked) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        updateLayer(selectedLayer.id, {
          x: selectedLayer.x + direction.x * amount,
          y: selectedLayer.y + direction.y * amount,
        });
      }
      // Mac 键盘无 Delete 键，Backspace 同样触发删除
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeLayer(selectedLayer.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
