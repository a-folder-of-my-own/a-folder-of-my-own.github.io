import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i), l.slice(i + 1)];
  })
);

const or = await (await fetch('https://openrouter.ai/api/v1/models')).json();
const free = (or.data || [])
  .filter((m) => m.id.endsWith(':free'))
  .map((m) => m.id)
  .sort();
console.log('OPENROUTER FREE (' + free.length + ')');
for (const id of free) console.log('  ' + id);

const groq = await (await fetch('https://api.groq.com/openai/v1/models', {
  headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
})).json();
console.log('\nGROQ (' + (groq.data || []).length + ')');
for (const m of (groq.data || []).sort((a, b) => a.id.localeCompare(b.id))) {
  console.log('  ' + m.id);
}
