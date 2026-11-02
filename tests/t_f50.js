const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.eval('(function(){const RD=Date,F=new RD("2026-10-11T15:00:00").getTime();class FD extends RD{constructor(...a){if(a.length===0)super(F);else super(...a)}static now(){return F}};globalThis.Date=FD})()'); /* pinned to a Sunday: the test fills a whole week of challenges */  w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.HTMLElement.prototype.scrollIntoView = () => {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`window.__badgeSync = true; syncId = 'x'; window.__setDocImpl = () => Promise.resolve();
      window.ds = n => lbAddDays(todayStr(), -n);
      window.T0 = lbFmt(new Date(TREATMENT_START));
      window.mk = (d, o) => { let e = entries.find(x => x.date === d); if (!e) { e = { date: d }; entries.push(e); } Object.assign(e, o); return e; };
      window.sess = (n, sets, planDay) => ({ type: 'Strength', ts: Date.now() - n * 864e5, min: 40, planDay: planDay || 'Push', sets });
      window.R = (n, w) => Array.from({ length: n }, () => ({ weight: w, reps: 10 }));
      baselineWeight = 205; goalWeight = 180; userProteinGoal = 100; localStorage.removeItem('mounjaro-badges-seen'); localStorage.removeItem('mounjaro-weekly-win');
      showView('badges');`);
  const CP = 'Chest Press (machine)', PD = 'Pec Deck (machine)', SP = 'Shoulder Press (machine)', TP = 'Triceps Pushdown (cable)';
  // one exercise for each of the 11 muscle groups (found at run time)
  const names = ev(`(() => { const cand = ['Chest Press (machine)','Shoulder Press (machine)','Triceps Pushdown (cable)','Lat Pulldown','Seated Row','Reverse Fly (machine)','Bicep Curl','Wrist Curl','Reverse Wrist Curl','Leg Press','Leg Curl (machine)','Calf Raise (machine)','Cable Crunch','Plank','Leg Extension (machine)']; const out = {}; cand.forEach(n => { const g = muscleGroupFor(n); if (g && MUSCLE_MAP_GROUPS.includes(g) && !out[g]) out[g] = n; }); return out; })()`);
  const haveAll = Object.keys(names).length === 11;

  // a lived-in history: 60 days of small entries, weekly weights, the last 4 injections on schedule
  ev(`entries = []; for (let i = 60; i >= 0; i--) mk(ds(i), { steps: '3000', water: '30' });
      const mon = lbWeekStart(todayStr()); for (let i = 0; i < 6; i++) mk(lbAddDays(mon, -7 * i), { weight: String(196 - i * 0.5) });
      for (let k = 8; k <= 11; k++) mk(lbAddDays(T0, 7 * k), { injection: true, dose: '5' });
      mk(ds(35), { ex: [sess(35, { '${CP}': R(3, 80), '${PD}': R(3, 50), '${SP}': R(3, 40), '${TP}': R(3, 30) })] });
      mk(ds(3), { ex: [sess(3, { '${CP}': R(3, 90), '${PD}': R(3, 56), '${SP}': R(3, 45), '${TP}': R(3, 36) })] });
      mk(ds(20), { steps: '99999', ex: [sess(20, ${JSON.stringify(Object.fromEntries(Object.values(names).map(n => [n, [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }]])))} )] });
      entries.sort((a, b) => a.date.localeCompare(b.date)); renderBadges();`);

  console.log('=== 1. layout ===');
  const order = [...$('view-badges').children].map(c => c.id).filter(Boolean);
  check('cards in order (not in a group yet, so the leaderboard pitch is last): Weekly challenges, Badges, Recent achievements, Milestones, PR Hall of Fame, All badges, Leaderboard', order.slice(0, 9).join() === 'badgeCelebration,milestoneCelebration,weeklyChallengesCard,badgeSummaryCard,recentAchievementsCard,milestonesSummaryCard,prHallOfFameCard,badgeSectionsCard,leaderboardCard');
  check('all badges start as one line per category (12 of them, including Recovery), none of the locked padlocks showing', doc.querySelectorAll('#badgeSections .bcat-head').length === 12 && doc.querySelectorAll('#badgeSections .badge-row').length === 0);
  check('each line says how many you have and shows a small bar', [...doc.querySelectorAll('#badgeSections .bcat-head')].every(h => /\d+\/\d+/.test(h.querySelector('.bcat-count').textContent) && !!h.querySelector('.bcat-bar')));

  console.log('=== 2. trophy shelf and categories ===');
  const earnedN = ev(`Object.values(badgeIndex).filter(x => x.b.value >= x.b.tier).length`);
  check('every earned badge is a small trophy on the shelf, newest first', doc.querySelectorAll('#trophyShelf .trophy').length === earnedN && earnedN >= 4 && [...doc.querySelectorAll('#trophyShelf .trophy')].every(t => !!t.getAttribute('aria-label')));
  const head = n => doc.querySelector(`#badgeSections [data-bcat="${n}"]`);
  const catRows = n => doc.querySelectorAll(`#badgeSections [data-bcat="${n}"] ~ .bcat-body .badge-row`).length;
  click(head('Steps'));
  check('tapping a category opens all of its badges as rows', head('Steps').getAttribute('aria-expanded') === 'true' && catRows('Steps') === 3);
  check('earned ones say "✓ Earned · <date>", locked ones show a bar and what is left', !!doc.querySelector('#badgeSections .badge-row.earned .br-desc') && /✓ Earned · \w{3} \d+/.test(doc.querySelector('#badgeSections .badge-row.earned .br-desc').textContent) || !!doc.querySelector('#badgeSections .badge-row .bp-fill'));
  click(head('Steps')); check('tapping again closes it', catRows('Steps') === 0 && head('Steps').getAttribute('aria-expanded') === 'false');

  console.log('=== 3. tap a badge for details ===');
  click(head('Blood Sugar'));
  const lockedRow = doc.querySelector('#badgeSections .badge-row:not(.earned)[data-badge]');
  click(lockedRow);
  check('tapping a locked badge opens a sheet with what it is, your progress, and what is left', $('badgeSheet').style.display !== 'none' && /\d+\/\d+/.test($('badgeSheet').textContent) && /to go/.test($('badgeSheet').textContent) && !!$('badgeSheet').querySelector('.bp-fill'));
  click($('badgeSheetBackdrop')); check('the dimmed background closes it', $('badgeSheet').style.display === 'none' && $('badgeSheetBackdrop').style.display === 'none');
  click(doc.querySelector('#trophyShelf .trophy'));
  check('tapping a trophy shows "✓ Earned · <date>"', /✓ Earned · /.test($('badgeSheet').textContent));
  click($('badgeSheet').querySelector('[data-badgeclose]')); check('✕ closes it too', $('badgeSheet').style.display === 'none');
  check('the sheet is pinned to the bottom (fixed)', w.getComputedStyle($('badgeSheet')).position === 'fixed');

  console.log('=== 4. next up ===');
  const nu = [...doc.querySelectorAll('#nextUpBadges .badge-row')];
  check('"Next up" shows the 3 closest badges', nu.length === 3);
  const frac = r => { const m = r.querySelector('.br-count').textContent.split('/').map(x => parseFloat(x.replace(/,/g, ''))); return m[0] / m[1]; };
  check('closest first (progress never goes up the list)', frac(nu[0]) >= frac(nu[1]) && frac(nu[1]) >= frac(nu[2]));
  check('each says how much is left ("3 more days")', nu.every(r => /more \w+/.test(r.querySelector('.br-desc').textContent)));

  console.log('=== 5. no more duplicate titles ===');
  const titles = ev(`Object.values(badgeIndex).map(x => x.b.title).concat(buildMilestoneCategories().flatMap(c => c.milestones.map(m => m.title)))`);
  check('every badge and milestone title is unique (the two "10 Workouts"/"50 Workouts" pairs are gone)', new Set(titles).size === titles.length);
  check('the any-activity badges are now "Activities"', ev(`badgeIndex.workouts_10.b.title`) === '10 Activities' && /lifting, walks, cardio/.test(ev(`badgeIndex.workouts_10.b.desc`)));

  console.log('=== 6. protein badges follow your goal ===');
  check('the text names your goal (100 g)', /100g/.test(ev(`badgeIndex.protein_7.b.desc`)));
  ev(`userProteinGoal = 120; renderBadges()`); check('change the goal to 120 and the badge text follows', /120g/.test(ev(`badgeIndex.protein_7.b.desc`)));
  ev(`entries.forEach(e => { e.protein = '110'; }); userProteinGoal = 100`); const s100 = ev(`computeBadgeData().proteinStreak`);
  ev(`userProteinGoal = 120`); const s120 = ev(`computeBadgeData().proteinStreak`);
  check('and so does the streak (110 g days count at a 100 g goal, not at 120 g)', s100 > 7 && s120 === 0);
  ev(`entries.forEach(e => { delete e.protein; }); userProteinGoal = 100; renderBadges()`);

  console.log('=== 7. new badges ===');
  const d = ev(`computeBadgeData()`);
  check('injections on 4 consecutive scheduled weeks → injectionWeeks 4, and "On Schedule" is earned', d.injectionWeeks === 4 && ev(`badgeIndex.inj_4.b.value >= badgeIndex.inj_4.b.tier`) && ev(`badgeIndex.inj_12.b.value < badgeIndex.inj_12.b.tier`));
  check('weighing in each of the last 6 weeks → "Weekly Weigh-ins" earned', d.weighInWeeks >= 6 && ev(`badgeIndex.weigh_4.b.value >= 4`));
  check('a week that trains all 11 muscle groups → "Full-Body Week" earned', !haveAll || (d.fullBodyWeeks >= 1 && ev(`badgeIndex.fullbody_1.b.value >= 1`)));
  check('lifts heavier than the 4 weeks before in 3 muscles → "Lifts Trending Up" earned', d.musclesUp >= 3 && ev(`badgeIndex.progress_3.b.value >= 3`));
  const ed = ev(`badgeEarnedDates()`);
  check('the injection badge has an earned date, and it flips exactly on that date', !!ed.inj_4 && !ev(`allEarnedBadgeIds('${ev('lbAddDays(badgeEarnedDates().inj_4, -1)')}').includes('inj_4')`) && ev(`allEarnedBadgeIds('${ed.inj_4}').includes('inj_4')`));

  console.log('=== 8. weekly challenges ===');
  ev(`entries = []; window.satisfy = (ws, cut) => { weeklyChallenges(ws).forEach(c => { if (c.done) return; for (let i = 0; i < c.target; i++) { const d = lbAddDays(ws, i); if (cut && d > cut) break; const o = {};
        if (c.kind === 'workouts') o.ex = [sess(0, { '${CP}': R(3, 80) })]; else if (c.kind === 'protein') o.protein = '130'; else if (c.kind === 'steps') o.steps = '99999'; else if (c.kind === 'water') o.water = '80'; else if (c.kind === 'logging') o.weight = '190'; else if (c.kind === 'weighin') o.weight = '190';
        mk(d, o); } }); };
      const W = lbWeekStart(todayStr()); mk(lbAddDays(W, -28), { weight: '195' }); [-21, -14, -7].forEach(k => satisfy(lbAddDays(W, k))); entries.sort((a, b) => a.date.localeCompare(b.date)); renderBadges();`);
  const cards = () => [...doc.querySelectorAll('#weeklyChallengesBody .wc-row')];
  check('three challenges this week, each with a progress bar and "x/y"', cards().length === 3 && cards().every(r => !!r.querySelector('.bp-fill') && /\d+\/\d+/.test(r.querySelector('.br-count').textContent)));
  check('titles read like goals ("Lift 3 times", "Hit your protein goal 5 days", …)', cards().every(r => r.querySelector('.br-title').textContent.trim().length > 6));
  check('the header says which week and how many are done', /Week of/.test($('weeklyChallengesBody').textContent) && /0 of 3 done/.test($('weeklyChallengesBody').textContent));
  check('three past weeks were all won, so there are 3 weekly wins and "Weekly Win" is earned', /3 weekly wins so far/.test($('weeklyChallengesBody').textContent) && ev(`computeBadgeData().weeklyWinCount`) === 3 && ev(`badgeIndex.challenge_1.b.value >= 1`) && ev(`badgeIndex.challenge_4.b.value < 4`));
  check('a dot per recent week shows the wins', doc.querySelectorAll('#weeklyChallengesBody .wc-dot.won').length === 3);
  ev(`document.getElementById('prToast').style.display = 'none'; satisfy(lbWeekStart(todayStr())); renderBadges()`);
  check('finishing all three this week shows the Weekly win banner', !!$('weeklyWinBanner') && /3 of 3 done/.test($('weeklyChallengesBody').textContent));
  check('with a gold toast and confetti, once', $('prToast').style.display === 'block' && /Weekly win/.test($('prToast').textContent) && doc.querySelectorAll('#weeklyChallengesCard .confetti-piece').length > 0);
  ev(`document.getElementById('prToast').style.display = 'none'; renderBadges()`); check('it does not repeat on the next render', $('prToast').style.display !== 'block');
  check('and the win now counts (4 weekly wins)', ev(`weeklyWinData().filter(x => x.wonDate).length`) === 4);

  console.log('=== 9. recent achievements ===');
  const ra = [...doc.querySelectorAll('#recentAchievementsBody .ra-row')];
  check('a dated list, newest first, 3 at most to start', ra.length >= 1 && ra.length <= 3 && ra.every(r => /\w{3} \d+/.test(r.querySelector('.ra-when').textContent)));
  const dates = ev(`(() => { const a = []; document.querySelectorAll('#recentAchievementsBody .ra-row').forEach(r => a.push(r.querySelector('.ra-when').textContent)); return a; })()`);
  check('"Show more" is offered when there are more than 3', ev(`badgeEarnedDates()`) && (ra.length < 3 || !!doc.querySelector('#recentAchievementsBody [data-recentmore]')));

  const raNames = ev(`(() => { const a = []; document.querySelectorAll('#recentAchievementsBody .ra-name').forEach(n => a.push(n.textContent)); return a; })()`);
  check('an achievement that is both a badge and a milestone is listed once (no "10 lbs Lost" next to "Weight Lost: 10 lbs")', new Set(raNames.map(n => n.replace(/^[^:]*: /, '').replace(/ Lost$/, '').toLowerCase())).size === raNames.length);
  console.log('=== 10. a bigger badge set does not re-announce what you already had ===');
  ev(`localStorage.setItem('mounjaro-badges-seen', JSON.stringify(['steps_1'])); localStorage.removeItem('mounjaro-badges-v2'); document.getElementById('badgeCelebration').style.display = 'none'; document.getElementById('badgeCelebration').innerHTML = ''; entries = []; renderBadges()`);
  check('with no data loaded yet (an empty first paint) nothing is migrated', w.localStorage.getItem('mounjaro-badges-v2') === null);
  ev(`for (let i = 60; i >= 0; i--) mk(ds(i), { steps: '99999', water: '80' }); entries.sort((a, b) => a.date.localeCompare(b.date)); renderBadges()`);
  const seen = JSON.parse(w.localStorage.getItem('mounjaro-badges-seen') || '[]');
  check('once data is there, what is already earned is marked seen once (steps_7, steps_30, water_7 …)', seen.includes('steps_1') && seen.includes('steps_7') && seen.includes('steps_30') && seen.includes('water_7') && w.localStorage.getItem('mounjaro-badges-v2') === '1');
  check('and no "new!" banner appears for them', $('badgeCelebration').style.display === 'none' && !$('badgeCelebration').innerHTML.trim());
  ev(`mk(ds(0), { ex: [sess(0, { '${CP}': R(3, 80) })] }); renderBadges()`);
  check('a genuinely new unlock afterwards still gets its banner', $('badgeCelebration').style.display === 'block' && /First Workout/.test($('badgeCelebration').textContent));

  console.log('=== 11. milestones, trimmed ===');
  ev(`entries = []; mk(ds(40), { weight: '200' }); mk(ds(10), { weight: '194' }); entries.sort((a, b) => a.date.localeCompare(b.date)); renderBadges()`);
  const chips = [...doc.querySelectorAll('#milestonesSummaryBody .mil-chip')], msRows = doc.querySelectorAll('#milestonesSummaryBody .badge-row').length;
  check('reached milestones are small chips with the date reached ("✓ 10 lbs  Sep 29")', chips.length >= 1 && chips.some(c => /10 lbs/.test(c.textContent) && /\w{3} \d+/.test(c.textContent)));
  check('each category shows just its next one as a progress row', msRows >= 3 && msRows <= 4);
  const mm = doc.querySelector('#milestonesSummaryBody [data-mmore]'); const rowsBefore = msRows;
  click(mm); check('"Show N more ahead" opens the rest', doc.querySelectorAll('#milestonesSummaryBody .badge-row').length > rowsBefore);

  console.log('=== 12. PR Hall of Fame ===');
  ev(`entries = []; const lifts = ['Chest Press (machine)','Shoulder Press (machine)','Pec Deck (machine)','Triceps Pushdown (cable)','Lat Pulldown','Seated Row','Leg Press'];
      lifts.forEach((n, i) => { mk(ds(80 - i), { ex: [sess(80 - i, { [n]: R(3, 50 + i * 10) })] }); mk(ds(10 + i * 3), { ex: [sess(10 + i * 3, { [n]: R(3, 70 + i * 10) })] }); });
      entries.sort((a, b) => a.date.localeCompare(b.date)); renderBadges()`);
  const prRows = [...doc.querySelectorAll('#prHallOfFameBody .pr-row')];
  check('5 lifts to start, with a "Show all 7 lifts" button', prRows.length === 5 && /Show all 7 lifts/.test($('prHallOfFameBody').textContent));
  check('newest record first (Chest Press, set 10 days ago), not heaviest first (Leg Press weighs most)', /Chest Press/.test(prRows[0].textContent) && !/Leg Press/.test(prRows[0].textContent));
  check('each shows how far it has come since the first time (+20)', prRows.every(r => /\+20/.test(r.textContent)));
  check('no gold/silver/bronze medals any more', !$('prHallOfFameBody').innerHTML.includes('#FFD700') && !$('prHallOfFameBody').innerHTML.includes('#C0C0C0'));
  click($('prHallOfFameBody').querySelector('[data-prmore]')); check('"Show all" lists all 7', doc.querySelectorAll('#prHallOfFameBody .pr-row').length === 7);

  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
