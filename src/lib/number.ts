export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** 数据模型 opacity 为 0-1，UI 统一展示 0-100 */
export const toPercentUI = (value: number) => Math.round(value * 100);
export const fromPercentUI = (value: number) => clamp(value / 100, 0, 1);
