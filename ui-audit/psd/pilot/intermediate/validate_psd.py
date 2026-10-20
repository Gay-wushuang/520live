from pathlib import Path
import json
from psd_tools import PSDImage

root = Path(__file__).resolve().parents[4]
psd_path = root / "ui-audit/psd/pilot/CardWheel-Editable.psd"
preview_path = root / "ui-audit/psd/pilot/intermediate/CardWheel-PSD-Composite.png"
psd = PSDImage.open(psd_path)
counts = {"groups": 0, "type_layers": 0, "pixel_layers": 0, "other": 0}
names = []
for layer in psd.descendants():
    names.append(layer.name)
    if layer.is_group():
        counts["groups"] += 1
    elif layer.kind == "type":
        counts["type_layers"] += 1
    elif layer.kind == "pixel":
        counts["pixel_layers"] += 1
    else:
        counts["other"] += 1

composite = psd.composite(force=True)
composite.save(preview_path)
result = {
    "size": [psd.width, psd.height],
    "color_mode": str(psd.color_mode),
    "depth": psd.depth,
    "counts": counts,
    "preview": str(preview_path),
    "preview_bytes": preview_path.stat().st_size,
    "layer_names": names,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
