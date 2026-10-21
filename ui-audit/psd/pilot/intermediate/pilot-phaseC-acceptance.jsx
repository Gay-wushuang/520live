#target photoshop
/*
 * PSD Pilot v2.1 — Phase C Photoshop 实测验收（Final Evidence Gate）
 *
 * 相对 v2 的改动（对应工单三个证据缺口）：
 *  1. 删除硬编码的 "SO-FULL-RES PASS"。改为对四个季节 Smart Object 逐个执行
 *     “编辑内容”（placedLayerEditContents），打开其内嵌源，实测像素尺寸
 *     （期望 1672x941 @72ppi，即原始积分卡 PNG 规格），并采样内嵌源像素。
 *  2. 在临时副本中把 “Card image / Spring / Smart Object” 的内容替换为
 *     测试标记图（1672x941@72ppi 品红/黑/绿），导出替换前、替换后的整页合成图，
 *     供 verify-pixel-diff-v21.mjs 做逐像素核验（春季卡区域必须变化，
 *     其余区域必须零差异）。
 *  3. 另存临时 PSD → 关闭 → 重新打开：再次实测四季内嵌源与全部 47 个图层的
 *     名称/类型/可见性，确认替换持久化且其余卡图、图层结构未受非预期影响。
 *  4. 之后才做“文字/形状可编辑”验证（独立阶段，避免把文字重排的抗锯齿差异
 *     混入替换证据），并再次保存/重开确认文字修改持久化。
 *  5. 任何断言失败、脚本异常、缺少预期证据，都会写入 acceptance-result.json
 *     并以 "PSD_PILOT_V21:FAIL" 作为脚本返回值；COM 调用程序
 *     run-phaseC-acceptance.ps1 会据此以非零退出码失败。
 *
 * 只读取临时副本；所有写入都在工作目录内，绝不覆盖交付 PSD。
 *
 * 路径来源（由 COM 调用程序设置的环境变量，缺省值仅用于单独运行本脚本）：
 *   PSD_PILOT_WORKDIR   验收工作目录
 *   PSD_PILOT_WORK_PSD  交付 PSD 的临时副本（本脚本打开的就是它）
 *   PSD_PILOT_MARKER    春季卡替换用测试标记图
 */
app.displayDialogs = DialogModes.NO;

// ============================ 0) 路径 / 日志 ============================
var HERE = File($.fileName).parent;
var WORK = $.getenv('PSD_PILOT_WORKDIR') || (HERE.fsName + '/acceptance-v21');
var WORK_PSD = $.getenv('PSD_PILOT_WORK_PSD') || (HERE.parent.fsName + '/CardWheel-Editable-v2.psd');
var MARKER = $.getenv('PSD_PILOT_MARKER') || (HERE.fsName + '/card-spring-marker.png');

var workFolder = new Folder(WORK);
if (!workFolder.exists) workFolder.create();

var LOG_FILE = new File(WORK + '/acceptance.log');
LOG_FILE.encoding = 'UTF-8';
LOG_FILE.open('w');
LOG_FILE.writeln('PSD Pilot v2.1 acceptance — ' + new Date().toString());
LOG_FILE.writeln('photoshop   = ' + app.name + ' ' + app.version);
LOG_FILE.writeln('workdir     = ' + WORK);
LOG_FILE.writeln('work psd    = ' + WORK_PSD);
LOG_FILE.writeln('marker      = ' + MARKER);
LOG_FILE.writeln('----');
LOG_FILE.close();

function log(m) {
  LOG_FILE.encoding = 'UTF-8';
  LOG_FILE.open('a');
  LOG_FILE.writeln(String(m));
  LOG_FILE.close();
}

// ============================ 1) 断言框架 ============================
var checks = [];
function expect(label, cond, detail) {
  var ok = !!cond;
  var d = (detail === undefined || detail === null) ? '' : String(detail);
  checks.push({ label: label, ok: ok, detail: d });
  log((ok ? 'PASS ' : 'FAIL ') + label + (d ? ' :: ' + d : ''));
  return ok;
}

