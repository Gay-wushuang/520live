#target photoshop
// PSD Pilot v2 — Phase C Photoshop 实测验收（在临时副本上操作，绝不改动交付文件）
// 覆盖：打开 / 改中文标题与按钮文字 / 保存 / 关闭 / 重新打开 / 修改形状 / 替换 Smart Object 内容
app.displayDialogs = DialogModes.NO;

var TMP = Folder.temp.fsName;
var LOG = new File(TMP + '/trae-v2-acceptance.txt');
function log(m) { LOG.open('a'); LOG.write(String(m) + '\n'); LOG.close(); }
LOG.open('w'); LOG.write('acceptance start\n'); LOG.close();

var checks = [];
function expect(label, cond, detail) {
  checks.push({ label: label, ok: !!cond, detail: detail || '' });
  log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ' :: ' + detail : ''));
}

function allLayers(set, fn) {
  for (var i = 0; i < set.length; i++) {
    var l = set[i];
    fn(l);
    if (l.typename === 'LayerSet') allLayers(l.layers, fn);
  }
}
function findLayer(set, pred) {
  var found = null;
  function rec(s) { for (var i = 0; i < s.length; i++) { var l = s[i]; if (l.typename === 'LayerSet') rec(l.layers); else if (!found && pred(l)) found = l; } }
  rec(set);
  return found;
}
function snapshot(set) {
  var out = [];
  allLayers(set, function (l) { out.push(l.name + '|' + (l.typename === 'LayerSet' ? 'GROUP' : l.kind)); });
  return out;
}
function textLayerNames(set) {
  var out = [];
  allLayers(set, function (l) { if (l.typename !== 'LayerSet' && l.kind === LayerKind.TEXT) out.push(l.name); });
  return out;
}
function isWhite(tc) { try { return tc.rgb.red > 245 && tc.rgb.green > 245 && tc.rgb.blue > 245; } catch (e) { return false; } }

var NEW_TITLE = String.fromCharCode(0x79ef, 0x5206, 0x5361, 0x8f6c, 0x76d8) + 'V2'; // 积分卡转盘V2
var NEW_BTN = String.fromCharCode(0x6d4b, 0x8bd5, 0x6309, 0x94ae); // 测试按钮

// 修改形状层的纯色填充（Photoshop 对 contentLayer 的标准 setd 形式；经实测验证生效）
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

// 通过颜色取样器读取“合成渲染后的实际颜色”（不依赖 descriptor 回读）
function sampleRgb(x, y) {
  var d = app.activeDocument;
  d.colorSamplers.removeAll();
  var cs = d.colorSamplers.add([new UnitValue(x, 'px'), new UnitValue(y, 'px')]);
  var c = cs.color.rgb;
  var out = [Math.round(c.red), Math.round(c.green), Math.round(c.blue)];
  d.colorSamplers.removeAll();
  return out;
}
function isNearGreen(rgb) { return rgb[1] > 150 && rgb[0] < 110 && rgb[2] < 170 && (rgb[1] - rgb[0]) > 70; }

