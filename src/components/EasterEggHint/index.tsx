import * as Tooltip from '@radix-ui/react-tooltip';
import './EasterEggHint.css';

export default function EasterEggHint() {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="glass-nav__easter-egg-trigger" aria-label="查看彩蛋">
            <div className="glass-nav__egg-dot"></div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            className="glass-nav__tooltip-content" 
            sideOffset={5}
            side="top"
            align="center"
          >
            冷知识：初音绿的十六进制色号是 <span style={{ color: '#39C5BB', fontWeight: 'bold' }}>#39C5BB</span> Yヾ(≧▽≦＠)
            <Tooltip.Arrow className="glass-nav__tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
