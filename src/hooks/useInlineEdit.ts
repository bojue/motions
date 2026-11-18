import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Layer, Page } from "../model/project";
import type { Box } from "../engine/renderer";
import { isEditableTextLayer } from "../components/editor/layerUtils";
import { editFontStyle, expandEditBox } from "../components/editor/inlineEditStyle";

interface Options {
  designScale: number;
  screenScale: number;
  boxStyle: (box: Box, layer: Layer) => React.CSSProperties;
  /** 进入编辑时暂停播放并选中图层 */
  enterSelect: (layerId: string) => void;
  getLayerText: (layer: Layer) => string;
  commitLayerText: (layer: Layer, value: string) => void;
  /** 读取当前正在编辑的图层（视图派生值，提交时取最新） */
  getEditingLayer: () => Layer | null;
}

/** 画布内联编辑：双击进入、失焦/Cmd+Enter 提交、Esc 取消 */
export function useInlineEdit({ designScale, screenScale, boxStyle, enterSelect, getLayerText, commitLayerText, getEditingLayer }: Options) {
  /** 正在编辑的图层、草稿内容与进入编辑时冻结的包围盒 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editBox, setEditBox] = useState<Box | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const beginEdit = (layer: Layer, box: Box | undefined) => {
    if (!isEditableTextLayer(layer) || !box) return;
    enterSelect(layer.id);
    setEditBox(box);
    setEditDraft(getLayerText(layer));
    setEditingId(layer.id);
  };

  const commitEdit = () => {
    const editingLayer = getEditingLayer();
    if (editingLayer && editDraft !== getLayerText(editingLayer)) commitLayerText(editingLayer, editDraft);
    setEditingId(null);
    setEditBox(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBox(null);
  };

  /** 进入内联编辑时自动聚焦并全选文字，便于直接替换 */
  useEffect(() => {
    if (!editingId) return;
    const input = editInputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [editingId]);

  /** 内联编辑框自适应高度：草稿换行超出图层框时向下扩展，保证多行输入始终可见 */
  useLayoutEffect(() => {
    const input = editInputRef.current;
    if (!editingId || !editBox || !input) return;
    input.style.height = "auto";
    const needed = Math.ceil(input.scrollHeight);
    const base = Math.ceil(editBox.h * designScale * screenScale);
    input.style.height = `${Math.max(base, needed)}px`;
  }, [editingId, editBox, editDraft, designScale, screenScale]);

  /** 编辑框定位与字号样式（editFontStyle / expandEditBox 调用点） */
  const editorStyle = (layer: Layer, box: Box, page: Page): React.CSSProperties => ({
    ...boxStyle(expandEditBox(layer, box, page, editDraft), layer),
    ...editFontStyle(layer, box, page, designScale * screenScale),
  });

  return {
    editingId, setEditingId, editDraft, setEditDraft, editBox, setEditBox,
    editInputRef, beginEdit, commitEdit, cancelEdit, editorStyle,
  };
}