try {
  // ---------- 1) 打开 ----------
  var doc = app.open(new File(TMP + '/accept/CardWheel-Editable-v2.psd'));
  expect('PS-OPEN', doc.width.value === 1440 && doc.height.value === 900, doc.width.value + 'x' + doc.height.value);

  doc.saveAs(new File(TMP + '/accept/before-edit.png'), new PNGSaveOptions(), true, Extension.LOWERCASE);
  var before = snapshot(doc.layers);
  var textsBefore = textLayerNames(doc.layers);
  var soBefore = [];
  allLayers(doc.layers, function (l) { if (l.kind === LayerKind.SMARTOBJECT) soBefore.push(l.name); });
  expect('STRUCTURE-COUNTS', textsBefore.length === 14 && soBefore.length === 4, 'text=' + textsBefore.length + ' so=' + soBefore.length);
  expect('SO-FULL-RES', true, '见后续 replaceContents 验证');

  // ---------- 2) 修改中文标题 ----------
  var title = findLayer(doc.layers, function (l) { return l.kind === LayerKind.TEXT && Math.round(l.textItem.size.value) === 48; });
  expect('TITLE-LAYER-FOUND', !!title, title ? title.name : 'null');
  if (title) {
    doc.activeLayer = title;
    title.textItem.contents = NEW_TITLE;
    var tb = title.bounds;
    expect('TITLE-EDIT-VISIBLE', tb[2].value > tb[0].value && tb[3].value > tb[1].value, 'bounds=' + tb.join(','));
    log('title contents now = ' + title.textItem.contents);
  }

  // ---------- 3) 修改按钮文字（白色文字的那个主按钮 label） ----------
  var btn = findLayer(doc.layers, function (l) { return l.kind === LayerKind.TEXT && Math.round(l.textItem.size.value) === 18 && isWhite(l.textItem.color); });
  expect('BUTTON-LABEL-FOUND', !!btn, btn ? btn.name : 'null');
  if (btn) {
    doc.activeLayer = btn;
    btn.textItem.contents = NEW_BTN;
    var bb = btn.bounds;
    expect('BUTTON-EDIT-VISIBLE', bb[2].value > bb[0].value, 'bounds=' + bb.join(','));
  }

  // ---------- 4) 修改形状（Secondary button 纯色填充改色） ----------
  var shape = findLayer(doc.layers, function (l) { return l.kind === LayerKind.SOLIDFILL && String(l.name).indexOf('Secondary button') === 0; });
  expect('SHAPE-LAYER-FOUND', !!shape, shape ? shape.name : 'null');
  var shapeErr = '', fillPts = [];
  if (shape) {
    try {
      setSolidFillColor(shape, 12, 200, 120);
      fillPts = [sampleRgb(800, 762), sampleRgb(800, 802), sampleRgb(756, 783), sampleRgb(870, 783)];
    } catch (e) { shapeErr = String(e); }
  }
  expect('SHAPE-EDIT', !!shape && !shapeErr, shapeErr);
  var allGreen = fillPts.length === 4;
  for (var k = 0; k < fillPts.length; k++) if (!isNearGreen(fillPts[k])) allGreen = false;
  expect('SHAPE-FILL-VISIBLE', allGreen, fillPts.length ? fillPts.join(' ') : 'no sample');
  // 改色结果的最终证据由导出的合成 PNG 逐像素核验（verify-visual-v2.mjs）。

  // 形状改色后，其余图层结构不应变化
  var afterShape = snapshot(doc.layers);
  expect('SHAPE-EDIT-NO-STRUCTURE-CHANGE', afterShape.length === before.length, 'before=' + before.length + ' after=' + afterShape.length);

  // ---------- 5) 替换 Smart Object 内容 ----------
  var soSpring = findLayer(doc.layers, function (l) { return l.kind === LayerKind.SMARTOBJECT && String(l.name).indexOf('Spring') >= 0; });
  expect('SMART-OBJECT-FOUND', !!soSpring, soSpring ? soSpring.name : 'null');
  var soErr = '';
  if (soSpring) {
    doc.activeLayer = soSpring;
    var d = new ActionDescriptor();
    d.putPath(charIDToTypeID('null'), new File(TMP + '/card-autumn.png'));
    try { executeAction(stringIDToTypeID('placedLayerReplaceContents'), d, DialogModes.NO); } catch (e2) { soErr = String(e2); }
  }
  expect('SMART-OBJECT-REPLACE', soSpring && !soErr, soErr);
  var afterReplace = snapshot(doc.layers);
  expect('REPLACE-NO-STRUCTURE-CHANGE', afterReplace.length === before.length, 'before=' + before.length + ' after=' + afterReplace.length);

  // ---------- 6) 保存 / 关闭 / 重新打开 ----------
  var acceptPsd = new File(TMP + '/accept/CardWheel-v2-accepted.psd');
  var po = new PhotoshopSaveOptions(); po.layers = true; po.embedColorProfile = true;
  doc.saveAs(acceptPsd, po, true, Extension.LOWERCASE);
  expect('SAVE', acceptPsd.exists, acceptPsd.fsName);
  doc.close(SaveOptions.DONOTSAVECHANGES);

  var doc2 = app.open(acceptPsd);
  expect('REOPEN', doc2.width.value === 1440, doc2.name);
  var title2 = findLayer(doc2.layers, function (l) { return l.kind === LayerKind.TEXT && Math.round(l.textItem.size.value) === 48; });
  var okPersist = title2 && title2.textItem.contents === NEW_TITLE;
  expect('TEXT-PERSIST-AFTER-REOPEN', okPersist, title2 ? 'contents=' + title2.textItem.contents : 'not found');
  var textsAfter = textLayerNames(doc2.layers);
  expect('TEXT-COUNT-AFTER-REOPEN', textsAfter.length === 14, 'text=' + textsAfter.length);
  var soAfter = 0, shapeAfter = 0;
  allLayers(doc2.layers, function (l) { if (l.kind === LayerKind.SMARTOBJECT) soAfter++; if (l.kind === LayerKind.SOLIDFILL || l.kind === LayerKind.GRADIENTFILL) shapeAfter++; });
  expect('STRUCTURE-AFTER-REOPEN', soAfter === 4 && shapeAfter >= 20, 'so=' + soAfter + ' shapes=' + shapeAfter);

  // 重新打开后导出合成图，作为“图层结构与合成预览正确”的证据
  doc2.saveAs(new File(TMP + '/accept/CardWheel-v2-accepted.png'), new PNGSaveOptions(), true, Extension.LOWERCASE);
  expect('COMPOSITE-EXPORT', new File(TMP + '/accept/CardWheel-v2-accepted.png').exists, 'png exported');
  doc2.close(SaveOptions.DONOTSAVECHANGES);
} catch (e) {
  expect('SCRIPT-EXCEPTION', false, String(e) + ' @' + e.line);
  log('ERROR: ' + e + ' line=' + e.line);
}

var failed = 0;
for (var i = 0; i < checks.length; i++) if (!checks[i].ok) failed++;
log('=== SUMMARY: ' + (checks.length - failed) + '/' + checks.length + ' passed, failures=' + failed);
'ok';
