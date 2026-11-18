/** 品牌渐变方块标识：编辑器顶栏 brand-mark 与向导 qs-brand 同款 logo */
import { Icon } from "./Icon";

export const BrandMark = ({ size = 28 }: { size?: number }) => (
  <span className="mc-brand-mark" style={{ width: size, height: size }}>
    <Icon name="play" size={size / 2}/>
  </span>
);
