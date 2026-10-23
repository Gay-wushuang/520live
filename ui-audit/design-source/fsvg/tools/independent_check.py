# FSVG v1.1 独立结构复核（不复用 validate_svg.py 逻辑）
import json, sys, xml.etree.ElementTree as ET, collections, re
from pathlib import Path

root = Path(r'e:/ERE/Documents/Work/直播轮盘')
kit = root/'ui-audit/design-source/fsvg'
SVG = '{http://www.w3.org/2000/svg}'
issues = []

man = json.loads((kit/'contract/SVG-MANIFEST.json').read_text(encoding='utf-8'))
fmx = json.loads((kit/'contract/FUNCTION-MATRIX.json').read_text(encoding='utf-8'))
smx = json.loads((kit/'contract/STATE-MATRIX.json').read_text(encoding='utf-8'))
ui  = json.loads((root/'ui-audit/manifest.json').read_text(encoding='utf-8'))

DOMAIN_MATCH = {
    'monopoly': lambda p: 'pages/monopoly/' in p or '/MON-' in p,
    'card-wheel': lambda p: 'pages/card-wheel/' in p or '/CARD-' in p or '/CS-' in p,
    'overlay': lambda p: 'overlays/' in p or '/OVL-' in p,
}

# 1. per-file: XML, dup ids, metadata, native-only, external refs
func_tokens = collections.defaultdict(set)
text_total = 0
for rel in man['svgFiles']:
    p = kit/rel
    if not p.exists():
        issues.append(f'MISSING FILE {rel}'); continue
    try:
        r = ET.parse(p).getroot()
    except Exception as e:
        issues.append(f'XML {rel}: {e}'); continue
    if r.tag != SVG+'svg':
        issues.append(f'ROOT {rel}')
    ids = [n.attrib['id'] for n in r.iter() if 'id' in n.attrib]
    dups = [k for k, v in collections.Counter(ids).items() if v > 1]
    if dups:
        issues.append(f'DUP {rel} {dups}')
    if not {'width', 'height', 'viewBox', 'data-design-system', 'data-artboard'}.issubset(r.attrib):
        issues.append(f'META {rel}')
    for n in r.iter():
        if n.tag in {SVG+'image', SVG+'foreignObject'}:
            issues.append(f'NONNATIVE {rel}')
        for a in ('href', 'xlink:href'):
            if a in n.attrib:
                issues.append(f'HREF {rel} {str(n.attrib[a])[:60]}')
    raw = p.read_text(encoding='utf-8')
    if re.search(r'url\((?!#)', raw):
        issues.append(f'EXTERNAL-URL {rel}')
    if '@import' in raw:
        issues.append(f'IMPORT {rel}')
    for n in r.iter():
        for t in n.attrib.get('data-func', '').split():
            func_tokens[rel].add(t)
    text_total += sum(1 for n in r.iter() if n.tag == SVG+'text')

# 2. FUNCTION-MATRIX: 重算期望集合并与 contract 对账
recount = {}
for row in fmx:
    fid = row['functionId']
    expect = sorted(rel for rel in man['svgFiles'] if DOMAIN_MATCH[row['domain']](rel.replace('\\', '/')) and fid in func_tokens[rel])
    recount[fid] = expect
    if sorted(row['svgFiles']) != expect:
        issues.append(f'FUNC LIST MISMATCH {fid} contract={len(row["svgFiles"])} expect={len(expect)}')
    if row['mappedSvgCount'] != len(expect):
        issues.append(f'COUNT MISMATCH {fid} {row["mappedSvgCount"]} vs {len(expect)}')

# 3. 截图映射 50/50：kit manifest 键 ↔ ui-audit manifest 文件
kit_keys = set(man['screenshots'].keys())
ui_files = set()
for c in ui['candidates']:
    ui_files.update(c['files'])
ui_keys = {f.replace('screenshots/', '') for f in ui_files}
if kit_keys != ui_keys:
    issues.append(f'SHOT KEY SET DIFF +{sorted(ui_keys-kit_keys)} -{sorted(kit_keys-ui_keys)}')
if len(man['screenshots']) != 50:
    issues.append(f'SHOT COUNT {len(man["screenshots"])}')
for k, v in man['screenshots'].items():
    if not (kit/v['svg']).exists():
        issues.append(f'SHOT SVG MISSING {k}')

