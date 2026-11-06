// บัญชีรายรับรายจ่าย: สคริปต์รับข้อมูลจากแอปมาลงชีตนี้
// วางทั้งหมดนี้แทนโค้ดเดิมใน Apps Script แล้วกด "ทำให้ใช้งานได้" เป็นเว็บแอป

var SHEET = 'รายการ';
var DEL = '_ลบแล้ว';
var CFG = '_ตั้งค่า';
var HEAD = ['วันที่', 'ประเภท', 'หมวด', 'จำนวนเงิน', 'โน้ต', 'id', 'สร้างเมื่อ', 'แก้ล่าสุด', 'ที่มา'];

function doGet() {
  return out_({ ok: true, app: 'money-app' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = ss.getSpreadsheetTimeZone();
    var sh = sheet_(ss, SHEET, HEAD);
    var dl = sheet_(ss, DEL, ['id', 'ลบเมื่อ']);
    var cf = sheet_(ss, CFG, ['key', 'value']);

    // ของเดิมในชีต
    var map = {};
    if (sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, HEAD.length).getValues().forEach(function (r) {
        if (!r[5]) return;
        var d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]);
        map[r[5]] = {
          id: String(r[5]), date: d, t: r[1] === 'รายรับ' ? 'in' : 'out', cat: String(r[2]),
          amt: Number(r[3]), note: String(r[4] || ''), ts: Number(r[6]) || 0, u: Number(r[7]) || 0, src: r[8] === 'Claude' ? 'claude' : ''
        };
      });
    }
    var deleted = {};
    if (dl.getLastRow() > 1) {
      dl.getRange(2, 1, dl.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0]) deleted[r[0]] = 1; });
    }

    // รายการที่ลบจากแอป
    var newDel = [];
    (req.deleted || []).forEach(function (d) {
      if (d && d.id && !deleted[d.id]) { deleted[d.id] = 1; newDel.push([d.id, new Date(d.at || Date.now())]); }
    });
    if (newDel.length) dl.getRange(dl.getLastRow() + 1, 1, newDel.length, 2).setValues(newDel);
    Object.keys(deleted).forEach(function (id) { delete map[id]; });

    // รายการจากแอป เอาอันที่แก้ล่าสุด
    (req.items || []).forEach(function (x) {
      if (!x || !x.id || deleted[x.id] || !(x.amt > 0)) return;
      var old = map[x.id];
      if (!old || (x.u || 0) > (old.u || 0)) {
        map[x.id] = { id: x.id, date: x.date, t: x.t === 'in' ? 'in' : 'out', cat: x.cat, amt: x.amt, note: x.note || '', ts: x.ts || 0, u: x.u || 0, src: x.src || (old && old.src) || '' };
      }
    });

    // เขียนชีตใหม่ เรียงวันล่าสุดขึ้นก่อน
    var list = Object.keys(map).map(function (k) { return map[k]; });
    list.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts; });
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, HEAD.length).clearContent().setFontColor(null);
    if (list.length) {
      var rows = list.map(function (x) {
        return [x.date, x.t === 'in' ? 'รายรับ' : 'รายจ่าย', x.cat, x.amt, x.note, x.id, x.ts, x.u, x.src === 'claude' ? 'Claude' : ''];
      });
      sh.getRange(2, 1, rows.length, HEAD.length).setValues(rows);
      sh.getRange(2, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
      sh.getRange(2, 4, rows.length, 1).setNumberFormat('#,##0.00');
      sh.getRange(2, 2, rows.length, 1).setFontColors(rows.map(function (r) { return [r[1] === 'รายรับ' ? '#1d7f4e' : '#c0392b']; }));
    }

    // หมวดที่ตั้งเอง
    var cfgv = {};
    if (cf.getLastRow() > 1) cf.getRange(2, 1, cf.getLastRow() - 1, 2).getValues().forEach(function (r) { cfgv[r[0]] = r[1]; });
    var custom = cfgv.custom ? JSON.parse(cfgv.custom) : { out: [], in: [] };
    var customU = Number(cfgv.customU) || 0;
    if ((req.customU || 0) > customU && req.custom) {
      custom = req.custom; customU = req.customU;
      cf.getRange(2, 1, 2, 2).setValues([['custom', JSON.stringify(custom)], ['customU', String(customU)]]);
    }

    return out_({ ok: true, items: list, deleted: Object.keys(deleted), custom: custom, customU: customU });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet_(ss, name, head) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (name.charAt(0) === '_') sh.hideSheet();
    if (name === SHEET) { sh.hideColumns(6, 3); sh.setColumnWidth(5, 220); }
    var first = ss.getSheets()[0];
    if (name === SHEET && first.getName() !== SHEET && first.getLastRow() === 0) ss.deleteSheet(first);
  }
  return sh;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
