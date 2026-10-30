import { num, formatDate, setsSummary } from './utils.js';

/*
 * DEMO AI coach: answers come from built-in rules and text,
 * with a short "thinking" delay. No external API is called.
 */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round25 = (n) => Math.round(n / 2.5) * 2.5;
const r1 = (n) => Math.round(n * 10) / 10;

function analyse(sets) {
  const s = sets.map((x) => ({ kg: num(x.kg), reps: num(x.reps) }));
  const top = Math.max(...s.map((x) => x.kg));
  const working = s.filter((x) => x.kg === top);
  const target = Math.max(...working.map((x) => x.reps));
  return { top, working, target, hitAll: working.every((x) => x.reps >= target) };
}

/** Progression advice based on the last sessions */
export function localSuggestion(history) {
  const last = history[history.length - 1];
  if (!last) {
    return "No history for this exercise yet.\n\nPick a weight you can lift for 8–12 clean reps with 1–2 reps left in the tank. Log it, and next time I'll suggest how to progress.";
  }
  const a = analyse(last.sets);
  const step = a.top >= 40 ? 2.5 : 1;
  const head = `Last time (${formatDate(last.date, { day: 'numeric', month: 'short' })}): ${setsSummary(last.sets)}\n\n`;

  if (a.top === 0) return head + `Bodyweight exercise: try adding 1 rep per set today (aim for ${a.target + 1}).`;
  if (a.hitAll && a.target >= 12)
    return head + `✅ ${a.target} reps on every set. Go up to ${a.top + step} kg and aim for 8–10 reps.`;
  if (a.hitAll) return head + `✅ All sets hit ${a.target} reps at ${a.top} kg → try ${a.top + step} kg × ${a.target} today.`;

  const before = history[history.length - 2];
  if (before) {
    const b = analyse(before.sets);
    if (b.top === a.top && !b.hitAll) {
      return head + `⚠️ Stuck at ${a.top} kg for two sessions. Deload to ${round25(a.top * 0.9)} kg × ${a.target} and build back up.`;
    }
  }
  return head + `↔️ Not every set reached ${a.target} reps → stay at ${a.top} kg and aim for ${a.target} reps on all ${a.working.length} sets.`;
}

