#target photoshop
// PSD Pilot v2 — Photoshop 处理脚本
// 1) 重新排版全部文字层（ag-psd 写出的文字层在 Photoshop 中首次打开为 0 尺寸，需触发重排才渲染）
// 2) 将四季卡片栅格占位层替换为原生 Smart Object（嵌入 1672x941 原始 PNG，非破坏性缩放到 104x104）
// 3) 另存为最终 PSD，并导出合成 PNG 供局部误差统计
app.displayDialogs = DialogModes.NO;

var TMP = Folder.temp.fsName;
var LOG = new File(TMP + '/trae-v2-log.txt');
function log(m) { LOG.open('a'); LOG.write(String(m) + '\n'); LOG.close(); }
LOG.open('w'); LOG.write('v2 start\n'); LOG.close();

function collect(set, fn) {
  for (var i = 0; i < set.length; i++) {
    var l = set[i];
    if (l.typename === 'LayerSet') { collect(l.layers, fn); } else { fn(l); }
  }
}
function findLayerByName(set, name) {
  var found = null;
  function rec(s) { for (var i = 0; i < s.length; i++) { if (s[i].typename === 'LayerSet') rec(s[i].layers); else if (s[i].name === name) found = s[i]; } }
  rec(set);
  return found;
}
function findSetByName(set, name) {
  var found = null;
  function rec(s) { for (var i = 0; i < s.length; i++) { if (s[i].typename === 'LayerSet') { if (s[i].name === name) { found = s[i]; } rec(s[i].layers); } } }
  rec(set);
  return found;
}

var CARD_SOURCES = [
  { season: 'Spring', file: TMP + '/card-spring.png' },
  { season: 'Summer', file: TMP + '/card-summer.png' },
  { season: 'Autumn', file: TMP + '/card-autumn.png' },
  { season: 'Winter', file: TMP + '/card-winter.png' }
];

var result = { steps: [], errors: [] };
try {
  var doc = app.open(new File(TMP + '/CardWheel-v2-agsd.psd'));
  log('opened ' + doc.name + ' ' + doc.width.value + 'x' + doc.height.value);
  result.steps.push('opened');

  // --- 1) 文字层重排 ---
  var textCount = 0;
  collect(doc.layers, function (l) {
    if (l.kind === LayerKind.TEXT) {
      doc.activeLayer = l;
      var c = l.textItem.contents;
      l.textItem.contents = c;
      textCount++;
    }
  });
  log('text layers reflowed = ' + textCount);
  result.steps.push('reflowed ' + textCount + ' text layers');

  // --- 2) 卡片占位层 -> Smart Object ---
  var wheelGroup = findSetByName(doc.layers, 'Wheel / Editable parts');
  var ringRef = findLayerByName(doc.layers, 'Wheel / Border rings highlight');
  log('wheelGroup=' + (wheelGroup ? wheelGroup.name : 'null') + ' ringRef=' + (ringRef ? ringRef.name : 'null'));

  var soNames = [];
  for (var i = 0; i < CARD_SOURCES.length; i++) {
    var season = CARD_SOURCES[i].season;
    var placeholder = findLayerByName(doc.layers, 'Card image / ' + season + ' / source PNG');
    if (!placeholder) { result.errors.push('placeholder missing: ' + season); log('MISSING placeholder ' + season); continue; }
    doc.activeLayer = placeholder;
    var b = placeholder.bounds; // 占位层在文档中的位置
    var tx = b[0].value, ty = b[1].value;
    doc.activeLayer = placeholder; // 保持激活

    var srcDoc = app.open(new File(CARD_SOURCES[i].file));
    var srcLayer = srcDoc.layers[0];
    var dup = srcLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
    srcDoc.close(SaveOptions.DONOTSAVECHANGES);

    doc.activeLayer = dup;
    executeAction(stringIDToTypeID('newPlacedLayer'), undefined, DialogModes.NO); // 转为 Smart Object（嵌入原始分辨率）
    var so = doc.activeLayer;
    var px = 104 / 1672 * 100, py = 104 / 941 * 100;
    so.resize(px, py, AnchorPosition.TOPLEFT);
    so.translate(tx - so.bounds[0].value, ty - so.bounds[1].value);
    so.name = 'Card image / ' + season + ' / Smart Object';
    if (wheelGroup) so.move(wheelGroup, ElementPlacement.INSIDE);
    if (ringRef) so.move(ringRef, ElementPlacement.PLACEBEFORE); // 置于外环之上、季节标签之下
    soNames.push(so.name);
    log('created SO ' + so.name + ' bounds=' + so.bounds.join(','));

    placeholder.remove(); // 删除栅格占位层
  }
  result.steps.push('smart objects: ' + soNames.join(' | '));

  // --- 记录最终图层顺序（便于人工核对） ---
  var order = [];
  collect(doc.layers, function (l) { order.push(l.name + ' [kind=' + l.kind + ']'); });
  log('final order:\n' + order.join('\n'));
  result.steps.push('order captured: ' + order.length + ' layers');

  // --- 3) 导出合成 PNG + 另存 PSD ---
  doc.saveAs(new File(TMP + '/CardWheel-v2-composite.png'), new PNGSaveOptions(), true, Extension.LOWERCASE);
  var psdOpts = new PhotoshopSaveOptions();
  psdOpts.layers = true;
  psdOpts.embedColorProfile = true;
  doc.saveAs(new File(TMP + '/CardWheel-Editable-v2.psd'), psdOpts, true, Extension.LOWERCASE);
  result.steps.push('saved psd + png');
  log('saved psd + png');

  doc.close(SaveOptions.DONOTSAVECHANGES);
  log('closed ok  errors=' + result.errors.length);
} catch (e) {
  result.errors.push(String(e) + ' @' + e.line);
  log('ERROR: ' + e + ' line=' + e.line);
}
'ok';
