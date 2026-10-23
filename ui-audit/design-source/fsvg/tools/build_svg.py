"""520live functional SVG source generator. No external assets, deterministic SVG layer IDs."""
from __future__ import annotations
import json, math, re, zipfile, collections, os
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
SVGNS='http://www.w3.org/2000/svg'
ET.register_namespace('',SVGNS)
BASE_FONT='Noto Sans CJK SC, Microsoft YaHei, PingFang SC, sans-serif'
# Deliberately neutral, semantic-only palette shared across every artboard.
C=dict(bg='#F3F5F7',surface='#FFFFFF',subtle='#F8F9FA',ink='#24313F',muted='#667380',border='#CFD5DA',line='#E6EAEE',accent='#364A60',accentFill='#E7EDF2',danger='#6E3F42',warning='#6F5E3B',ok='#3E6759',disabled='#F1F2F4',overlay='#24313F',shadow='#DCE1E6')
EVENTS=['积分','厄运','冒险','真心','效果','周边','混乱']
SEASONS=['春季','夏季','秋季','冬季']

class Doc:
 def __init__(self,w,h,name,context='base',viewport=None):
  self.w,self.h=w,h; self.ids=set();self.root=ET.Element(f'{{{SVGNS}}}svg',{'width':str(w),'height':str(h),'viewBox':f'0 0 {w} {h}','version':'1.1', 'data-design-system':'520live-functional-v1', 'data-artboard':name, 'data-context':context,'data-viewport':viewport or f'{w}x{h}'})
  self.g=self.root
  ET.SubElement(self.root,f'{{{SVGNS}}}title').text=name+' — 520live 功能型结构稿'
  ET.SubElement(self.root,f'{{{SVGNS}}}desc').text='静态功能与状态映射；所有可见几何/文字为原生 SVG，未实现业务事件。'
  st=ET.SubElement(self.root,f'{{{SVGNS}}}style');st.text=f'text {{ font-family: {BASE_FONT}; }}'
  self.bg(C['bg'])
 def _id(self,attrs):
  if attrs.get('id'):
   assert attrs['id'] not in self.ids,(self.root.attrib['data-artboard'],attrs['id'])
   self.ids.add(attrs['id'])
 def a(self,tag,attrs=None,parent=None,text=None):
  attrs={k:str(v) for k,v in (attrs or {}).items() if v is not None}
  self._id(attrs)
  t=ET.SubElement(parent if parent is not None else self.g, f'{{{SVGNS}}}{tag}',attrs)
  if text is not None:t.text=str(text)
  return t
 def group(self,id,func=None,state=None,layer=None,parent=None):
  attrs={'id':id,'data-func':func,'data-state':state,'data-layer':layer}
  return self.a('g',attrs,parent)
 def bg(self,color):self.a('rect',{'x':0,'y':0,'width':self.w,'height':self.h,'fill':color,'id':'ARTBOARD-BACKGROUND','data-layer':'10-layout'})
 def rect(self,x,y,w,h,fill='surface',stroke='border',radius=12,id=None,parent=None,width=1,dash=None):
  return self.a('rect',{'id':id,'x':round(x,2),'y':round(y,2),'width':round(w,2),'height':round(h,2),'rx':radius,'fill':C.get(fill,fill),'stroke':C.get(stroke,stroke) if stroke else 'none','stroke-width':width,'stroke-dasharray':dash},parent)
 def text(self,x,y,s,size=14,color='ink',weight=400,id=None,parent=None,anchor='start'):
  return self.a('text',{'id':id,'x':round(x,2),'y':round(y,2),'fill':C.get(color,color),'font-size':size,'font-weight':weight,'text-anchor':anchor,'dominant-baseline':'middle'},parent,s)
 def line(self,x1,y1,x2,y2,color='border',width=1,parent=None):return self.a('line',{'x1':x1,'y1':y1,'x2':x2,'y2':y2,'stroke':C.get(color,color),'stroke-width':width},parent)
 def circle(self,x,y,r,fill='surface',stroke='border',parent=None,width=1,id=None):return self.a('circle',{'id':id,'cx':x,'cy':y,'r':r,'fill':C.get(fill,fill),'stroke':C.get(stroke,stroke) if stroke else 'none','stroke-width':width},parent)
 def path(self,d,fill='none',stroke='border',parent=None,width=1,id=None):return self.a('path',{'id':id,'d':d,'fill':C.get(fill,fill),'stroke':C.get(stroke,stroke) if stroke else 'none','stroke-width':width},parent)
 def label(self,x,y,s,parent=None):return self.text(x,y,s,11,'muted',500,parent=parent)
 def panel(self,id,x,y,w,h,title,func=None,subtitle=None):
  g=self.group(id,func=func,layer='10-layout')
  self.rect(x,y,w,h,parent=g)
  self.text(x+18,y+28,title,16,'ink',700,parent=g)
  if subtitle:self.text(x+18,y+51,subtitle,11,'muted',parent=g)
  return g
 def button(self,id,x,y,w,h,s,kind='normal',func=None,state='default',parent=None):
  g=self.group(id,func,state,'30-controls',parent=parent)
  fills={'normal':'surface','primary':'accent','disabled':'disabled','quiet':'subtle','danger':'surface'}
  self.rect(x,y,w,h,fills.get(kind,'surface'),'accent' if kind=='primary' else ('danger' if kind=='danger' else 'border'),8,parent=g)
  self.text(x+w/2,y+h/2+1,s,13,'surface' if kind=='primary' else ('muted' if kind=='disabled' else 'ink'),650,parent=g,anchor='middle')
  return g
 def field(self,id,x,y,w,h,value,func=None,parent=None):
  g=self.group(id,func,layer='30-controls',parent=parent)
  self.rect(x,y,w,h,'subtle','border',8,parent=g)
  self.text(x+12,y+h/2,value,12,'muted',parent=g)
  return g
 def chip(self,id,x,y,w,s,func=None,kind='subtle',parent=None):
  g=self.group(id,func,layer='40-status',parent=parent)
  self.rect(x,y,w,26,kind,'line',6,parent=g)
  self.text(x+10,y+13,s,11,'ink',500,parent=g)
  return g
 def write(self,path):
  path=ROOT/path;path.parent.mkdir(parents=True,exist_ok=True)
  ET.indent(self.root,space='  ')
  ET.ElementTree(self.root).write(path,encoding='utf-8',xml_declaration=True)
  return str(path.relative_to(ROOT))

