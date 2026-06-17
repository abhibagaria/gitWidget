// Fetches a user's public GitHub contribution calendar via the GraphQL API
// and writes a small static JSON the widget can read. Runs in CI (token stays
// server-side, never shipped to the browser).
//
//   GH_TOKEN  - a GitHub token (the Actions GITHUB_TOKEN is enough for public data)
//   GH_LOGIN  - the username to fetch (default: abhibagaria)

import { writeFile, mkdir } from 'node:fs/promises';

const login = process.env.GH_LOGIN || 'abhibagaria';
const token = process.env.GH_TOKEN;
if (!token) { console.error('Missing GH_TOKEN'); process.exit(1); }

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount contributionLevel weekday }
          }
        }
      }
    }
  }`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'gitWidget',
  },
  body: JSON.stringify({ query, variables: { login } }),
});

if (!res.ok) { console.error(`GitHub API ${res.status}`, await res.text()); process.exit(1); }
const json = await res.json();
if (json.errors) { console.error(JSON.stringify(json.errors, null, 2)); process.exit(1); }

const cal = json.data.user.contributionsCollection.contributionCalendar;
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const weeks = cal.weeks.map(w =>
  w.contributionDays.map(d => ({
    date: d.date,
    count: d.contributionCount,
    level: LEVEL[d.contributionLevel] ?? 0,
  }))
);

// derived stats so the widget stays dumb/fast
const days = weeks.flat();
let current = 0;
for (let i = days.length - 1; i >= 0 && days[i].count > 0; i--) current++;
let run = 0, longest = 0, best = { count: 0, date: null };
for (const d of days) {
  if (d.count > 0) { run++; longest = Math.max(longest, run); } else run = 0;
  if (d.count > best.count) best = { count: d.count, date: d.date };
}

const out = {
  login,
  total: cal.totalContributions,
  currentStreak: current,
  longestStreak: longest,
  bestDay: best,
  generatedAt: new Date().toISOString(),
  weeks,
};

await mkdir('data', { recursive: true });
await writeFile('data/contributions.json', JSON.stringify(out));
console.log(`Wrote data/contributions.json — ${out.total} contributions, ${weeks.length} weeks.`);