/* ---------- Form cues ---------- */
const FORM = [
  { keys: ['romanian', 'rdl'], cues: [
    'Soft knees. Push your hips back like closing a door with your butt.',
    'Keep the bar against your legs the whole way down.',
    'Stop when you feel a strong hamstring stretch, usually just below the knee.',
    'Squeeze your glutes to stand up. Don’t lean back at the top.' ] },
  { keys: ['deadlift'], cues: [
    'Bar over mid-foot, shins close to the bar.',
    'Take the slack out of the bar before you pull. Chest up, lats tight.',
    'Push the floor away with your legs. Don’t yank with your back.',
    'Lock out with your glutes and keep the bar close all the way down.' ] },
  { keys: ['bench', 'chest press', 'incline'], cues: [
    'Squeeze your shoulder blades together and keep them pinned.',
    'Feet flat, slight arch, glutes stay on the bench.',
    'Lower to mid-chest with elbows ~45°, not flared out.',
    'Drive up and slightly back over your shoulders.' ] },
  { keys: ['leg press'], cues: [
    'Feet shoulder-width, mid-platform.',
    'Lower until your knees are around 90° without your lower back lifting off the pad.',
    'Push through your whole foot, not just your toes.',
    'Don’t lock your knees hard at the top.' ] },
  { keys: ['squat'], cues: [
    'Brace your core like you’re about to be punched, then descend.',
    'Knees track over your toes. Let them travel forward.',
    'Sit down between your hips, chest proud.',
    'Drive up through mid-foot and keep the bar over mid-foot.' ] },
  { keys: ['overhead', 'shoulder press', 'military'], cues: [
    'Squeeze glutes and abs so your lower back doesn’t arch.',
    'Start with the bar on your upper chest, forearms vertical.',
    'Move your head back slightly, then push it "through the window" once the bar passes.',
    'Finish with the bar over the middle of your foot.' ] },
  { keys: ['pull up', 'pull-up', 'pulldown', 'chin'], cues: [
    'Start every rep by pulling your shoulders down, away from your ears.',
    'Drive your elbows down toward your back pockets.',
    'Bring your chest toward the bar. Don’t just reach with your chin.',
    'Control the way down. No dropping.' ] },
  { keys: ['row'], cues: [
    'Hinge forward with a flat back and keep your torso still.',
    'Pull toward your lower ribs/belly button.',
    'Squeeze your shoulder blades at the top for a split second.',
    'Don’t use body swing to move the weight.' ] },
  { keys: ['leg curl', 'hamstring'], cues: [
    'Line up your knee with the machine’s pivot point.',
    'Keep your hips pressed into the pad.',
    'Curl fully and squeeze for a second.',
    'Lower slowly (2–3 seconds).' ] },
  { keys: ['curl'], cues: [
    'Pin your elbows to your sides.',
    'No swinging: if you need momentum, the weight is too heavy.',
    'Squeeze hard at the top.',
    'Lower slowly and get a full stretch at the bottom.' ] },
  { keys: ['tricep', 'pushdown', 'extension', 'dip'], cues: [
    'Keep your elbows locked in place at your sides.',
    'Fully straighten your arms and squeeze your triceps.',
    'Only your forearms move.',
    'Control the way back up.' ] },
  { keys: ['lateral', 'raise'], cues: [
    'Light weight, strict form. This is a small muscle.',
    'Lead with your elbows, slight bend in the arms.',
    'Raise to shoulder height, not higher.',
    'Lower slowly. Don’t let the weights drop.' ] },
];
const DEFAULT_CUES = [
  'Use a full, controlled range of motion.',
  'Brace your core before every rep.',
  'Lower the weight in 2–3 seconds.',
  'Stop the set when your form starts to break.',
];

/* ---------- Superset partners ---------- */
const SUPERSETS = [
  { keys: ['bench', 'chest', 'incline', 'press'], ideas: [
    'Barbell Row: antagonist (back vs. chest), saves time',
    'Pull Up / Lat Pulldown: balances pushing with pulling',
    'Face Pull: keeps your shoulders healthy' ] },
  { keys: ['row', 'pull', 'chin'], ideas: [
    'Bench Press: chest vs. back, classic antagonist pair',
    'Overhead Press: push/pull without fatiguing the same muscles',
    'Plank: core work while your back recovers' ] },
  { keys: ['squat', 'leg press'], ideas: [
    'Leg Curl: quads vs. hamstrings',
    'Hanging Leg Raise: core work without taxing your legs',
    'Calf Raise: easy pairing, uses rest time' ] },
  { keys: ['deadlift', 'romanian', 'leg curl'], ideas: [
    'Leg Extension: hamstrings vs. quads',
    'Ab Wheel / Plank: core between heavy hinge sets',
    'Calf Raise: low fatigue, saves time' ] },
  { keys: ['curl'], ideas: [
    'Tricep Pushdown: biceps vs. triceps, great arm pump',
    'Lateral Raise: small muscle, no overlap',
    'Overhead Tricep Extension: antagonist with a long stretch' ] },
  { keys: ['tricep', 'pushdown', 'extension', 'dip'], ideas: [
    'Bicep Curl: triceps vs. biceps',
    'Hammer Curl: brachialis + forearms',
    'Lateral Raise: no overlap with triceps' ] },
  { keys: ['lateral', 'raise'], ideas: [
    'Bicep Curl: no overlap, easy pairing',
    'Rear Delt Fly: complete shoulder work',
    'Tricep Pushdown: uses rest time efficiently' ] },
];
const DEFAULT_IDEAS = [
  'Plank: core work that doesn’t interfere',
  'Calf Raise: low fatigue, easy to pair',
  'Any exercise for the opposite muscle group (e.g. push ↔ pull)',
];

