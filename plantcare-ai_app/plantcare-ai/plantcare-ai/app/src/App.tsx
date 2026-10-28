import { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, BrainCircuit, History as HistoryIcon, Home as HomeIcon, Leaf, Settings as SettingsIcon } from 'lucide-react';
import { StoreProvider, useStore } from './store';
import { LeafMark } from './components/PlantArt';
import { LinkBadge, Toasts } from './components/ui';
import { Home } from './screens/Home';
import { Plant } from './screens/Plant';
import { Live } from './screens/Live';
import { Analysis } from './screens/Analysis';
import { History } from './screens/History';
import { Alerts } from './screens/Alerts';
import { Settings } from './screens/Settings';

export type Screen = 'home' | 'plant' | 'live' | 'analysis' | 'history' | 'alerts' | 'settings';

const NAV: { id: Screen; label: string; icon: JSX.Element }[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon /> },
  { id: 'plant', label: 'Plant', icon: <Leaf /> },
  { id: 'live', label: 'Live', icon: <Activity /> },
  { id: 'analysis', label: 'AI Health', icon: <BrainCircuit /> },
  { id: 'history', label: 'History', icon: <HistoryIcon /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
];

const fromHash = (): Screen => {
  const h = window.location.hash.replace('#/', '') as Screen;
  return NAV.some((n) => n.id === h) ? h : 'home';
};

function Shell() {
  const [screen, setScreen] = useState<Screen>(fromHash);
  const { unread, link } = useStore();

  useEffect(() => {
    const on = () => setScreen(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((s: Screen) => {
    if (window.location.hash !== `#/${s}`) window.location.hash = `/${s}`;
    setScreen(s);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => go('home')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} aria-label="PlantCare AI home">
            <LeafMark /> PlantCare AI
          </button>
          <span className="spacer" />
          {link === 'demo' && <span className="chip chip-demo">DEMO DATA</span>}
        </div>
      </div>
      <main className="page" key={screen}>
        {screen === 'home' && <Home go={go} />}
        {screen === 'plant' && <Plant />}
        {screen === 'live' && <Live go={go} />}
        {screen === 'analysis' && <Analysis />}
        {screen === 'history' && <History />}
        {screen === 'alerts' && <Alerts go={go} />}
        {screen === 'settings' && <Settings go={go} />}
      </main>
      <Toasts />
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {NAV.map((n) => (
            <button key={n.id} aria-current={screen === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              {n.icon}
              <span className="lbl">{n.label}</span>
              {n.id === 'alerts' && unread > 0 && <span className="dot" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
            </button>
          ))}
        </div>
      </nav>
      <span className="visually-hidden"><LinkBadge link={link} /></span>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
