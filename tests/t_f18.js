const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  console.log('=== 1. placeholders never look like entered values ===');
  check('macro fields show "0" (not "30 / 220 / 20 / 10")', ['mProtein', 'mCal', 'mCarbs', 'mFat'].map(id => $(id).placeholder).join() === '0,0,0,0');
  check('no placeholder is a realistic-looking number or an "e.g." squeezed in', ['mProtein', 'mCal', 'mCarbs', 'mFat'].every(id => !/e\.g|[1-9]/.test($(id).placeholder)));
  const ph = html.match(/input::placeholder, textarea::placeholder \{([^}]*)\}/);
  check('placeholders are styled light and thin (opacity <= 0.5, weight 500)', !!ph && /opacity: 0\.45/.test(ph[1]) && /font-weight: 500/.test(ph[1]));
  check('(Servings keeps "1": blank genuinely means one serving)', $('mServings').placeholder === '1');
  console.log('=== 2. What fits: long names are readable ===');
  ev(`window.ds = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      const M = (desc, p, cal, ts) => ({ desc, mt: 'Dinner', protein: String(p), cal: String(cal), carbs: '30', fat: '20', ts });
      entries = [1, 2, 3, 4].map(i => ({ date: ds(i), meals: [M('Chocolate Red Velvet Cake with Cream Cheese Frosting', 40, 610, i * 10), M('Southwest stuffed peppers with black beans', 38, 412, i * 10 + 1), M("Sloppy Joe's", 60, 632, i * 10 + 2)] }));
      entries.push({ date: todayStr(), meals: [] }); syncId = 'x'; document.getElementById('foodDate').value = todayStr(); showView('food'); renderMealList(); renderProteinSummary();`);
  const rows = [...doc.querySelectorAll('#whatFitsList .fits-row')];
  check('suggestions are listed', rows.length >= 3);
  check('the full long name is in the page (CSS wraps it; nothing is cut in the text itself)', [...doc.querySelectorAll('#whatFitsList .fits-name')].some(n => n.textContent.includes('Chocolate Red Velvet Cake with Cream Cheese Frosting')));
  check('macros are compact: "40g · 610 cal" (the word "protein" is in the card header instead)', rows.every(r => /^\d+g · \d+ cal$/.test(r.querySelector('.fits-macros').textContent)) && /protein/.test($('whatFitsLeft').textContent));
  check('the protein number is picked out in its own colour', rows.every(r => r.querySelector('.fits-macros .fits-p')));
  check('names wrap to 2 lines instead of one cut-off line', /\.fits-name \{ white-space: normal !important; display: -webkit-box; -webkit-line-clamp: 2/.test(html));
  check('macros stay on one line next to the + button', /\.fits-macros \{ margin-top: 0 !important; white-space: nowrap; flex-shrink: 0/.test(html));
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2000); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 30000);