// 必须出现的检查项；缺任何一项（例如脚本中途异常）都视为“缺少预期证据”。
var REQUIRED = [
  'PS-OPEN', 'PS-VERSION', 'SOURCE-IS-TEMP-COPY', 'STRUCTURE-COUNTS', 'SNAPSHOT-BASELINE',
  'SO-DIM:Spring', 'SO-DIM:Summer', 'SO-DIM:Autumn', 'SO-DIM:Winter',
  'SO-DISPLAY-SIZE', 'SO-SAMPLES-BASELINE',
  'OPEN-EXPORT',
  'SMART-OBJECT-FOUND', 'SMART-OBJECT-REPLACE',
  'SPRING-SO-KIND-AFTER-REPLACE', 'SPRING-SO-BOUNDS-UNCHANGED',
  'SPRING-SO-DIM-AFTER-REPLACE', 'SPRING-SO-COLOR-AFTER-REPLACE', 'SPRING-SO-MARKER-PATTERN',
  'REPLACE-NO-STRUCTURE-CHANGE', 'POST-REPLACE-EXPORT',
  'SAVE', 'REOPEN',
  'STRUCTURE-AFTER-REOPEN', 'STRUCTURE-SNAPSHOT-STABLE', 'TEXT-COUNT-AFTER-REOPEN',
  'SPRING-SO-PERSIST-DIM', 'SPRING-SO-PERSIST-COLOR', 'OTHER-SO-CONTENT-STABLE',
  'COMPOSITE-EXPORT',
  'TITLE-LAYER-FOUND', 'TITLE-EDIT-VISIBLE',
  'BUTTON-LABEL-FOUND', 'BUTTON-EDIT-VISIBLE',
  'SHAPE-LAYER-FOUND', 'SHAPE-EDIT', 'SHAPE-FILL-VISIBLE', 'SHAPE-EDIT-NO-STRUCTURE-CHANGE',
  'EDIT-EXPORT',
  'EDIT-SAVE', 'EDIT-REOPEN',
  'TEXT-PERSIST-AFTER-REOPEN', 'STRUCTURE-AFTER-EDIT-REOPEN', 'SPRING-SO-STILL-MARKER',
  'EDIT-REOPEN-EXPORT'
];

// ============================ 2) 工具函数 ============================
function allLayers(set, fn) {
  for (var i = 0; i < set.length; i++) {
    var l = set[i];
    fn(l);
    if (l.typename === 'LayerSet') allLayers(l.layers, fn);
  }
}

function findLayer(set, pred) {
  var found = null;
  function rec(s) {
    for (var i = 0; i < s.length; i++) {
      var l = s[i];
      if (l.typename === 'LayerSet') rec(l.layers);
      else if (!found && pred(l)) found = l;
    }
  }
  rec(set);
  return found;
}

function kindName(l) {
  if (l.typename === 'LayerSet') return 'GROUP';
  if (l.kind === LayerKind.TEXT) return 'TEXT';
  if (l.kind === LayerKind.SMARTOBJECT) return 'SMARTOBJECT';
  if (l.kind === LayerKind.SOLIDFILL) return 'SOLIDFILL';
  if (l.kind === LayerKind.GRADIENTFILL) return 'GRADIENTFILL';
  return 'KIND_' + l.kind;
}

function snapshot(set) {
  var out = [];
  allLayers(set, function (l) {
    out.push(l.name + '|' + kindName(l) + '|' + (l.visible ? 'visible' : 'hidden'));
  });
  return out;
}

function listTexts(set) {
  var out = [];
  allLayers(set, function (l) { if (l.typename !== 'LayerSet' && l.kind === LayerKind.TEXT) out.push(l.name); });
  return out;
}

function boundsOf(l) {
  var b = l.bounds;
  return [Math.round(b[0].value), Math.round(b[1].value), Math.round(b[2].value), Math.round(b[3].value)];
}

