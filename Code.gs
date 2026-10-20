/**
 * 템퍼스 관리노트 — 구글 시트 백엔드
 * 웹 화면(Index.html)에서 저장한 모든 기록이 이 스프레드시트 탭에 한 줄씩 쌓입니다.
 *
 * 설치: 확장 프로그램 > Apps Script 에 Code.gs, Index.html 붙여넣기
 *       → setup 한 번 실행(권한 허용) → 배포 > 새 배포 > 웹 앱
 */

var TABS = {
  STU: { name: '학생', head: ['이름', '학년', '학교', '주담당 조교', '상태', '메모'] },
  TUT: { name: '조교', head: ['이름'] },
  TT:  { name: '시간표', head: ['적용월', '요일', '시작', '종료', '수업명', '과목', '구분', '대상학생', '담당'] },
  LES: { name: '수업일지', head: ['기록ID', '날짜', '요일', '수업명', '선생님', '진도', '교재', '숙제', '숙제 마감일', '테스트·평가', '메모', '저장시각'] },
  LOG: { name: '관리일지', head: ['기록ID', '날짜', '요일', '학생', '담당조교', '출결', '오늘 일정', '지난 점검사항', '점검결과', '지난 숙제', '순공시간', '집중도(1~5)',
    '과목1', '계획1', '달성1', '과목2', '계획2', '달성2', '과목3', '계획3', '달성3', '과목4', '계획4', '달성4',
    '테스트·점수', '특이사항(학부모)', '내부메모', '다음 점검사항', '처음 저장', '마지막 수정'] },
  WK:  { name: '주간피드백', head: ['기록ID', '주 시작', '주 끝', '학생', '수업명', '학습 과목', '학습 단원', '학습 교재',
    '숙제 성실도', '숙제 코멘트', '수업 집중도', '집중도 코멘트', '학습 이해도', '이해도 코멘트', '담임 코멘트',
    '기록 일수', '출석 일수', '순공 합계', '저장시각'] },
  HIS: { name: '학생이력' }
};
var PLAN_MAX = 4;
var DAYS = '일월화수목금토';

/* ---------- 웹 앱 ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('템퍼스 관리노트')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- 최초 1회: 탭 만들기 + 사진 자료 넣기 ---------- */
function setup() {
  var ss = SpreadsheetApp.getActive();
  ['STU', 'TUT', 'TT', 'LES', 'LOG', 'WK'].forEach(function (k) { ensureTab_(ss, TABS[k]); });

  // 시트가 비어 있을 때만 '샘플학생' 1명의 예시 이력을 넣습니다.
  // 실제 학생·시간표는 웹의 '학생·시간표' 탭에서 추가하고, 샘플학생은 '재원' 체크를 끄면 숨겨집니다.
  var today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  var day = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); };
  var S = '샘플학생';
  var stu = ss.getSheetByName(TABS.STU.name);
  if (stu.getLastRow() < 2) write_(stu, [[S, '중2', '', '', '재원', '예시 학생입니다. 실제 학생을 추가한 뒤 재원 체크를 끄세요']]);
  var tt = ss.getSheetByName(TABS.TT.name);
  if (tt.getLastRow() < 2) {
    var m = today.slice(0, 7);
    write_(tt, [[m, '화', '17:00', '19:00', '중2 수학(샘플)', '수학', '수업', S, ''],
                [m, '목', '17:00', '19:00', '중2 수학(샘플)', '수학', '수업', S, '']]);
  }
  var les = ss.getSheetByName(TABS.LES.name);
  if (les.getLastRow() < 2) {
    write_(les, [
      ['L1', day(-7), dow_(day(-7)), '중2 수학(샘플)', '', 'p.72~75 이등변삼각형 개념 + 문제풀이', '', '개념노트 정리, 개념드릴 p.2', day(-5), '', '예시 기록', stamp_()],
      ['L2', day(-5), dow_(day(-5)), '중2 수학(샘플)', '', 'p.76~79 직각삼각형 합동 + 문제풀이', '', '개념드릴 p.3~8', day(-2), '백지테스트', '예시 기록', stamp_()]
    ]);
  }
  var log = ss.getSheetByName(TABS.LOG.name);
  if (log.getLastRow() < 2) {
    var L = function (d, att, hw, hrs, foc, plans, test, note, next, chk, prev) {
      var row = [d + '_' + S, d, dow_(d), S, '조교', att, '17:00 중2 수학(샘플)', prev || '', chk || '', hw, hrs, foc];
      for (var i = 0; i < PLAN_MAX; i++) { var p = plans[i] || []; row.push(p[0] || '', p[1] || '', p[2] || ''); }
      return row.concat([test, note, '', next, stamp_(), stamp_()]);
    };
    write_(log, [
      L(day(-7), '출석', '완료', 3, 4, [['수학', '개념드릴 p.1', '완료'], ['영어', '단어 Day3', '완료']], '', '', '개념노트 지참 확인'),
      L(day(-5), '출석', '일부', 2.5, 3, [['수학', '개념드릴 p.2', '일부'], ['국어', '문법 1강', '완료']], '백지테스트 6/10', '백지테스트를 한 번 더 보기로 했습니다.', '백지테스트 재시험', '해결', '개념노트 지참 확인'),
      L(day(-2), '출석', '완료', 3.5, 5, [['수학', '개념드릴 p.3~8', '완료'], ['과학', '1단원 정리', '완료']], '백지테스트 재시험 10/10', '재시험을 통과했습니다.', '단원평가 준비', '해결', '백지테스트 재시험')
    ]);
  }
  ensureHistoryTab_(ss);
  return '설치 완료: 탭 ' + ss.getSheets().length + '개';
}

