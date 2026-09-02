import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { CITIES, RANKS } from '../../../shared/constants';

const primaryItems = [
  { path: '/dashboard', label: 'Home', icon: '⌂' },
  { path: '/crimes', label: 'Crimes', icon: '◆' },
  { path: '/goods', label: 'Goods', icon: '▦' },
  { path: '/travel', label: 'Travel', icon: '➜' },
  { path: '/crew', label: 'Crew', icon: '♟' },
];

const empireItems = [
  { path: '/garage', label: 'Garage', icon: '◇' },
  { path: '/marketplace', label: 'Car market', icon: '◈' },
  { path: '/store', label: 'Store & bank', icon: '▤' },
  { path: '/bullet-factories', label: 'Factories', icon: '▥' },
  { path: '/props', label: 'Properties', icon: '▧' },
];

const combatItems = [
  { path: '/shoot', label: 'Combat', icon: '◎' },
  { path: '/shoot-calculator', label: 'Shot calculator', icon: '⌖' },
];

const Navigation = () => {
  const location = useLocation();
  const { player, logout } = useGameStore();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  if (!player) return null;

  const currentCity = CITIES[player.city];
  const currentRank = RANKS[player.rank];
  const allItems = [...primaryItems, ...empireItems, ...combatItems];

  const handleLogout = () => {
    logout();
    localStorage.removeItem('auth_token');
  };

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-mafia-red text-white shadow-lg shadow-red-950/40'
        : 'text-mafia-gray-300 hover:bg-white/5 hover:text-white'
    }`;

  const group = (title: string, items: typeof primaryItems) => (
    <div>
      <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-mafia-gray-400">{title}</div>
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.path} to={item.path} className={itemClass}>
            <span className="w-5 text-center text-base text-mafia-gold">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-[4.5rem] border-b border-white/10 bg-[#090b10]/95 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-mafia-red/40 bg-mafia-red/10 text-xl">♠</span>
            <div className="min-w-0">
              <div className="font-bold tracking-[0.18em] text-white">MAFIOSO</div>
              <div className="truncate text-[11px] text-mafia-gray-400">{currentCity.flag} {currentCity.name} · {currentRank.name}</div>
            </div>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-mafia-gray-400">Cash</div><div className="font-mono font-bold text-money">${player.money.toLocaleString()}</div></div>
            <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-mafia-gray-400">Respect</div><div className="font-bold text-mafia-gold">{player.respect.toLocaleString()}</div></div>
            <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-mafia-gray-400">Ammo</div><div className="font-bold text-white">{player.bullets}</div></div>
            <button type="button" onClick={handleLogout} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-mafia-gray-300 hover:border-white/20 hover:text-white">Sign out</button>
          </div>

          <button type="button" aria-label="Open game menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="rounded-xl border border-white/10 px-3 py-2 text-xl text-white lg:hidden">{menuOpen ? '×' : '☰'}</button>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[4.5rem] z-40 hidden w-64 flex-col border-r border-white/10 bg-[#0c0f15]/95 p-4 lg:flex">
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {group('Street', primaryItems)}
          {group('Empire', empireItems)}
          {group('Combat', combatItems)}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="font-bold text-white">{player.username}</div>
          <div className="mt-1 text-xs text-mafia-gray-400">{currentRank.name} · {player.bullets} bullets</div>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 pt-[4.5rem] backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="ml-auto h-full w-[min(88vw,360px)] overflow-y-auto border-l border-white/10 bg-[#0c0f15] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-bold text-white">{player.username}</div>
              <div className="mt-1 text-sm text-mafia-gray-400">{currentRank.name} in {currentCity.name}</div>
              <div className="mt-3 flex gap-5 text-sm"><span className="text-money">${player.money.toLocaleString()}</span><span className="text-mafia-gold">{player.respect.toLocaleString()} respect</span></div>
            </div>
            <div className="space-y-2">{allItems.map((item) => <NavLink key={item.path} to={item.path} className={itemClass}><span className="w-5 text-center text-mafia-gold">{item.icon}</span>{item.label}</NavLink>)}</div>
            <button type="button" onClick={handleLogout} className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-mafia-gray-300">Sign out</button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#090b10]/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden">
        {primaryItems.slice(0, 4).map((item) => {
          const active = location.pathname === item.path;
          return <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold ${active ? 'text-mafia-red' : 'text-mafia-gray-400'}`}><span className="text-lg">{item.icon}</span>{item.label}</Link>;
        })}
        <button type="button" onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-bold text-mafia-gray-400"><span className="text-lg">☰</span>More</button>
      </nav>
    </>
  );
};

export default Navigation;
