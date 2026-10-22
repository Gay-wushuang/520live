// 在专用副本上验证文字层修改、Photoshop 保存与重新打开。
(function () {
  var previousDialogs = app.displayDialogs;
  var path = 'E:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/CardWheel-Photoshop-QA-v3.psd';
  var original = '积分卡转盘';
  var probe = '积分卡转盘 · 编辑验证';
  var doc = null;
  var steps = [];

  function findTitle(layers) {
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      if (layer.typename === 'LayerSet') {
        var nested = findTitle(layer.layers);
        if (nested !== null) return nested;
      } else if (layer.kind === LayerKind.TEXT && layer.name === 'Title / 积分卡转盘') {
        return layer;
      }
    }
    return null;
  }

  try {
    app.displayDialogs = DialogModes.NO;
    doc = app.open(new File(path));
    var title = findTitle(doc.layers);
    if (title === null || title.textItem.contents !== original) throw new Error('原始标题文字不符合预期');
    title.textItem.contents = probe;
    doc.save();
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;
    steps.push('SAVE_EDIT=OK');

    doc = app.open(new File(path));
    title = findTitle(doc.layers);
    if (title === null || title.textItem.contents !== probe) throw new Error('重开后未保留编辑文字');
    steps.push('REOPEN_EDIT=OK');
    title.textItem.contents = original;
    doc.save();
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;

    doc = app.open(new File(path));
    title = findTitle(doc.layers);
    if (title === null || title.textItem.contents !== original) throw new Error('标题恢复后重开未通过');
    steps.push('RESTORE_REOPEN=OK');
    steps.push('SIZE=' + doc.width.as('px') + 'x' + doc.height.as('px'));
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;
    return steps.join('\n');
  } catch (error) {
    if (doc !== null) {
      try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
    }
    return 'TEXT_QA_ERROR=' + error.toString() + '\n' + steps.join('\n');
  } finally {
    app.displayDialogs = previousDialogs;
  }
})();