function sameList(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isWhiteColor(tc) {
  try { return tc.rgb.red > 245 && tc.rgb.green > 245 && tc.rgb.blue > 245; } catch (e) { return false; }
}

function isMagenta(rgb) { return rgb[0] >= 240 && rgb[1] <= 15 && rgb[2] >= 240; }
function isNearBlack(rgb) { return rgb[0] <= 15 && rgb[1] <= 15 && rgb[2] <= 15; }
function isNearGreen(rgb) { return rgb[1] >= 240 && rgb[0] <= 15 && rgb[2] <= 15; }
function sameRgb(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
function rgbStr(a) { return a[0] + ',' + a[1] + ',' + a[2]; }

// 打开 Smart Object 的内嵌源，实测像素尺寸/分辨率并采样；关闭内嵌文档后回到宿主文档。
function measureSmartObject(hostDoc, hostName, layer) {
  hostDoc.activeLayer = layer;
  var desc = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
  desc.putReference(charIDToTypeID('null'), ref);
  executeAction(stringIDToTypeID('placedLayerEditContents'), desc, DialogModes.NO);

  var soDoc = app.activeDocument;
  var res = {
    docName: soDoc.name,
    width: soDoc.width.value,
    height: soDoc.height.value,
    resolution: parseFloat(String(soDoc.resolution)),
    samples: []
  };
  var pts = [
    [Math.floor(res.width / 2), Math.floor(res.height / 2)],
    [Math.floor(res.width / 10), Math.floor(res.height / 10)],
    [Math.floor(res.width * 9 / 10), Math.floor(res.height * 9 / 10)]
  ];
  for (var i = 0; i < pts.length; i++) {
    var cs = soDoc.colorSamplers.add([new UnitValue(pts[i][0], 'px'), new UnitValue(pts[i][1], 'px')]);
    var c = cs.color.rgb;
    res.samples.push({ x: pts[i][0], y: pts[i][1], rgb: [Math.round(c.red), Math.round(c.green), Math.round(c.blue)] });
  }
  soDoc.colorSamplers.removeAll();
  soDoc.close(SaveOptions.DONOTSAVECHANGES);

  res.activeAfterClose = app.activeDocument.name;
  res.backToHost = (res.activeAfterClose === hostName);
  if (!res.backToHost) { try { app.activeDocument = hostDoc; } catch (e) { } }
  return res;
}

// 修改 shape 层纯色填充（Photoshop 25.11 下唯一实测生效的调用形式）
function setSolidFillColor(layer, r, g, b) {
  app.activeDocument.activeLayer = layer;
  var desc = new ActionDescriptor();
  var d2 = new ActionDescriptor(), d3 = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putEnumerated(stringIDToTypeID('contentLayer'), stringIDToTypeID('ordinal'), stringIDToTypeID('targetEnum'));
  desc.putReference(stringIDToTypeID('null'), ref);
  d3.putDouble(stringIDToTypeID('red'), r);
  d3.putDouble(stringIDToTypeID('grain'), g);
  d3.putDouble(stringIDToTypeID('blue'), b);
  d2.putObject(stringIDToTypeID('color'), stringIDToTypeID('RGBColor'), d3);
  desc.putObject(stringIDToTypeID('to'), stringIDToTypeID('solidColorLayer'), d2);
  executeAction(stringIDToTypeID('set'), desc, DialogModes.NO);
}

function sampleComposite(x, y) {
  var d = app.activeDocument;
  d.colorSamplers.removeAll();
  var cs = d.colorSamplers.add([new UnitValue(x, 'px'), new UnitValue(y, 'px')]);
  var c = cs.color.rgb;
  var out = [Math.round(c.red), Math.round(c.green), Math.round(c.blue)];
  d.colorSamplers.removeAll();
  return out;
}
function isNearGreenComposite(rgb) { return rgb[1] > 150 && rgb[0] < 110 && rgb[2] < 170 && (rgb[1] - rgb[0]) > 70; }

function exportPng(doc, p) {
  try { app.refresh(); } catch (e) { }
  var f = new File(p);
  doc.saveAs(f, new PNGSaveOptions(), true, Extension.LOWERCASE);
  return f.exists ? f.length : -1;
}

function savePsd(doc, p) {
  var f = new File(p);
  var po = new PhotoshopSaveOptions();
  po.layers = true;
  po.embedColorProfile = true;
  doc.saveAs(f, po, true, Extension.LOWERCASE);
  return f.exists ? f.length : -1;
}

// ============================ 3) JSON 序列化（ExtendScript 无内置 JSON） ============================
function jsonEsc(s) {
  s = String(s);
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    var code = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === '\\') out += '\\\\';
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c === '\t') out += '\\t';
    else if (code < 32) out += '\\u' + ('0000' + code.toString(16)).slice(-4);
    else out += c;
  }
  return out;
}
function toJson(v) {
  if (v === null || v === undefined) return 'null';
  var t = typeof v;
  if (t === 'number') return isFinite(v) ? String(v) : 'null';
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'string') return '"' + jsonEsc(v) + '"';
  if (v instanceof Array) {
    var parts = [];
    for (var i = 0; i < v.length; i++) parts.push(toJson(v[i]));
    return '[' + parts.join(',') + ']';
  }
  var keys = [];
  for (var k in v) if (v.hasOwnProperty(k)) keys.push(k);
  var kv = [];
  for (var j = 0; j < keys.length; j++) kv.push('"' + jsonEsc(keys[j]) + '":' + toJson(v[keys[j]]));
  return '{' + kv.join(',') + '}';
}

// ============================ 4) 验收主体 ============================
var SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
var EXPECT_W = 1672, EXPECT_H = 941;   // 四季积分卡原始 PNG 像素尺寸
var DISPLAY = 104;                     // 非破坏性缩放后的显示边长

