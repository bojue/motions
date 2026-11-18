import type { Layer } from "../../model/project";
/** 「添加文本图层」的默认规格：三处调用点（图层面板/文本面板/时间轴）共用 */
export const createTextLayerSpec = (ink: string): Partial<Layer> => ({
  kind: "text", name: "文本", content: "输入一段新的文字",
  width: 760, height: 170, fontSize: 64, color: ink,
});
