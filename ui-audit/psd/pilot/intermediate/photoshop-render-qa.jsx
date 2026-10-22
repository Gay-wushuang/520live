// 从原始 PSD 导出 Photoshop 的合成视图，用于视觉验收。
(function () {
  var previousDialogs = app.displayDialogs;
  var doc = null;
  try {
    app.displayDialogs = DialogModes.NO;
    doc = app.open(new File('E:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/CardWheel-Editable.psd'));
    var output = new File('E:/ERE/Documents/Work/直播轮盘/ui-audit/psd/pilot/intermediate/CardWheel-Photoshop-Render-v3.png');
    if (output.exists) throw new Error('渲染输出已存在，拒绝覆盖');
    var options = new ExportOptionsSaveForWeb();
    options.format = SaveDocumentType.PNG;
    options.PNG8 = false;
    options.transparency = true;
    options.interlaced = false;
    doc.exportDocument(output, ExportType.SAVEFORWEB, options);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;
    return 'RENDER=OK\nFILE=' + output.fsName + '\nBYTES=' + output.length;
  } catch (error) {
    if (doc !== null) {
      try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
    }
    return 'RENDER_ERROR=' + error.toString();
  } finally {
    app.displayDialogs = previousDialogs;
  }
})();