var NEW_TITLE = String.fromCharCode(0x79ef, 0x5206, 0x5361, 0x8f6c, 0x76d8) + 'V2'; // 积分卡转盘V2
var NEW_BTN = String.fromCharCode(0x6d4b, 0x8bd5, 0x6309, 0x94ae);                 // 测试按钮

var result = {
  script: 'pilot-phaseC-acceptance.jsx',
  version: '2.1',
  result: 'FAIL',
  photoshop: { name: app.name, version: app.version },
  paths: { workdir: WORK, workPsd: WORK_PSD, marker: MARKER },
  document: null,
  counts: null,
  structure: { baseline: [], afterReplace: [], afterReopen: [], afterEdit: [], afterEditReopen: [] },
  smartObjects: {},
  texts: {},
  editBoxes: {},
  exports: {},
  notes: [],
  required: REQUIRED,
  missing: [],
  failures: []
};

var doc = null;
var hostName = '';
var baselineSnapshot = null;
var soBaseline = {};

function seasonLayer(set, season) {
  return findLayer(set, function (l) {
    return l.kind === LayerKind.SMARTOBJECT && String(l.name).indexOf('Card image / ' + season + ' /') === 0;
  });
}

function openDoc(p) {
  var f = new File(p);
  app.open(f);
  return app.activeDocument;
}