# 4. STATE-MATRIX：46 全 mapped、文件存在、ID 集与截图 ID 集一致
if len(smx) != 46:
    issues.append(f'STATE COUNT {len(smx)}')
for s in smx:
    if s['baselineStatus'] != 'ok' or s['designEvidence'] != 'mapped':
        issues.append(f'STATE NOT MAPPED {s["candidate"]}')
    for rel in s['svgFiles']:
        if not (kit/rel).exists():
            issues.append(f'STATE FILE MISSING {rel}')
if {s['candidate'] for s in smx} != {v['id'] for v in man['screenshots'].values()}:
    issues.append('STATE/SHOT ID SET MISMATCH')

# 5. wall 系语义专项：运行时 WallpaperRewardModal 无右上角关闭按钮
WALL_SVGS = ('states/OVL-WALL-01.desktop.svg', 'states/OVL-WALL-02.desktop.svg',
             'overlays/OVL-WALL-01.svg', 'overlays/OVL-WALL-01.mobile.svg')
p = kit/'states/OVL-WALL-02.desktop.svg'
r = ET.parse(p).getroot()
ids = {n.attrib['id'] for n in r.iter() if 'id' in n.attrib}
need = {'OVERLAY-BACKDROP', 'OVERLAY-MODAL', 'OVERLAY-PHASE',
        'OVERLAY-REWARD-ARTWORK', 'OVERLAY-CONTINUE'}
if not need.issubset(ids):
    issues.append(f'WALL02 IDS {need-ids}')
if r.attrib.get('data-artboard') != 'OVL-WALL-02-desktop':
    issues.append('WALL02 ARTBOARD')
for rel in WALL_SVGS:
    rr = ET.parse(kit/rel).getroot()
    if 'OVERLAY-CLOSE' in {n.attrib['id'] for n in rr.iter() if 'id' in n.attrib}:
        issues.append(f'FICTIONAL OVERLAY-CLOSE {rel}')
# OVL-F08 功能映射不得包含虚构关闭控件，且必须保留领取操作组件
f08 = [row for row in fmx if row['functionId'] == 'OVL-F08']
if not f08:
    issues.append('OVL-F08 MISSING')
else:
    if 'OVERLAY-CLOSE' in f08[0]['componentIDs']:
        issues.append('OVL-F08 FICTIONAL COMPONENT OVERLAY-CLOSE')
    for cid in ('OVERLAY-MODAL', 'OVERLAY-PHASE', 'OVERLAY-CONTINUE'):
        if cid not in f08[0]['componentIDs']:
            issues.append(f'OVL-F08 MISSING COMPONENT {cid}')
# 其余 overlay（运行时确有 × 关闭）不得因本次修复丢失
close_count = 0
for rel in man['svgFiles']:
    if rel in WALL_SVGS:
        continue
    rr = ET.parse(kit/rel).getroot()
    if 'OVERLAY-CLOSE' in {n.attrib['id'] for n in rr.iter() if 'id' in n.attrib}:
        close_count += 1
if close_count != 28:
    issues.append(f'OVERLAY-CLOSE RETENTION COUNT {close_count} EXPECTED 28')

print('svgFiles:', len(man['svgFiles']), '| unique:', len(set(man['svgFiles'])))
print('ui shots:', ui['meta']['screenshotFileCount'],
      '| kit keys:', len(kit_keys), '| ui keys:', len(ui_keys))
print('function rows:', len(fmx), '| state rows:', len(smx))
print('editable text nodes:', text_total)
print('ISSUES:', len(issues))
for i in issues:
    print(' -', i)

# 6. 修复模式：--fix 时按重算结果写回 FUNCTION-MATRIX（列全 svgFiles、对齐 mappedSvgCount）
if '--fix' in sys.argv and issues:
    for row in fmx:
        row['svgFiles'] = recount[row['functionId']]
        row['mappedSvgCount'] = len(row['svgFiles'])
    (kit/'contract/FUNCTION-MATRIX.json').write_text(
        json.dumps(fmx, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('FUNCTION-MATRIX.json rewritten with full svgFiles lists.')
print('INDEPENDENT CHECK:', 'PASS' if not issues else 'FAIL')
sys.exit(0 if not issues else 1)
