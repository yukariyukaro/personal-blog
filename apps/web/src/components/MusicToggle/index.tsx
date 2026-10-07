import { useBgmAudio } from './useBgmAudio'
import './MusicToggle.css'

export default function MusicToggle() {
  const { isPlaying, toggle } = useBgmAudio()

  const label = isPlaying ? '暂停背景音乐' : '播放背景音乐'

  return (
    <button
      className={`music-toggle ${isPlaying ? 'is-playing' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={isPlaying}
      title={label}
      onClick={toggle}
    >
      {/* 几何复刻明日方舟官网 icon_sound：5 根竖条（宽 4、间距 6.5）。
          官网是单条 path，这里拆成独立 rect 才能逐条做抖动动画，视觉一致。 */}
      <svg
        className="music-toggle__icon"
        viewBox="0 0 30 34"
        aria-hidden="true"
        focusable="false"
      >
        <rect className="music-toggle__bar" x="0" y="11.29" width="4" height="12.132" />
        <rect className="music-toggle__bar" x="6.5" y="6.234" width="4" height="22.243" />
        <rect className="music-toggle__bar" x="13" y="0.867" width="4" height="32.978" />
        <rect className="music-toggle__bar" x="19.5" y="6.234" width="4" height="22.243" />
        <rect className="music-toggle__bar" x="26" y="11.29" width="4" height="12.132" />
      </svg>
    </button>
  )
}
