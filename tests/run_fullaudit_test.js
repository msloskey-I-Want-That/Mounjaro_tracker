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
dom.window.addEventListener('error', (e) => globalErrors.push('GLOBAL: ' + e.message));

setTimeout(async () => {
  // Build a rich, realistic dataset spanning several months
  dom.window.eval(`
    baselineWeight = 242; goalWeight = 197;
    workoutPlanMode = 'ppl';
    entries = [];
    labs = [];
    medications = [{ name: 'Mounjaro', fillDate: '2026-09-01', daysSupply: 28 }];
    foodCombos = [{ name: 'Breakfast combo', items: [{desc:'Oatmeal',protein:'6',cal:'150',carbs:'27',fat:'3'}], createdAt: Date.now() }];
    pinnedFavorites = [{ desc: 'Chicken Salad', protein: '35', cal: '400', carbs: '20', fat: '15' }];
    pinnedRecipes = [];
    scannedBarcodeCache = {};
    customWorkoutExercises = { Push: [], Pull: [], Legs: [] };
    hiddenWorkoutExercises = { Push: [], Pull: [], Legs: [] };
    exerciseOrderOverride = {};
    supersetPairs = {};
    exerciseRestOverride = {};

    for (let i = 0; i < 90; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0,10);
      const dow = d.getDay();
      const hasWorkout = i % 2 === 0;
      entries.push({
        date: dateStr,
        weight: (240 - i * 0.3).toFixed(1),
        meals: [{ desc: 'Chicken Salad', mt: 'Lunch', protein: '35', cal: '400', carbs: '20', fat: '15', ts: Date.now() - i*1000, offPlan: i === 5 }],
        protein: '120', carbs: '150', calories: '2000', fat: '70',
        hasOffPlanMeal: i === 5,
        water: '64', steps: '8500', sleepHrs: '7.2', sleepScore: '82',
        activeCal: '450', distanceMi: '3.1', hrv: '45', restHR: '58',
        glucose: i % 3 === 0 ? '95' : undefined,
        injection: i % 7 === 0, dose: i % 7 === 0 ? '10' : undefined, site: i % 7 === 0 ? 'Abdomen L' : undefined,
        ex: hasWorkout ? [{
          type: 'Strength', planDay: ['Push','Pull','Legs'][i % 3], effort: 3,
          sets: { 'Bench Press': [{ weight: 100 + Math.floor(i/10), reps: 10, warmup: false }] }
        }] : []
      });
    }
    labs.push({ date: '2026-08-01', a1c: '6.2' });
    document.getElementById('foodDate').value = todayStr();
    document.getElementById('exDate').value = todayStr();
  `);

  const noArgFunctions = [
    'renderAll', 'updateStats', 'renderCharts', 'renderBadges', 'renderMedications',
    'renderFavorites', 'renderHistory', 'renderExList', 'renderWorkoutPlan',
    'renderWorkoutHistory', 'renderActivityHistory', 'renderMealList', 'renderWater',
    'renderRecipeBuilder', 'renderLabs', 'renderLabPanelSummary', 'renderProteinSummary',
    'renderWorkoutVolumeSparkline', 'renderDueToday', 'updateInjBanner',
    'updateLogContextStrip', 'renderAddCardMenu', 'renderPaletteRow', 'updateHeader',
    'renderRecipeTotalsDisplay' in this ? '' : 'updateRecipeTotalsDisplay',
    'renderInjectionSiteMap', 'renderDoseTimeline', 'renderDoseComparison',
    'computeBadgeData', 'computeDueTodayItems', 'computePatternsNoticed',
    'computeMilestonesReached', 'computeDoseEscalationTimeline',
    'computeSideEffectsNearDoseIncreases', 'renderSideEffectCorrelation',
    'showTrainerSummary', 'showDoctorSummary', 'showRestTimerDone'
  ].filter(Boolean);

  const results = { passed: [], failed: [] };
  for (const fn of noArgFunctions) {
    dom.window.__lastErrorCount = globalErrors.length;
    try {
      dom.window.eval(`typeof ${fn} === 'function' ? ${fn}() : (() => { throw new Error('NOT_DEFINED'); })()`);
      if (globalErrors.length > dom.window.__lastErrorCount) {
        results.failed.push(`${fn}: triggered a global error - ${globalErrors[globalErrors.length-1]}`);
      } else {
        results.passed.push(fn);
      }
    } catch (e) {
      results.failed.push(`${fn}: ${e.message}`);
    }
  }

  console.log('=== SMOKE TEST RESULTS ===');
  console.log(`Passed: ${results.passed.length} / ${noArgFunctions.length}`);
  console.log('');
  if (results.failed.length) {
    console.log('=== FAILURES ===');
    results.failed.forEach(f => console.log(' - ' + f));
  } else {
    console.log('ALL FUNCTIONS EXECUTED WITHOUT ERROR');
  }

  console.log('');
  console.log('=== Total global errors caught during entire test ===', globalErrors.length);
  globalErrors.forEach(e => console.log(' -', e));

  process.exit(0);
}, 2000);
setTimeout(() => process.exit(1), 20000);
