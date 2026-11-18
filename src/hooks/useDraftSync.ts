import { useEffect, useRef } from "react";
import type { Project } from "../model/project";
import { createDefaultProject, loadProject, pageSettleTime, saveProject } from "../model/project";

/** 初始项目：向导产物优先，其次本地草稿，最后默认项目；附首屏稳定展示时间 */
export const loadInitialProject = (initialProject?: Project | null) => {
  const project = initialProject ?? loadProject() ?? createDefaultProject();
  return { project, startTime: pageSettleTime(project, 0) };
};

/** 草稿持久化：变更防抖 320ms 落盘；卸载时立即补一次保存 */
export function useDraftSync(project: Project) {
  useEffect(() => {
    const timer = window.setTimeout(() => saveProject(project), 320);
    return () => window.clearTimeout(timer);
  }, [project]);

  // 离开编辑器（如返回向导）时立即落盘，避免防抖窗口内的最后一次修改丢失
  const latestProjectRef = useRef(project);
  latestProjectRef.current = project;
  useEffect(() => () => saveProject(latestProjectRef.current), []);
}
