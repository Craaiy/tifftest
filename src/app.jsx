import { useEffect, useRef, useState } from 'react';
import { useStore } from './store.jsx';
import { RestTimer } from './timer.jsx';
import { todayKey } from './utils.js';
import DayView from './dayview.jsx';
import RoutineSession from './session.jsx';
import Routines from './routines.jsx';
import Stats from './stats.jsx';
import Profile from './profile.jsx';
import Settings from './settings.jsx';

const TABS = [
  { id: 'today', label: 'Today', icon: '🏋️' },
  { id: 'routines', label: 'Routines', icon: '📋' },
  { id: 'stats', label: 'Stats', icon: '📈' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function App() {
  const { data, startRoutine } = useStore();
  const [tab, setTab] = useState('today');
  const [date, setDate] = useState(todayKey());
  const [sessionRoutine, setSessionRoutine] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  // When the app is reopened on a new day, jump to today
  // (but never in the middle of a routine, e.g. a late session past midnight)
  const live = useRef({ date, sessionRoutine });
  live.current = { date, sessionRoutine };
  useEffect(() => {
    let last = todayKey();
    const onVisible = () => {
      const now = todayKey();
      if (document.visibilityState !== 'visible' || now === last) return;
      if (live.current.date === last && !live.current.sessionRoutine) setDate(now);
      last = now;
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const switchTab = (id) => {
    // Tapping "Today" while already on Today returns from a routine to the day overview
    if (id === 'today' && tab === 'today') setSessionRoutine(null);
    setTab(id);
    setShowSettings(false);
    window.scrollTo(0, 0);
  };

  const startFromRoutinesTab = (routineId) => {
    const today = todayKey();
    const existing = data.workouts.find((w) => w.date === today);
    if (existing?.finished && existing.routineId !== routineId) {
      alert("Today's workout is already finished. Open it on the Today tab and tap Edit to reopen it first.");
      return;
    }
    startRoutine(today, routineId);
    setDate(today);
    setSessionRoutine(routineId);
    setTab('today');
    setShowSettings(false);
    window.scrollTo(0, 0);
  };

  let content;
  if (tab === 'today' && sessionRoutine) {
    content = (
      <RoutineSession routineId={sessionRoutine} date={date} onBack={() => setSessionRoutine(null)} />
    );
  } else if (tab === 'today') {
    content = <DayView date={date} setDate={setDate} onOpenRoutine={(id) => setSessionRoutine(id)} />;
  } else if (tab === 'routines') {
    content = <Routines onStart={startFromRoutinesTab} />;
  } else if (tab === 'stats') {
    content = <Stats />;
  } else if (showSettings) {
    content = <Settings onBack={() => setShowSettings(false)} />;
  } else {
    content = (
      <Profile
        onOpenSettings={() => setShowSettings(true)}
        onSelectDate={(d) => {
          setDate(d);
          setSessionRoutine(null);
          switchTab('today');
        }}
      />
    );
  }

  return (
    <div className="app">
      <main>{content}</main>
      <RestTimer />
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => switchTab(t.id)}>
            <span className="icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}