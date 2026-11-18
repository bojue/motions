import { useState } from "react";
import type { Project } from "../model/project";
import { downloadBlob, exportProject } from "../engine/exporter";

interface RunExportOptions {
  /** 导出流程启动时（录制开始前）调用：编辑器用于暂停播放 */
  before?: () => void;
  /** 导出失败时收到错误提示文案 */
  onError?: (message: string) => void;
}

/** 编辑器与向导共用的导出流程：导出中重复调用直接忽略 */
export function useExport() {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const runExport = async (project: Project, { before, onError }: RunExportOptions = {}) => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);
    before?.();
    try {
      await document.fonts?.ready;
      const { blob, extension } = await exportProject(project, setExportProgress);
      downloadBlob(blob, `${project.title || "motioncraft"}.${extension}`);
    } catch (error) {
      console.error(error);
      onError?.(error instanceof Error ? error.message : "导出失败，请稍后重试。");
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  return { exporting, exportProgress, runExport };
}
