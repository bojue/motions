/** 读取为 data URL（用于草稿持久化） */
export const readAsDataUrl = (file: File): Promise<string> => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : URL.createObjectURL(file));
  reader.onerror = () => resolve(URL.createObjectURL(file));
  reader.readAsDataURL(file);
});

/** 图片压缩到最长边 1600px 的 WebP，控制体积以便随草稿存入 localStorage；视频仍用 object URL */
export const fileToUrl = async (file: File): Promise<string> => {
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
    return URL.createObjectURL(file);
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1200 * 1024) {
      bitmap.close();
      return await readAsDataUrl(file);
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法压缩图片");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/webp", 0.9);
  } catch {
    return readAsDataUrl(file);
  }
};