# 28 cells: four repetitions of seven actual categories, clockwise starting at top-left.
def board(d,x,y,w,h,mobile=False,multiple=False,target=None,phase='ready',player_count=1):
 g=d.group('MON-BOARD','MON-F09 MON-F10 MON-F11','target' if target else phase,'10-layout')
 d.rect(x,y,w,h,'surface','border',14,parent=g)
 gap=2; cw=(w-28)/8;ch=(h-28)/8;left=x+14;top=y+14
 # perim: top 8, right 6, bottom 8 reversed, left 6 upward
 coordinates=[(i,0) for i in range(8)]+[(7,j) for j in range(1,7)]+[(i,7) for i in range(7,-1,-1)]+[(0,j) for j in range(6,0,-1)]
 assert len(coordinates)==28
 for i,(gx,gy) in enumerate(coordinates,1):
  rx=left+gx*cw;ry=top+gy*ch;ev=EVENTS[(i-1)%7];is_target=target==i
  cell=d.group(f'MON-CELL-{i:02d}', 'MON-F09 MON-F11', 'target' if is_target else 'normal',parent=g)
  d.rect(rx+1,ry+1,cw-2,ch-2,'accentFill' if is_target else 'subtle','accent' if is_target else 'border',4,parent=cell,width=2 if is_target else 1)
  d.text(rx+cw/2,ry+ch*.36,ev,9 if mobile else 12,'ink',650,anchor='middle',parent=cell)
  d.text(rx+cw/2,ry+ch*.71,f'#{i:02d}',8 if mobile else 10,'muted',parent=cell,anchor='middle')
 # Center unused space is reserved for state, not new functionality/artwork.
 ix=left+cw;iy=top+ch;iw=6*cw;ih=6*ch
 artwork=d.group('MON-ARTWORK-SLOT',None,'optional-placeholder','20-content',g)
 d.rect(ix+6,iy+6,iw-12,ih-12,'surface','line',9,parent=artwork)
 d.text(ix+iw/2,iy+ih*.30,'当前棋盘',18 if not mobile else 14,'ink',700,parent=g,anchor='middle')
 d.text(ix+iw/2,iy+ih*.47,'28 格 · 七类 × 4',12 if not mobile else 10,'muted',parent=g,anchor='middle')
 d.text(ix+iw/2,iy+ih*.64,'棋子与事件目标由游戏状态驱动',11 if not mobile else 8,'muted',parent=g,anchor='middle')
 # Render player token at cell 2 plus second player's example.
 for idx,pos in enumerate(([2,16,22] if player_count>=3 else ([2,16] if multiple else [2]))):
  gx,gy=coordinates[pos-1];tx=left+(gx+1)*cw-12;ty=top+gy*ch+12
  tok=d.group(f'MON-PLAYER-TOKEN-{idx+1}','MON-F10','moving' if phase=='moving' else 'standing','40-status',g)
  d.circle(tx,ty,11,'accent' if idx==0 else 'surface','accent',tok)
  d.text(tx,ty+1,f'P{idx+1}',9,'surface' if idx==0 else 'ink',700,anchor='middle',parent=tok)
 return g

