// 在 Photoshop 内只读检查试点 PSD；不要保存或修改交付原件。
(function () {
  var previousDialogs = app.displayDialogs;
  var doc = null;
  var lines = [];
  var counts = { groups: 0, text: 0, raster: 0, other: 0 };

  function walk(layers, depth) {
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var prefix = new Array(depth + 1).join('  ');
      if (layer.typename === 'LayerSet') {
        counts.groups++;
        lines.push(prefix + '[GROUP] ' + layer.name);
        walk(layer.layers, depth + 1);
      } else if (layer.kind === LayerKind.TEXT) {
        counts.text++;
        lines.push(prefix + '[TEXT] ' + layer.name + ' {' + layer.textItem.font + '} => ' + layer.textItem.contents.replace(/\r|\n/g, ' '));
      } else if (layer.kind === LayerKind.NORMAL) {
        counts.raster++;
        lines.push(prefix + '[RASTER] ' + layer.name);
      } else {
        counts.other++;
        lines.push(prefix + '[OTHER] ' + layer.name + ' / ' + layer.kind);
      }
    }
  }

  try {
    app.displayDialogs = DialogModes.NO;
    doc = app.open(new File('E:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/CardWheel-Editable.psd'));
    lines.push('PHOTOSHOP_VERSION=' + app.version);
    lines.push('DOC=' + doc.name);
    lines.push('SIZE=' + doc.width.as('px') + 'x' + doc.height.as('px'));
    lines.push('MODE=' + doc.mode + ',BITS=' + doc.bitsPerChannel);
    walk(doc.layers, 0);
    lines.push('COUNTS=' + counts.groups + ',' + counts.text + ',' + counts.raster + ',' + counts.other);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;
    return lines.join('\n');
  } catch (error) {
    if (doc !== null) {
      try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
    }
    return 'AUDIT_ERROR=' + error.toString() + '\n' + lines.join('\n');
  } finally {
    app.displayDialogs = previousDialogs;
  }
})();
