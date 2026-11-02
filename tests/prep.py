import sys
src = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/five/index.html'
content = open(src, encoding='utf-8').read()
content = content.replace('<script type="module">', '<script>', 1)
marker = """import { initializeApp }        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, orderBy, enableIndexedDbPersistence }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';"""
stub = """
function initializeApp(cfg) { return {}; }
function getFirestore(app) { return {}; }
function collection(...args) { return { _path: args.slice(1).join('/') }; }
function doc(...args) { return { _path: args.slice(1).join('/') }; }
async function fsSetDoc(ref, data, opts) { window.__setDocCalls = (window.__setDocCalls||0)+1; return window.__setDocImpl ? window.__setDocImpl(ref, data, opts) : Promise.resolve(); }
async function fsDeleteDoc(ref) { return window.__deleteDocImpl ? window.__deleteDocImpl(ref) : Promise.resolve(); }
async function getDoc(ref) { return window.__getDocImpl ? window.__getDocImpl(ref) : { exists: () => false, data: () => ({}) }; }
async function getDocs(ref) { if (ref && ref._path && /^groups[/][^/]+[/]members$/.test(ref._path)) { if (window.__getDocsError) throw new Error('permission-denied'); return { docs: (window.__groupDocs || []).map(d => ({ id: d.id, data: () => d.data })) }; } return { docs: [] }; }
function onSnapshot(ref, cb, errCb) {
  if (ref && ref._path && /^groups[/][^/]+[/]cheers$/.test(ref._path)) { window.__cheerSubs = (window.__cheerSubs || 0) + 1; window.__cheerCb = cb; window.__cheerErrCb = errCb; if (cb) cb({ docs: (window.__cheerDocs || []).map(d => ({ id: d.id, data: () => d.data })) }); return () => { window.__cheerUnsubs = (window.__cheerUnsubs || 0) + 1; }; }
  if (ref && ref._path && /^groups[/][^/]+[/]members$/.test(ref._path)) { window.__groupSubs = (window.__groupSubs || 0) + 1; window.__groupCb = cb; window.__groupErrCb = errCb; if (window.__groupSnapError && errCb) errCb(new Error('permission-denied')); else if (cb) cb({ docs: (window.__groupDocs || []).map(d => ({ id: d.id, data: () => d.data })) }); return () => { window.__groupUnsubs = (window.__groupUnsubs || 0) + 1; }; }
  const isEntries = ref && ref._path && ref._path.endsWith('/entries');
  const docs = isEntries ? (window.__snapDocs || []).map(d => ({ data: () => d, id: d.date })) : [];
  const isSettings = ref && ref._path && ref._path.endsWith('meta/settings');
  if (cb) cb(isSettings ? { exists: () => !!window.__settingsData, data: () => window.__settingsData || {}, docs: [] } : { exists: () => false, data: () => ({}), docs });
  return () => {};
}
function query(ref) { return ref; }
function orderBy(...args) { return {}; }
async function enableIndexedDbPersistence(db) { return Promise.resolve(); }
"""
if marker not in content:
    # Firestore import was aliased (feature 3 renames it) - handle that form too
    import re
    m = re.search(r"import \{ initializeApp \}[^\n]*\nimport \{[^}]*\}\s*\n?\s*from '[^']*firebase-firestore\.js';", content)
    assert m, "firebase import block not found"
    marker = m.group(0)
content = content.replace(marker, stub)
open('/home/claude/live_five.html', 'w', encoding='utf-8').write(content)
import shutil; shutil.copy('/home/claude/live_five.html', '/home/claude/shots/app.html')
print("test page ready")
