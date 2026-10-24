"""Generate only the CARD-02 desktop pilot and its explicitly labelled concepts."""
from pathlib import Path
from html import escape
from subprocess import run

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
STATES = ROOT / 'states'
CONCEPTS = ROOT / 'concepts'
STATES.mkdir(parents=True, exist_ok=True)
CONCEPTS.mkdir(parents=True, exist_ok=True)

COL = dict(bg='#111A35', panel='#273257', deep='#1B2746', light='#F2F1F8', mist='#A397D4', gold='#C9AA76', white='#FCFAFF', muted='#AFB9D2', ink='#1D2948', edge='#455273', disabled='#4E5B78', disabledText='#CDD5E6')
SEASONS = [
    ('春季','春','spring','#704E70','#DDB4CD','春-积分卡.png'),
    ('夏季','夏','summer','#3D637A','#A8D1DA','夏-积分卡.png'),
    ('秋季','秋','autumn','#725459','#D9B79B','秋-积分卡.png'),
    ('冬季','冬','winter','#485B79','#B7C8E6','冬-积分卡.png'),
]

def rect(x,y,w,h,fill,rx=0,stroke=None,sw=1,extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+f' {extra}/>'

def text(x,y,s,size=14,fill=None,weight=600,anchor='start'):
    return f'<text x="{x}" y="{y}" fill="{fill or COL["white"]}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" dominant-baseline="middle">{escape(str(s))}</text>'

def grp(id_,body,func=None,state=None,role=None,extra=''):
    return f'<g id="{id_}"'+(f' data-func="{func}"' if func else '')+(f' data-state="{state}"' if state else '')+(f' data-role="{role}"' if role else '')+f' {extra}>{body}</g>'

def btn(id_,x,y,w,h,label,func=None,kind='secondary',state='default'):
    palette={'primary':(COL['mist'],COL['ink']),'secondary':(COL['panel'],COL['white']),'danger':('#4C354B','#F3CDD5'),'disabled':(COL['disabled'],COL['disabledText'])}
    bg,fg=palette[kind]
    return grp(id_,rect(x,y,w,h,bg,10)+text(x+w/2,y+h/2+1,label,14,fg,700,'middle'),func,state,'control')

def real_thumbnail(filename):
    path=REPO/'public'/filename
    script="const sharp=require('sharp'); sharp(process.argv[1]).resize(210,118,{fit:'contain',background:'#F2F1F8'}).jpeg({quality:86,chromaSubsampling:'4:4:4'}).toBuffer().then(b=>process.stdout.write(b.toString('base64'))).catch(e=>{console.error(e);process.exit(1)});"
    result=run(['node','-e',script,str(path)],cwd=REPO,capture_output=True,text=True,check=True)
    return 'data:image/jpeg;base64,'+result.stdout

ART={item[2]:real_thumbnail(item[5]) for item in SEASONS}

def svg(body,name):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1050" viewBox="0 0 1440 1050" data-design-system="Starry-Luxe-Clear-V2.1" data-artboard="{name}">
<title>{name} — 520live CARD-02 V2.1 视觉精修</title>
<desc>静态设计稿；原始卡牌图片的确定性缩略图内嵌为独立 SVG image 对象。轮盘视觉不执行抽奖算法。</desc>
<style>text {{ font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }}</style>
<defs>
<linearGradient id="night" x2="0" y2="1"><stop stop-color="#172240"/><stop offset="1" stop-color="#111A35"/></linearGradient>
<clipPath id="wheel-disc"><circle cx="640" cy="500" r="282"/></clipPath>
<clipPath id="art-spring"><rect x="648" y="322" width="210" height="118" rx="11"/></clipPath>
<clipPath id="art-summer"><rect x="648" y="560" width="210" height="118" rx="11"/></clipPath>
<clipPath id="art-autumn"><rect x="422" y="560" width="210" height="118" rx="11"/></clipPath>
<clipPath id="art-winter"><rect x="422" y="322" width="210" height="118" rx="11"/></clipPath>
</defs>{body}</svg>'''

def wheel(phase, result_example=False):
    a=[]
    a.append(grp('CARD-WHEEL-PANEL',rect(160,98,826,776,COL['deep'],22)+text(190,130,'四季轮盘',18,COL['white'],750)+text(190,157,'指针停下后，才会记录对应季节积分卡',13,COL['muted'],500),'CARD-F01 CARD-F02'))
    a.append(grp('CARD-WHEEL',f'<circle cx="640" cy="500" r="300" fill="{COL["panel"]}" stroke="{COL["edge"]}" stroke-width="2"/>'+'<circle cx="640" cy="500" r="288" fill="#1B2746"/>','CARD-F01 CARD-F02','ready' if phase=='READY' else phase.lower()))
    disc=[]
    paths=[
        'M640 500 L640 218 A282 282 0 0 1 922 500 Z',
        'M640 500 L922 500 A282 282 0 0 1 640 782 Z',
        'M640 500 L640 782 A282 282 0 0 1 358 500 Z',
        'M640 500 L358 500 A282 282 0 0 1 640 218 Z',
    ]
    # Clockwise visual positions: spring, summer, autumn, winter.
    for i,(name,mark,key,fill,accent,filename) in enumerate(SEASONS):
        x,y=[(648,322),(648,560),(422,560),(422,322)][i]
        disc.append(grp(f'CARD-SECTOR-{i+1}',f'<path d="{paths[i]}" fill="{fill}"/>' + f'<path d="{paths[i]}" fill="{accent}" opacity="0.13"/>'+'<path d="'+paths[i]+'" fill="none" stroke="#8390AF" stroke-opacity="0.28" stroke-width="1"/>', 'CARD-F01 CARD-F02',key,'visual-sector'))
        if phase not in ('LOADING','ERROR'):
            art=rect(x-3,y-3,216,124,COL['light'],13,accent,1)+f'<image x="{x}" y="{y}" width="210" height="118" href="{ART[key]}" clip-path="url(#art-{key})" preserveAspectRatio="xMidYMid meet"/>'
            disc.append(grp(f'CARD-WHEEL-ART-{i+1:02d}',art,'CARD-F01 CARD-F10','real-source-thumbnail','raster-art',f'data-source="public/{filename}"'))
        else:
            placeholder='图片加载中' if phase=='LOADING' else '图片未载入'
            disc.append(grp(f'CARD-WHEEL-ART-{i+1:02d}',rect(x,y,210,118,'#6C7691',11)+text(x+105,y+59,placeholder,13,COL['white'],550,'middle'),'CARD-F01 CARD-F10','loading-placeholder' if phase=='LOADING' else 'error-placeholder','temporary-placeholder'))
        label_y=463 if i in (0,3) else 705
        disc.append(text(x+105,label_y,name,19,COL['white'],750,'middle'))
    disc.append(grp('CARD-WHEEL-HUB',f'<circle cx="640" cy="500" r="43" fill="{COL["panel"]}" stroke="{COL["gold"]}" stroke-width="2"/>'+text(640,501,'四季',14,COL['white'],700,'middle'),'CARD-F02','center','decoration'))
    a.append(grp('CARD-ROTATING-DISC',''.join(disc),'CARD-F02','result-example' if result_example else phase.lower(),'visual-wheel', 'transform="rotate(-45 640 500)"' if result_example else ''))
    pointer_label='示例：春季' if result_example else '待抽取'
    a.append(grp('CARD-WHEEL-POINTER',rect(588,173,104,28,COL['panel'],9)+text(640,188,pointer_label,12,COL['white'],700,'middle')+f'<path d="M627 205 L653 205 L640 234 Z" fill="{COL["gold"]}"/>','CARD-F02','result-example' if result_example else 'neutral','pointer'))
    return ''.join(a)

def main(phase='READY', result_example=False):
    if phase not in ('READY','LOADING','SPINNING','ERROR'): raise ValueError(phase)
    a=[rect(0,0,1440,1050,'url(#night)')]
    for i,(x,y) in enumerate([(133,52),(334,78),(1364,185),(90,790),(1380,943)]):
        a.append(f'<circle id="ambient-star-{i+1}" cx="{x}" cy="{y}" r="1.5" fill="{COL["gold"]}" opacity="0.26" data-role="decoration"/>')
    a.append(grp('CARD-HEADER',rect(32,22,1376,54,COL['deep'],14)+text(54,49,'520live  /  积分卡转盘',20,COL['white'],750)+text(362,49,'四季收集',11,COL['muted'],500),'CARD-F05'))
    a.append(btn('CARD-BACK',1246,30,140,38,'← 返回棋盘','CARD-F05'))
    a.append(grp('CARD-TOOL-RAIL',rect(32,98,112,870,COL['deep'],18)+text(88,127,'工具',13,COL['muted'],600,'middle'),role='conceptual-disclosure'))
    for i,(label,y) in enumerate([('转盘',168),('收集',240),('档案',312),('记录',384)]):
        a.append(grp(f'CARD-TOOL-{i+1}',rect(43,y-24,90,56,COL['panel'] if i==0 else 'none',12)+text(88,y+4,label,14,COL['white'] if i==0 else COL['muted'],700,'middle'),role='conceptual-disclosure'))
    a.append(wheel(phase,result_example))
    a.append(grp('CARD-OPERATION-PANEL',rect(1002,200,406,674,COL['panel'],18)+text(1030,244,'本轮抽取',22,COL['white'],750)+text(1030,281,'四季积分卡',13,COL['muted'],550),'CARD-F03 CARD-F04 CARD-F05'))
    a.append(grp('CARD-PLAYER-SUMMARY',text(1030,345,'当前档案',13,COL['muted'],550)+text(1120,345,'存档 1 · 玩家',14,COL['white'],700),'CARD-F06 CARD-F07','design-example','summary'))
    status={'READY':('已就绪','卡图已载入，可以抽取'),'LOADING':('加载中','正在载入四季卡图'),'SPINNING':('抽取中','旋转结束前不能再次抽取'),'ERROR':('加载失败','卡图未能载入，请检查资源后重试')}[phase]
    if result_example: status=('设计示例：春季','指针落在春季扇区内部；非运行时结果')
    status_color='#F3CDD5' if phase=='ERROR' else COL['muted']
    a.append(grp('CARD-RESULT-FEEDBACK',text(1030,423,status[0],16,status_color,700)+text(1030,571,status[1],13,status_color,550),'CARD-F04', 'result-example' if result_example else phase.lower(),'status'))
    a.append(grp('CARD-SPIN-ELIGIBILITY',text(1030,387,'图片载入后可抽取',13,COL['muted'],550),'CARD-F03',phase.lower(),'informational'))
    label={'READY':'抽取积分卡','LOADING':'图片加载中…','SPINNING':'抽取中…','ERROR':'暂不可抽取'}[phase]
    if result_example: label='结果停靠示意 · 不可操作'
    a.append(btn('CARD-ACTION-SPIN',1030,465,350,76,label,'CARD-F03','primary' if phase=='READY' and not result_example else 'disabled','ready' if phase=='READY' and not result_example else 'disabled'))
    a.append(grp('CARD-RESET-SEPARATOR',rect(1030,714,350,1,COL['edge']),role='decoration'))
    a.append(grp('CARD-RESET-EXPLANATION',text(1030,742,'重置游戏不会返回棋盘',12,COL['muted'],550),'CARD-F05',role='informational'))
    a.append(btn('CARD-RESET',1030,769,350,52,'重置游戏','CARD-F05','danger' if phase!='SPINNING' else 'disabled','disabled' if phase=='SPINNING' else 'default'))
    a.append(grp('CARD-FOOTER',rect(160,897,1248,75,COL['panel'],14)+text(185,934,'当前收集',15,COL['white'],700)+text(318,934,'0 张 · 静态示例',13,COL['muted'],550)+text(1252,934,'查看收集 →',13,COL['muted'],600),'CARD-F09 CARD-F14','zero-progress','summary-not-control'))
    if phase=='ERROR':
        a.append(grp('CARD-ERROR-CONCEPT-NOTE',text(190,848,'设计提案：现有运行时尚未单独呈现加载错误',12,COL['muted'],550),state='not-implemented',role='concept-note'))
    return ''.join(a)

def expanded():
    a=[main(),rect(0,0,1440,1050,'#080D1D',extra='opacity="0.54"')]
    a.append(grp('CARD-TOOLS-DRAWER',rect(822,95,586,878,COL['light'],22)+text(851,131,'收集、档案与记录',21,COL['ink'],750)+text(851,159,'概念展开态 · 现有功能的承载',12,'#65708A',500),role='conceptual-panel'))
    a.append(grp('CARD-DRAWER-CLOSE',rect(1342,111,42,38,'#E6E6F1',9)+text(1363,131,'×',20,COL['ink'],700,'middle'),role='conceptual-disclosure'))
    a.append(grp('CARD-ARCHIVE',rect(846,185,538,235,'#FFFFFF',14)+text(866,213,'玩家档案',17,COL['ink'],750),'CARD-F06 CARD-F07'))
    a.append(grp('CARD-PROFILE-SELECT',rect(866,233,498,34,'#F2F1F8',8)+text(879,251,'当前档案：存档 1  ▾',13,COL['ink'],600),'CARD-F06','default','control'))
    a.append(grp('CARD-PLAYER-NAME',rect(866,274,328,34,'#F2F1F8',8)+text(879,292,'昵称：玩家',13,COL['ink'],550),'CARD-F07','editable','control'))
    a.append(btn('CARD-PLAYER-SAVE',1202,274,162,34,'保存名称','CARD-F07'))
    for id_,x,y,w,label,kind in [('CARD-PROFILE-SAVE',866,317,158,'保存存档','secondary'),('CARD-PROFILE-LOAD',1032,317,158,'读取存档','secondary'),('CARD-PROFILE-NEW',1198,317,166,'新建存档','secondary'),('CARD-PROFILE-DELETE',866,360,498,'删除当前存档','danger')]:
        a.append(btn(id_,x,y,w,35,label,'CARD-F06',kind))
    a.append(grp('CARD-STATS',rect(846,434,538,64,'#FFFFFF',12)+text(866,466,'抽取统计',15,COL['ink'],700),'CARD-F08','zero'))
    a.append(grp('CARD-STATS-TOTAL',text(1070,466,'总抽取 0',13,'#65708A',600),'CARD-F08','zero','status'))
    a.append(grp('CARD-STATS-CARD',text(1220,466,'积分卡 0',13,'#65708A',600),'CARD-F08','zero','status'))
    a.append(grp('CARD-COLLECTION',rect(846,509,538,226,'#FFFFFF',14)+text(866,538,'四季收集',16,COL['ink'],750),'CARD-F09 CARD-F10 CARD-F13 CARD-F14'))
    for i,(name,mark,key,fill,accent,_) in enumerate(SEASONS):
        x=866+(i%2)*254;y=554+(i//2)*70
        a.append(grp(f'CARD-SEASON-{i+1}',rect(x,y,244,62,'#F2F1F8',9)+rect(x+10,y+10,28,28,accent,7)+text(x+24,y+25,mark,13,COL['ink'],700,'middle')+text(x+47,y+22,name+'  0/2',13,COL['ink'],700)+text(x+47,y+45,'壁纸未解锁',11,'#65708A',550),'CARD-F09 CARD-F10 CARD-F13','zero','progress'))
    a.append(grp('CARD-GOAL',text(866,707,'首次同季 2 张可领取壁纸；后续奖励按现有规则',12,'#65708A',550),'CARD-F14','informational','goal-not-eligibility'))
    a.append(grp('CARD-HISTORY',rect(846,747,538,78,'#FFFFFF',12)+text(866,773,'最近抽取',15,COL['ink'],700)+text(866,801,'暂无记录',12,'#65708A',550),'CARD-F11','empty'))
    a.append(grp('CARD-LOGS',rect(846,836,538,113,'#FFFFFF',12)+text(866,863,'下播核对日志',15,COL['ink'],700)+text(866,891,'暂无记录 · 抽取后自动记录',12,'#65708A',550),'CARD-F11 CARD-F12','empty'))
    a.append(btn('CARD-LOG-COPY',866,904,238,34,'复制日志','CARD-F12'))
    a.append(btn('CARD-LOG-CSV',1114,904,250,34,'导出 CSV','CARD-F12'))
    return ''.join(a)

(STATES/'CARD-02.desktop.svg').write_text(svg(main(),'CARD-02-DESKTOP-V2.1'),encoding='utf-8')
(STATES/'CARD-02.LOADING.svg').write_text(svg(main('LOADING'),'CARD-02-LOADING-CONCEPT-V2.1'),encoding='utf-8')
(STATES/'CARD-02.SPINNING.svg').write_text(svg(main('SPINNING'),'CARD-02-SPINNING-CONCEPT-V2.1'),encoding='utf-8')
(CONCEPTS/'CARD-02.error-proposal.svg').write_text(svg(main('ERROR'),'CARD-02-ERROR-PROPOSAL-NOT-IMPLEMENTED-V2.1'),encoding='utf-8')
(CONCEPTS/'CARD-02.tools-expanded.svg').write_text(svg(expanded(),'CARD-02-TOOLS-EXPANDED-CONCEPT-V2.1'),encoding='utf-8')
(CONCEPTS/'CARD-02.pointer-result-example.svg').write_text(svg(main(result_example=True),'CARD-02-POINTER-RESULT-DESIGN-EXAMPLE-V2.1'),encoding='utf-8')