function ensureTab_(ss, t) {
  var sh = ss.getSheetByName(t.name) || ss.insertSheet(t.name);
  sh.getRange(1, 1, 1, t.head.length).setValues([t.head]).setFontWeight('bold').setBackground('#E2EEEA');
  sh.setFrozenRows(1);
  return sh;
}

function ensureHistoryTab_(ss) {
  var sh = ss.getSheetByName(TABS.HIS.name) || ss.insertSheet(TABS.HIS.name);
  sh.clear();
  sh.getRange('A1').setValue('학생').setFontWeight('bold');
  var rule = SpreadsheetApp.newDataValidation().requireValueInRange(ss.getSheetByName(TABS.STU.name).getRange('A2:A'), true).build();
  sh.getRange('B1').setDataValidation(rule).setValue(ss.getSheetByName(TABS.STU.name).getRange(2, 1).getValue()).setBackground('#FFF6C9');
  sh.getRange('C1').setValue('← 학생을 고르면 그 학생의 하루 기록이 최신순으로 모두 나옵니다');
  var head = TABS.LOG.head.slice(1, 28);
  sh.getRange(2, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#E2EEEA');
  sh.getRange('A3').setFormula("=IFERROR(SORT(FILTER('관리일지'!B2:AB, '관리일지'!D2:D=$B$1), 1, FALSE), \"기록 없음\")");
  sh.setFrozenRows(2);
}

/* ---------- 읽기 ---------- */
function getData() {
  var ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(TABS.LOG.name)) setup();
  tidy_(ss);
  return {
    students: rows_(ss, TABS.STU).map(function (r) { return { name: r[0], grade: r[1], school: r[2], tutor: r[3], active: r[4] !== '휴원' && r[4] !== '퇴원', status: r[4] || '재원', memo: r[5] }; })
      .filter(function (s) { return s.name; }),
    tutors: rows_(ss, TABS.TUT).map(function (r) { return r[0]; }).filter(String),
    classes: rows_(ss, TABS.TT).map(function (r) {
      return { month: String(r[0]).slice(0, 7), day: r[1], start: r[2], end: r[3], name: r[4], subject: r[5], kind: r[6] || '수업',
        students: String(r[7] || '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(String), teacher: r[8] };
    }).filter(function (c) { return c.name; }),
    lessons: rows_(ss, TABS.LES).map(lessonFromRow_).filter(function (x) { return x.id; }),
    logs: rows_(ss, TABS.LOG).map(logFromRow_).filter(function (x) { return x.id; }),
    weeklies: rows_(ss, TABS.WK).map(function (r) {
      return { id: r[0], start: r[1], end: r[2], student: r[3], hwScore: r[8], focScore: r[10], achScore: r[12], savedAt: r[18] };
    }).filter(function (x) { return x.id; }),
    sheetUrl: ss.getUrl()
  };
}

function lessonFromRow_(r) {
  return { id: r[0], date: r[1], className: r[3], teacher: r[4], progress: r[5], book: r[6], hw: r[7], due: r[8], test: r[9], memo: r[10] };
}
function logFromRow_(r) {
  var plans = [];
  for (var i = 0; i < PLAN_MAX; i++) {
    var s = r[12 + i * 3], p = r[13 + i * 3], a = r[14 + i * 3];
    if (s || p || a) plans.push({ subj: s, plan: p, result: a });
  }
  return { id: r[0], date: r[1], student: r[3], tutor: r[4], att: r[5], schedule: r[6], prevCheck: r[7], checkResult: r[8],
    hw: r[9], hours: r[10], focus: r[11], plans: plans, test: r[24], note: r[25], memo: r[26], next: r[27], createdAt: r[28], updatedAt: r[29] };
}

/* ---------- 쓰기 ---------- */
function saveLog(o) {
  return locked_(function () {
    var sh = SpreadsheetApp.getActive().getSheetByName(TABS.LOG.name);
    var id = o.date + '_' + o.student;
    var row = [id, o.date, dow_(o.date), o.student, o.tutor, o.att, o.schedule, o.prevCheck, o.checkResult, o.hw,
      o.hours === '' || o.hours == null ? '' : Number(o.hours), o.focus === '' || o.focus == null ? '' : Number(o.focus)];
    for (var i = 0; i < PLAN_MAX; i++) {
      var p = (o.plans || [])[i] || {};
      row.push(p.subj || '', p.plan || '', p.result || '');
    }
    var found = findRow_(sh, id);
    var created = found ? norm_(sh.getRange(found, 29).getValue()) : stamp_();
    row.push(o.test, o.note, o.memo, o.next, created, stamp_());
    put_(sh, found, row);
    return logFromRow_(row.map(norm_));
  });
}

function saveLesson(o) {
  return locked_(function () {
    var sh = SpreadsheetApp.getActive().getSheetByName(TABS.LES.name);
    var id = o.id || ('L' + Utilities.getUuid().slice(0, 8));
    var row = [id, o.date, dow_(o.date), o.className, o.teacher, o.progress, o.book, o.hw, o.due, o.test, o.memo, stamp_()];
    put_(sh, findRow_(sh, id), row);
    return lessonFromRow_(row.map(norm_));
  });
}

function deleteLesson(id) {
  return locked_(function () {
    var sh = SpreadsheetApp.getActive().getSheetByName(TABS.LES.name);
    var found = findRow_(sh, id);
    if (found) sh.deleteRow(found);
    return true;
  });
}

function saveConfig(cfg) {
  return locked_(function () {
    var ss = SpreadsheetApp.getActive();
    replaceAll_(ss.getSheetByName(TABS.STU.name), (cfg.students || []).map(function (s) {
      return [s.name, s.grade || '', s.school || '', s.tutor || '', s.active === false ? '휴원' : '재원', s.memo || ''];
    }), TABS.STU.head.length);
    replaceAll_(ss.getSheetByName(TABS.TUT.name), (cfg.tutors || []).map(function (t) { return [t]; }), 1);
    replaceAll_(ss.getSheetByName(TABS.TT.name), (cfg.classes || []).map(function (c) {
      return [c.month, c.day, c.start, c.end, c.name, c.subject || '', c.kind || '수업', (c.students || []).join(', '), c.teacher || ''];
    }), TABS.TT.head.length);
    return getData();
  });
}

function saveWeekly(o) {
  return locked_(function () {
    var sh = SpreadsheetApp.getActive().getSheetByName(TABS.WK.name);
    var id = o.start + '_' + o.student;
    var row = [id, o.start, o.end, o.student, o.classes, o.subjects, o.unit, o.books, o.hwScore, o.hwCmt, o.focScore, o.focCmt,
      o.achScore, o.achCmt, o.teacher, o.days, o.att, o.hours, stamp_()];
    put_(sh, findRow_(sh, id), row);
    return { id: id, start: o.start, end: o.end, student: o.student, hwScore: o.hwScore, focScore: o.focScore, achScore: o.achScore, savedAt: norm_(row[18]) };
  });
}

/* ---------- 도우미 ---------- */
function rows_(ss, t) {
  var sh = ss.getSheetByName(t.name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, t.head.length).getValues().map(function (r) { return r.map(norm_); });
}
function write_(sh, rows) {
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows.map(function (r) { return r.map(safe_); }));
}
function replaceAll_(sh, rows, width) {
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, width).clearContent();
  write_(sh, rows);
}
/** 같은 기록ID 줄이 있으면 덮어쓰고, 없으면 맨 아래에 새 줄로 쌓음 */
function put_(sh, found, row) {
  var safe = row.map(safe_);
  if (found) sh.getRange(found, 1, 1, safe.length).setValues([safe]);
  else sh.appendRow(safe);
}
function findRow_(sh, id) {
  if (sh.getLastRow() < 2) return 0;
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === String(id)) return i + 2;
  return 0;
}
function locked_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function tz_() { return 'Asia/Seoul'; }
/** 시트 시간대를 한국으로 맞추고, 새 시트에 딸려 온 빈 '시트1' 탭을 정리 */
function tidy_(ss) {
  if (ss.getSpreadsheetTimeZone && ss.getSpreadsheetTimeZone() !== 'Asia/Seoul') ss.setSpreadsheetTimeZone('Asia/Seoul');
  var blank = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}
/** 시트가 날짜·시간으로 바꿔 저장한 값을 화면용 글자로 되돌림 */
function norm_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (v.getFullYear() < 1901) return Utilities.formatDate(v, tz_(), 'HH:mm');
    var hm = Utilities.formatDate(v, tz_(), 'HH:mm');
    return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') + (hm !== '00:00' ? ' ' + hm : '');
  }
  return v === null || v === undefined ? '' : (typeof v === 'number' ? v : String(v));
}
/** = + - @ 로 시작하는 글은 수식으로 오해되지 않게 글자로 저장 */
function safe_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v === undefined || v === null ? '' : v;
}
function dow_(s) {
  var p = String(s).split('-');
  return DAYS.charAt(new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay());
}
function stamp_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
