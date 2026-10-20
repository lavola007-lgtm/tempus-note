// Fake SpreadsheetApp that coerces values the way Google Sheets does on entry
(function (g) {
  function coerce(v) {
    if (typeof v !== 'string') return v;
    if (v.charAt(0) === "'") return v.slice(1);
    var m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(v))) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    if ((m = /^(\d{4})-(\d{2})$/.exec(v))) return new Date(+m[1], +m[2] - 1, 1);
    if ((m = /^(\d{1,2}):(\d{2})$/.exec(v))) return new Date(1899, 11, 30, +m[1], +m[2]);
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^[=+\-@]/.test(v)) throw new Error('formula parse error: ' + v);
    return v;
  }
  function disp(v) { return v instanceof Date ? 'D' : String(v); }
  function Sheet(name) { this.name = name; this.data = []; }
  Sheet.prototype.getLastRow = function () { var n = this.data.length; while (n && this.data[n - 1].every(function (x) { return x === '' || x == null; })) n--; return n; };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    var sh = this; if (typeof r === 'string') { return { setValue: function () { return this; }, setFontWeight: function () { return this; }, setDataValidation: function () { return this; }, setBackground: function () { return this; }, setFormula: function () { return this; } }; }
    nr = nr || 1; nc = nc || 1;
    var rg = {
      getValues: function () { var o = []; for (var i = 0; i < nr; i++) { var row = []; for (var j = 0; j < nc; j++) { var v = (sh.data[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; },
      getDisplayValues: function () { return rg.getValues().map(function (rw) { return rw.map(function (v) { return v instanceof Date ? '?' : String(v); }); }); },
      getValue: function () { return rg.getValues()[0][0]; },
      setValues: function (vals) { for (var i = 0; i < nr; i++) { sh.data[r - 1 + i] = sh.data[r - 1 + i] || []; for (var j = 0; j < nc; j++) sh.data[r - 1 + i][c - 1 + j] = coerce(vals[i][j]); } return rg; },
      clearContent: function () { for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) if (sh.data[r - 1 + i]) sh.data[r - 1 + i][c - 1 + j] = ''; return rg; },
      setFontWeight: function () { return rg; }, setBackground: function () { return rg; }, setDataValidation: function () { return rg; }, setValue: function () { return rg; }, setFormula: function () { return rg; }
    };
    return rg;
  };
  Sheet.prototype.appendRow = function (row) { var n = this.getLastRow(); this.data[n] = row.map(coerce); };
  Sheet.prototype.deleteRow = function (r) { this.data.splice(r - 1, 1); };
  Sheet.prototype.setFrozenRows = function () {}; Sheet.prototype.clear = function () { this.data = []; };
  var sheets = {};
  var SS = { getSheetByName: function (n) { return sheets[n] || null; }, insertSheet: function (n) { return (sheets[n] = new Sheet(n)); },
    getSheets: function () { return Object.keys(sheets).map(function (k) { return sheets[k]; }); }, getUrl: function () { return 'https://docs.google.com/spreadsheets/d/MOCK'; },
    getSpreadsheetTimeZone: function () { return 'Asia/Seoul'; }, setSpreadsheetTimeZone: function () {},
    deleteSheet: function (sh) { delete sheets[sh.name]; } };
  g.__sheets = sheets;
  g.SpreadsheetApp = { getActive: function () { return SS; }, newDataValidation: function () { return { requireValueInRange: function () { return { build: function () { return {}; } }; } }; } };
  g.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  g.Session = { getScriptTimeZone: function () { return 'Asia/Seoul'; } };
  g.Utilities = { getUuid: function () { return Math.random().toString(16).slice(2) + 'abcdef'; },
    formatDate: function (d, tz, f) { var p = function (n) { return String(n).padStart(2, '0'); };
      return f.replace('yyyy', d.getFullYear()).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate())).replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes())); } };
  g.HtmlService = {};
})(typeof window !== "undefined" ? window : globalThis);
