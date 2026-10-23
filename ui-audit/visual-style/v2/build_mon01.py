"""Deterministic, isolated MON-01 visual pilot generator; never touches frozen FSVG."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
STATES = ROOT / 'states'
CONCEPTS = ROOT / 'concepts'
STATES.mkdir(parents=True, exist_ok=True)
CONCEPTS.mkdir(parents=True, exist_ok=True)

C = dict(bg='#111A35', panel='#273257', panel2='#1B2746', light='#F2F1F8', mist='#A397D4', gold='#C9AA76', white='#FCFAFF', muted='#AFB9D2', edge='#455273', ink='#1D2948')
KINDS = [
    ('积分', '◇', '#D5BD8D', '#39415C'), ('厄运', '!', '#D9A1AA', '#503A53'),
    ('冒险', '◆', '#E5B092', '#554353'), ('真心', '♥', '#E0A7C2', '#513F5D'),
    ('效果', '✦', '#A4C8D0', '#35505D'), ('周边', '▣', '#C5AFE3', '#443C61'),
    ('混乱', '◈', '#A9B5E0', '#3B4668'),
]

def rect(x, y, w, h, fill, rx=0, stroke=None, sw=1, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '') + f' {extra}/>'

def txt(x, y, value, size=14, color=None, weight=500, anchor='start', extra=''):
    return f'<text x="{x}" y="{y}" fill="{color or C["white"]}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" dominant-baseline="middle" {extra}>{escape(str(value))}</text>'

def group(id_, body, func=None, state=None, role=None):
    attrs = f' id="{id_}"' + (f' data-func="{func}"' if func else '') + (f' data-state="{state}"' if state else '') + (f' data-role="{role}"' if role else '')
    return f'<g{attrs}>{body}</g>'

def button(id_, x, y, w, h, label, func=None, kind='secondary', state='default'):
    fills = {'primary': (C['mist'], C['ink']), 'secondary': (C['panel'], C['white']), 'danger': ('#4C354B', '#F3CDD5')}
    fill, ink = fills[kind]
    return group(id_, rect(x,y,w,h,fill,10, '#665478' if kind=='danger' else None) + txt(x+w/2,y+h/2+1,label,14,ink,700,'middle'),func,state,'control')

def svg(body, title):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1050" viewBox="0 0 1440 1050" data-design-system="Starry-Luxe-Clear-V2" data-artboard="{title}">
<title>{title} — 520live 星夜轻奢视觉试点</title>
<desc>静态设计源；data-func 是业务映射，不代表 SVG 具有交互能力。</desc>
<style>text {{ font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }}</style>
<defs><linearGradient id="night" x2="0" y2="1"><stop stop-color="#172240"/><stop offset="1" stop-color="#111A35"/></linearGradient><linearGradient id="board-center" x2="0.8" y2="1"><stop stop-color="#202D50"/><stop offset="1" stop-color="#172341"/></linearGradient></defs>
{body}</svg>'''

def base():
    a=[]
    a.append(rect(0,0,1440,1050,'url(#night)'))
    # Only a few low-contrast stars; no decorative content inside functional text areas.
    for i,(x,y,r) in enumerate([(131,54,2),(322,78,1.5),(1031,57,1.4),(1364,184,1.6),(95,762,1.3),(1380,941,1.5)]):
        a.append(f'<circle id="ambient-star-{i+1}" cx="{x}" cy="{y}" r="{r}" fill="#C9AA76" opacity="0.32" data-role="decoration"/>')
    a.append(group('MON-HEADER', rect(32,22,1376,58,C['panel2'],14) + txt(54,51,'520live  /  大富翁',21,C['white'],750) + txt(337,52,'星夜棋局',12,C['muted'],500), 'MON-F01 MON-F02'))
    a.append(button('MON-NAV-CARD',1092,30,158,42,'积分抽奖 ↗','MON-F01'))
    a.append(button('MON-RESET',1260,30,126,42,'重置棋盘','MON-F02','danger'))
    # Compact tool rail. These are design-proposed disclosure surfaces, not existing routes.
    a.append(group('MON-TOOL-RAIL',rect(32,98,112,875,C['panel2'],18) + txt(88,127,'工具',13,C['muted'],600,'middle'),role='conceptual-disclosure'))
    for j,(label,y,active) in enumerate([('棋盘',168,True),('观众',240,False),('记录',312,False),('说明',384,False)]):
        a.append(group(f'MON-TOOL-{j+1}',rect(43,y-24,90,56,C['panel'] if active else 'none',12) + txt(88,y+4,label,14,C['white'] if active else C['muted'],700,'middle'),role='conceptual-disclosure'))
    a.append(group('MON-TURN-CONTROLS',rect(160,98,1248,120,C['panel'],18) + txt(190,129,'当前回合',12,C['muted'],650) + txt(190,166,'观众 · 第 1 回合',27,C['white'],750) + txt(488,139,'当前位置',12,C['muted'],600) + txt(488,170,'#01  积分',18,C['white'],700) + txt(668,139,'移动方向',12,C['muted'],600), 'MON-F07 MON-F08 MON-F11 MON-F12'))
    a.append(group('MON-DIRECTION',rect(650,155,112,34,C['panel2'],9) + txt(706,173,'前进 · 1 骰',13,C['white'],650,'middle'),'MON-F08 MON-F12','default','status-not-clickable'))
    a.append(group('MON-DICE-VISUAL',rect(798,122,66,66,C['light'],13) + rect(803,127,56,56,'#DDDDEA',10) + ''.join(f'<circle cx="{x}" cy="{y}" r="4" fill="{C["ink"]}"/>' for x,y in [(821,145),(841,145),(831,155),(821,165),(841,165)]),role='decoration'))
    a.append(group('MON-DICE-RESULT',txt(884,145,'六面骰',12,C['muted'],600) + txt(884,174,'等待掷骰',14,C['white'],650),'MON-F07','not-rolled','status-not-clickable'))
    a.append(button('MON-ACTION-ROLL',1190,129,190,58,'掷骰子前进','MON-F08 MON-F11','primary','ready'))
    a.append(group('MON-BOARD',rect(160,233,1248,710,C['panel2'],22) + rect(174,247,1220,682,'none',18,C['edge']) + txt(191,254,'28 格环形棋盘',13,C['muted'],650), 'MON-F09 MON-F10 MON-F11','ready'))
    # 8 top, 6 right, 8 bottom, 6 left = 28 in clockwise order.
    cells=[]
    for n in range(28):
        if n < 8: col,row=n,0
        elif n < 14: col,row=7,n-7
        elif n < 22: col,row=21-n,7
        else: col,row=0,28-n
        x,y=191+143*col,270+81*row
        label,icon,accent,fill=KINDS[n%7]
        active=n==0
        cell=rect(x,y,137,74,fill,10,C['gold'] if active else '#596079',2 if active else 0.6)
        cell+=rect(x+11,y+12,27,27,accent,7) + txt(x+24.5,y+27,icon,15,C['ink'],800,'middle')
        cell+=txt(x+47,y+26,label,15,C['white'],720) + txt(x+12,y+58,f'#{n+1:02d}',12,C['muted'],620)
        if active: cell+=group('MON-PLAYER-TOKEN-1',f'<circle cx="{x+112}" cy="{y+54}" r="15" fill="{C["gold"]}" stroke="{C["light"]}" stroke-width="2"/>'+txt(x+112,y+55,'P1',10,C['ink'],800,'middle'),'MON-F10','standing','player-token')
        cells.append(group(f'MON-CELL-{n+1:02d}',cell,'MON-F09 MON-F11','current' if active else 'normal','board-cell'))
    a.extend(cells)
    # Empty center: only non-semantic night background and faint stars.
    a.append(group('MON-BOARD-CENTER',rect(334,359,859,474,'url(#board-center)',18) + '<circle cx="454" cy="429" r="1.5" fill="#C9AA76" opacity="0.28"/><circle cx="1051" cy="721" r="1.5" fill="#C9AA76" opacity="0.22"/>',role='empty-center'))
    # Bottom information strip is contextual, not another permanent center card.
    a.append(group('MON-BOARD-STATUS',rect(175,958,1222,64,C['panel'],14) + txt(197,989,'棋盘就绪',15,C['white'],700) + txt(320,989,'当前 #01 积分   ·   等待掷骰   ·   暂无待处理事件',13,C['muted'],550),'MON-F09 MON-F10 MON-F11','ready','status'))
    a.append(group('MON-LAST-EVENT',txt(1179,989,'事件：无',12,C['muted'],550),'MON-F11 MON-F13','none','status'))
    return ''.join(a)

def expanded():
    a=[base(),rect(0,0,1440,1050,'#080D1D',0,None,1,'opacity="0.52"')]
    a.append(group('MON-TOOLS-DRAWER',rect(144,94,546,854,C['light'],22) + txt(174,128,'观众管理与记录',22,C['ink'],750) + txt(174,155,'概念展开态 · 现有功能的迁移承载',12,'#65708A',500),role='conceptual-panel'))
    # Disclosure tabs are not runtime buttons in this static pilot.
    for k,(label,x) in enumerate([('观众与档案',174),('记录',344),('轮盘说明',464)]):
        a.append(group(f'MON-DRAWER-TAB-{k+1}',rect(x,179,150 if k==0 else 112,36,C['panel'] if k==0 else '#E6E6F1',9)+txt(x+12,198,label,13,C['white'] if k==0 else C['ink'],650),role='conceptual-disclosure'))
    a.append(group('MON-AUDIENCE',rect(174,228,486,445,'#FFFFFF',14)+txt(194,253,'观众与档案',17,C['ink'],750),'MON-F03 MON-F04 MON-F05 MON-F06 MON-F12'))
    a.append(group('MON-USER-COUNT',txt(585,253,'1 位观众',12,'#66718B',600),'MON-F05','one','status'))
    a.append(group('MON-PROFILE-SELECT',rect(194,272,446,39,'#F2F1F8',8)+txt(209,293,'当前档案：默认档案  ▾',13,C['ink'],600),'MON-F03','default','control'))
    for id_,x,label in [('MON-PROFILE-SAVE',194,'保存'),('MON-PROFILE-LOAD',347,'读取'),('MON-PROFILE-NEW',500,'新档案')]:
        a.append(button(id_,x,321,140,38,label,'MON-F03'))
    a.append(group('MON-AUDIENCE-EDIT',rect(194,374,446,38,'#F2F1F8',8)+txt(209,394,'当前观众昵称：观众',13,C['ink'],550),'MON-F04','editable','control'))
    a.append(group('MON-USER-SELECT',rect(194,420,446,38,'#E7E4F0',8)+txt(209,440,'P1  观众   ·   #01  积分',13,C['ink'],650),'MON-F05','selected','control'))
    a.append(group('MON-USER-INPUT',rect(194,472,300,38,'#F2F1F8',8)+txt(207,492,'新增观众昵称',12,'#66718B',500),'MON-F05','empty','control'))
    a.append(button('MON-USER-ADD',506,472,134,38,'添加','MON-F05'))
    a.append(group('MON-USER-BULK',rect(194,518,446,51,'#F2F1F8',8)+txt(207,543,'批量导入：每行一个昵称，或逗号分隔',12,'#66718B',500),'MON-F05','empty','control'))
    a.append(button('MON-USER-IMPORT',194,580,286,42,'导入观众名单','MON-F05'))
    a.append(button('MON-USER-DELETE',491,580,149,42,'删除观众','MON-F05 MON-F06','danger'))
    a.append(group('MON-EFFECTS',txt(194,651,'当前效果：无',12,'#66718B',550),'MON-F12','none','status'))
    a.append(group('MON-LOGS',rect(174,690,486,168,'#FFFFFF',14)+txt(194,718,'下播核对记录',17,C['ink'],750)+txt(194,745,'暂无记录；行动后自动写入。',12,'#66718B',500),'MON-F13 MON-F14','empty'))
    a.append(button('MON-LOG-COPY',194,793,208,42,'复制日志','MON-F14'))
    a.append(button('MON-LOG-CSV',412,793,228,42,'导出 CSV','MON-F14'))
    a.append(group('MON-LEGEND',txt(174,888,'七类图例：积分 / 厄运 / 冒险 / 真心 / 效果 / 周边 / 混乱',12,C['ink'],600),'MON-F15','collapsed-content','informational'))
    a.append(group('MON-FEEDBACK',txt(174,919,'系统提示与上次事件：按状态显示',11,'#66718B',500),'MON-F13','none','status'))
    return ''.join(a)

(STATES/'MON-01.desktop.svg').write_text(svg(base(),'MON-01-DESKTOP-V2'),encoding='utf-8')
(CONCEPTS/'MON-01.tools-expanded.svg').write_text(svg(expanded(),'MON-01-TOOLS-EXPANDED-CONCEPT'),encoding='utf-8')