// Picks the entry with the most specific (longest) matching keyword, matching whole words only
function findIn(list, name) {
  let best = null;
  let len = 0;
  for (const x of list)
    for (const k of x.keys)
      if (k.length > len && new RegExp(`\\b${k}`).test(name)) {
        best = x;
        len = k.length;
      }
  return best;
}

/* ---------- Free questions ---------- */
const REP_RANGES = {
  Strength: '3–6 reps, 3–5 sets, 2–4 min rest',
  'Muscle growth': '8–12 reps, 3–4 sets, 60–120 s rest',
  'Fat loss': '10–15 reps, 3 sets, 45–90 s rest (keep the weights challenging!)',
  'General fitness': '8–12 reps, 3 sets, 60–90 s rest',
};

const QA = [
  { keys: ['pain', 'hurt', 'injur', 'sharp'], a: () =>
    '⚠️ Sharp or joint pain = stop the exercise.\n\n• Normal muscle burn is fine, joint pain isn’t\n• Try a lighter weight or a pain-free variation\n• If it persists for more than a few days, see a physio or doctor' },
  { keys: ['sore', 'doms'], a: () =>
    '• Muscle soreness (DOMS) is normal 1–3 days after training\n• Light movement and walking help more than full rest\n• Sleep, protein and water speed up recovery\n• You can train sore muscles lightly, just skip heavy PR attempts' },
  { keys: ['warm'], a: (c) => {
    const top = c.lastTop;
    if (!top) return '• 5 min light cardio\n• 1–2 light sets of 10–12 reps\n• Then 1 set at ~75% of your working weight for 3–5 reps';
    return `Warm-up for ${top} kg working sets:\n• ${round25(top * 0.4)} kg × 10\n• ${round25(top * 0.6)} kg × 5\n• ${round25(top * 0.8)} kg × 3\nThen start your working sets.`;
  } },
  { keys: ['how many rep', 'how many set', 'rep range', 'reps'], a: (c) =>
    `For your goal (${c.goal}):\n• ${REP_RANGES[c.goal] ?? REP_RANGES['General fitness']}\n• Leave 1–2 reps in the tank on most sets\n• Add weight once you hit the top of the range on all sets` },
  { keys: ['rest', 'break', 'timer'], a: () =>
    '• Heavy compound lifts (squat, bench, deadlift): 2–3 min\n• Accessories (curls, raises): 60–90 s\n• Supersets: rest after both exercises\nYou can set a custom rest per exercise via ⋯ → Rest timer.' },
  { keys: ['plateau', 'stuck', 'progress', 'heavier', 'increase'], a: (c) => localSuggestion(c.history) },
  { keys: ['protein', 'eat', 'diet', 'food', 'nutrition'], a: (c) => {
    const bw = c.bodyweight;
    const range = bw ? `${Math.round(bw * 1.6)}–${Math.round(bw * 2.2)} g` : '1.6–2.2 g per kg body weight';
    return `• Protein: ${range} per day\n• Spread it over 3–5 meals\n• Eat a meal with carbs + protein 1–3 h before training\n• Drink plenty of water, especially on training days`;
  } },
  { keys: ['sleep', 'recover', 'tired', 'fatigue'], a: () =>
    '• Aim for 7–9 hours of sleep. It’s where you actually get stronger\n• Feeling drained for over a week? Take a lighter (deload) week\n• Keep 1–2 rest days per week' },
  { keys: ['cardio', 'run'], a: () =>
    '• Cardio and lifting go fine together\n• Do cardio after lifting or on separate days\n• 2–3 sessions of 20–30 min per week is a great base' },
];

const GENERIC = [
  'Good question! General rule: progress slowly, keep form strict, and log every session so you can see the trend.',
  'Consistency beats intensity. Showing up 3–4× per week for months gives the best results.',
  'Focus on adding a little weight or one extra rep over time. Small jumps add up fast.',
];

