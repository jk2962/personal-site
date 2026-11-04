// Writes mufc.json: Man United's latest finished match, read from FotMob's team page.
// Run hourly by .github/workflows/mufc.yml; the site reads the JSON for the "about me" mood line.
import { writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const res = await fetch('https://www.fotmob.com/teams/10260/fixtures/manchester-united', { headers: { 'user-agent': UA } });
if (!res.ok) throw new Error(`FotMob returned ${res.status}`);
const html = await res.text();
const raw = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
if (!raw) throw new Error('FotMob page layout changed: no __NEXT_DATA__');
const fixtures = JSON.parse(raw).props?.pageProps?.fallback?.['team-10260']?.fixtures?.allFixtures?.fixtures;
if (!Array.isArray(fixtures)) throw new Error('FotMob page layout changed: no fixtures list');

const last = fixtures
  .filter(f => f.status?.finished && !f.status.cancelled)
  .sort((a, b) => b.status.utcTime.localeCompare(a.status.utcTime))[0];
if (!last) throw new Error('no finished match found');

const home = last.home.id === 10260, us = home ? last.home : last.away, them = home ? last.away : last.home;
const out = {
  result: last.result,           // 1 win, 0 draw, -1 loss (FotMob's own call, so shootouts count)
  us: us.score, them: them.score,
  opponent: them.name,
  pens: /pen/i.test(last.status.reason?.short ?? '') || /pen/i.test(last.status.reason?.long ?? ''),
  url: 'https://www.fotmob.com' + last.pageUrl,
  date: last.status.utcTime,
};
if (![1, 0, -1].includes(out.result) || !Number.isInteger(out.us) || !Number.isInteger(out.them)) throw new Error('unexpected match data: ' + JSON.stringify(out));
writeFileSync('mufc.json', JSON.stringify(out, null, 1) + '\n');
console.log(out);
