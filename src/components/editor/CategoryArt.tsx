/**
 * 分类瓦片插画（参考 Canva 分类卡）：每个分类一幅白色扁平剪纸风迷你插画，
 * 铺满渐变瓦片；线条层次用透明度区分主次。
 */
import type React from "react";

export const CategoryArt: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case "text-group": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <rect x="12" y="17" width="40" height="9" rx="4.5" fill="#fff" opacity=".95"/>
        <rect x="12" y="32" width="30" height="7" rx="3.5" fill="#fff" opacity=".65"/>
        <rect x="12" y="44" width="20" height="6" rx="3" fill="#fff" opacity=".4"/>
      </svg>);
    case "charts": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <rect x="12" y="36" width="10" height="16" rx="5" fill="#fff" opacity=".55"/>
        <rect x="27" y="26" width="10" height="26" rx="5" fill="#fff" opacity=".75"/>
        <rect x="42" y="15" width="10" height="37" rx="5" fill="#fff"/>
        <circle cx="47" cy="9" r="3" fill="#fff" opacity=".9"/>
      </svg>);
    case "cta": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <rect x="9" y="26" width="40" height="15" rx="7.5" fill="#fff"/>
        <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" fill="none">
          <path d="M54 22l3.5-3.5"/><path d="M56.5 33.5h5"/><path d="M54 45l3.5 3.5"/>
        </g>
      </svg>);
    case "shapes": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <path d="M44 11 60 39H28Z" fill="#fff" opacity=".8"/>
        <circle cx="24" cy="27" r="13" fill="#fff" opacity=".95"/>
        <rect x="27" y="34" width="21" height="21" rx="7" fill="#fff" opacity=".5"/>
      </svg>);
    case "buttons": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <rect x="10" y="22" width="36" height="19" rx="9.5" fill="#fff"/>
        <circle cx="36.5" cy="31.5" r="7" fill="#e5397f"/>
        <circle cx="47" cy="44" r="9.5" fill="#fff"/>
        <path d="M47 40v8M43 44h8" stroke="#e5397f" strokeWidth="3" strokeLinecap="round"/>
      </svg>);
    case "lists": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <circle cx="16" cy="20" r="4.5" fill="#fff" opacity=".95"/>
        <rect x="26" y="16" width="26" height="8" rx="4" fill="#fff" opacity=".8"/>
        <circle cx="16" cy="33" r="4.5" fill="#fff" opacity=".7"/>
        <rect x="26" y="29" width="19" height="8" rx="4" fill="#fff" opacity=".6"/>
        <circle cx="16" cy="46" r="4.5" fill="#fff" opacity=".5"/>
        <rect x="26" y="42" width="13" height="8" rx="4" fill="#fff" opacity=".45"/>
      </svg>);
    case "tags": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <path d="M12 20h20l16 12-16 12H12z" fill="#fff" opacity=".92"/>
        <circle cx="20" cy="32" r="3.5" fill="#4f5fe0"/>
        <rect x="42" y="13" width="12" height="8" rx="4" fill="#fff" opacity=".5"/>
      </svg>);
    case "decorations": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <circle cx="22" cy="18" r="5" fill="#fff" opacity=".9"/>
        <rect x="36" y="12" width="10" height="10" rx="3" fill="#fff" opacity=".6" transform="rotate(15 41 17)"/>
        <circle cx="50" cy="34" r="7" fill="#fff" opacity=".5"/>
        <rect x="14" y="38" width="14" height="6" rx="3" fill="#fff" opacity=".75" transform="rotate(-12 21 41)"/>
        <circle cx="34" cy="48" r="4" fill="#fff" opacity=".85"/>
        <rect x="42" y="46" width="9" height="9" rx="3" fill="#fff" opacity=".45" transform="rotate(20 46.5 50.5)"/>
      </svg>);
    case "motion-text": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <path d="M18 16l18 10-18 10z" fill="#fff" opacity=".95"/>
        <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" fill="none">
          <path d="M42 20h7"/><path d="M46 29h9"/><path d="M42 38h5"/>
        </g>
      </svg>);
    case "backgrounds": return (
      <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
        <circle cx="40" cy="22" r="11" fill="#fff" opacity=".9"/>
        <rect x="10" y="40" width="44" height="16" rx="8" fill="#fff" opacity=".6"/>
      </svg>);
    default: return null;
  }
};
