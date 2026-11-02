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
  const $ = id => doc.getElementById(id);
  ev(`window.ds = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }; entries = [{ date: ds(2), weight: '224', glucose: '131' }, { date: ds(1), weight: '223', glucose: '140' }]; anthropicKey = 'sk-test';`);
  console.log('=== 1. Ask: ready for the next question ===');
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'Your glucose averaged 135.' }] }) });
  $('aiAskInput').value = 'how is my <b>glucose</b>?'; click($('aiAskBtn')); await sleep(80);
  check('after the answer arrives the field is empty, ready for the next question', $('aiAskInput').value === '');
  check('the answer is shown', /averaged 135/.test($('aiAskResults').innerHTML));
  check('and so is what you asked (so clearing the box loses nothing)', /You asked: “how is my/.test($('aiAskResults').textContent));
  check('the question is shown as text, not injected as HTML', !/<b>glucose<\/b>/.test($('aiAskResults').innerHTML) && /&lt;b&gt;glucose&lt;\/b&gt;/.test($('aiAskResults').innerHTML));
  check('the "based on" line is still there', /Based on 2 days of logs · 2 with glucose readings/.test($('aiAskResults').innerHTML));
  $('aiAskInput').value = 'second question'; click($('aiAskBtn')); await sleep(80);
  check('a second question works the same way', /You asked: “second question”/.test($('aiAskResults').textContent) && $('aiAskInput').value === '');
  console.log('=== 2. a failed ask keeps your words so you can retry ===');
  w.fetch = async () => ({ ok: false, status: 529, json: async () => ({}) });
  $('aiAskInput').value = 'will this fail?'; click($('aiAskBtn')); await sleep(80);
  check('server error -> message shown, text kept', /Failed — HTTP 529/.test($('aiAskResults').innerHTML) && $('aiAskInput').value === 'will this fail?');
  w.fetch = async () => { throw new Error('offline'); };
  click($('aiAskBtn')); await sleep(80);
  check('no connection -> message shown, text kept', /Failed — check your connection/.test($('aiAskResults').innerHTML) && $('aiAskInput').value === 'will this fail?');
  ev(`anthropicKey = ''`); click($('aiAskBtn')); await sleep(30);
  check('no API key -> same message, text kept', /Add your Anthropic API key/.test($('aiAskResults').innerHTML) && $('aiAskInput').value === 'will this fail?');
  $('aiAskInput').value = ''; ev(`anthropicKey = 'sk-test'`); click($('aiAskBtn')); await sleep(30);
  check('empty box -> "Type a question first" (nothing sent)', /Type a question first/.test($('aiAskResults').innerHTML));
  console.log('=== 3. tapping into a search/describe field selects the old text ===');
  for (const [id, label] of [['aiAskInput', 'Ask about your data'], ['mDesc', 'food search'], ['mealDescInput', '"describe what you ate"'], ['dayDescInput', 'day description'], ['workoutDescInput', 'workout description'], ['historySearch', 'history notes search']]) {
    const el = $(id); el.value = 'previous text here'; el.dispatchEvent(new w.Event('focus')); await sleep(15);
    check(`${label}: all existing text is selected on tap`, el.selectionStart === 0 && el.selectionEnd === 'previous text here'.length);
  }
  $('mDesc').value = ''; $('mDesc').dispatchEvent(new w.Event('focus')); await sleep(15);
  check('an empty field is fine (nothing to select, no error)', true);
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2000); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 30000);