/* ---------- Cardio advice ---------- */
function cardioCoach(kind, ctx) {
  const last = ctx.history[ctx.history.length - 1];

  if (kind === 'today') {
    if (!last) {
      return 'No cardio logged yet for this exercise.\n\n• Start with 20–30 min at a pace where you can still talk\n• Log time, distance and intensity, and next time I’ll suggest how to progress.';
    }
    const min = last.sets.reduce((a, s) => a + num(s.min), 0);
    const km = last.sets.reduce((a, s) => a + num(s.km), 0);
    const lvl = Math.max(0, ...last.sets.map((s) => num(s.level)));
    const lines = [
      `Last time (${formatDate(last.date, { day: 'numeric', month: 'short' })}): ${setsSummary(last.sets)}`,
      '',
    ];
    if (km && min) {
      lines.push(`• Go further: ${r1(km * 1.1)} km in ~${Math.round(min * 1.1)} min`);
      lines.push(`• Or go faster: ${r1(km)} km in ${Math.max(1, Math.round(min * 0.95))} min`);
    } else if (min) {
      lines.push(`• Add 5 minutes: aim for ${Math.round(min + 5)} min`);
    } else if (km) {
      lines.push(`• Add 10% distance: aim for ${r1(km * 1.1)} km`);
    }
    if (lvl) lines.push(`• Or keep the same time and raise the intensity to ${r1(lvl + 1)}`);
    lines.push('', 'Progress one thing at a time, and keep at least one easy session per week.');
    return lines.join('\n');
  }

  if (kind === 'form') {
    return `Tips for ${ctx.exercise.name}:\n• Warm up 5 min at an easy pace\n• Stay relaxed: shoulders down, steady breathing\n• Most sessions should pass the "talk test" (you can still speak in sentences)\n• Cool down 3–5 min before stopping`;
  }

  if (kind === 'superset') {
    return 'Cardio works best as its own block:\n• After lifting: 10–20 min as a finisher\n• Before lifting: 5–10 min easy as a warm-up\n• Intervals: e.g. 30 s hard / 90 s easy × 8\n\nTip: you can still link it via ⋯ → 🔗 Superset with next for a circuit.';
  }

  const q = (ctx.question || '').toLowerCase();
  if (kind === 'custom' && /plateau|stuck|progress|faster|further|improve/.test(q)) {
    return cardioCoach('today', ctx);
  }
  return null; // other free questions use the normal answers
}

/** Main entry point: returns a coach answer */
export async function askCoach(kind, ctx) {
  await wait(500 + Math.random() * 700); // "thinking"
  const name = ctx.exercise.name.toLowerCase();

  if (ctx.exercise.type === 'cardio') {
    const c = cardioCoach(kind, ctx);
    if (c) return c;
  }

  if (kind === 'today') return localSuggestion(ctx.history);

  if (kind === 'form') {
    const cues = findIn(FORM, name)?.cues ?? DEFAULT_CUES;
    return `Form cues for ${ctx.exercise.name}:\n${cues.map((c) => '• ' + c).join('\n')}`;
  }

  if (kind === 'superset') {
    const ideas = findIn(SUPERSETS, name)?.ideas ?? DEFAULT_IDEAS;
    return `Good superset partners for ${ctx.exercise.name}:\n${ideas.map((i) => '• ' + i).join('\n')}\n\nTip: link them via ⋯ → 🔗 Superset with next.`;
  }

  // Free question
  const q = (ctx.question || '').toLowerCase();
  const rule = QA.find((r) => r.keys.some((k) => new RegExp(`\\b${k}`).test(q)));
  if (rule) return rule.a(ctx);

  const last = ctx.history[ctx.history.length - 1];
  return (
    pick(GENERIC) +
    (last ? `\n\nYour last ${ctx.exercise.name} session: ${setsSummary(last.sets)}.` : '') +
    '\n\nTry asking about: warm-up, reps, rest, plateau, soreness, protein or sleep.'
  );
}