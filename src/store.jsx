import { createContext, useContext, useEffect, useState } from 'react';
import { uid, num, toggleLink, normalizeSupersets } from './utils.js';
import { useCloud } from './sync.js';
import { useAppearance } from './theme.js';
import { sfx } from './sounds.js';
import { LIBRARY, LIBRARY_VERSION, libraryInfo } from './library.js';

export const KEY = 'fittrack-data-v1';

export const DEFAULT_SETTINGS = {
  // workouts
  restSeconds: 90,
  autoTimer: true,
  defaultSets: 3,
  defaultReps: 10,
  // appearance
  theme: 'dark',
  accent: '#4f8cff',
  fontSize: 'normal',
  reduceMotion: false,
  // sounds & haptics
  sound: true,
  volume: 0.7,
  timerSound: 'beep',
  setSound: 'tick',
  finishSound: 'fanfare',
  countdown: true,
  vibrate: true,
};

const DEFAULT_PROFILE = { name: '', height: '', goal: 'Strength' };

export const isCardio = (exercise) => exercise?.type === 'cardio';

const newExercise = (name, extra = {}) => ({
  id: uid(),
  name,
  note: '',
  rest: null,
  muscle: 'Other',
  type: 'strength',
  ...extra,
});

// Gives existing exercises a muscle group/type and adds new library exercises
function upgradeExercises(list, libVersion) {
  const out = list.map((e) => {
    const lib = libraryInfo(e.name);
    return {
      note: '',
      rest: null,
      ...e,
      muscle: e.muscle ?? lib?.muscle ?? 'Other',
      type: e.type ?? lib?.type ?? 'strength',
    };
  });
  if ((libVersion ?? 0) < LIBRARY_VERSION) {
    const have = new Set(out.map((e) => e.name.toLowerCase()));
    for (const l of LIBRARY)
      if (!have.has(l.name.toLowerCase())) out.push(newExercise(l.name, { muscle: l.muscle, type: l.type }));
  }
  return out;
}

export function freshData() {
  return {
    version: 3,
    updatedAt: 0,
    owner: null,
    libVersion: LIBRARY_VERSION,
    exercises: LIBRARY.map((l) => newExercise(l.name, { muscle: l.muscle, type: l.type })),
    routines: [],
    workouts: [],
    bodyweights: [],
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
  };
}

// Upgrades older saved data to the current format (safe to run more than once)
export function migrate(d) {
  const f = freshData();
  return {
    ...f,
    ...d,
    version: 3,
    libVersion: LIBRARY_VERSION,
    exercises: d.exercises ? upgradeExercises(d.exercises, d.libVersion) : f.exercises,
    routines: d.routines ?? [],
    workouts: d.workouts ?? [],
    bodyweights: d.bodyweights ?? [],
    profile: { ...f.profile, ...d.profile },
    settings: { ...f.settings, ...d.settings },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {}
  return freshData();
}

/** Last finished session (before `beforeDate`) that contains this exercise */
export function getPrevious(workouts, exerciseId, beforeDate) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    if (!w.finished || w.date >= beforeDate) continue;
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (entry) {
      const sets = entry.sets.filter((s) => s.done);
      if (sets.length) return { date: w.date, sets, note: entry.note };
    }
  }
  return null;
}

/** Heaviest weight ever completed for this exercise */
export function getBest(workouts, exerciseId) {
  let best = 0;
  for (const w of workouts) {
    if (!w.finished) continue;
    for (const e of w.entries) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of e.sets) if (s.done) best = Math.max(best, num(s.kg));
    }
  }
  return best;
}

const str = (v) => (v === undefined || v === null ? '' : String(v));

