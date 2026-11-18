import type { EasingKind } from "../model/project";

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function ease(kind: EasingKind, progress: number): number {
  const t = clamp01(progress);
  switch (kind) {
    case "linear":
      return t;
    case "easeOut":
      return 1 - Math.pow(1 - t, 3);
    case "elastic": {
      // easeOutBack：结尾轻微回弹，接近弹簧手感
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  }
}
