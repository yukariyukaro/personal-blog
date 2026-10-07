import { useEffect, useState } from 'react';
import './SideIndicator.css';

// 移动端做装饰减法：竖排指示条整体不渲染（规范约定 JS 早退 + CSS display:none 兜底）
const MOBILE_BREAKPOINT = 768;

interface SideIndicatorProps {
  currentIndex: number;
  total: number;
  titles: { en: string; zh: string }[];
}

export default function SideIndicator({ currentIndex, total, titles }: SideIndicatorProps) {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth <= MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  if (isMobile) {
    return null;
  }

  const currentTitle = titles[currentIndex];

  return (
    <aside className="side-indicator" aria-label="Panel Navigation Indicator">
      <div className="side-indicator__inner" key={currentIndex}>
        <div className="side-indicator__numbers">
          <span className="side-indicator__current">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
          <span className="side-indicator__divider">//</span>
          <span className="side-indicator__total">
            {String(total).padStart(2, '0')}
          </span>
        </div>
        <div className="side-indicator__text">
          <div className="side-indicator__title-en">{currentTitle.en}</div>
          <div className="side-indicator__title-zh">{currentTitle.zh}</div>
        </div>
      </div>
    </aside>
  );
}