try {
  // ============ Phase A：打开临时副本 + 基线（含四季内嵌源实测） ============
  doc = openDoc(WORK_PSD);
  hostName = doc.name;
  var docFullPath = doc.fullName.fsName;
  expect('PS-OPEN', doc.width.value === 1440 && doc.height.value === 900,
    doc.width.value + 'x' + doc.height.value + ' name=' + hostName);
  expect('PS-VERSION', String(app.version).length > 0, app.name + ' ' + app.version);
  expect('SOURCE-IS-TEMP-COPY', docFullPath === new File(WORK_PSD).fsName, 'doc=' + docFullPath);
  result.document = { name: hostName, width: doc.width.value, height: doc.height.value, fullName: docFullPath };

  var textNames = [], soNames = [], shapeCount = 0, total = 0;
  allLayers(doc.layers, function (l) {
    total++;
    if (l.typename === 'LayerSet') return;
    if (l.kind === LayerKind.TEXT) textNames.push(l.name);
    if (l.kind === LayerKind.SMARTOBJECT) soNames.push(l.name);
    if (l.kind === LayerKind.SOLIDFILL || l.kind === LayerKind.GRADIENTFILL) shapeCount++;
  });
  result.counts = { text: textNames.length, smartObject: soNames.length, shape: shapeCount, total: total };
  expect('STRUCTURE-COUNTS', textNames.length === 14 && soNames.length === 4 && shapeCount >= 20 && total === 47,
    'text=' + textNames.length + ' so=' + soNames.length + ' shapes=' + shapeCount + ' total=' + total);

  baselineSnapshot = snapshot(doc.layers);
  result.structure.baseline = baselineSnapshot;
  expect('SNAPSHOT-BASELINE', baselineSnapshot.length === 47, 'layers=' + baselineSnapshot.length);

  // 四季 Smart Object 内嵌源实测（替代 v2 的硬编码 SO-FULL-RES）
  var displayOk = true, displayDetail = [], samplesOk = true, samplesDetail = [];
  for (var si = 0; si < SEASONS.length; si++) {
    var season = SEASONS[si];
    var layer = seasonLayer(doc.layers, season);
    if (!layer) {
      expect('SO-DIM:' + season, false, 'layer not found');
      samplesOk = false;
      samplesDetail.push(season + '=missing');
      continue;
    }
    var b = boundsOf(layer);
    var m = measureSmartObject(doc, hostName, layer);
    soBaseline[season] = { name: layer.name, bounds: b, content: m };
    result.smartObjects[season] = { name: layer.name, displayBounds: b, baseline: m };

    expect('SO-DIM:' + season, Math.round(m.width) === EXPECT_W && Math.round(m.height) === EXPECT_H,
      Math.round(m.width) + 'x' + Math.round(m.height) + ' @' + m.resolution + 'ppi doc=' + m.docName);
    if (!m.backToHost) { samplesOk = false; samplesDetail.push(season + '=not-back-to-host'); }

    var w = b[2] - b[0], h = b[3] - b[1];
    if (Math.abs(w - DISPLAY) > 1.5 || Math.abs(h - DISPLAY) > 1.5) displayOk = false;
    displayDetail.push(season + '=' + w + 'x' + h);
    if (!m.samples || m.samples.length !== 3) samplesOk = false;
    samplesDetail.push(season + '=' + rgbStr(m.samples[0].rgb) + '/' + rgbStr(m.samples[1].rgb) + '/' + rgbStr(m.samples[2].rgb));
  }
  expect('SO-DISPLAY-SIZE', displayOk, displayDetail.join(' '));
  expect('SO-SAMPLES-BASELINE', samplesOk, samplesDetail.join(' '));

  result.exports.open = WORK + '/v21-01-open.png';
  var openLen = exportPng(doc, result.exports.open);
  expect('OPEN-EXPORT', openLen > 100000, result.exports.open + ' bytes=' + openLen);

  // ============ Phase B：替换春季卡图（Smart Object 内容替换） ============
  var soSpring = seasonLayer(doc.layers, 'Spring');
  expect('SMART-OBJECT-FOUND', !!soSpring, soSpring ? soSpring.name : 'null');
  var springBefore = soSpring ? boundsOf(soSpring) : null;
  var markerFile = new File(MARKER);
  var replaceErr = '';
  if (soSpring) {
    doc.activeLayer = soSpring;
    var dRep = new ActionDescriptor();
    dRep.putPath(charIDToTypeID('null'), markerFile);
    try { executeAction(stringIDToTypeID('placedLayerReplaceContents'), dRep, DialogModes.NO); }
    catch (eRep) { replaceErr = String(eRep); }
  }
  expect('SMART-OBJECT-REPLACE', !!soSpring && replaceErr === '' && markerFile.exists,
    replaceErr || ('marker=' + MARKER + ' exists=' + markerFile.exists));

  var soSpring2 = seasonLayer(doc.layers, 'Spring');
  expect('SPRING-SO-KIND-AFTER-REPLACE',
    !!soSpring2 && soSpring2.kind === LayerKind.SMARTOBJECT && String(soSpring2.name).indexOf('Spring') >= 0,
    soSpring2 ? soSpring2.name + ' kind=' + kindName(soSpring2) : 'null');

  var springAfter = soSpring2 ? boundsOf(soSpring2) : null;
  expect('SPRING-SO-BOUNDS-UNCHANGED',
    !!springBefore && !!springAfter && sameList(springBefore, springAfter),
    'before=' + (springBefore ? springBefore.join(',') : 'null') + ' after=' + (springAfter ? springAfter.join(',') : 'null'));

  if (soSpring2) {
    var springAfterMeasure = measureSmartObject(doc, hostName, soSpring2);
    result.smartObjects.Spring.afterReplace = springAfterMeasure;
    result.smartObjects.Spring.afterReplaceBounds = springAfter;
    expect('SPRING-SO-DIM-AFTER-REPLACE',
      Math.round(springAfterMeasure.width) === EXPECT_W && Math.round(springAfterMeasure.height) === EXPECT_H,
      Math.round(springAfterMeasure.width) + 'x' + Math.round(springAfterMeasure.height) + ' @' + springAfterMeasure.resolution + 'ppi doc=' + springAfterMeasure.docName);

    var centerAfter = springAfterMeasure.samples[0].rgb;
    var centerBefore = soBaseline.Spring.content.samples[0].rgb;
    expect('SPRING-SO-COLOR-AFTER-REPLACE', isMagenta(centerAfter) && !sameRgb(centerAfter, centerBefore),
      'center ' + rgbStr(centerBefore) + ' -> ' + rgbStr(centerAfter));
    expect('SPRING-SO-MARKER-PATTERN',
      isNearBlack(springAfterMeasure.samples[1].rgb) && isNearGreen(springAfterMeasure.samples[2].rgb),
      'topLeft=' + rgbStr(springAfterMeasure.samples[1].rgb) + ' bottomRight=' + rgbStr(springAfterMeasure.samples[2].rgb));
  } else {
    expect('SPRING-SO-DIM-AFTER-REPLACE', false, 'spring smart object missing');
    expect('SPRING-SO-COLOR-AFTER-REPLACE', false, 'spring smart object missing');
    expect('SPRING-SO-MARKER-PATTERN', false, 'spring smart object missing');
  }

  var afterReplaceSnapshot = snapshot(doc.layers);
  result.structure.afterReplace = afterReplaceSnapshot;
  expect('REPLACE-NO-STRUCTURE-CHANGE', sameList(afterReplaceSnapshot, baselineSnapshot),
    'baseline=' + baselineSnapshot.length + ' now=' + afterReplaceSnapshot.length);

  // ============ Phase C：保存 → 关闭 → 重开（替换持久性） ============
  // 注意导出顺序：Photoshop 在“另存 PSD”时会对嵌入的 Smart Object 内容做一次性归一化
  // （v2.1 实测：本标记图绿色块 R 通道 0→1，共 399 像素；保存后渲染稳定）。
  // 因此“替换后”合成图在保存之后导出，代表真正写入磁盘的状态，重开比对才有意义。
  var acceptPsdPath = WORK + '/CardWheel-v2.1-accepted.psd';
  var acceptLen = savePsd(doc, acceptPsdPath);
  result.exports.acceptedPsd = acceptPsdPath;
  expect('SAVE', acceptLen > 1000000, acceptPsdPath + ' bytes=' + acceptLen);

  result.exports.postReplace = WORK + '/v21-02-post-replace.png';
  var postLen = exportPng(doc, result.exports.postReplace);
  expect('POST-REPLACE-EXPORT', postLen > 100000, result.exports.postReplace + ' bytes=' + postLen);

  doc.close(SaveOptions.DONOTSAVECHANGES);

  doc = openDoc(acceptPsdPath);
  result.exports.reopenedPsd = doc.fullName.fsName;
  expect('REOPEN', doc.width.value === 1440 && doc.height.value === 900,
    doc.name + ' ' + doc.width.value + 'x' + doc.height.value);

  var soAfter = 0, shapesAfter = 0, totalAfter = 0;
  allLayers(doc.layers, function (l) {
    totalAfter++;
    if (l.typename !== 'LayerSet' && l.kind === LayerKind.SMARTOBJECT) soAfter++;
    if (l.typename !== 'LayerSet' && (l.kind === LayerKind.SOLIDFILL || l.kind === LayerKind.GRADIENTFILL)) shapesAfter++;
  });
  expect('STRUCTURE-AFTER-REOPEN', soAfter === 4 && shapesAfter >= 20 && totalAfter === 47,
    'so=' + soAfter + ' shapes=' + shapesAfter + ' total=' + totalAfter);

  var reopenSnapshot = snapshot(doc.layers);
  result.structure.afterReopen = reopenSnapshot;
  expect('STRUCTURE-SNAPSHOT-STABLE', sameList(reopenSnapshot, baselineSnapshot),
    'baseline=' + baselineSnapshot.length + ' reopened=' + reopenSnapshot.length);

  var textsAfter = listTexts(doc.layers);
  expect('TEXT-COUNT-AFTER-REOPEN', textsAfter.length === 14, 'text=' + textsAfter.length);

  var otherDetail = [], otherOk = true;
  for (var ri = 0; ri < SEASONS.length; ri++) {
    var rs = SEASONS[ri];
    if (!result.smartObjects[rs]) result.smartObjects[rs] = {};
    var rl = seasonLayer(doc.layers, rs);
    if (!rl) {
      result.smartObjects[rs].afterReopen = null;
      otherOk = false;
      otherDetail.push(rs + '=missing');
      if (rs === 'Spring') { expect('SPRING-SO-PERSIST-DIM', false, 'missing'); expect('SPRING-SO-PERSIST-COLOR', false, 'missing'); }
      continue;
    }
    var rm = measureSmartObject(doc, hostName, rl);
    result.smartObjects[rs].afterReopen = rm;
    result.smartObjects[rs].afterReopenBounds = boundsOf(rl);

    if (rs === 'Spring') {
      expect('SPRING-SO-PERSIST-DIM',
        Math.round(rm.width) === EXPECT_W && Math.round(rm.height) === EXPECT_H,
        Math.round(rm.width) + 'x' + Math.round(rm.height) + ' @' + rm.resolution + 'ppi doc=' + rm.docName);
      var pc = rm.samples[0].rgb;
      expect('SPRING-SO-PERSIST-COLOR', isMagenta(pc) && isNearBlack(rm.samples[1].rgb) && isNearGreen(rm.samples[2].rgb),
        'center=' + rgbStr(pc) + ' topLeft=' + rgbStr(rm.samples[1].rgb) + ' bottomRight=' + rgbStr(rm.samples[2].rgb));
    } else {
      var base = soBaseline[rs].content;
      var same = Math.round(rm.width) === Math.round(base.width) && Math.round(rm.height) === Math.round(base.height);
      for (var sIdx = 0; sIdx < base.samples.length; sIdx++) {
        if (!sameRgb(rm.samples[sIdx].rgb, base.samples[sIdx].rgb)) same = false;
      }
      if (!same) otherOk = false;
      otherDetail.push(rs + '=' + (same ? 'stable' : 'CHANGED') + ' ' + Math.round(rm.width) + 'x' + Math.round(rm.height) + ' c=' + rgbStr(rm.samples[0].rgb));
    }
  }
  expect('OTHER-SO-CONTENT-STABLE', otherOk, otherDetail.join(' | '));

  result.exports.reopened = WORK + '/v21-03-reopened.png';
  var reopenedLen = exportPng(doc, result.exports.reopened);
  expect('COMPOSITE-EXPORT', reopenedLen > 100000, result.exports.reopened + ' bytes=' + reopenedLen);

  // ============ Phase D：文字/形状可编辑（独立阶段，不影响替换证据） ============
  var title = findLayer(doc.layers, function (l) {
    return l.kind === LayerKind.TEXT && Math.round(l.textItem.size.value) === 48;
  });
  expect('TITLE-LAYER-FOUND', !!title, title ? title.name : 'null');
  if (title) {
    result.texts.title = { name: title.name, before: title.textItem.contents };
    doc.activeLayer = title;
    title.textItem.contents = NEW_TITLE;
    var tb = title.bounds;
    result.texts.title.after = title.textItem.contents;
    result.texts.title.bounds = boundsOf(title);
    result.editBoxes.title = boundsOf(title);
    expect('TITLE-EDIT-VISIBLE', tb[2].value > tb[0].value && tb[3].value > tb[1].value && title.textItem.contents === NEW_TITLE,
      'contents=' + title.textItem.contents + ' bounds=' + boundsOf(title).join(','));
  }

  var btn = findLayer(doc.layers, function (l) {
    return l.kind === LayerKind.TEXT && Math.round(l.textItem.size.value) === 18 && isWhiteColor(l.textItem.color);
  });
  expect('BUTTON-LABEL-FOUND', !!btn, btn ? btn.name : 'null');
  if (btn) {
    result.texts.buttonLabel = { name: btn.name, before: btn.textItem.contents };
    doc.activeLayer = btn;
    btn.textItem.contents = NEW_BTN;
    var bb = btn.bounds;
    result.texts.buttonLabel.after = btn.textItem.contents;
    result.texts.buttonLabel.bounds = boundsOf(btn);
    result.editBoxes.buttonLabel = boundsOf(btn);
    expect('BUTTON-EDIT-VISIBLE', bb[2].value > bb[0].value && btn.textItem.contents === NEW_BTN,
      'contents=' + btn.textItem.contents + ' bounds=' + boundsOf(btn).join(','));
  }

  var primaryShape = findLayer(doc.layers, function (l) {
    return String(l.name).indexOf('Primary button') === 0;
  });
  if (primaryShape) result.editBoxes.primaryShape = boundsOf(primaryShape);

  var shape = findLayer(doc.layers, function (l) {
    return l.kind === LayerKind.SOLIDFILL && String(l.name).indexOf('Secondary button') === 0;
  });
  expect('SHAPE-LAYER-FOUND', !!shape, shape ? shape.name : 'null');
  var shapeErr = '', fillPts = [];
  if (shape) {
    result.editBoxes.secondaryShape = boundsOf(shape);
    try {
      setSolidFillColor(shape, 12, 200, 120);
      fillPts = [sampleComposite(800, 762), sampleComposite(800, 802), sampleComposite(756, 783), sampleComposite(870, 783)];
    } catch (eShape) { shapeErr = String(eShape); }
  }
  expect('SHAPE-EDIT', !!shape && shapeErr === '', shapeErr);
  var allGreen = fillPts.length === 4;
  for (var k = 0; k < fillPts.length; k++) if (!isNearGreenComposite(fillPts[k])) allGreen = false;
  result.shapeFillSamples = fillPts;
  expect('SHAPE-FILL-VISIBLE', allGreen, fillPts.length ? fillPts.join(' ') : 'no sample');

  var afterEditSnapshot = snapshot(doc.layers);
  result.structure.afterEdit = afterEditSnapshot;
  expect('SHAPE-EDIT-NO-STRUCTURE-CHANGE', sameList(afterEditSnapshot, baselineSnapshot),
    'baseline=' + baselineSnapshot.length + ' now=' + afterEditSnapshot.length);

  result.exports.edited = WORK + '/v21-04-edited.png';
  var editedLen = exportPng(doc, result.exports.edited);
  expect('EDIT-EXPORT', editedLen > 100000, result.exports.edited + ' bytes=' + editedLen);

  // ============ Phase E：再次保存 → 重开（文字持久性） ============
  var editedPsdPath = WORK + '/CardWheel-v2.1-edited.psd';
  var editedPsdLen = savePsd(doc, editedPsdPath);
  result.exports.editedPsd = editedPsdPath;
  expect('EDIT-SAVE', editedPsdLen > 1000000, editedPsdPath + ' bytes=' + editedPsdLen);
  doc.close(SaveOptions.DONOTSAVECHANGES);

  doc = openDoc(editedPsdPath);
  expect('EDIT-REOPEN', doc.width.value === 1440 && doc.height.value === 900, doc.name);

  var title2 = findLayer(doc.layers, function (l) {
    return l.kind === LayerKind.TEXT && Math.round(l.textItem.size.value) === 48;
  });
  expect('TEXT-PERSIST-AFTER-REOPEN', !!title2 && title2.textItem.contents === NEW_TITLE,
    title2 ? 'contents=' + title2.textItem.contents : 'not found');

  var editReopenSnapshot = snapshot(doc.layers);
  result.structure.afterEditReopen = editReopenSnapshot;
  expect('STRUCTURE-AFTER-EDIT-REOPEN', sameList(editReopenSnapshot, baselineSnapshot),
    'baseline=' + baselineSnapshot.length + ' reopened=' + editReopenSnapshot.length);

  var springAfterEditReopen = seasonLayer(doc.layers, 'Spring');
  var springFinal = springAfterEditReopen ? measureSmartObject(doc, hostName, springAfterEditReopen) : null;
  result.smartObjects.Spring.afterEditReopen = springFinal;
  result.smartObjects.Spring.afterEditReopenBounds = springAfterEditReopen ? boundsOf(springAfterEditReopen) : null;
  expect('SPRING-SO-STILL-MARKER',
    !!springFinal && isMagenta(springFinal.samples[0].rgb) && isNearBlack(springFinal.samples[1].rgb) && isNearGreen(springFinal.samples[2].rgb),
    springFinal ? ('center=' + rgbStr(springFinal.samples[0].rgb) + ' ' + Math.round(springFinal.width) + 'x' + Math.round(springFinal.height) + ' @' + springFinal.resolution + 'ppi') : 'missing');

  result.exports.editedReopened = WORK + '/v21-05-edited-reopened.png';
  var editedReopenLen = exportPng(doc, result.exports.editedReopened);
  expect('EDIT-REOPEN-EXPORT', editedReopenLen > 100000, result.exports.editedReopened + ' bytes=' + editedReopenLen);

  doc.close(SaveOptions.DONOTSAVECHANGES);
  doc = null;
} catch (e) {
  result.notes.push('MAIN-EXCEPTION: ' + String(e) + ' @line ' + e.line);
  log('ERROR: ' + e + ' line=' + e.line);
  expect('SCRIPT-EXCEPTION', false, String(e) + ' @line ' + e.line);
} finally {
  try { if (doc && app.documents.length > 0 && app.activeDocument === doc) doc.close(SaveOptions.DONOTSAVECHANGES); } catch (eClose) { log('cleanup close failed: ' + eClose); }
}

