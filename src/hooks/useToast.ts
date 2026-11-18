import { useEffect, useRef, useState } from "react";

/** 顶栏轻提示：短暂展示操作反馈后自动消失（2800ms，新 toast 打断旧 timer） */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  return { message: toast, notify };
}
