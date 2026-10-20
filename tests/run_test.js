// Code.gs를 가짜 스프레드시트(mock.js)로 실행해 저장·수정·삭제를 확인합니다.
// 실행: node tests/run_test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx);
const r = (code) => vm.runInContext(code, ctx);
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok  ', msg); };

r('setup()');
const d = r('getData()');
assert(d.students.length === 1 && d.students[0].name === '샘플학생', '샘플학생 1명만 들어감');
assert(d.classes.length === 2 && /^\d{4}-\d{2}$/.test(d.classes[0].month) && d.classes[0].start === '17:00', '시간표 월·시간 형식 유지');
assert(d.lessons.length === 2 && d.logs.length === 3, '샘플 수업일지 2건 · 하루 기록 3건');

const saved = r(`saveLog({student:'학생B',date:'2026-10-20',tutor:'조교A',att:'출석',hw:'일부',hours:'3.5',focus:4,
  plans:[{subj:'수학',plan:'- 개념드릴 18~21p',result:'완료'}],test:'=10/20',note:'',memo:'',next:'재시험',checkResult:'',prevCheck:'',schedule:''})`);
assert(saved.plans[0].plan === '- 개념드릴 18~21p' && saved.test === '=10/20', '- = 로 시작하는 글이 그대로 저장됨');
r(`saveLog({student:'학생B',date:'2026-10-20',tutor:'조교B',att:'지각',hw:'완료',hours:'2',focus:'',plans:[],test:'',note:'',memo:'',next:'',checkResult:'',prevCheck:'',schedule:''})`);
const logs = r('getData().logs');
assert(logs.length === 4 && logs.filter(l=>l.student==='학생B').length === 1 && logs.find(l=>l.student==='학생B').tutor === '조교B', '같은 날 같은 학생은 한 줄로 수정됨');

const les = r(`saveLesson({date:'2026-10-20',className:'중2 수학',teacher:'',progress:'p.118',book:'',hw:'드릴',due:'2026-10-22',test:'',memo:''})`);
assert(r('getData().lessons.length') === 3, '수업일지 추가');
r(`deleteLesson(${JSON.stringify(les.id)})`);
assert(r('getData().lessons.length') === 2, '수업일지 삭제');

r(`saveWeekly({start:'2026-10-19',end:'2026-10-25',student:'학생B',classes:'',subjects:'',unit:'',books:'',hwScore:5,hwCmt:'',focScore:4,focCmt:'',achScore:4,achCmt:'',teacher:'',days:1,att:1,hours:2})`);
r(`saveWeekly({start:'2026-10-19',end:'2026-10-25',student:'학생B',classes:'',subjects:'',unit:'',books:'',hwScore:3,hwCmt:'',focScore:4,focCmt:'',achScore:4,achCmt:'',teacher:'',days:1,att:1,hours:2})`);
const wk = r('getData().weeklies');
assert(wk.length === 1 && wk[0].hwScore === 3, '주간피드백 같은 주는 한 줄로 수정됨');
