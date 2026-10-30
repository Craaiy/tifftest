import { useEffect, useRef, useState } from 'react';
import { uid } from './utils.js';

/*
 * DEMO cloud: accounts and "cloud" data are stored in this browser's localStorage.
 * The functions behave like a real backend (with fake delays), so a real service
 * like Supabase can replace this file later without changing the rest of the app.
 */
const USERS = 'fittrack-demo-users'; // { email: { id, password } }
const CLOUD = 'fittrack-demo-cloud'; // { userId: data }
const SESSION = 'fittrack-demo-session'; // { id, email }

const read = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function useCloud(data, replaceData, clearLocal) {
  const [user, setUser] = useState(() => read(SESSION, null));
  const [status, setStatus] = useState('signed-out');
  const [error, setError] = useState('');

  const dataRef = useRef(data);
  const userRef = useRef(user);
  const ready = useRef(false);
  const skipNext = useRef(false);
  const busy = useRef(false);
  dataRef.current = data;
  userRef.current = user;

  const push = async () => {
    const u = userRef.current;
    if (!u) return;
    setStatus('syncing');
    await wait(400);
    if (userRef.current?.id !== u.id) return; // signed out meanwhile
    const cloud = read(CLOUD, {});
    cloud[u.id] = dataRef.current;
    write(CLOUD, cloud);
    setError('');
    setStatus('synced');
  };

  const pull = async () => {
    const u = userRef.current;
    if (!u || busy.current) return;
    busy.current = true;
    setStatus('syncing');
    await wait(500);

    const remote = read(CLOUD, {})[u.id];
    const local = dataRef.current;
    let useRemote = false;

    if (remote) {
      if (local.owner !== u.id) {
        // This device has guest data (or another account's data)
        const hasLocalWork = local.workouts.some((w) => w.finished);
        useRemote =
          !hasLocalWork ||
          confirm(
            'Your account already has saved data.\n\nOK = use account data\nCancel = overwrite the account with the data on this device'
          );
      } else {
        useRemote = (remote.updatedAt || 0) > (local.updatedAt || 0);
      }
    }

    ready.current = true;
    busy.current = false;

    if (useRemote) {
      skipNext.current = true;
      replaceData({ ...remote, owner: u.id });
      setStatus('synced');
    } else if (local.owner !== u.id) {
      replaceData({ ...local, owner: u.id, updatedAt: Date.now() }); // upload follows automatically
    } else if (!remote || (local.updatedAt || 0) > (remote.updatedAt || 0)) {
      await push();
    } else {
      setStatus('synced');
    }
  };

  // Login / logout
  useEffect(() => {
    ready.current = false;
    if (!user) {
      setStatus('signed-out');
      return;
    }
    pull();
  }, [user?.id]);

  // Upload changes (debounced)
  useEffect(() => {
    if (!user || !ready.current) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setStatus('pending');
    const t = setTimeout(push, 1500);
    return () => clearTimeout(t);
  }, [data]);

  return {
    enabled: true,
    demo: true,
    user,
    status,
    error,
    async signIn(email, password) {
      await wait(500);
      const key = email.trim().toLowerCase();
      const acc = read(USERS, {})[key];
      if (!acc || acc.password !== password) throw new Error('Invalid email or password.');
      const u = { id: acc.id, email: key };
      write(SESSION, u);
      setUser(u);
    },
    async signUp(email, password) {
      await wait(500);
      const key = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(key)) throw new Error('Enter a valid email address.');
      const users = read(USERS, {});
      if (users[key]) throw new Error('An account with this email already exists. Sign in instead.');
      users[key] = { id: uid(), password };
      write(USERS, users);
      const u = { id: users[key].id, email: key };
      write(SESSION, u);
      setUser(u);
      return true; // signed in immediately (no email confirmation in demo)
    },
    async signOut() {
      await push();
      ready.current = false; // never upload the emptied device data
      localStorage.removeItem(SESSION);
      setUser(null);
      clearLocal();
    },
    syncNow: () => pull(),
  };
}