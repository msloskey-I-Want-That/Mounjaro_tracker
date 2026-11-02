// Checks firestore.rules against the database paths the app ACTUALLY uses (read straight from index.html).
// This is not Google's rules engine; it evaluates the simple "match path { allow ...: if true; }" form these rules use.
const fs = require('fs');
const html = fs.readFileSync('/home/claude/five/index.html', 'utf-8');
const rules = fs.readFileSync('/home/claude/firestore.rules', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };

// ── read the rules ──
const noComments = rules.replace(/\/\/.*$/gm, '');
const rulesList = [];
for (const m of noComments.matchAll(/match\s+(\/[^\s{]*(?:\{[^}]*\}[^\s{]*)*)\s*\{\s*allow\s+([a-z, ]+?)\s*:\s*if\s+true\s*;\s*\}/g)) {
  rulesList.push({ segs: m[1].split('/').filter(Boolean), ops: m[2].split(',').map(s => s.trim()) });
}
const expand = ops => new Set(ops.flatMap(o => o === 'read' ? ['get', 'list'] : o === 'write' ? ['create', 'update', 'delete'] : [o]));
function allowed(op, segs) { // op on a DOCUMENT path (segs has an even number of parts)
  return rulesList.some(r => r.segs.length === segs.length && expand(r.ops).has(op) && r.segs.every((p, i) => /^\{[^}=]+\}$/.test(p) || p === segs[i]));
}
const canList = collSegs => allowed('list', [...collSegs, '*']); // listing a collection needs a rule for its documents

// ── read the app's database paths ──
function calls(kind) {
  const out = []; let i = 0;
  while ((i = html.indexOf(kind + '(db,', i)) !== -1) {
    let depth = 0, j = i + kind.length; const start = j + 1;
    for (; j < html.length; j++) { if (html[j] === '(') depth++; else if (html[j] === ')') { depth--; if (depth === 0) break; } }
    const inner = html.slice(start, j); let d2 = 0, cur = '', args = [];
    for (const ch of inner) { if (ch === '(') d2++; if (ch === ')') d2--; if (ch === ',' && d2 === 0) { args.push(cur.trim()); cur = ''; } else cur += ch; }
    args.push(cur.trim()); args.shift(); // drop "db"
    out.push(args.map(a => (/^'[^']*'$/.test(a) ? a.slice(1, -1) : '*')));
    i = j;
  }
  return out;
}
const uniq = a => [...new Set(a.map(x => x.join('/')))].map(s => s.split('/'));
const docShapes = uniq(calls('doc')), collShapes = uniq(calls('collection'));
console.log('app document shapes:', docShapes.map(s => s.join('/')).join('  |  '));
console.log('app collection shapes:', collShapes.map(s => s.join('/')).join('  |  '));

console.log('=== the rules file ===');
check(`parsed ${rulesList.length} rules`, rulesList.length === 5);
check('no recursive wildcard ({x=**}) anywhere, no catch-all, no condition other than the plain `if true`', !/=\*\*/.test(noComments) && !/match\s+\/\{[^}]*\}\s*\{/.test(noComments) && (noComments.match(/allow/g) || []).length === rulesList.length);
check('every rule is under /trackers/<id>/… or /groups/<code>/… (nothing at the top level)', rulesList.every(r => (r.segs[0] === 'trackers' || r.segs[0] === 'groups') && r.segs.length === (r.segs[0] === 'trackers' ? 4 : 4)));

console.log('=== everything the app does is allowed ===');
check('found the paths the app uses (settings, entries, labs, members, cheers)', ['trackers/*/meta/settings', 'trackers/*/entries/*', 'trackers/*/labs/*', 'groups/*/members/*', 'groups/*/cheers/*'].every(p => docShapes.some(s => s.join('/') === p)) && ['trackers/*/entries', 'trackers/*/labs', 'groups/*/members', 'groups/*/cheers'].every(p => collShapes.some(s => s.join('/') === p)));
check('every DOCUMENT path the app reads, writes or deletes is allowed', docShapes.every(s => { const ok = ['get', 'create', 'update', 'delete'].every(op => allowed(op, s)); if (!ok) console.log('   NOT ALLOWED:', s.join('/')); return ok; }));
check('every COLLECTION the app lists or listens to is allowed', collShapes.every(s => { const ok = canList(s); if (!ok) console.log('   NOT ALLOWED to list:', s.join('/')); return ok; }));
check('the app never uses a collection-group query (which these rules would not allow)', !/collectionGroup\(/.test(html));
check('the app talks to no other top-level collection', [...docShapes, ...collShapes].every(s => s[0] === 'trackers' || s[0] === 'groups'));

console.log('=== what is blocked ===');
const no = (label, op, segs) => check(`denied: ${label}`, !allowed(op, segs));
check('denied: listing ALL trackers (the way someone would browse everyone\'s health data)', !canList(['trackers']));
check('denied: listing ALL groups', !canList(['groups']));
no('reading a tracker\'s top-level document', 'get', ['trackers', 'abc']);
no('reading a group\'s top-level document', 'get', ['groups', 'abc']);
no('writing a tracker\'s top-level document', 'create', ['trackers', 'abc']);
check('denied: listing a made-up collection inside a tracker', !canList(['trackers', 'abc', 'secrets']));
no('reading a made-up document inside a tracker', 'get', ['trackers', 'abc', 'secrets', 'x']);
no('going deeper than the app does (entries/day/anything/x)', 'get', ['trackers', 'abc', 'entries', '2026-01-01', 'sub', 'x']);
no('any other top-level collection (users)', 'get', ['users', 'abc']);
no('any other top-level collection (recipes)', 'get', ['recipes', 'abc']);
check('denied: listing any other top-level collection', !canList(['users']) && !canList(['recipes']));
check('but one specific tracker IS reachable by someone who knows its ID (that is how the app works)', allowed('get', ['trackers', 'a-real-id', 'entries', '2026-10-08']) && canList(['trackers', 'a-real-id', 'entries']));
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