/** Create sets: uses the routine target first, then last session's numbers */
function makeSets(prev, count, fill = {}, cardio = false) {
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const p = prev?.sets[i] ?? prev?.sets[prev.sets.length - 1];
    if (cardio) {
      return {
        id: uid(),
        min: str(fill.min || p?.min),
        km: str(fill.km || p?.km),
        level: str(fill.level || p?.level),
        done: false,
      };
    }
    return {
      id: uid(),
      kg: p ? str(p.kg) : '',
      reps: fill.reps ? str(fill.reps) : p ? str(p.reps) : '',
      done: false,
    };
  });
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [data, setRaw] = useState(load);

  // Every change gets a timestamp (used to decide which copy is newest when syncing)
  const setData = (fn) =>
    setRaw((d) => {
      const next = fn(d);
      return next === d ? d : { ...next, updatedAt: Date.now() };
    });
  const replaceData = (d) => setRaw(migrate(d));
  const clearLocal = () => {
    localStorage.removeItem(KEY);
    setRaw(freshData());
  };

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
      if (!window.__fittrackStorageWarned) {
        window.__fittrackStorageWarned = true;
        alert('Could not save: browser storage is full. Export a backup in Settings.');
      }
    }
  }, [data]);

  useAppearance(data.settings);
  const cloud = useCloud(data, replaceData, clearLocal);

  const updateWorkout = (date, fn) =>
    setData((d) => {
      const current =
        d.workouts.find((w) => w.date === date) ??
        { id: uid(), date, routineId: null, finished: false, entries: [] };
      const next = fn(structuredClone(current), d);
      const workouts = d.workouts
        .filter((w) => w.date !== date)
        .concat(next)
        .sort((a, b) => a.date.localeCompare(b.date));
      return { ...d, workouts };
    });

  const updateEntry = (date, entryId, fn) =>
    updateWorkout(date, (w) => {
      const e = w.entries.find((x) => x.id === entryId);
      if (e) fn(e);
      return w;
    });

  const api = {
    data,
    cloud,

    /* ----- exercises ----- */
    addExercise(name, extra = {}) {
      const existing = data.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing.id;
      const ex = newExercise(name, extra);
      setData((d) => ({ ...d, exercises: [...d.exercises, ex] }));
      return ex.id;
    },
    updateExercise(id, patch) {
      setData((d) => ({
        ...d,
        exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },

    /* ----- workout entries ----- */
    addEntry(date, exerciseId, count) {
      updateWorkout(date, (w, d) => {
        const cardio = isCardio(d.exercises.find((x) => x.id === exerciseId));
        const prev = getPrevious(d.workouts, exerciseId, date);
        const n = count ?? prev?.sets.length ?? (cardio ? 1 : d.settings.defaultSets);
        const fill = cardio || prev ? {} : { reps: d.settings.defaultReps };
        w.entries.push({
          id: uid(),
          exerciseId,
          sets: makeSets(prev, n, fill, cardio),
          target: {},
          note: '',
          superset: null,
        });
        return w;
      });
    },
    removeEntry(date, entryId) {
      updateWorkout(date, (w) => {
        w.entries = normalizeSupersets(w.entries.filter((e) => e.id !== entryId));
        if (!w.entries.length) w.routineId = null; // empty day is no longer "in a routine"
        return w;
      });
    },
    patchEntry(date, entryId, patch) {
      updateEntry(date, entryId, (e) => Object.assign(e, patch));
    },
    toggleSuperset(date, entryId) {
      updateWorkout(date, (w) => {
        const i = w.entries.findIndex((e) => e.id === entryId);
        if (i >= 0) w.entries = toggleLink(w.entries, i);
        return w;
      });
    },

    /* ----- sets ----- */
    updateSet(date, entryId, setId, patch) {
      updateEntry(date, entryId, (e) => {
        const s = e.sets.find((x) => x.id === setId);
        if (s) Object.assign(s, patch);
      });
    },
    addSet(date, entryId) {
      updateWorkout(date, (w, d) => {
        const e = w.entries.find((x) => x.id === entryId);
        if (!e) return w;
        const cardio = isCardio(d.exercises.find((x) => x.id === e.exerciseId));
        const base = cardio ? { min: '', km: '', level: '' } : { kg: '', reps: '' };
        const last = e.sets[e.sets.length - 1];
        const copy = last ? Object.fromEntries(Object.keys(base).map((k) => [k, last[k] ?? ''])) : base;
        e.sets.push({ id: uid(), ...copy, done: false });
        return w;
      });
    },
    removeSet(date, entryId, setId) {
      updateEntry(date, entryId, (e) => {
        e.sets = e.sets.filter((s) => s.id !== setId);
      });
    },

    /* ----- routines & days ----- */
    startRoutine(date, routineId) {
      updateWorkout(date, (w, d) => {
        if (w.finished) return w;
        const routine = d.routines.find((r) => r.id === routineId);
        if (!routine) return w;
        w.routineId = routineId;
        for (const re of routine.exercises) {
          if (w.entries.some((e) => e.exerciseId === re.exerciseId)) continue;
          const cardio = isCardio(d.exercises.find((x) => x.id === re.exerciseId));
          const prev = getPrevious(d.workouts, re.exerciseId, date);
          const target = cardio
            ? { min: re.min || '', km: re.km || '', level: re.level || '' }
            : { reps: re.reps || null };
          const fill = cardio ? target : { reps: re.reps || (prev ? null : d.settings.defaultReps) };
          w.entries.push({
            id: uid(),
            exerciseId: re.exerciseId,
            sets: makeSets(prev, re.sets || 1, fill, cardio),
            target,
            note: '',
            superset: re.superset ?? null,
          });
        }
        w.entries = normalizeSupersets(w.entries);
        return w;
      });
    },
    finishDay(date) {
      sfx('finish', data.settings);
      updateWorkout(date, (w) => ({ ...w, finished: true, finishedAt: new Date().toISOString() }));
    },
    reopenDay(date) {
      updateWorkout(date, (w) => ({ ...w, finished: false }));
    },
    saveRoutine(routine) {
      const r = { ...routine, exercises: normalizeSupersets(routine.exercises) };
      setData((d) => ({
        ...d,
        routines: d.routines.some((x) => x.id === r.id)
          ? d.routines.map((x) => (x.id === r.id ? r : x))
          : [...d.routines, r],
      }));
    },
    deleteRoutine(id) {
      setData((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) }));
    },

    /* ----- body weight, profile, settings ----- */
    addBodyweight(date, kg) {
      setData((d) => ({
        ...d,
        bodyweights: [...d.bodyweights.filter((b) => b.date !== date), { date, kg }].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      }));
    },
    removeBodyweight(date) {
      setData((d) => ({ ...d, bodyweights: d.bodyweights.filter((b) => b.date !== date) }));
    },
    updateProfile(patch) {
      setData((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
    },
    updateSettings(patch) {
      setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },

    /* ----- data ----- */
    importData(obj) {
      setData((d) => ({ ...migrate(obj), owner: d.owner }));
    },
    resetData() {
      setData((d) => ({ ...freshData(), owner: d.owner }));
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}