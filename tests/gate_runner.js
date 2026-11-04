// Parallel test runner for the gate. usage: node gate_runner.js [1|2|3|all]
// Runs suites JOBS at a time (default: CPU cores + 1 — suites spend part of their time idle in sleeps).
// A suite that fails is re-run once on its own after the pool is done (with the machine quiet), so timing
// flakes from parallel load don't fail the gate (same rule as the old serial runner); a real failure fails again.
// A passing part writes /tmp/gate_stamps/<hash>_partN, exactly like the old serial runner.
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
process.chdir('/home/claude');
const arg = process.argv[2] || 'all';
const parts = arg === 'all' ? [1, 2, 3] : [Number(arg)];
if (!parts.every(p => [1, 2, 3].includes(p))) { console.error('usage: node gate_runner.js [1|2|3|all]'); process.exit(2); }
const JOBS = Number(process.env.JOBS) || os.cpus().length + 1;
const CACHE = '/tmp/gate_node_cache'; fs.mkdirSync(CACHE, { recursive: true });
const env = { ...process.env, NODE_COMPILE_CACHE: CACHE };   // reuse compiled jsdom between suites

const ver = s => Number(s.match(/\d+/)[0]);
const suites = fs.readdirSync('.').filter(f => /^t_f\d+\.js$/.test(f)).sort((a, b) => ver(a) - ver(b));
const partOf = new Map(suites.map((t, i) => [t, i % 3 + 1]));   // same split as before
const strip = s => s.split('\n').filter(l => !/Could not load|Not implemented/.test(l)).join('\n');
const smoke = {
  'run_fullaudit_test.js': o => { o = strip(o); return /Passed: 38 \/ 38/.test(o) && /global errors caught during entire test === 0/.test(o); },
  'run_fullaudit_tabs.js': o => (o.match(/: OK/g) || []).length === 7,
  'run_setui_test.js': o => /ALL CHECKS PASSED/.test(o),
};
const jobs = [];
if (parts.includes(1)) Object.keys(smoke).forEach(f => jobs.push({ file: f, part: 1, ok: smoke[f], limit: 40e3 }));
suites.filter(t => parts.includes(partOf.get(t))).forEach(t => jobs.push({ file: t, part: partOf.get(t), ok: o => /ALL PASSED/.test(o), limit: 60e3 }));
// longest-first so the slow suites don't end up alone at the tail
let times = {}; try { times = JSON.parse(fs.readFileSync('/tmp/gate_times.json')); } catch (e) {}
jobs.sort((a, b) => (times[b.file] || 6) - (times[a.file] || 6));

function run(job, plain) {
  return new Promise(res => {
    const t0 = Date.now(); let out = '';
    const c = spawn('node', [job.file], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d);
    const kill = setTimeout(() => c.kill('SIGKILL'), job.limit);
    c.on('close', () => { clearTimeout(kill); if (!plain) times[job.file] = (Date.now() - t0) / 1e3; res({ pass: job.ok(out), out }); });
  });
}
async function pool(list, n, plain) {
  const results = new Map(); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (next < list.length) { const j = list[next++]; results.set(j, await run(j, plain)); }
  }));
  return results;
}
(async () => {
  const t0 = Date.now();
  const hash = execFileSync('./gate_hash.sh').toString().trim();
  const first = await pool(jobs, JOBS);
  const bad = new Set();
  for (const j of jobs) if (!first.get(j).pass) {
    const again = (await pool([j], 1, true)).get(j);
    if (again.pass) console.log(`(flaked once, passed on re-run: ${j.file})`);
    else { bad.add(j.part); console.log(`FAIL ${j.file}\n` + again.out.split('\n').filter(l => /FAIL|TIMEOUT|Error/.test(l)).slice(0, 8).join('\n')); }
  }
  try { fs.writeFileSync('/tmp/gate_times.json', JSON.stringify(times)); } catch (e) {}
  fs.mkdirSync('/tmp/gate_stamps', { recursive: true });
  for (const p of parts) {
    if (bad.has(p)) console.log(`PART ${p} FAILED`);
    else { fs.writeFileSync(`/tmp/gate_stamps/${hash}_part${p}`, ''); console.log(`PART ${p} PASSED`); }
  }
  console.log(`${jobs.length} suites, ${JOBS} at a time, ${((Date.now() - t0) / 1e3).toFixed(0)} s`);
  if (arg === 'all') console.log(bad.size ? 'SUITE FAILURES' : 'ALL SUITES PASSED');
  process.exit(bad.size ? 1 : 0);
})();
