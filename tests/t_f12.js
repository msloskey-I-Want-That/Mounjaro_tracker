const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const doc = dom.window.document; const w = dom.window; const ev = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`window.ds = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };`);
  ev(`entries = [
    { date: ds(130), glucose: '300' },
    { date: ds(3), weight: '224', glucose: '131' },
    { date: ds(2), weight: '223.4', glucose: '145', glucose2hr: '170', restHR: '52', sys: '128', dia: '82', waist: '38', chest: '44', arms: '15', water: 64, notes: '${'felt dizzy after the walk '.repeat(12)}', restDay: 'sick', injection: true, site: 'Abdomen L', dose: '5',
      meals: [{ desc: 'Chicken Salad', mt: 'Lunch', protein: '35', cal: '400', carbs: '20', fat: '15' }, { desc: 'Greek yogurt', mt: 'Snack', protein: '17', cal: '120' }],
      ex: [{ type: 'Strength', min: 45, effort: 4 }, { type: 'Strength' }, { type: 'Treadmill', min: 30, dist: 2.1 }] },
    { date: ds(1), weight: '223' } ]`);
  const rows = ev('gatherRecentHealthData(120)'); const byDate = Object.fromEntries(rows.map(r => [r.date, r]));
  const d2 = byDate[ev('ds(2)')], d3 = byDate[ev('ds(3)')], d1 = byDate[ev('ds(1)')];
  console.log('=== 1. what the AI is handed ===');
  check('fasting glucose is included (the bug)', d3.glucose_fasting_mgdl === '131' && d2.glucose_fasting_mgdl === '145');
  check('2-hour post-meal glucose too', d2.glucose_2hr_post_meal_mgdl === '170');
  check('a day without glucose simply has no glucose key (not a fake zero)', !('glucose_fasting_mgdl' in d1) && !('glucose_2hr_post_meal_mgdl' in d1));
  check('readings older than the window stay out', !rows.some(r => r.glucose_fasting_mgdl === '300'));
  check('resting HR, blood pressure, measurements, water', d2.resting_hr_bpm === '52' && d2.blood_pressure === '128/82' && d2.waist_in === '38' && d2.chest_in === '44' && d2.arms_in === '15' && d2.water_oz === 64);
  check('sick/rest flag and injection site', d2.day_status === 'sick' && d2.injection === true && d2.injection_site === 'Abdomen L' && d2.dose === '5');
  check('notes are included but capped at 200 chars', typeof d2.notes === 'string' && d2.notes.startsWith('felt dizzy') && d2.notes.length === 200);
  check('meals: what was eaten, with macros', d2.meals.length === 2 && d2.meals[0] === 'Lunch: Chicken Salad 400cal 35gP 20gC 15gF' && d2.meals[1] === 'Snack: Greek yogurt 120cal 17gP');
  check('workout effort is carried, and a workout with no minutes no longer prints "undefinedmin"', d2.exercise === 'Strength 45min (effort 4/5), Strength, Treadmill 30min 2.1mi');
  check('existing fields still there (weight)', d1.weight === '223');
  const big = ev(`(() => { const out = []; for (let i = 0; i < 120; i++) out.push({ date: ds(i), weight: '223.4', glucose: '120', glucose2hr: '150', restHR: '50', sys: '120', dia: '80', water: 64, notes: 'x'.repeat(300), protein: '120', calories: '2000', carbs: '150', fat: '70', steps: '9000', sleepHrs: '7', sleepScore: '80', hrv: '45', tags: ['nausea'], tagSeverity: { nausea: 2 }, meals: Array.from({ length: 6 }, (_, k) => ({ desc: 'Some reasonably long meal description number ' + k, mt: 'Lunch', protein: '30', cal: '500', carbs: '40', fat: '20' })), ex: [{ type: 'Strength', min: 45, effort: 3 }] }); entries = out; return JSON.stringify(gatherRecentHealthData(120)).length; })()`);
  check(`(sanity) an extreme 120-day dataset really is large (${big} chars)`, big > 100000);
  console.log('=== 2. the Ask box ===');
  ev(`entries = [ { date: ds(3), weight: '224', glucose: '131' }, { date: ds(2), weight: '223.4', glucose: '145', glucose2hr: '170', meals: [{ desc: 'Pasta', mt: 'Dinner', protein: '20', cal: '700', carbs: '90', fat: '20' }] }, { date: ds(1), weight: '223' } ]; anthropicKey = 'sk-test';`);
  let sent = null; w.fetch = async (url, opts) => { sent = JSON.parse(opts.body); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'Your fasting glucose averaged 138.' }] }) }; };
  doc.getElementById('aiAskInput').value = "I've noticed my glucose numbers have been creeping up"; click(doc.getElementById('aiAskBtn')); await sleep(80);
  const prompt = sent && sent.messages[0].content;
  check('the prompt now contains the glucose readings', /"glucose_fasting_mgdl":"145"/.test(prompt) && /"glucose_2hr_post_meal_mgdl":"170"/.test(prompt));
  check('and the meals next to them', /Dinner: Pasta 700cal/.test(prompt));
  check('and the legend (units, 130 target, gaps are normal)', /mg\/dL/.test(prompt) && /under 130/.test(prompt) && /gaps are normal/.test(prompt));
  check("the question is passed through, and the 'only use the data' rule is kept", /creeping up/.test(prompt) && /Answer using only what's actually in the data/.test(prompt));
  const shown = doc.getElementById('aiAskResults').innerHTML;
  check('the answer is shown', /averaged 138/.test(shown));
  check('with a "based on" line that exposes what it saw (3 days, 2 with glucose)', /Based on 3 days of logs · 2 with glucose readings/.test(shown));
  ev(`entries = [ { date: ds(1), weight: '223' } ]`); doc.getElementById('aiAskInput').value = 'how is my glucose?'; click(doc.getElementById('aiAskBtn')); await sleep(80);
  check('if there truly is no glucose logged, the line says 0 — the failure is now visible, not silent', /0 with glucose readings/.test(doc.getElementById('aiAskResults').innerHTML));
  ev(`anthropicKey = ''`); doc.getElementById('aiAskInput').value = 'a question'; click(doc.getElementById('aiAskBtn')); await sleep(30);
  check('no API key -> same message as before', /Add your Anthropic API key/.test(doc.getElementById('aiAskResults').innerHTML));
  console.log('=== 2b. a huge history is trimmed to a safe size, and says so ===');
  ev(`entries = Array.from({ length: 120 }, (_, i) => ({ date: ds(i), weight: '223.4', glucose: '120', glucose2hr: '150', restHR: '50', sys: '120', dia: '80', water: 64, notes: 'x'.repeat(300), protein: '120', calories: '2000', carbs: '150', fat: '70', steps: '9000', sleepHrs: '7', sleepScore: '80', hrv: '45', tags: ['nausea'], tagSeverity: { nausea: 2 }, meals: Array.from({ length: 6 }, (_, k) => ({ desc: 'Some reasonably long meal description number ' + k, mt: 'Lunch', protein: '30', cal: '500', carbs: '40', fat: '20' })), ex: [{ type: 'Strength', min: 45, effort: 3 }] })); anthropicKey = 'sk-test';`);
  sent = null; doc.getElementById('aiAskInput').value = 'how is my glucose?'; click(doc.getElementById('aiAskBtn')); await sleep(120);
  check('the request stays under ~100k characters', sent && sent.messages[0].content.length < 105000);
  const m = doc.getElementById('aiAskResults').innerHTML.match(/Based on (\d+) days/);
  check('it dropped to a shorter window (60-119 days) and the caption says how many', m && +m[1] >= 60 && +m[1] < 120);
  ev(`entries = [ { date: ds(3), weight: '224', glucose: '131' }, { date: ds(2), weight: '223.4', glucose: '145' }, { date: ds(1), weight: '223' } ]`);
  sent = null; doc.getElementById('aiAskInput').value = 'how is my glucose?'; click(doc.getElementById('aiAskBtn')); await sleep(80);
  check('normal data still uses the full 120-day window', /Based on 3 days/.test(doc.getElementById('aiAskResults').innerHTML) && /"glucose_fasting_mgdl":"145"/.test(sent.messages[0].content));
  console.log('=== 3. Weekly Insights uses the same data ===');
  ev(`anthropicKey = 'sk-test'; entries = [ { date: ds(5), glucose: '150', weight: '225' }, { date: ds(3), glucose: '131', weight: '224' }, { date: ds(2), glucose: '145', weight: '223.4', dose: '5', injection: true }, { date: ds(1), weight: '223' } ];`);
  sent = null; await ev('generateWeeklyInsights(false)');
  const wp = sent && sent.messages[0].content;
  check('weekly insights now also sees glucose (it never did)', !!wp && /"glucose_fasting_mgdl":"145"/.test(wp) && /Field notes/.test(wp));
  check('and is told to look at glucose against meals and dose timing', /glucose readings alongside what was eaten or when the dose was taken/.test(wp));
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2000); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 30000);
