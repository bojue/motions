import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { UploadItem } from "../components/editor/assetCatalog";
import { fileToUrl } from "../lib/mediaFile";
import { newId } from "../lib/id";

interface Options {
  /** 轻提示回调（hook 不直接依赖 UI） */
  notify: (message: string) => void;
}

/** 上传素材面板：素材列表 state、file input 处理与图片/视频校验 */
export function useUploads({ notify }: Options) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  /** 注册上传文件：过滤图片/视频，生成可插入画布的素材项（素材面板、上传面板与拖拽共用） */
  const buildUploadItems = async (files: FileList | File[]): Promise<UploadItem[]> => {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    return Promise.all(list.map(async (file) => ({
      id: newId("upload"),
      name: file.name,
      size: file.size,
      url: await fileToUrl(file),
      kind: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
    })));
  };

  const addUploadFiles = async (files: FileList | File[]) => {
    const items = await buildUploadItems(files);
    if (!items.length) {
      notify("仅支持图片与视频格式的文件");
      return;
    }
    setUploads((current) => [...current, ...items]);
    notify(`已上传 ${items.length} 个素材，点击缩略图即可插入画布`);
  };

  /** 隐藏 file input 的 change 处理：注册素材后清空 value 以便重复选择同一文件 */
  const handleUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) addUploadFiles(event.target.files);
    event.target.value = "";
  };

  return { uploads, setUploads, uploadInputRef, buildUploadItems, addUploadFiles, handleUploadInputChange };
}
