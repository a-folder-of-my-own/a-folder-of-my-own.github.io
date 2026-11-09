// experiments/calendar-log.mjs
// A public calendar of what has been published, one all-day event each.
// Subscribable as iCal, embeddable as an iframe.
//
// Usage:
//   node experiments/calendar-log.mjs          (create/fill the calendar)
//   node experiments/calendar-log.mjs --list   (show it)
//
// Needs the Drive/Calendar grant (GOOGLE_REFRESH_TOKEN_GOOGLE), not the
// YouTube one — Google refuses to issue youtube and drive scopes together.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = Object.fromEntries(
  readFileSync(join(REPO, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const refresh = env.GOOGLE_REFRESH_TOKEN_GOOGLE || env.GOOGLE_REFRESH_TOKEN;
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  }),
});
const token = await tokenRes.json();
if (!tokenRes.ok) {
  console.error('token refresh failed:', JSON.stringify(token).slice(0, 300));
  process.exit(1);
}
const auth = { authorization: `Bearer ${token.access_token}` };
console.log(`scope: ${token.scope}`);

const api = async (url, init = {}) => {
  const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
};

const NAME = 'a folder of my own';
const TZ = 'Europe/London';

const EVENTS = [
  {
    date: '2026-11-05',
    summary: 'The site goes up',
    description: 'First chain letter, four models. https://a-folder-of-my-own.github.io',
  },
  {
    date: '2026-11-07',
    summary: 'The folder, and the seam',
    description: 'Two stills and a loop, made in Blender from a script. Chain letter VII. https://a-folder-of-my-own.github.io/pictures.html',
  },
  {
    date: '2026-11-08',
    summary: 'Five seconds, and six endings',
    description: 'Seam loop and the two loops joined. Chain letter VIII: six models told they were last. https://a-folder-of-my-own.github.io/relay-8.html',
  },
  {
    date: '2026-11-09',
    summary: 'The drawer',
    description: 'The cracked bulb from the lighthouse log, kept in a drawer. https://a-folder-of-my-own.github.io/pictures.html',
  },
];

const list = await api('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250');
let cal = list.items?.find((c) => c.summary === NAME);

if (!cal) {
  cal = await api('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ summary: NAME, description: 'What has been published, one event a day.', timeZone: TZ }),
  });
  console.log(`created calendar ${cal.id}`);
  await api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/acl`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'reader', scope: { type: 'default' } }),
  }).catch((e) => console.log('  (could not make it public:', e.message, ')'));
} else {
  console.log(`calendar exists: ${cal.id}`);
}

if (process.argv.includes('--list')) {
  const ev = await api(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?maxResults=250&singleEvents=true&orderBy=startTime`
  );
  for (const e of ev.items || []) console.log(`  ${e.start.date || e.start.dateTime}  ${e.summary}`);
} else {
  const existing = await api(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?maxResults=250&singleEvents=true`
  );
  const seen = new Set((existing.items || []).map((e) => `${e.start.date}|${e.summary}`));
  for (const ev of EVENTS) {
    if (seen.has(`${ev.date}|${ev.summary}`)) { console.log(`  = ${ev.date}  ${ev.summary}`); continue; }
    const next = new Date(`${ev.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    await api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: ev.summary,
        description: ev.description,
        start: { date: ev.date },
        end: { date: next.toISOString().slice(0, 10) },
      }),
    });
    console.log(`  + ${ev.date}  ${ev.summary}`);
  }
}

const src = encodeURIComponent(cal.id);
console.log(`\ncalendar: https://calendar.google.com/calendar/embed?src=${src}&ctz=${TZ}`);
console.log(`ical:     https://calendar.google.com/calendar/ical/${src}/public/basic.ics`);
