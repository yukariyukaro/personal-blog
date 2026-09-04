export default function HomePageWave() {
  return (
    <div className="home-page__waves" aria-hidden="true">
      <svg
        className="home-page__waves-svg"
        viewBox="0 20 150 32"
        preserveAspectRatio="none"
        shapeRendering="auto"
      >
        <defs>
          <path
            id="home-gentle-wave"
            d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v48h-352z"
          />
        </defs>
        <g className="home-page__waves-parallax">
          <use
            href="#home-gentle-wave"
            x="48"
            y="0"
            fill="var(--home-wave-fill)"
            opacity="0.28"
            style={{ animationDelay: '-2s', animationDuration: '7s' }}
          />
          <use
            href="#home-gentle-wave"
            x="48"
            y="3"
            fill="var(--home-wave-fill)"
            opacity="0.48"
            style={{ animationDelay: '-3s', animationDuration: '10s' }}
          />
          <use
            href="#home-gentle-wave"
            x="48"
            y="5"
            fill="var(--home-wave-fill)"
            opacity="0.7"
            style={{ animationDelay: '-4s', animationDuration: '13s' }}
          />
          <use
            href="#home-gentle-wave"
            x="48"
            y="7"
            fill="var(--home-wave-fill)"
            opacity="0.98"
            style={{ animationDelay: '-5s', animationDuration: '20s' }}
          />
        </g>
      </svg>
    </div>
  )
}