// ============================ 5) 收尾：统计缺失证据 + 写 JSON ============================
function finalize() {
  var failed = [];
  var ran = {};
  for (var i = 0; i < checks.length; i++) {
    ran[checks[i].label] = true;
    if (!checks[i].ok) failed.push(checks[i].label + ' :: ' + checks[i].detail);
  }
  var missing = [];
  for (var j = 0; j < REQUIRED.length; j++) if (!ran[REQUIRED[j]]) missing.push(REQUIRED[j]);

  result.checks = checks;
  result.failures = failed;
  result.missing = missing;
  result.result = (failed.length === 0 && missing.length === 0) ? 'PASS' : 'FAIL';

  log('----');
  log('=== SUMMARY: ' + (checks.length - failed.length) + '/' + checks.length + ' checks passed, failures=' + failed.length + ', missingRequired=' + missing.length);
  for (var fi = 0; fi < failed.length; fi++) log('  FAILED: ' + failed[fi]);
  for (var mi = 0; mi < missing.length; mi++) log('  MISSING: ' + missing[mi]);
  log('=== RESULT: ' + result.result);

  var rf = new File(WORK + '/acceptance-result.json');
  rf.encoding = 'UTF-8';
  rf.open('w');
  rf.write(toJson(result));
  rf.close();

  return 'PSD_PILOT_V21:' + result.result;
}

var status = 'PSD_PILOT_V21:FAIL';
try {
  status = finalize();
} catch (eFinal) {
  log('FINALIZE-ERROR: ' + eFinal);
}
status;
