export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

// Dates are stored as 'YYYY-MM-DD' strings in local time
export const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayKey = () => toKey(new Date());

export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const formatDate = (
  k,
  opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
) => parseKey(k).toLocaleDateString(undefined, opts);

// Monday of the week
export const weekStart = (k) => {
  const d = parseKey(k);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toKey(d);
};

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// Input cleaners: allow "82,5" and strip letters
export const cleanDec = (v) => String(v).replace(',', '.').replace(/[^0-9.]/g, '');
export const cleanInt = (v) => String(v).replace(/\D/g, '');

// Epley formula for estimated 1 rep max
export const e1rm = (kg, reps) => (reps > 0 ? kg * (1 + reps / 30) : 0);

export const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString();

export const fmtShort = (n) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n * 10) / 10);

export const fmtTime = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ---------- Cardio ---------- */
export const isCardioSet = (s) => !!s && ('min' in s || 'km' in s || 'level' in s);

// "30 min · 5 km · lvl 8" (only the parts that are filled in)
export function cardioText(s) {
  const parts = [];
  if (num(s?.min)) parts.push(`${fmt(num(s.min))} min`);
  if (num(s?.km)) parts.push(`${fmt(num(s.km))} km`);
  if (num(s?.level)) parts.push(`lvl ${fmt(num(s.level))}`);
  return parts.join(' · ');
}

export const pace = (min, km) => (min > 0 && km > 0 ? `${fmtTime((min * 60) / km)} /km` : '');
export const speed = (min, km) => (min > 0 && km > 0 ? `${fmt(km / (min / 60))} km/h` : '');

export const setsSummary = (sets) =>
  sets
    .map((s) => (isCardioSet(s) ? cardioText(s) || '—' : `${s.kg || 0}×${s.reps || 0}`))
    .join(', ');

/* ---------- Supersets ----------
   Items (workout entries or routine items) that share the same `superset`
   id and sit next to each other form one superset. */

export function normalizeSupersets(list) {
  const counts = {};
  list.forEach((x) => x.superset && (counts[x.superset] = (counts[x.superset] || 0) + 1));
  return list.map((x) => (x.superset && counts[x.superset] < 2 ? { ...x, superset: null } : x));
}

// Link item i with item i+1, or unlink them if they are already linked
export function toggleLink(list, i) {
  const next = list.map((x) => ({ ...x }));
  const a = next[i];
  const b = next[i + 1];
  if (!a || !b) return list;
  if (a.superset && a.superset === b.superset) {
    const old = a.superset;
    const fresh = uid();
    for (let j = i + 1; j < next.length && next[j].superset === old; j++) next[j].superset = fresh;
  } else {
    const id = a.superset || uid();
    const old = b.superset;
    a.superset = id;
    b.superset = id;
    if (old) for (let j = i + 2; j < next.length && next[j].superset === old; j++) next[j].superset = id;
  }
  return normalizeSupersets(next);
}

// Split a list into blocks: single exercises or supersets
export function groupBlocks(list) {
  const blocks = [];
  list.forEach((x, i) => {
    const last = blocks[blocks.length - 1];
    if (last && x.superset && list[i - 1]?.superset === x.superset) last.push(x);
    else blocks.push([x]);
  });
  return blocks;
}