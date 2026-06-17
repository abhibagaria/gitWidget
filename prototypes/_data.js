/* Shared mock contribution data for all prototypes.
   Shaped to roughly resemble the real graph: active Jun-Oct,
   quiet Nov-Apr, ramping hard Apr-Jun. Deterministic (seeded). */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Returns { weeks: Day[][], total, start, end }
   Day = { date: Date, count: number, level: 0..4 } */
function genContributions(seed = 909) {
  const rnd = mulberry32(seed);
  const weeks = [];
  let total = 0;

  // End "today" fixed so the demo is stable: 2026-06-15 (a Monday-ish ref).
  const end = new Date(2026, 5, 15);
  // Align start to the Sunday 52 weeks back.
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);

      // Density profile by week index.
      let p;
      if (w < 20) p = 0.34;        // Jun-Oct: moderate, scattered
      else if (w < 46) p = 0.05;   // Nov-Apr: sparse
      else p = 0.72;               // Apr-Jun: dense ramp

      // Weekends a bit quieter.
      if (d === 0 || d === 6) p *= 0.55;

      let count = 0, level = 0;
      if (date <= end && rnd() < p) {
        count = 1 + Math.floor(rnd() * rnd() * 18);
        level = count >= 12 ? 4 : count >= 7 ? 3 : count >= 3 ? 2 : 1;
        total += count;
      }
      days.push({ date, count, level });
    }
    weeks.push(days);
  }
  return { weeks, total, start, end };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fmtDate(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* Month labels aligned to week columns: returns [{col, label}] */
function monthLabels(weeks) {
  const out = [];
  let last = -1;
  weeks.forEach((week, i) => {
    const m = week[0].date.getMonth();
    if (m !== last) { out.push({ col: i, label: MONTHS[m] }); last = m; }
  });
  // Drop a label if it's crammed against the previous one.
  return out.filter((o, i) => i === 0 || o.col - out[i - 1].col >= 2);
}
