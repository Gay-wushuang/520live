"""Fail-closed structural validation of FSVG artboards and screenshot coverage."""
from pathlib import Path
import xml.etree.ElementTree as ET
import json,collections,re,sys
ROOT=Path(__file__).resolve().parents[1]
SVG='{http://www.w3.org/2000/svg}'
manifest=json.loads((ROOT/'contract/SVG-MANIFEST.json').read_text(encoding='utf-8'))
functions=json.loads((ROOT/'contract/FUNCTION-MATRIX.json').read_text(encoding='utf-8'))
states=json.loads((ROOT/'contract/STATE-MATRIX.json').read_text(encoding='utf-8'))
fail=[];records=[]
for relative in manifest['svgFiles']:
 p=ROOT/relative
 if not p.exists():fail.append(f'MISSING {relative}');continue
 try:root=ET.parse(p).getroot()
 except Exception as e:fail.append(f'XML {relative} {e}');continue
 if root.tag!=SVG+'svg':fail.append(f'ROOT {relative}')
 ids=[n.attrib['id'] for n in root.iter() if 'id' in n.attrib]
 dup=[k for k,v in collections.Counter(ids).items() if v>1]
 if dup:fail.append(f'DUP-IDS {relative} {dup}')
 if not {'width','height','viewBox','data-design-system','data-artboard'}.issubset(root.attrib):fail.append(f'METADATA {relative}')
 if not any(n.tag==SVG+'text' for n in root.iter()):fail.append(f'NO EDITABLE TEXT {relative}')
 for node in root.iter():
  if node.tag in {SVG+'image',SVG+'foreignObject'}:fail.append(f'NON-NATIVE OBJECT {relative}')
  if node.tag==SVG+'rect':
   try:
    if float(node.attrib.get('width',0))<0 or float(node.attrib.get('height',0))<0:fail.append(f'NEGATIVE RECT {relative}')
   except ValueError: fail.append(f'BAD RECT {relative}')
 if 'monopoly/' in relative or '/MON-' in relative:
  cells=[n for n in root.iter() if n.tag==SVG+'g' and re.fullmatch('MON-CELL-[0-9]{2}',n.attrib.get('id',''))]
  if len(cells)!=28:fail.append(f'BOARD CELL COUNT {relative} {len(cells)}')
  type_counts=collections.Counter()
  for cell in cells:
   labels=[n.text for n in cell.iter() if n.tag==SVG+'text' and n.text]
   if labels: type_counts[labels[0]]+=1
  if set(type_counts.values())!={4} or len(type_counts)!=7:fail.append(f'BOARD TYPE COUNTS {relative} {dict(type_counts)}')
 records.append({'path':relative,'ids':len(ids),'textNodes':sum(n.tag==SVG+'text' for n in root.iter())})

for row in functions:
 if row['designCoverage']!='mapped' or row['mappedSvgCount']<1:fail.append(f'FUNCTION UNMAPPED {row["functionId"]}')
 # verify full declared component ID has at least one exact occurrence among files.
 all_ids=set()
 for rel in row['svgFiles']:
  root=ET.parse(ROOT/rel).getroot()
  all_ids.update(n.attrib['id'] for n in root.iter() if 'id' in n.attrib)
 for id in row['componentIDs']:
  if id not in all_ids:fail.append(f'FUNCTION COMPONENT MISSING {row["functionId"]} {id}')

# 语义断言：WallpaperRewardModal 运行时无右上角关闭按钮，wall 系 SVG 与 OVL-F08 均不得虚构 OVERLAY-CLOSE。
WALL_SVGS={'states/OVL-WALL-01.desktop.svg','states/OVL-WALL-02.desktop.svg','overlays/OVL-WALL-01.svg','overlays/OVL-WALL-01.mobile.svg'}
close_files=[]
for rel in manifest['svgFiles']:
 root=ET.parse(ROOT/rel).getroot()
 if 'OVERLAY-CLOSE' in {n.attrib['id'] for n in root.iter() if 'id' in n.attrib}:close_files.append(rel)
leaked=sorted(set(close_files)&WALL_SVGS)
if leaked:fail.append('FICTIONAL OVERLAY-CLOSE IN WALL SVG '+str(leaked))
# 其余 overlay（EVT/FIG/RES/VID 及 CARD-04 内嵌结果层）运行时存在 × 关闭，必须保留。
if len(close_files)!=28:fail.append(f'OVERLAY-CLOSE FILE COUNT {len(close_files)} EXPECTED 28')
for row in functions:
 if row['functionId']=='OVL-F08':
  if 'OVERLAY-CLOSE' in row['componentIDs']:fail.append('FICTIONAL OVL-F08 COMPONENT OVERLAY-CLOSE')
  for cid in ('OVERLAY-MODAL','OVERLAY-PHASE','OVERLAY-CONTINUE'):
   if cid not in row['componentIDs']:fail.append('MISSING OVL-F08 COMPONENT '+cid)

if len(states)!=46:fail.append('CANDIDATE COUNT')
if sum(x['baselineStatus']=='ok' for x in states)!=46:fail.append('SUCCESS COUNT')
if sum(x['baselineStatus']=='blocked' for x in states)!=0:fail.append('BLOCKED COUNT')
for item in states:
 if item['baselineStatus']=='ok' and not item['svgFiles']:fail.append('UNMAPPED STATE '+item['candidate'])
 if item['baselineStatus']=='blocked' and item['svgFiles']:fail.append('FAKE BLOCKED STATE '+item['candidate'])
if len(manifest['screenshots'])!=50:fail.append('SCREENSHOT COUNT')
for key,item in manifest['screenshots'].items():
 if not (ROOT/item['svg']).exists():fail.append('MISSING SHOT SVG '+key)
 if key.startswith('mobile/') and (item['viewport']!='mobile' or '.mobile.svg' not in item['svg']):fail.append('WRONG MOBILE VIEWPORT '+key)
 if key.endswith('.tablet.png') and item['viewport']!='tablet':fail.append('WRONG TABLET VIEWPORT '+key)
if len(set(manifest['svgFiles']))!=len(manifest['svgFiles']):fail.append('DUPLICATE OUTPUT PATHS')
if fail:
 for e in fail:print('FAIL',e)
 print('GATE: FSVG_STRUCTURAL_BLOCKED',len(fail),'failures')
 sys.exit(1)
summary={'gate':'FSVG_V11_STRUCTURAL_PASS','svgFiles':len(records),'stateCandidates':len(states),'successCandidates':46,'blockedCandidates':0,'screenshotMappedArtboards':len(manifest['screenshots']),'functionIdsMapped':len(functions),'uniqueIdFiles':len(records),'editableTextNodes':sum(r['textNodes'] for r in records),'sourceCodeFunctionalAudit':'NOT_COMPLETED','photoshopNativeLayerAcceptance':'NOT_COMPLETED'}
(ROOT/'contract/VALIDATION-RESULT.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
