import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import './Navbar.css';

export default function Navbar() {
  return (
    <NavigationMenu.Root className="glass-nav" aria-label="Main Navigation">
      <NavigationMenu.List className="glass-nav__list">
        <NavigationMenu.Item className="glass-nav__logo-item">
          <div className="glass-nav__logo">
            <a href="/">娄宿三</a>
          </div>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
