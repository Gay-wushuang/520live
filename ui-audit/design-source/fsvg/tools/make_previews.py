from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import cairosvg,io
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'previews';P.mkdir(exist_ok=True)
paths={'大富翁 · Desktop':'pages/monopoly/desktop.svg','积分卡 · Desktop':'pages/card-wheel/desktop.svg','大富翁 · Mobile':'pages/monopoly/mobile.svg','积分卡 · Mobile':'pages/card-wheel/mobile.svg','事件弹窗 · 真心话':'overlays/OVL-EVT-04.svg','奖励 · 壁纸':'overlays/OVL-WALL-01.svg','组件体系':'components/component-library.svg'}
thumbs=[]
for title,rel in paths.items():
 width=1020 if 'Desktop' in title else 600 if 'Mobile' in title else 900
 target=P/(Path(rel).stem+'_'+rel.split('/')[0]+'-preview.png')
 raw=cairosvg.svg2png(url=str(ROOT/rel),output_width=width)
 target.write_bytes(raw)
 im=Image.open(io.BytesIO(raw)).convert('RGB')
 if 'Mobile' in title: im=im.crop((0,0,im.width,round(im.width*844/390)))
 thumbs.append((title,im))
W=1920;H=1630
sheet=Image.new('RGB',(W,H),'#edf0f3');dr=ImageDraw.Draw(sheet)
font_paths=['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
font=next((ImageFont.truetype(f,24) for f in font_paths if Path(f).exists()),ImageFont.load_default())
font_small=next((ImageFont.truetype(f,19) for f in font_paths if Path(f).exists()),ImageFont.load_default())
dr.text((54,27),'520live  ·  Functional SVG / Grey-scale System',fill='#24313F',font=font)
def put(ix,title,im,x,y,w,h):
 dr.rounded_rectangle((x,y,x+w,y+h),radius=12,fill='#fff',outline='#D5DAE0',width=2)
 dr.text((x+16,y+12),title,fill='#24313F',font=font_small)
 box=(x+12,y+51,w-24,h-65)
 fit=min(box[2]/im.width,box[3]/im.height)
 resized=im.resize((int(im.width*fit),int(im.height*fit)),Image.Resampling.LANCZOS)
 sheet.paste(resized,(int(box[0]+(box[2]-resized.width)/2),int(box[1]+(box[3]-resized.height)/2)))
for i,(title,im) in enumerate(thumbs[:2]):put(i,title,im,40+i*947,85,918,590)
for i,(title,im) in enumerate(thumbs[2:4]):put(i,title,im,40+i*396,691,380,880)
for i,(title,im) in enumerate(thumbs[4:]):put(i+4,title,im,842+(i%2)*520,691+(i//2)*444,499,428)
sheet.save(P/'design-overview.png',optimize=True)
print('Preview files:',len(list(P.glob('*.png'))))
