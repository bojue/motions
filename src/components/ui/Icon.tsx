/** 内联图标库：38 个 24×24 描边图标，编辑器与向导共用 */
export type IconName =
  | "page" | "layers" | "plus" | "play" | "pause" | "export" | "undo" | "redo"
  | "text" | "button" | "shape" | "copy" | "trash" | "up" | "down" | "eye"
  | "lock" | "unlock" | "chevron" | "fullscreen" | "check" | "eyeOff"
  | "template" | "upload" | "folder" | "grid" | "search" | "close" | "alignCenter" | "bulb" | "sparkle"
  | "globe" | "share" | "image" | "music" | "chart" | "qr" | "subtitle";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    page: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    play: <path d="m9 5 11 7-11 7V5Z"/>,
    pause: <path d="M8 5v14M16 5v14"/>,
    export: <><path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/></>,
    undo: <><path d="m9 7-5 5 5 5"/><path d="M4 12h9a7 7 0 0 1 7 7"/></>,
    redo: <><path d="m15 7 5 5-5 5"/><path d="M20 12h-9a7 7 0 0 0-7 7"/></>,
    text: <><path d="M5 6V4h14v2M12 4v16M8 20h8"/></>,
    alignCenter: <><path d="M4 6h16M7 11h10M5 16h14M9 21h6"/></>,
    button: <><rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/></>,
    shape: <><rect x="4" y="4" width="16" height="16" rx="3"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    up: <path d="m6 14 6-6 6 6"/>,
    down: <path d="m6 10 6 6 6-6"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><path d="m4 4 16 16"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    unlock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    fullscreen: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    template: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
    upload: <><path d="M12 15V3M8 7l4-4 4 4"/><path d="M4 21h16"/></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></>,
    close: <path d="M6 6l12 12M18 6 6 18"/>,
    bulb: <><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3Z"/><path d="M9 18h6M10 21h4"/></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9Z"/></>,
    share: <><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="m8.4 10.8 6.8-3.9M8.4 13.2l6.8 3.9"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 4 4"/></>,
    music: <><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></>,
    chart: <><path d="M3 21h18"/><path d="M6 17v-4M11 17V6M16 17v-7"/></>,
    qr: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14v2M18 14v2M14 20h2M20 17v3M17 20h3"/></>,
    subtitle: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 15h4M12 15h6M6 11.5h5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export { Icon };
