const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_fullaudit_test.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true });
dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
dom.window.alert = () => {};
dom.window.confirm = () => true;
dom.window.print = () => {};
dom.window.Chart = class { constructor() {} destroy() {} };
const globalErrors = [];
dom.window.addEventListener('error', (e) => globalErrors.push(e.message + ' | ' + (e.error && e.error.stack ? e.error.stack.split('\n')[1] : '')));

setTimeout(async () => {
  dom.window.eval(`
    baselineWeight = 242; goalWeight = 197;
    workoutPlanMode = 'ppl';
    entries = [];
    labs = [{ date: '2026-08-01', a1c: '6.2' }];
    medications = [{ name: 'Mounjaro', fillDate: '2026-09-01', daysSupply: 28 }];
    foodCombos = [{ name: 'Breakfast combo', items: [{desc:'Oatmeal',protein:'6',cal:'150',carbs:'27',fat:'3'}], createdAt: Date.now() }];
    pinnedFavorites = [{ desc: 'Chicken Salad', protein: '35', cal: '400', carbs: '20', fat: '15' }];
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0,10);
      entries.push({
        date: dateStr, weight: (240 - i*0.3).toFixed(1),
        meals: [{ desc: 'Chicken Salad', mt: 'Lunch', protein: '35', cal: '400', carbs: '20', fat: '15', ts: Date.now()-i*1000 }],
        protein: '120', carbs: '150', calories: '2000', fat: '70',
        water: '64', steps: '8500', injection: i % 7 === 0, dose: i%7===0?'10':undefined,
        ex: i % 2 === 0 ? [{ type: 'Strength', planDay: ['Push','Pull','Legs'][i%3], effort: 3, sets: { 'Bench Press': [{ weight: 100, reps: 10, warmup: false }] } }] : []
      });
    }
    document.getElementById('foodDate').value = todayStr();
    document.getElementById('exDate').value = todayStr();
  `);

  const tabs = ['dashboard', 'log', 'food', 'exercise', 'history', 'charts', 'badges'];
  console.log('=== Switching through every tab ===');
  for (const tab of tabs) {
    const before = globalErrors.length;
    try {
      dom.window.eval(`showView('${tab}')`);
      const after = globalErrors.length;
      console.log(`${tab}: ${after > before ? 'ERROR - ' + globalErrors[after-1] : 'OK'}`);
    } catch (e) {
      console.log(`${tab}: THREW - ${e.message}`);
    }
  }

  console.log('');
  console.log('Total global errors:', globalErrors.length);
  globalErrors.forEach(e => console.log(' -', e));
  process.exit(0);
}, 2000);
setTimeout(() => process.exit(1), 20000);
