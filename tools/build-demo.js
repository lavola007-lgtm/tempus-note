// 체험판(docs/index.html) 만들기: Index.html 화면 + 브라우저 안의 가짜 시트로 Code.gs 를 그대로 실행
// 실행: node tools/build-demo.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const backend = `
<script>
${read('tests/mock.js')}
</script>
<script>
${read('Code.gs')}
</script>
<script>
(function () {
  var KEY = 'tempus-demo-v1';
  function save() {
    try {
      var out = {};
      Object.keys(__sheets).forEach(function (k) {
        out[k] = __sheets[k].data.map(function (r) { return (r || []).map(function (v) { return v instanceof Date ? { d: v.getTime() } : v; }); });
      });
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch (e) {}
  }
  function restore() {
    try {
      var raw = localStorage.getItem(KEY); if (!raw) return false;
      var o = JSON.parse(raw), ss = SpreadsheetApp.getActive();
      Object.keys(o).forEach(function (k) {
        var sh = ss.getSheetByName(k) || ss.insertSheet(k);
        sh.data = o[k].map(function (r) { return r.map(function (v) { return v && typeof v === 'object' && 'd' in v ? new Date(v.d) : v; }); });
      });
      return true;
    } catch (e) { return false; }
  }
  if (!restore()) { setup(); save(); }
  var api = { getData: getData, saveLog: saveLog, saveLesson: saveLesson, deleteLesson: deleteLesson, saveConfig: saveConfig, saveWeekly: saveWeekly };
  window.MOCK = {};
  Object.keys(api).forEach(function (k) { window.MOCK[k] = function () { var r = api[k].apply(null, arguments); if (k !== 'getData') save(); return r; }; });
  window.__resetDemo = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
})();
</script>`;

const banner = `<div style="background:#F3DC5A;color:#4A3F00;padding:8px 16px;font:600 14px/1.4 'IBM Plex Sans KR',system-ui,sans-serif;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:center">
  체험판입니다. 입력한 기록은 이 브라우저에만 저장되고 구글 시트로 가지 않습니다.
  <button onclick="__resetDemo()" style="font:inherit;border:1px solid #4A3F00;background:transparent;color:inherit;border-radius:6px;padding:2px 10px;cursor:pointer">처음 상태로</button>
</div>`;

let html = read('Index.html');
html = html.replace('<body>', '<body>\n' + banner);
html = html.replace('<script>\n(function(){', backend + '\n<script>\n(function(){');
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'index.html'), html);
console.log('docs/index.html', html.length, 'bytes');
