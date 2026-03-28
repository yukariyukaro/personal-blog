import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import './Navbar.css';

interface NavbarProps {
  visible?: boolean;
  activeIndex?: number;
  onNavigate?: (index: number) => void;
}

const NAV_ITEMS = [
  { en: 'INDEX', zh: '首页' },
  { en: 'INFORMATION', zh: '介绍' },
  { en: 'PORTFOLIO', zh: '作品' },
]

export default function Navbar({ visible = true, activeIndex = 0, onNavigate }: NavbarProps) {
  return (
    <NavigationMenu.Root
      className={`site-nav ${visible ? '' : 'site-nav--hidden'}`}
      aria-label="Main Navigation"
    >
      <div className="site-nav__logo-container">
        <a href="/" className="site-nav__logo">娄宿三</a>
      </div>

      <NavigationMenu.List className="site-nav__list">
        {NAV_ITEMS.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <NavigationMenu.Item key={item.en} className="site-nav__item">
              <NavigationMenu.Link
                className={`site-nav__link ${isActive ? 'site-nav__link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.(index);
                }}
                href={`#${item.en.toLowerCase()}`}
              >
                <span className="site-nav__text-en">{item.en}</span>
                <span className="site-nav__text-zh">{item.zh}</span>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