def monopoly(d, state='MON-01', viewport='desktop'):
 mobile=viewport=='mobile';tablet=viewport=='tablet';wide=viewport=='wide';W,H=d.w,d.h
 phase='rolling' if state=='MON-02' else ('moving' if state=='MON-03' else ('pending' if state in ('MON-04','MON-15') else 'ready'))
 multiple=state in ('MON-09','MON-16');target=2 if state in ('MON-04','MON-15','MON-wide') else None
 has_effect=state in ('MON-06','MON-07','MON-wide');logs=state in ('MON-05','MON-06','MON-11','MON-wide')
 direction=state=='MON-08';removed=state=='MON-17'; archive=state=='MON-12';toast=state in ('MON-13','MON-17')
 header=d.group('MON-HEADER','MON-F01 MON-F02',layer='10-layout');d.rect(0,0,W,76,'surface',None,0,parent=header)
 d.text(24 if mobile else 34,28,'大富翁互动系统',19 if mobile else 24,'ink',700,parent=header)
 d.text(24 if mobile else 34,52,'28 格 / 7 种类型 / 每种 4 格',10 if mobile else 12,'muted',parent=header)
 if mobile:
  d.button('MON-NAV-CARD',240,13,124,44,'积分卡转盘','normal','MON-F01')
 else:
  d.button('MON-NAV-CARD',W-280,15,130,44,'打开积分抽奖','normal','MON-F01')
  d.button('MON-RESET',W-140,15,118,44,'重置棋盘','danger','MON-F02')
 if mobile:
  status=d.panel('MON-TURN-CONTROLS',14,90,W-28,265,'当前回合','MON-F07 MON-F08 MON-F11 MON-F12')
  d.label(30,143,'当前观众',status);d.text(30,165,'观众A',17,'ink',700,parent=status)
  d.label(195,143,'当前位置',status);d.text(195,165,'第 2 格',16,'ink',650,parent=status)
  d.chip('MON-ROLL-DICE-MOBILE',29,185,145,'六面骰：4 点','MON-F07',parent=status)
  d.chip('MON-DIRECTION-STATUS',181,185,171,'方向：前进 1 格','MON-F08',parent=status)
  d.button('MON-ACTION-ROLL',29,224,332,52,'触发当前事件' if phase=='pending' else ('掷骰中…' if phase=='rolling' else '掷骰子前进'), 'disabled' if phase in ('rolling','moving') else 'primary','MON-F08 MON-F11',phase,parent=status)
  d.button('MON-RESET-MOBILE',29,292,156,44,'重置棋盘','danger','MON-F02',parent=status)
  d.button('MON-NEXT-MOBILE',201,292,160,44,'下一回合','normal','MON-F08',parent=status)
  bx=14;by=370;bw=W-28;bh=480
  board(d,bx,by,bw,bh,True,multiple,target,phase,3 if state=='MON-09' else (2 if multiple else 1))
  # Detailed cell information prevents tiny-board labels being the only source.
  d.chip('MON-BOARD-DETAIL',18,858,W-36,'当前格：#02 厄运 / P1 位置','MON-F09 MON-F10 MON-F11')
  sy=899;pw=W-28
  audience=d.panel('MON-AUDIENCE',14,sy,pw,530,'观众管理','MON-F03 MON-F04 MON-F05 MON-F06 MON-F12','管理操作保留完整，不以手机适配为由删减')
  d.field('MON-PROFILE-SELECT',28,sy+64,pw-28,42,'档案：观众A · 第 1 回合  ▾','MON-F03',audience)
  for i,(key,title) in enumerate([('SAVE','保存档案'),('LOAD','读取档案'),('NEW','新建档案')]):d.button('MON-PROFILE-'+key,28+i*115,sy+119,106,44,title,'normal','MON-F03',parent=audience)
  d.field('MON-AUDIENCE-EDIT',28,sy+183,pw-28,44,'观众A / 昵称可编辑','MON-F04',audience)
  d.chip('MON-USER-COUNT',28,sy+240,130,'观众 2 位' if multiple else '观众 1 位','MON-F05',parent=audience)
  d.button('MON-USER-DELETE',218,sy+226,132,44,'删除观众','danger','MON-F05 MON-F06',parent=audience)
  d.field('MON-USER-INPUT',28,sy+295,218,46,'输入观众昵称','MON-F05',audience)
  d.button('MON-USER-ADD',255,sy+295,94,46,'添加','normal','MON-F05',parent=audience)
  d.field('MON-USER-BULK',28,sy+357,320,65,'批量观众名称（多行）','MON-F05',audience)
  d.button('MON-USER-IMPORT',28,sy+441,320,50,'导入观众名单','normal','MON-F05',parent=audience)
  d.chip('MON-EFFECTS',28,sy+496,320,'效果：再前进一格 / 后退 / 重掷','MON-F12',parent=audience)
  ly=sy+546;lg=d.panel('MON-LOGS',14,ly,pw,204,'下播核对日志','MON-F13 MON-F14')
  d.text(28,ly+77,'最近记录：掷骰 · 移动 · 事件' if logs else '暂无记录，开始行动后自动记录',12,'muted',parent=lg)
  d.button('MON-LOG-COPY',28,ly+130,155,46,'复制日志','normal','MON-F14',parent=lg)
  d.button('MON-LOG-CSV',195,ly+130,155,46,'导出 CSV','normal','MON-F14',parent=lg)
  yy=ly+220; legend=d.panel('MON-LEGEND',14,yy,pw,158,'轮盘类型说明','MON-F15')
  for i,e in enumerate(EVENTS):d.chip('MON-LEGEND-'+str(i),26+(i%2)*165,yy+55+(i//2)*24,154,f'{e} · 4 格','MON-F15',parent=legend)
  d.chip('MON-FEEDBACK',18,yy+174,336,'系统提示：操作结果 / 失败原因','MON-F13')
  return
 # desktop/wide/tablet two-column layout with optional narrower grid.
 margin=24 if tablet else 32;gap=18;side=260 if tablet else (320 if wide else 302)
 top=98; mainx=margin+side+gap; mainw=W-mainx-margin
 audience=d.panel('MON-AUDIENCE',margin,top,side,492,'观众档案','MON-F03 MON-F04 MON-F05 MON-F06 MON-F12')
 d.chip('MON-USER-COUNT',margin+side-88,top+16,66,'3 位' if multiple else '1 位','MON-F05',parent=audience)
 d.field('MON-PROFILE-SELECT',margin+16,top+52,side-32,38,'当前档案：观众A  ▾' if not archive else '当前档案：观众B  ▾','MON-F03',audience)
 d.text(margin+18,top+117,'观众A  ·  第 1 回合',17,'ink',650,parent=audience)
 d.label(margin+18,top+147,'位置 第 2 格   ·   方向 前进',audience)
 if has_effect:d.chip('MON-EFFECTS',margin+16,top+169,side-32,'已生效：再前进 1 格','MON-F12',parent=audience)
 else:d.chip('MON-EFFECTS',margin+16,top+169,side-32,'效果状态：无','MON-F12',parent=audience)
 for i,(key,title) in enumerate([('SAVE','保存'),('LOAD','读取'),('NEW','新建')]):
  bw=(side-44)/3;d.button('MON-PROFILE-'+key,margin+16+i*(bw+6),top+207,bw,40,title,'normal','MON-F03',parent=audience)
 d.field('MON-AUDIENCE-EDIT',margin+16,top+264,side-32,37,'当前观众：观众A（可编辑）','MON-F04',audience)
 d.field('MON-USER-INPUT',margin+16,top+312,side-102,40,'新增观众昵称','MON-F05',audience)
 d.button('MON-USER-ADD',margin+side-78,top+312,62,40,'添加','normal','MON-F05',parent=audience)
 d.field('MON-USER-BULK',margin+16,top+359,side-32,48,'批量导入 / 换行或逗号分隔','MON-F05',audience)
 d.button('MON-USER-IMPORT',margin+16,top+416,side-116,42,'导入观众名单','normal','MON-F05',parent=audience)
 d.button('MON-USER-DELETE',margin+side-91,top+416,75,42,'删除','danger','MON-F05 MON-F06',parent=audience)
 d.chip('MON-USER-SELECT',margin+16,top+462,side-32,'观众列表  P1 观众A / P2 观众B / P3 观众C' if state=='MON-09' else ('观众列表  P1 观众A / P2 观众B' if multiple else '观众列表  P1 观众A'),'MON-F05',parent=audience)
 logs_g=d.panel('MON-LOGS',margin,top+507,side,126,'下播核对日志','MON-F13 MON-F14')
 d.label(margin+16,top+564,'骰子、移动、事件记录' if logs else '暂无记录，开始行动后显示',logs_g)
 d.button('MON-LOG-COPY',margin+16,top+582,108,40,'复制日志','normal','MON-F14',parent=logs_g)
 d.button('MON-LOG-CSV',margin+131,top+582,side-148,40,'导出 CSV','normal','MON-F14',parent=logs_g)
 legend=d.panel('MON-LEGEND',margin,top+648,side,138,'七类棋盘图例','MON-F15')
 for i,e in enumerate(EVENTS):d.text(margin+16+(i//4)*(side//2),top+696+(i%4)*23,f'{e} · 4 格',11,'muted',parent=legend)
 ctrl=d.panel('MON-TURN-CONTROLS',mainx,top,mainw,215,'当前回合与骰子','MON-F07 MON-F08 MON-F11 MON-F12')
 dice_x=mainx+16;d.rect(dice_x,top+50,180 if mainw>700 else 100,144,'subtle','line',12,parent=ctrl)
 d.text(dice_x+14,top+71,'六面骰',12,'ink',600,parent=ctrl)
 d.rect(dice_x+54 if mainw>700 else dice_x+32,top+89,68,68,'surface','accent',9,parent=ctrl,width=2)
 for u,v in [(0,0),(1,0),(0,1),(1,1)]:d.circle((dice_x+74 if mainw>700 else dice_x+49)+u*27,top+108+v*29,5,'accent',None,ctrl)
 dx=dice_x+(198 if mainw>700 else 118);statw=(mainw-(dx-mainx)-32)/3
 for i,(title,val) in enumerate([('当前观众','观众A'),('当前位置','第 2 格'),('下次移动','前进 · 1 格')]):
  xx=dx+i*(statw+3); d.rect(xx,top+51,statw-3,68,'subtle','border',8,parent=ctrl);d.label(xx+10,top+69,title,ctrl);d.text(xx+10,top+95,val,14,'ink',700,parent=ctrl)
 button_title=('触发厄运事件' if phase=='pending' else ('移动中…' if phase=='moving' else ('掷骰中…' if phase=='rolling' else '掷骰子前进')))
 d.button('MON-ACTION-ROLL',dx,top+133,mainw-(dx-mainx)-16,48,button_title,'disabled' if phase in ('rolling','moving') else 'primary','MON-F08 MON-F11',phase,parent=ctrl)
 d.chip('MON-DIRECTION',dx,top+184,min(198,mainw-230),'方向选项：前进 / 后退' if direction else '方向：前进（可切换）','MON-F08 MON-F12',parent=ctrl)
 d.chip('MON-DICE-RESULT',dx+205,top+184,min(172,mainw-420),'骰点：4 / 待执行','MON-F07',parent=ctrl)
 bx=mainx;by=top+230;bw=mainw;bh=min(456,H-by-90)
 if bh<340:bh=360
 board(d,bx,by,bw,bh,False,multiple,target,phase,3 if state=='MON-09' else (2 if multiple else 1))
 d.chip('MON-LAST-EVENT',mainx+8,by+bh-35,min(mainw-16,320),'上次事件：厄运 / 已结束' if state=='MON-05' else '事件状态：无待处理' if phase=='ready' else '事件状态：处理中','MON-F11 MON-F13')
 d.chip('MON-BOARD-STATUS',mainx+8,by+bh+10,mainw-16,'当前：观众A · #02 厄运   |   '+('目标格高亮' if target else '等待掷骰')+'   |   多棋子 / 效果均有状态入口','MON-F09 MON-F10 MON-F11')
 if toast:d.chip('MON-FEEDBACK',mainx+8,by+bh+43,min(mainw-16,450),'系统提示：'+('至少保留一位观众' if removed else '读取成功 / 日志为空'),'MON-F13')
 else:d.chip('MON-FEEDBACK',mainx+8,by+bh+43,min(mainw-16,450),'系统提示 / 上次事件（状态驱动）','MON-F13')
 if not mobile:d.button('MON-NEXT-TURN',mainx+mainw-220,by+bh+42,212,32,'继续 / 下一回合','quiet','MON-F08')

def wheel(d,cx,cy,r,season_labels=True,loading=False):
 g=d.group('CARD-WHEEL','CARD-F01 CARD-F02 CARD-F03 CARD-F04', 'loading' if loading else 'ready',layer='10-layout')
 d.circle(cx,cy,r,'surface','border',g,2)
 for i in range(4):
  x2=cx+math.cos(i*math.pi/2)*r;y2=cy+math.sin(i*math.pi/2)*r
  d.line(cx,cy,x2,y2,'border',2,g)
 for i,s in enumerate(SEASONS):
  a=-math.pi/4+i*math.pi/2
  x=cx+math.cos(a)*r*.54;y=cy+math.sin(a)*r*.54
  asset=d.group(f'CARD-WHEEL-ART-{i+1:02d}','CARD-F01 CARD-F10','placeholder','20-content',g)
  d.rect(x-42,y-32,84,64,'subtle','border',6,parent=asset)
  d.text(x,y-8,s,13,'ink',650,parent=asset,anchor='middle')
  d.text(x,y+13,'卡片素材',10,'muted',parent=asset,anchor='middle')
 d.circle(cx,cy,17,'accent','surface',g,2);d.text(cx,cy+1,'抽',12,'surface',700,parent=g,anchor='middle')
 d.path(f'M {cx-13} {cy-r-16} L {cx+13} {cy-r-16} L {cx} {cy-r+14} Z','accent',None,g)
 if loading:
  d.rect(cx-r*.84,cy-26,r*1.68,52,'surface','border',7,parent=g)
  d.text(cx,cy,'正在加载四季卡图…',13,'muted',parent=g,anchor='middle')
 return g

def collection_cards(d,x,y,w,states=None,small=False):
 st=states or {};col=1 if small else 2;gap=10;rh=112 if small else 99;cw=(w-(col-1)*gap)/col
 for i,sea in enumerate(SEASONS):
  xx=x+(i%col)*(cw+gap);yy=y+(i//col)*(rh+gap)
  count=st.get(sea,0)
  g=d.group(f'CARD-SEASON-{i+1}','CARD-F09 CARD-F10 CARD-F13', 'unlocked' if count>=2 else 'progress','20-content')
  d.rect(xx,yy,cw,rh,'subtle','border',10,parent=g)
  asset=d.group(f'CARD-COLLECTION-ART-{i+1:02d}','CARD-F10','placeholder','20-content',g)
  d.rect(xx+10,yy+12,60,60,'surface','border',5,parent=asset)
  d.text(xx+40,yy+43,'卡图',10,'muted',anchor='middle',parent=asset)
  d.text(xx+80,yy+24,sea,13,'ink',650,parent=g)
  d.text(xx+80,yy+46,f'{count}/2  ·  {count*50}%',12,'muted',parent=g)
  d.rect(xx+80,yy+57,max(cw-96,20),6,'line',None,3,parent=g)
  if count:d.rect(xx+80,yy+57,max(cw-96,20)*count/2,6,'accent',None,3,parent=g)
  if not small:d.text(xx+80,yy+82,'壁纸可领取' if count>=2 else '壁纸未解锁',11,'muted',parent=g)

def cardwheel(d,state='CARD-02',viewport='desktop'):
 mobile=viewport in ('mobile','tablet');tablet=viewport=='tablet';W,H=d.w,d.h
 loading=state=='CARD-01';spinning=state=='CARD-03';result=state in ('CARD-04',)
 vals={'CS-04':{'春季':1},'CS-05':{'春季':2},'CS-06':{s:2 for s in SEASONS}}.get(state,{})
 hdr=d.group('CARD-HEADER','CARD-F05',layer='10-layout')
 d.rect(0,0,W,76,'surface',None,0,parent=hdr)
 d.text(24 if mobile else 34,28,'积分卡转盘',20 if mobile else 26,'ink',700,parent=hdr)
 d.text(24 if mobile else 34,52,'春 · 夏 · 秋 · 冬 / 收集与奖励',11,'muted',parent=hdr)
 if mobile:d.button('CARD-BACK',W-128,12,109,46,'返回棋盘','normal','CARD-F05')
 else:d.button('CARD-BACK',W-180,14,152,46,'← 返回棋盘','normal','CARD-F05')
 if mobile:
  wp=d.panel('CARD-WHEEL-PANEL',14,88,W-28,510,'四季抽取','CARD-F01 CARD-F02 CARD-F03 CARD-F04')
  wheel(d,W/2,310,157,True,loading)
  d.button('CARD-ACTION-SPIN',28,481,W-56,50,'图片加载中…' if loading else ('抽取中…' if spinning else '抽取积分卡'),'disabled' if loading or spinning else 'primary','CARD-F03',state,wp)
  d.button('CARD-RESET',28,541,W-56,44,'重置游戏','normal','CARD-F05',parent=wp)
  d.chip('CARD-RESULT-FEEDBACK',14,612,W-28,'命中：春季卡 / 收集数已更新' if result else '抽取反馈：等待开始','CARD-F04')
  archive_y=652
  af=d.panel('CARD-ARCHIVE',14,archive_y,W-28,288,'玩家档案','CARD-F06 CARD-F07')
  d.field('CARD-PROFILE-SELECT',28,archive_y+60,W-56,42,'当前档案：玩家A / 玩家B  ▾' if state=='CS-10' else '当前档案：玩家A  ▾','CARD-F06',af)
  d.field('CARD-PLAYER-NAME',28,archive_y+112,W-56,42,'玩家昵称（可编辑）','CARD-F07',af)
  for i,(k,t) in enumerate([('SAVE','保存'),('LOAD','读取'),('NEW','新建')]):
   d.button('CARD-PROFILE-'+k,28+i*114,archive_y+169,106,44,t,'normal','CARD-F06',parent=af)
  d.button('CARD-PROFILE-DELETE',28,archive_y+226,W-56,42,'删除当前档案','danger','CARD-F06',parent=af)
  stat_y=archive_y+304
  stp=d.panel('CARD-STATS',14,stat_y,W-28,126,'抽取统计','CARD-F08 CARD-F09')
  d.chip('CARD-STATS-TOTAL',28,stat_y+63,150,'总抽取：4 次' if state=='CS-02' else '总抽取：0 次','CARD-F08',parent=stp)
  d.chip('CARD-STATS-CARD',199,stat_y+63,150,'卡片：2 张' if state=='CS-02' else '卡片：0 张','CARD-F08',parent=stp)
  yy=stat_y+142;coll=d.panel('CARD-COLLECTION',14,yy,W-28,545,'四季收集进度','CARD-F09 CARD-F10 CARD-F13 CARD-F14')
  collection_cards(d,28,yy+56,W-56,vals,True)
  d.chip('CARD-GOAL',28,yy+512,W-56,'目标：四季壁纸 → 终极视频','CARD-F14',parent=coll)
  h_y=yy+559;hp=d.panel('CARD-HISTORY',14,h_y,W-28,174,'最近四次抽取','CARD-F11')
  for i in range(4):d.chip('CARD-HISTORY-'+str(i),28,h_y+50+i*29,W-56,f'记录 {i+1}：'+('春季卡' if i<2 and state=='CS-07' else '暂无'),'CARD-F11',parent=hp)
  lg_y=h_y+190;lg=d.panel('CARD-LOGS',14,lg_y,W-28,168,'抽取日志','CARD-F11 CARD-F12')
  d.text(28,lg_y+69,'抽取日期 · 季节 · 结果' if state=='CS-09' else '暂无日志',12,'muted',parent=lg)
  d.button('CARD-LOG-COPY',28,lg_y+110,155,44,'复制日志','normal','CARD-F12',parent=lg)
  d.button('CARD-LOG-CSV',196,lg_y+110,155,44,'导出 CSV','normal','CARD-F12',parent=lg)
  if result:overlay(d,'OVL-RES-01')
  return
 margin=32; gap=20;left= min(720,round(W*.54));rightx=margin+left+gap;rightw=W-rightx-margin
 wp=d.panel('CARD-WHEEL-PANEL',margin,96,left,734 if H>=1000 else 704,'转盘抽取','CARD-F01 CARD-F02 CARD-F03 CARD-F04')
 r=min(236,(left-80)/2,260)
 wheel(d,margin+left/2,96+316,r,True,loading)
 d.button('CARD-ACTION-SPIN',margin+32,96+566,left-64,48,'素材加载中…' if loading else ('转动中…' if spinning else '抽取积分卡'),'disabled' if loading or spinning else 'primary','CARD-F03',state,wp)
 d.button('CARD-RESET',margin+32,96+628,(left-74)/2,44,'重置游戏','normal','CARD-F05',parent=wp)
 d.chip('CARD-RESULT-FEEDBACK',margin+44+(left-74)/2,96+637,(left-74)/2-6,'命中季节：春季卡' if result else '准备就绪','CARD-F04',parent=wp)
 ap=d.panel('CARD-ARCHIVE',rightx,96,rightw,184,'玩家档案','CARD-F06 CARD-F07')
 d.field('CARD-PROFILE-SELECT',rightx+14,145,rightw-28,36,'档案：玩家A / 玩家B  ▾' if state=='CS-10' else '档案：玩家A / 可切换','CARD-F06',ap)
 d.field('CARD-PLAYER-NAME',rightx+14,190,rightw-28,36,'当前昵称：玩家A','CARD-F07',ap)
 buttons=['SAVE','LOAD','NEW','DELETE'];titles=['保存','读取','新建','删除'];bw=(rightw-42)/4
 for i,b in enumerate(buttons):d.button('CARD-PROFILE-'+b,rightx+12+i*(bw+6),238,bw,34,titles[i],'normal','CARD-F06',parent=ap)
 sp=d.panel('CARD-STATS',rightx,294,rightw,92,'抽取统计','CARD-F08')
 d.chip('CARD-STATS-TOTAL',rightx+14,342,(rightw-38)/2,'总抽取：4' if state=='CS-02' else '总抽取：0','CARD-F08',parent=sp)
 d.chip('CARD-STATS-CARD',rightx+24+(rightw-38)/2,342,(rightw-38)/2,'积分卡：2' if state=='CS-02' else '积分卡：0','CARD-F08',parent=sp)
 cp=d.panel('CARD-COLLECTION',rightx,400,rightw,275,'四季进度 / 壁纸奖励','CARD-F09 CARD-F10 CARD-F13 CARD-F14')
 collection_cards(d,rightx+14,455,rightw-28,vals,False)
 d.chip('CARD-GOAL',rightx+14,643,rightw-28,'已解锁：四季壁纸 → 终极视频' if state=='CS-06' else '目标：每季 2 张 → 壁纸 → 终极视频','CARD-F14',parent=cp)
 hp=d.panel('CARD-HISTORY',rightx,689,rightw,101,'最近四次抽取','CARD-F11')
 for i in range(4):d.chip('CARD-HISTORY-'+str(i),rightx+14+i*(rightw-28)/4,735,(rightw-46)/4,'春季' if state=='CS-07' else '—','CARD-F11',parent=hp)
 lp=d.panel('CARD-LOGS',margin,818 if H>=1000 else 814,W-2*margin,165,'运营日志 / 数据导出','CARD-F11 CARD-F12')
 d.text(margin+22,885 if H>=1000 else 880,'抽取记录：季节 / 结果 / 时间' if state=='CS-09' else '暂无记录，抽取后生成日志',13,'muted',parent=lp)
 d.button('CARD-LOG-COPY',W-320,843 if H>=1000 else 838,132,44,'复制日志','normal','CARD-F12',parent=lp)
 d.button('CARD-LOG-CSV',W-178,843 if H>=1000 else 838,132,44,'导出 CSV','normal','CARD-F12',parent=lp)
 if result:overlay(d,'OVL-RES-01')

def overlay(d,state,viewport='desktop'):
 W,H=d.w,d.h;mobile=viewport=='mobile'
 # every overlay shares a visual and layer vocabulary, differentiated by content and state.
 names={'OVL-EVT-01':('厄运事件','轮盘旋转中','spin'),'OVL-EVT-02':('厄运事件','抽取结果','result'),
 'OVL-EVT-03':('冒险事件','抽取结果','result'),'OVL-EVT-04':('真心话','长文本事件','result'),
 'OVL-EVT-05':('特殊效果','效果结果','result'),'OVL-EVT-06':('混乱事件','动态八扇区','result'),
 'OVL-FIG-01':('周边抽取','轮盘旋转中','spin'),'OVL-FIG-02':('周边抽取','周边结果与稀有度','result'),
 'OVL-RES-01':('积分卡结果','本次未触发壁纸奖励','card'),
 'OVL-WALL-01':('壁纸奖励','配对达成 / 可领取','wall'),
 'OVL-WALL-02':('终极奖励','双图壁纸弹窗','wall-ultimate'),
 'OVL-VID-01':('终极奖励视频','视频播放','video'),
 'OVL-VID-02':('终极奖励视频','视频加载中','video-loading')}
 title,sub,kind=names.get(state,('事件','状态','result'))
 fmap = ('OVL-F01' if state in ('OVL-EVT-01','OVL-EVT-02') else
         'OVL-F02' if state=='OVL-EVT-03' else
         'OVL-F03' if state=='OVL-EVT-04' else
         'OVL-F04' if state=='OVL-EVT-05' else
         'OVL-F05' if state=='OVL-EVT-06' else
         'OVL-F06' if state.startswith('OVL-FIG') else
         'OVL-F07' if state.startswith('OVL-RES') else
         'OVL-F08' if state.startswith('OVL-WALL') else 'OVL-F09')
 backdrop=d.group('OVERLAY-BACKDROP',fmap,'modal','50-overlays');d.a('rect',{'x':0,'y':0,'width':W,'height':H,'fill':C['overlay'],'fill-opacity':'0.34'},backdrop)
 bw=W-28 if mobile else min(656,W*.64);bx=(W-bw)/2;bh=690 if mobile else (680 if kind.startswith('video') else 660);by=26 if mobile else (H-bh)/2
 mg=d.panel('OVERLAY-MODAL',bx,by,bw,bh,title,fmap,sub)
 # WallpaperRewardModal（wall/wall-ultimate）和 VideoRewardPlayer（video/video-loading）运行时无右上角关闭按钮。
 if kind not in ('wall','wall-ultimate','video','video-loading'):
  d.button('OVERLAY-CLOSE',bx+bw-61,by+14,44,42,'×','quiet',fmap,parent=mg)
 d.chip('OVERLAY-PHASE',bx+20,by+76,bw-40,sub,fmap,parent=mg)
 if kind in ('spin','result'):
  cx=bx+bw/2;cy=by+300;r=min(180,bw*.32)
  n=8 if state=='OVL-EVT-06' else 6
  wg=d.group('OVERLAY-WHEEL',fmap,'spinning' if kind=='spin' else 'result','20-content',mg)
  d.circle(cx,cy,r,'surface','accent',wg,2)
  for i in range(n):
   a=2*math.pi*i/n;d.line(cx,cy,cx+math.cos(a)*r,cy+math.sin(a)*r,'border',1,wg)
   mid=a+math.pi/n;xx=cx+math.cos(mid)*r*.62;yy=cy+math.sin(mid)*r*.62
   d.text(xx,yy,f'{i+1}',14,'ink',700,parent=wg,anchor='middle')
  d.circle(cx,cy,24,'accent','surface',wg,2)
  d.text(cx,cy,'转' if kind=='spin' else '中',14,'surface',700,anchor='middle',parent=wg)
  d.path(f'M {cx-11} {cy-r-11} L {cx+11} {cy-r-11} L {cx} {cy-r+15} Z','accent',None,wg)
  ry=by+506;d.rect(bx+24,ry,bw-48,99,'subtle','border',8,parent=mg)
  if kind=='spin':d.text(bx+40,ry+49,'旋转中，请稍候…',16,'ink',600,parent=mg)
  else:
   d.text(bx+40,ry+24,'本次结果',13,'muted',parent=mg)
   d.text(bx+40,ry+51,'根据业务事件数据展示真实文案',14,'ink',700,parent=mg)
   if state=='OVL-EVT-04':d.text(bx+40,ry+78,'较长内容需支持换行、纵向滚动与完整阅读',11,'muted',parent=mg)
   if state=='OVL-FIG-02':d.text(bx+40,ry+78,'周边奖励 / 稀有度 / 领取提示',11,'muted',parent=mg)
  d.button('OVERLAY-CONTINUE',bx+24,by+bh-54,bw-48,42,'等待结果…' if kind=='spin' else '确认结果并继续','disabled' if kind=='spin' else 'primary',fmap,kind,parent=mg)
 elif kind=='wall-ultimate':
  # 终极奖励双图弹窗：季节壁纸 + 电脑壁纸并排，按钮进入视频层（无右上角关闭）。
  cx=bx+bw/2
  asset=d.group('OVERLAY-REWARD-ARTWORK',fmap,'placeholder','20-content',mg)
  gw=(bw-48-16)/2
  d.rect(bx+24,by+150,gw,220,'subtle','border',8,parent=asset)
  d.text(bx+24+gw/2,by+248,'季节壁纸图占位',12,'muted',anchor='middle',parent=mg)
  d.rect(bx+40+gw,by+150,gw,220,'subtle','border',8,parent=asset)
  d.text(bx+40+gw*1.5,by+248,'电脑壁纸图占位',12,'muted',anchor='middle',parent=mg)
  d.text(bx+24+gw/2,by+392,'季节壁纸 · 已解锁',12,'ink',600,anchor='middle',parent=mg)
  d.text(bx+40+gw*1.5,by+392,'夏秋双面折扇',12,'ink',600,anchor='middle',parent=mg)
  d.text(cx,by+430,'终极大奖已解锁 · 双图展示',15,'ink',700,anchor='middle',parent=mg)
  d.text(cx,by+458,'指针命中与季节信息来自奖励数据；领取后进入终极视频层',11,'muted',anchor='middle',parent=mg)
  d.button('OVERLAY-CONTINUE',bx+24,by+bh-68,bw-48,48,'领取终极奖励','primary',fmap,parent=mg)
 elif kind in ('card','wall'):
  cx=bx+bw/2
  asset=d.group('OVERLAY-REWARD-ARTWORK',fmap,'placeholder','20-content',mg)
  d.rect(cx-146,by+137,292,295,'subtle','border',8,parent=asset)
  d.text(cx,by+270,'卡片 / 壁纸预览占位',17,'ink',650,parent=mg,anchor='middle')
  d.text(cx,by+471,'春季卡 × 1' if kind=='card' else '春季壁纸 · 已解锁',16,'ink',700,anchor='middle',parent=mg)
  d.text(cx,by+511,'奖励结果和领取状态来自已有数据',12,'muted',anchor='middle',parent=mg)
  d.button('OVERLAY-CONTINUE',bx+24,by+bh-68,bw-48,48,'关闭结果' if kind=='card' else '关闭并领取奖励','primary',fmap,parent=mg)
 else:
  asset=d.group('OVERLAY-VIDEO-ASSET',fmap,'placeholder','20-content',mg)
  d.rect(bx+26,by+136,bw-52,310,'#333B43',None,6,parent=asset)
  d.text(bx+bw/2,by+278,'播放区域 / 静态占位' if kind=='video' else '视频加载中…',17,'#FFFFFF',650,anchor='middle',parent=mg)
  d.text(bx+30,by+485,'视频状态：播放 / 加载 / 结束',14,'ink',600,parent=mg)
  d.text(bx+30,by+520,'奖励领取与关闭存在业务关联，不可删除',12,'muted',parent=mg)
  d.button('OVERLAY-CONTINUE',bx+24,by+bh-64,bw-48,46,'关闭并领取','primary',fmap,parent=mg)
 return

# Screenshot evidence manifest reconstructed from baseline manifest + filenames.
CANDIDATES={
 **{f'MON-{i:02d}': x for i,x in enumerate(['初始/掷骰可用','掷骰中禁用','棋子移动/操作禁用','待触发厄运/目标格','事件完成横幅','特殊效果系统提示','观众激活效果','前进后退方向选择','三观众选择/删除','日志空态','日志有记录','两份档案选择','读取与空日志反馈','七类图例','宽屏目标格 ring','P1/P2 双棋子','删除最后观众拒绝'],1)},
 'MON-wide':'宽屏全页/图例/系统效果',
 **{f'CARD-{i:02d}':t for i,t in enumerate(['卡图加载中','转盘就绪','抽取禁用中','抽卡结果覆盖层','移动端 0/2 收集'],1)},
 **{f'CS-{i:02d}':t for i,t in enumerate(['单档案头','非零统计','四季 0/2','春季 1/2','春季 2/2 待领取','四季壁纸已解锁','最近四条历史','积分卡日志空态','积分卡日志有数据','两档案选择'],1)},
 **{f'OVL-EVT-{i:02d}':t for i,t in enumerate(['厄运旋转','厄运结果','冒险结果','真心话长文案','特殊效果结果','混乱八扇区结果'],1)},
 'OVL-FIG-01':'周边旋转','OVL-FIG-02':'周边结果','OVL-RES-01':'无配对奖励卡结果','OVL-WALL-01':'壁纸奖励','OVL-WALL-02':'终极双图弹窗','OVL-VID-01':'终极视频播放','OVL-VID-02':'终极视频加载'
}
MON_FUN={
'MON-F01':'MON-HEADER MON-NAV-CARD','MON-F02':'MON-RESET','MON-F03':'MON-PROFILE-SELECT MON-PROFILE-SAVE MON-PROFILE-LOAD MON-PROFILE-NEW','MON-F04':'MON-AUDIENCE-EDIT','MON-F05':'MON-USER-COUNT MON-USER-INPUT MON-USER-ADD MON-USER-IMPORT MON-USER-DELETE MON-USER-SELECT',
'MON-F06':'MON-USER-DELETE','MON-F07':'MON-TURN-CONTROLS MON-DICE-RESULT','MON-F08':'MON-ACTION-ROLL MON-DIRECTION','MON-F09':'MON-BOARD','MON-F10':'MON-BOARD','MON-F11':'MON-ACTION-ROLL MON-BOARD','MON-F12':'MON-EFFECTS','MON-F13':'MON-FEEDBACK MON-LOGS','MON-F14':'MON-LOGS MON-LOG-COPY MON-LOG-CSV','MON-F15':'MON-LEGEND'}
CARD_FUN={
'CARD-F01':'CARD-WHEEL','CARD-F02':'CARD-WHEEL','CARD-F03':'CARD-ACTION-SPIN','CARD-F04':'CARD-RESULT-FEEDBACK','CARD-F05':'CARD-RESET CARD-BACK',
'CARD-F06':'CARD-PROFILE-SELECT CARD-PROFILE-SAVE CARD-PROFILE-LOAD CARD-PROFILE-NEW CARD-PROFILE-DELETE','CARD-F07':'CARD-PLAYER-NAME','CARD-F08':'CARD-STATS','CARD-F09':'CARD-COLLECTION','CARD-F10':'CARD-COLLECTION','CARD-F11':'CARD-HISTORY CARD-LOGS','CARD-F12':'CARD-LOG-COPY CARD-LOG-CSV','CARD-F13':'CARD-COLLECTION','CARD-F14':'CARD-GOAL'}
OVERLAY_FUN={f'OVL-F{i:02d}':'OVERLAY-MODAL OVERLAY-CLOSE OVERLAY-PHASE OVERLAY-CONTINUE' for i in range(1,10)}
# WallpaperRewardModal 和 VideoRewardPlayer 运行时均无右上角关闭控件。
OVERLAY_FUN['OVL-F08']='OVERLAY-MODAL OVERLAY-PHASE OVERLAY-CONTINUE'
OVERLAY_FUN['OVL-F09']='OVERLAY-MODAL OVERLAY-PHASE OVERLAY-CONTINUE'

def build_components():
 d=Doc(1280,900,'COMPONENT-LIBRARY')
 d.text(42,45,'基础组件库 / 功能型母版',26,'ink',700)
 d.text(42,78,'统一：8px 间距 / 8px 按钮圆角 / 12px 容器圆角 / 灰阶语义 / 原生可编辑文字',13,'muted')
 p=d.panel('LIB-BUTTONS',42,110,570,205,'Button / 操作控件')
 for i,(t,k) in enumerate([('主操作','primary'),('常规操作','normal'),('静默操作','quiet'),('禁用操作','disabled')]):d.button('COMP-BTN-'+str(i),60+(i%2)*270,165+(i//2)*70,242,48,t,k,parent=p)
 p=d.panel('LIB-INPUTS',638,110,600,205,'Field / 表单控件')
 d.field('COMP-FIELD',658,166,540,44,'文本输入 / placeholder',parent=p)
 d.field('COMP-SELECT',658,226,540,44,'档案选择 ▾',parent=p)
 p=d.panel('LIB-CHIPS',42,335,570,162,'Status / 状态标签')
 for i,t in enumerate(['正常','选中','不可用','正在执行','成功','失败']):d.chip('COMP-CHIP-'+str(i),60+(i%3)*176,392+(i//3)*40,166,t,parent=p)
 p=d.panel('LIB-CARD',638,335,600,162,'Card / 内容容器')
 d.rect(658,384,265,93,'subtle','border',8,parent=p);d.text(674,415,'容器标题',14,'ink',700,parent=p);d.text(674,449,'内容与说明',12,'muted',parent=p)
 d.rect(937,384,279,93,'surface','accent',8,parent=p);d.text(952,415,'状态强调容器',14,'ink',700,parent=p);d.text(952,449,'语义上需要强调时使用',12,'muted',parent=p)
 p=d.panel('LIB-NOTES',42,517,1196,318,'组件规则 / PSD 转换约束')
 for i,t in enumerate(['原生 SVG：rect / circle / path / text，不使用滤镜或图片描边模拟按钮。','所有控件分组具稳定 ID + data-func + data-state，组件可单独导入 PSD。','PSD 推荐按 SVG 中的 g 分组构造 Photoshop Group；文字转 Type Layer，简单轮廓转 Shape Layer。','不将同一页面展平为一张图片。每张画板具有独立尺寸，状态稿由同一套生成规则构建。','移动端画板允许长页面；390×844 是首屏视口，整页内容可纵向滚动。','后续视觉风格仅修改令牌和图形语义，不允许破坏现有 FUNC-ID / Component-ID。']):d.text(66,583+i*39,'• '+t,15,'ink',parent=p)
 return d.write('components/component-library.svg')

def build_component_fragments():
 outputs=[]
 for name in ['button','input','status-chip','board-cell','player-token','reward-card','modal-shell']:
  d=Doc(440,240,'COMPONENT-'+name.upper())
  d.text(24,31,name.upper(),18,'ink',700)
  if name=='button':
   d.button('COMP-BUTTON-PRIMARY',24,67,180,50,'主要操作','primary',state='default')
   d.button('COMP-BUTTON-DISABLED',215,67,200,50,'不可用','disabled',state='disabled')
   d.button('COMP-BUTTON-SECONDARY',24,137,391,48,'次要操作',state='default')
  elif name=='input':
   d.field('COMP-INPUT',24,74,392,48,'昵称输入 / placeholder')
   d.field('COMP-SELECT',24,138,392,48,'存档选择  ▾')
  elif name=='status-chip':
   d.chip('COMP-CHIP-DEFAULT',24,80,186,'当前状态：就绪')
   d.chip('COMP-CHIP-PENDING',226,80,190,'处理中 / 加载中')
   d.chip('COMP-CHIP-ERROR',24,132,392,'失败原因：操作被拒绝')
  elif name=='board-cell':
   g=d.group('COMP-BOARD-CELL','MON-F09','normal','20-content')
   d.rect(24,66,154,146,'subtle','border',8,parent=g)
   d.text(101,119,'厄运',22,'ink',700,anchor='middle',parent=g)
   d.text(101,159,'#02',16,'muted',anchor='middle',parent=g)
   g=d.group('COMP-BOARD-TARGET','MON-F11','target','40-status')
   d.rect(204,66,154,146,'accentFill','accent',8,parent=g,width=2)
   d.text(281,119,'目标格',20,'ink',700,anchor='middle',parent=g)
   d.text(281,159,'#02',16,'muted',anchor='middle',parent=g)
  elif name=='player-token':
   for i in range(3):
    g=d.group(f'COMP-TOKEN-P{i+1}','MON-F10','standing','40-status')
    d.circle(85+i*130,120,32,'accent' if i==0 else 'surface','accent',g,2)
    d.text(85+i*130,120,'P'+str(i+1),20,'surface' if i==0 else 'ink',700,anchor='middle',parent=g)
  elif name=='reward-card':
   g=d.group('COMP-REWARD-CARD','CARD-F10 CARD-F13','placeholder','20-content')
   d.rect(24,65,175,150,'subtle','border',8,parent=g)
   d.text(111,130,'季节卡 / 图像插槽',13,'muted',anchor='middle',parent=g)
   g=d.group('COMP-REWARD-INFO','CARD-F09 CARD-F14','progress','20-content')
   d.text(217,91,'春季',19,'ink',700,parent=g)
   d.text(217,125,'1 / 2 · 50%',14,'muted',parent=g)
   d.rect(217,146,196,8,'line',None,4,parent=g)
   d.rect(217,146,98,8,'accent',None,4,parent=g)
   d.text(217,177,'下一目标：壁纸解锁',12,'muted',parent=g)
  else:
   g=d.group('COMP-MODAL-SHELL','OVL-F01','ready','50-overlays')
   d.rect(24,61,392,160,'surface','border',12,parent=g)
   d.text(47,93,'弹层标题',20,'ink',700,parent=g)
   d.text(47,134,'状态 / 说明 / 结果槽',13,'muted',parent=g)
   d.button('COMP-MODAL-CLOSE',351,75,48,44,'×',parent=g)
   d.button('COMP-MODAL-CONFIRM',47,160,350,44,'确认并继续','primary',parent=g)
  outputs.append(d.write('components/'+name+'.svg'))
 return outputs

def run():
 outputs=[]
 for vp,(w,h) in {'desktop':(1440,900),'wide':(1920,1080),'tablet':(768,1024),'mobile':(390,2400)}.items():
  d=Doc(w,h,f'MONOPOLY-{vp.upper()}',viewport='390x844' if vp=='mobile' else None);monopoly(d,viewport=vp);outputs.append(d.write(f'pages/monopoly/{vp}.svg'))
  hh=2600 if vp=='mobile' else (2200 if vp=='tablet' else max(h,1000))
  d=Doc(w,hh,f'CARD-WHEEL-{vp.upper()}',viewport='390x844' if vp=='mobile' else None);cardwheel(d,viewport=vp);outputs.append(d.write(f'pages/card-wheel/{vp}.svg'))
 # each actual screenshot gets a semantically accurate state file derived from the common system.
 archive=ROOT/'states';shot_map={}
 with zipfile.ZipFile('/mnt/data/screenshots.zip') as z:
  for n in sorted(z.namelist()):
   if not n.endswith('.png') or not ('desktop/' in n or 'mobile/' in n):continue
   f=Path(n).name;part=f.split('.')[0]
   if part not in CANDIDATES:continue
   vp='mobile' if n.startswith('mobile/') or '/mobile/' in n else ('wide' if 'wide' in f else ('tablet' if 'tablet' in f else 'desktop'))
   w,h={'mobile':(390,2400),'tablet':(768,1024),'desktop':(1440,1050),'wide':(1920,1080)}[vp]
   if part.startswith('MON'):
    d=Doc(w,h,part+'-'+vp,'variant',f'{390}x844' if vp=='mobile' else None);monopoly(d,part,vp)
   elif part.startswith('CARD') or part.startswith('CS'):
    if vp=='mobile':h=2600
    if vp=='tablet':h=2200
    d=Doc(w,h,part+'-'+vp,'variant','390x844' if vp=='mobile' else None);cardwheel(d,part,vp)
   else:
    d=Doc(390 if vp=='mobile' else 1440,844 if vp=='mobile' else 900,part+'-'+vp,'variant');overlay(d,part,vp)
   dest=f'states/{part}.{vp}.svg'; outputs.append(d.write(dest));shot_map[n]={'id':part,'viewport':vp,'svg':dest,'description':CANDIDATES[part],'sourceScreenshot':n}
 # canonical overlays separate from screenshot state outputs; states/ carries the OVL-WALL-02 reachable variant.
 for sid in [s for s in CANDIDATES if s.startswith('OVL-') and s!='OVL-WALL-02']:
  d=Doc(1440,900,sid,'overlay');overlay(d,sid);outputs.append(d.write(f'overlays/{sid}.svg'))
  if sid in ('OVL-EVT-02','OVL-EVT-04','OVL-FIG-02','OVL-RES-01','OVL-WALL-01','OVL-VID-01'):
   d=Doc(390,844,sid+'-MOBILE','overlay','390x844');overlay(d,sid,'mobile');outputs.append(d.write(f'overlays/{sid}.mobile.svg'))
 outputs.append(build_components())
 outputs.extend(build_component_fragments())
 # OVL-WALL-02 已在新基线可达；v1 时代的 blocked 记录改写为已解决说明（保留文件名可追溯）。
 (ROOT/'contract'/'BLOCKED-OVL-WALL-02.md').write_text('''# OVL-WALL-02 — RESOLVED（v1.1）\n\n文件名保留 BLOCKED 字样仅为追溯 v1 记录；该候选在新基线（82c5160 修复后）已可达。\n\nv1 记载的阻塞原因：CardWheelPage 仅在 `pendingReward && !showVideoReward` 时渲染 WallpaperRewardModal，而 ultimate 奖励曾由 gameStore.addCard 同步置 `showVideoReward=true`。\n\n新基线流程（82c5160 起）：addCard(ultimate) 先只置 pendingReward，展示双图弹窗（本套件 states/OVL-WALL-02.desktop.svg），用户点击「领取终极奖励」→ claimUltimateReward 置 showVideoReward=true 进入视频层（OVL-VID-01/02）→ 关闭结束。\n\n可达性已由 ui-audit/manifest.json（OVL-WALL-02，status=ok，screenshots/desktop/OVL-WALL-02.desktop.png）证实。\n''',encoding='utf-8')
 matrix=[]
 for domain,m in [('monopoly',MON_FUN),('card-wheel',CARD_FUN),('overlay',OVERLAY_FUN)]:
  files=[p for p in outputs if ((domain=='monopoly' and ('pages/monopoly/' in p or '/MON-' in p)) or (domain=='card-wheel' and ('pages/card-wheel/' in p or '/CARD-' in p or '/CS-' in p)) or (domain=='overlay' and ('overlays/' in p or '/OVL-' in p)))]
  for fid,cids in m.items():
   sources=[]
   for path in files:
    tree=ET.parse(ROOT/path)
    for g in tree.iter():
     if fid in g.attrib.get('data-func','').split():
      sources.append(path);break
   matrix.append({'functionId':fid,'domain':domain,'componentIDs':cids.split(),'svgFiles':sources, 'mappedSvgCount':len(sources),'implementationVerification':'pending_source_code_audit','designCoverage':'mapped' if sources else 'missing'})
 state_matrix=[]
 for name,description in CANDIDATES.items():
  assoc=[shot_map[k]['svg'] for k in shot_map if shot_map[k]['id']==name]
  state_matrix.append({'candidate':name,'description':description,'baselineStatus':'ok', 'svgFiles':assoc,'designEvidence':'mapped' if assoc else 'missing'})
 manifest={'project':'520live','baselineCommit':'712032679abdf4e14926624148ad965db7050bb6','artDirection':'functional-neutral-grayscale','contract':'FSVG v1.1','source':'FSVG v1 kit synced to ui-audit baseline (capture commit 8dcf2151799088d97d6c53f5751a86b1b9a347dc, published ui-audit/manifest.json)','screenshots':shot_map,'svgFiles':outputs,'candidateCount':len(CANDIDATES),'mappedAvailableCandidates':sum(s['designEvidence']=='mapped' for s in state_matrix),'blockedCandidate':None,'notClaims':['runtime functionality not implemented by SVG','source-code complete audit not performed in this environment','SVG structural pass is not a React runtime test']}
 for f,obj in [('FUNCTION-MATRIX.json',matrix),('STATE-MATRIX.json',state_matrix),('SVG-MANIFEST.json',manifest)]: (ROOT/'contract'/f).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
 (ROOT/'contract'/'DESIGN-TOKENS.json').write_text(json.dumps({'colors':C,'fontFamily':BASE_FONT,'spacingScale':[4,8,12,16,24,32,48], 'radii':{'control':8,'panel':12,'board':14},'svgLayerNames':['10-layout','20-content','30-controls','40-status','50-overlays'],'typography':{'header':24,'section':16,'body':13,'caption':11},'artworkPolicy':'no decorative art in functional phase'},ensure_ascii=False,indent=2),encoding='utf-8')
 (ROOT/'README.md').write_text('''# 520live 功能型 SVG 设计套件 — v1.1\n\n**此版本为灰阶功能设计稿，不是 PSD，也不是已经实现的交互系统。**\n\n## 文件\n- `pages/`: 大富翁、积分卡各自的 Desktop/Wide/Tablet/Mobile 基础布局。\n- `states/`: 50 张基线截图逐张对应的状态 SVG（含 v1.1 新增的 OVL-WALL-02 终极双图弹窗）。状态图由共享模板生成，不是 50 套互不相干的设计组件。\n- `overlays/`: 事件、周边、抽卡结果、壁纸、终极视频及移动端弹层设计。\n- `components/`: 中性组件总览与 7 个独立可编辑组件母版。\n- `contract/FUNCTION-MATRIX.json`: 38 项功能 ID 的 SVG 存在性映射，**非完整业务实现证明**。\n- `contract/STATE-MATRIX.json`: 46 个成功候选的设计去向（v1.1 起 OVL-WALL-02 已可达并映射）。\n- `contract/SVG-MANIFEST.json`: 图片与 SVG 一一对应索引。\n- `contract/DESIGN-TOKENS.json`: 全局视觉令牌。\n- `contract/BLOCKED-OVL-WALL-02.md`: v1 时代 blocked 记录的已解决说明（文件名保留可追溯）。\n- `tools/build_svg.py`: 共享源生成器。\n- `tools/validate_svg.py`: SVG/ID/功能覆盖验证。\n\n## PSD 设计交接\n保留图层分组 ID 和 `data-func`，每个按钮、输入框、进度、棋盘格均是独立原生 SVG 对象。\nCardWheel PSD 试点已在 `ui-audit/psd/` 完成 Photoshop 实机验收；FSVG 套件整体转 PSD 仍待后续开展。\n不要把导入的整个 SVG 作为唯一 Smart Object 就声称全部可编辑。\n当前生成器没有内嵌外部图片；有艺术资源的位置均为清楚标注的占位矩形。\n\n## 重要限制\n截图 Manifest 和上传契约并不等于对所有源码路径的完整审计。\n这里的 **截图状态设计映射率** 可以达到 46/46，**代码功能覆盖率** 仍标记 Pending，不得称为已通过。\n移动端 SVG 是完整滚动页，标记首屏视口 390×844；不可把超过 844 的页面内容误认作裁切。\n\n## 重生成\n```bash\npy -3 tools/build_svg.py\npy -3 tools/validate_svg.py\n```\n源模板在 `tools/build_svg.py`，在生成的 SVG 中手动修改后再次构建将覆盖修改；定稿后建议复制到冻结的设计源目录，再转 PSD。\n''',encoding='utf-8')
 print('Generated SVGs',len(outputs),'candidates',len(CANDIDATES),'shots',len(shot_map),'function ids',len(matrix))
 return outputs,matrix,state_matrix,shot_map

if __name__=='__main__':run()
