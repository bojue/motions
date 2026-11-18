import { useState } from "react";
import type { Layer, Page, Project } from "../model/project";

interface Options {
  /** undo/redo 还原项目后的回调：视图在此做选中修正等后续动作 */
  onRestore?: (project: Project) => void;
}

/** 项目状态 + 撤销/重做历史：同引用 patch 不入历史；图层更新只作用于激活页 */
export function useProjectHistory(initial: Project, { onRestore }: Options = {}) {
  const [project, setProject] = useState<Project>(initial);
  const [history, setHistory] = useState<{ past: Project[]; future: Project[] }>({ past: [], future: [] });

  const applyProject = (updater: Project | ((current: Project) => Project), record = true) => {
    const next = typeof updater === "function" ? updater(project) : updater;
    if (next === project) return;
    if (record) setHistory((value) => ({ past: [...value.past, project].slice(-50), future: [] }));
    setProject(next);
  };

  const updatePage = (pageId: string, patch: Partial<Page>, record = true) => {
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== pageId) return page;
        const next = { ...page, ...patch };
        if (patch.duration !== undefined) {
          next.layers = next.layers.map((layer) => {
            const enterDelay = Math.min(layer.enterDelay, Math.max(0, next.duration - 0.1));
            return { ...layer, enterDelay, duration: Math.min(layer.duration, Math.max(0.1, next.duration - enterDelay)) };
          });
        }
        return next;
      }),
    }), record);
  };

  const updateLayerInPage = (pageId: string, layerId: string, patch: Partial<Layer>, record = true) => {
    applyProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === pageId
        ? { ...page, layers: page.layers.map((layer) => {
            if (layer.id !== layerId) return layer;
            const next = { ...layer, ...patch };
            next.enterDelay = Math.min(page.duration - 0.1, Math.max(0, next.enterDelay));
            next.duration = Math.min(page.duration - next.enterDelay, Math.max(0.1, next.duration));
            return next;
          }) }
        : page),
    }), record);
  };

  /** 拖拽期间的直接写入：不记历史；拖拽结束后用 commitBefore 补拖拽开始前的快照 */
  const updateLayerDirectInPage = (pageId: string, layerId: string, patch: Partial<Layer>) => {
    setProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === pageId
        ? { ...page, layers: page.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer) }
        : page),
    }));
  };

  /** 拖拽结束补历史：把拖拽开始前的项目快照压入 past 并清空 future */
  const commitBefore = (before: Project) => {
    setHistory((value) => ({ past: [...value.past, before].slice(-50), future: [] }));
  };

  const undo = () => {
    if (!history.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory({ past: history.past.slice(0, -1), future: [project, ...history.future] });
    setProject(previous);
    onRestore?.(previous);
  };

  const redo = () => {
    if (!history.future.length) return;
    const next = history.future[0];
    setHistory({ past: [...history.past, project], future: history.future.slice(1) });
    setProject(next);
    onRestore?.(next);
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    project, canUndo, canRedo,
    applyProject, updatePage, updateLayerInPage, updateLayerDirectInPage,
    commitBefore, undo, redo,
  };
}
