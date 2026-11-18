/** 轻提示：message 非空时在底部居中短暂弹出 */
export const Toast = ({ message }: { message: string | null }) =>
  message != null ? <div className="mc-toast" role="status">{message}</div> : null;
