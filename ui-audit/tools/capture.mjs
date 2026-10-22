import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const AUDIT_ROOT = path.join(ROOT, 'ui-audit');
const SCREEN_ROOT = path.join(AUDIT_ROOT, 'screenshots');
const DESKTOP_ROOT = path.join(SCREEN_ROOT, 'desktop');
const MOBILE_ROOT = path.join(SCREEN_ROOT, 'mobile');
const OVERVIEW_ROOT = path.join(SCREEN_ROOT, 'overview');
const ASSET_ROOT = path.join(AUDIT_ROOT, 'design-source', 'assets');
const BASE_URL = process.env.UI_AUDIT_BASE_URL || 'http://127.0.0.1:5173';
const BASELINE_COMMIT = '8dcf2151799088d97d6c53f5751a86b1b9a347dc';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  wide: { width: 1920, height: 1080 },
};

const FIXED_TIME = '2026-10-20T08:00:00.000Z';
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

function cardFixture({ counts = {}, wallpapers = {}, history = false } = {}) {
  const cardCollection = Object.fromEntries(SEASONS.map((season) => [season, counts[season] ?? 0]));
  const wallpaperCollection = Object.fromEntries(SEASONS.map((season) => [season, wallpapers[season] ?? false]));
  const spinHistory = history
    ? [
        { id: 'spin-4', season: 'winter', label: '冬季积分卡', rewardStatus: 'ultimate', createdAt: FIXED_TIME },
        { id: 'spin-3', season: 'autumn', label: '秋季积分卡', rewardStatus: 'wallpaper', createdAt: FIXED_TIME },
        { id: 'spin-2', season: 'summer', label: '夏季积分卡', rewardStatus: 'none', createdAt: FIXED_TIME },
        { id: 'spin-1', season: 'spring', label: '春季积分卡', rewardStatus: 'none', createdAt: FIXED_TIME },
      ]
    : [];
  const auditLogs = history
    ? [
        { id: 'gift-log-4', type: 'reward_unlocked', playerName: '截图用户', note: '解锁终极奖励：冬季终极奖励', createdAt: FIXED_TIME },
        { id: 'gift-log-3', type: 'reward_claimed', playerName: '截图用户', note: '已领取秋季壁纸', createdAt: FIXED_TIME },
        { id: 'gift-log-2', type: 'card_spin', playerName: '截图用户', note: '抽中夏季积分卡，当前进度 1/2', createdAt: FIXED_TIME },
        { id: 'gift-log-1', type: 'card_spin', playerName: '截图用户', note: '抽中春季积分卡，当前进度 1/2', createdAt: FIXED_TIME },
      ]
    : [];
  const totalSpins = history ? 4 : Object.values(cardCollection).reduce((sum, value) => sum + value, 0);
  const userProfile = {
    id: 'capture-user-0001',
    nickname: '截图用户',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  };
  const archive = {
    id: 'capture-card-1',
    name: '存档 1',
    userProfile,
    cardCollection,
    wallpaperCollection,
    totalSpins,
    cardSpins: totalSpins,
    spinHistory,
    lastSpin: spinHistory[0] ?? null,
    auditLogs,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  };
  return {
    state: {
      currentArchiveId: archive.id,
      archiveSlots: [archive],
      userProfile,
      cardCollection,
      wallpaperCollection,
      totalSpins,
      cardSpins: totalSpins,
      spinHistory,
      lastSpin: spinHistory[0] ?? null,
      auditLogs,
      pendingReward: null,
      showVideoReward: false,
    },
    version: 2,
  };
}

function monopolyFixture({ position = 0, players = null, effects = [], logs = [] } = {}) {
  const seededPlayers = players ?? [
    {
      id: 'capture-player-1',
      name: '观众A',
      position,
      diceCount: 1,
      moveDirection: 1,
      isMoving: false,
      activeEffects: effects,
    },
  ];
  const archive = {
    id: 'capture-monopoly-1',
    name: '截图观众档案',
    players: seededPlayers,
    currentPlayerIndex: 0,
    currentTurn: 0,
    logs,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  };
  return {
    state: {
      currentArchiveId: archive.id,
      archiveSlots: [archive],
      players: seededPlayers,
      currentPlayerIndex: 0,
      currentTurn: 0,
      logs,
    },
    version: 1,
  };
}

const CARD_ZERO = cardFixture();
const CARD_SPRING_1 = cardFixture({ counts: { spring: 1 } });
const CARD_SPRING_2 = cardFixture({ counts: { spring: 2 } });
const CARD_ALL_UNLOCKED = cardFixture({
  wallpapers: { spring: true, summer: true, autumn: true, winter: true },
});
const CARD_HISTORY = cardFixture({
  counts: { spring: 1, summer: 1, autumn: 0, winter: 0 },
  wallpapers: { autumn: true, winter: true },
  history: true,
});

function effect(type, description) {
  return { type, remainingUses: 1, description };
}

async function prepareDirectories() {
  await mkdir(DESKTOP_ROOT, { recursive: true });
  await mkdir(MOBILE_ROOT, { recursive: true });
  await mkdir(OVERVIEW_ROOT, { recursive: true });
  await mkdir(ASSET_ROOT, { recursive: true });

  for (const directory of [DESKTOP_ROOT, MOBILE_ROOT, OVERVIEW_ROOT]) {
    const entries = await readdir(directory);
    await Promise.all(entries.filter((entry) => entry.endsWith('.png') || entry.endsWith('.html')).map((entry) => rm(path.join(directory, entry), { force: true })));
  }
}

async function copyDesignAssets() {
  const names = [
    '大富翁棋盘.png',
    '春-积分卡.png', '夏-积分卡.png', '秋-积分卡.png', '冬-积分卡.png',
    '春-壁纸.png', '夏-壁纸.png', '秋-壁纸.png', '冬-壁纸.png',
    '电脑壁纸.png', '动态壁纸.mp4', 'favicon.svg',
  ];
  for (const name of names) {
    await copyFile(path.join(ROOT, 'public', name), path.join(ASSET_ROOT, name));
  }
}

function initPayload(card, monopoly) {
  return { card: card ?? CARD_ZERO, monopoly: monopoly ?? monopolyFixture() };
}

async function newAuditPage(context, { viewport = 'desktop', card, monopoly, delayCards = false, delayVideo = false } = {}) {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORTS[viewport]);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(({ card: cardSeed, monopoly: monopolySeed }) => {
    localStorage.clear();
    localStorage.setItem('season-wheel-game-state', JSON.stringify(cardSeed));
    localStorage.setItem('monopoly-audience-state', JSON.stringify(monopolySeed));

    let randomQueue = [];
    let cryptoQueue = [];
    Math.random = () => (randomQueue.length ? randomQueue.shift() : 1 / 12);
    globalThis.__captureSetRandomQueue = (values) => { randomQueue = [...values]; };

    const nativeGetRandomValues = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) => {
      if (!cryptoQueue.length) return nativeGetRandomValues(array);
      for (let index = 0; index < array.length; index += 1) {
        const unit = cryptoQueue.length ? cryptoQueue.shift() : 0.5;
        array[index] = Math.min(0xffffffff, Math.floor(unit * 0x100000000));
      }
      return array;
    };
    globalThis.__captureSetCryptoQueue = (values) => { cryptoQueue = [...values]; };
  }, initPayload(card, monopoly));

  if (delayCards || delayVideo) {
    await page.route('**/*', async (route) => {
      const requestPath = decodeURIComponent(new URL(route.request().url()).pathname);
      if (delayCards && requestPath.endsWith('-积分卡.png')) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      if (delayVideo && requestPath.endsWith('动态壁纸.mp4')) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      await route.continue();
    });
  }

  return { page, consoleErrors, pageErrors };
}

async function gotoMonopoly(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '大富翁互动系统' }).waitFor();
}

async function gotoCard(page, { waitReady = true } = {}) {
  await page.goto(`${BASE_URL}/card-wheel`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '积分卡转盘' }).waitFor();
  if (waitReady) {
    await page.locator('canvas').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: '抽取积分卡' }).waitFor({ state: 'visible' });
  }
}

async function rollToPending(page, position = 0) {
  await page.getByRole('button', { name: '掷骰子前进' }).click();
  await page.getByRole('button', { name: /^触发事件：/ }).waitFor({ state: 'visible', timeout: 7000 });
  return position;
}

async function openEvent(page, { selectedUnit = 0.01 } = {}) {
  await page.evaluate((unit) => globalThis.__captureSetRandomQueue([unit, 0.01]), selectedUnit);
  await page.getByRole('button', { name: /^触发事件：/ }).click();
}

async function waitEventResult(page) {
  await page.getByText(/抽中事件 \d+/).waitFor({ state: 'visible', timeout: 7000 });
}

async function spinSpring(page) {
  await page.evaluate(() => globalThis.__captureSetCryptoQueue([0.75, 0]));
  await page.getByRole('button', { name: '抽取积分卡' }).click();
}

async function waitSpinComplete(page) {
  await page.getByText(/指针命中：.*积分卡/).first().waitFor({ state: 'visible', timeout: 8000 });
}

async function scrollCollection(page) {
  await page.getByRole('heading', { name: '📊 玩家收集档案' }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
}

const candidates = [
  { id: 'MON-01', area: 'monopoly', route: '/', class: 'auto', expected: '初始态：1 位观众、0 日志、掷骰按钮可用', viewports: ['desktop', 'mobile', 'tablet'], action: async (page) => gotoMonopoly(page) },
  { id: 'MON-02', area: 'monopoly', route: '/', class: 'auto', expected: '掷骰中禁用态与骰子提示', action: async (page) => { await gotoMonopoly(page); await page.getByRole('button', { name: '掷骰子前进' }).click(); await page.getByRole('button', { name: '掷骰中...' }).waitFor(); await page.waitForTimeout(250); } },
  { id: 'MON-03', area: 'monopoly', route: '/', class: 'auto', expected: '棋子逐格移动中，按钮禁用', monopoly: monopolyFixture({ position: 0 }), action: async (page) => { await gotoMonopoly(page); await page.evaluate(() => globalThis.__captureSetRandomQueue([7 / 12])); await page.getByRole('button', { name: '掷骰子前进' }).click(); await page.waitForTimeout(1770); } },
  { id: 'MON-04', area: 'monopoly', route: '/', class: 'data', expected: '厄运事件待触发按钮与目标格高亮', monopoly: monopolyFixture({ position: 0 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); } },
  { id: 'MON-05', area: 'monopoly', route: '/', class: 'data', expected: '事件完成后的上次事件横幅', monopoly: monopolyFixture({ position: 0 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await waitEventResult(page); await page.getByRole('button', { name: '关闭轮盘' }).click(); await page.getByText(/^上次事件：/).waitFor(); } },
  { id: 'MON-06', area: 'monopoly', route: '/', class: 'data', expected: '特殊效果系统提示与效果 chip', monopoly: monopolyFixture({ position: 3 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page, { selectedUnit: 0.01 }); await waitEventResult(page); await page.getByRole('button', { name: '关闭轮盘' }).click(); await page.getByText(/系统提示：.*下次掷骰/).waitFor(); } },
  { id: 'MON-07', area: 'monopoly', route: '/', class: 'data', expected: '当前观众激活效果胶囊', monopoly: monopolyFixture({ effects: [effect('auto_lottery', '经过积分抽奖格自动抽奖')] }), action: async (page) => { await gotoMonopoly(page); await page.getByText('经过积分抽奖格自动抽奖', { exact: true }).waitFor(); } },
  { id: 'MON-08', area: 'monopoly', route: '/', class: 'data', expected: '前进/后退方向选择器', monopoly: monopolyFixture({ effects: [effect('choose_direction', '选择移动方向')] }), action: async (page) => { await gotoMonopoly(page); await page.getByRole('button', { name: '后退' }).click(); } },
  { id: 'MON-09', area: 'monopoly', route: '/', class: 'auto', expected: '三位观众列表、当前项高亮与删除控件', action: async (page) => { await gotoMonopoly(page); await page.getByLabel('批量导入观众').fill('观众A\n观众B\n观众C'); await page.getByRole('button', { name: '导入观众名单' }).click(); await page.getByText('已导入 3 位观众', { exact: true }).waitFor(); } },
  { id: 'MON-10', area: 'monopoly', route: '/', class: 'auto', expected: '日志面板空态', action: async (page) => { await gotoMonopoly(page); await page.getByText(/暂无日志/).waitFor(); } },
  { id: 'MON-11', area: 'monopoly', route: '/', class: 'auto', expected: '日志面板含骰子、移动或事件记录', action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await page.getByText(/掷骰 1 = 1/).waitFor(); } },
  { id: 'MON-12', area: 'monopoly', route: '/', class: 'auto', expected: '新建后档案下拉含两项', action: async (page) => { await gotoMonopoly(page); await page.getByRole('button', { name: '新档案' }).click(); if (await page.locator('select[aria-label="切换观众档案"] option').count() !== 2) throw new Error('Expected two monopoly archives'); } },
  { id: 'MON-13', area: 'monopoly', route: '/', class: 'auto', expected: '读取成功与空日志复制反馈（同一候选状态的文本变体）', action: async (page) => { await gotoMonopoly(page); await page.getByRole('button', { name: '读取', exact: true }).click(); await page.getByText(/已读取本地观众档案/).waitFor(); await page.getByRole('button', { name: '复制', exact: true }).click(); await page.getByText('暂无大富翁日志可复制').waitFor(); } },
  { id: 'MON-14', area: 'monopoly', route: '/', class: 'auto', expected: '轮盘说明 7 行图例', action: async (page) => { await gotoMonopoly(page); await page.getByText('轮盘说明').waitFor(); await page.getByText(/混乱/).last().waitFor(); } },
  { id: 'MON-15', area: 'monopoly', route: '/', class: 'data', expected: '宽屏棋盘目标格 ring 高亮', viewport: 'wide', monopoly: monopolyFixture({ position: 0 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); } },
  { id: 'MON-16', area: 'monopoly', route: '/', class: 'auto', expected: '棋盘同时显示 P1、P2 棋子', action: async (page) => { await gotoMonopoly(page); await page.getByLabel('批量导入观众').fill('观众A\n观众B'); await page.getByRole('button', { name: '导入观众名单' }).click(); await page.getByText('P2', { exact: true }).waitFor(); } },
  { id: 'MON-17', area: 'monopoly', route: '/', class: 'auto', expected: '删除唯一观众被拒并显示系统提示', action: async (page) => { await gotoMonopoly(page); await page.getByRole('button', { name: /删除 观众A/ }).click(); await page.getByText(/至少需要保留一位观众/).waitFor(); } },
  { id: 'MON-wide', area: 'monopoly', route: '/', class: 'data', expected: '宽屏完整两栏、棋盘、系统提示和效果胶囊', viewport: 'wide', fullPage: true, monopoly: monopolyFixture({ effects: [effect('extra_dice', '再 +1 骰子（下次掷骰）')] }), action: async (page) => gotoMonopoly(page) },

  { id: 'CARD-01', area: 'card', route: '/card-wheel', class: 'auto', expected: '积分卡图片加载中 spinner', viewports: ['desktop', 'mobile'], delayCards: true, action: async (page) => { await gotoCard(page, { waitReady: false }); await page.getByText('加载积分卡...').waitFor(); } },
  { id: 'CARD-02', area: 'card', route: '/card-wheel', class: 'auto', expected: '转盘就绪、抽取按钮可用', viewports: ['desktop', 'mobile'], action: async (page) => gotoCard(page) },
  { id: 'CARD-03', area: 'card', route: '/card-wheel', class: 'auto', expected: '抽取中禁用态', action: async (page) => { await gotoCard(page); await spinSpring(page); await page.getByRole('button', { name: '抽取中...' }).waitFor(); await page.waitForTimeout(1200); } },
  { id: 'CARD-04', area: 'card', route: '/card-wheel', class: 'data', expected: '命中横幅与无奖励抽卡结果弹窗', card: CARD_ZERO, action: async (page) => { await gotoCard(page); await spinSpring(page); await waitSpinComplete(page); await page.getByRole('button', { name: '关闭结果' }).waitFor(); } },
  { id: 'CARD-05', area: 'card', route: '/card-wheel', class: 'auto', expected: '移动端整体与初始 0/2 收集状态', viewport: 'mobile', action: async (page) => gotoCard(page) },
  { id: 'CS-01', area: 'card', route: '/card-wheel', class: 'auto', expected: '单存档档案头', action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText(/当前：存档 1/).waitFor(); } },
  { id: 'CS-02', area: 'card', route: '/card-wheel', class: 'data', expected: '统计非零状态（另验证初始值为 0）', card: CARD_HISTORY, action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText('4', { exact: true }).first().waitFor(); } },
  { id: 'CS-03', area: 'card', route: '/card-wheel', class: 'auto', expected: '四季卡 0/2 与 0% 进度', action: async (page) => { await gotoCard(page); await scrollCollection(page); if (await page.getByText('0/2', { exact: true }).count() !== 4) throw new Error('Expected four 0/2 season cards'); } },
  { id: 'CS-04', area: 'card', route: '/card-wheel', class: 'data', expected: '春季 1/2、进度 50%', card: CARD_SPRING_1, action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText('1/2', { exact: true }).waitFor(); } },
  { id: 'CS-05', area: 'card', route: '/card-wheel', class: 'data', expected: '春季 2/2 待领取样式', card: CARD_SPRING_2, action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText('2/2', { exact: true }).waitFor(); } },
  { id: 'CS-06', area: 'card', route: '/card-wheel', class: 'data', expected: '四季壁纸已解锁与终极奖励目标', card: CARD_ALL_UNLOCKED, action: async (page) => { await gotoCard(page); await scrollCollection(page); if (await page.getByText('已解锁', { exact: true }).count() !== 4) throw new Error('Expected four unlocked seasons'); } },
  { id: 'CS-07', area: 'card', route: '/card-wheel', class: 'data', expected: '最近四条历史 chips', card: CARD_HISTORY, action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText(/积分卡 · 冬季积分卡/).waitFor(); } },
  { id: 'CS-08', area: 'card', route: '/card-wheel', class: 'auto', expected: '积分卡日志空态', action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText(/暂无日志，开始抽取后会自动记录/).waitFor(); } },
  { id: 'CS-09', area: 'card', route: '/card-wheel', class: 'data', expected: '积分卡日志列表', card: CARD_HISTORY, action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByText(/解锁终极奖励/).waitFor(); } },
  { id: 'CS-10', area: 'card', route: '/card-wheel', class: 'auto', expected: '新建后存档下拉含两项', action: async (page) => { await gotoCard(page); await scrollCollection(page); await page.getByRole('button', { name: '新建存档' }).click(); if (await page.locator('select[aria-label="切换存档"] option').count() !== 2) throw new Error('Expected two card archives'); } },

  { id: 'OVL-EVT-01', area: 'overlay', route: '/', class: 'data', expected: '厄运轮盘旋转中', monopoly: monopolyFixture({ position: 0 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await page.getByRole('heading', { name: /厄运事件轮盘/ }).waitFor(); await page.waitForTimeout(350); } },
  { id: 'OVL-EVT-02', area: 'overlay', route: '/', class: 'data', expected: '厄运轮盘结果卡', monopoly: monopolyFixture({ position: 0 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await waitEventResult(page); } },
  { id: 'OVL-EVT-03', area: 'overlay', route: '/', class: 'data', expected: '冒险事件轮盘结果', monopoly: monopolyFixture({ position: 1 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await waitEventResult(page); } },
  { id: 'OVL-EVT-04', area: 'overlay', route: '/', class: 'data', expected: '真心话轮盘结果与长文案', monopoly: monopolyFixture({ position: 2 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page, { selectedUnit: 0.2 }); await waitEventResult(page); } },
  { id: 'OVL-EVT-05', area: 'overlay', route: '/', class: 'data', expected: '特殊效果轮盘结果', monopoly: monopolyFixture({ position: 3 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await waitEventResult(page); } },
  { id: 'OVL-EVT-06', area: 'overlay', route: '/', class: 'data', expected: '混乱轮盘 8 动态扇区结果', monopoly: monopolyFixture({ position: 5 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await waitEventResult(page); } },
  { id: 'OVL-FIG-01', area: 'overlay', route: '/', class: 'data', expected: '实体周边轮盘旋转中', monopoly: monopolyFixture({ position: 4 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await page.getByText('抽取周边中...').waitFor(); await page.waitForTimeout(350); } },
  { id: 'OVL-FIG-02', area: 'overlay', route: '/', class: 'data', expected: '实体周边轮盘结果', monopoly: monopolyFixture({ position: 4 }), action: async (page) => { await gotoMonopoly(page); await rollToPending(page); await openEvent(page); await page.getByText(/活动海报 · 实体周边/).waitFor({ timeout: 6000 }); } },
  { id: 'OVL-RES-01', area: 'overlay', route: '/card-wheel', class: 'data', expected: '无配对奖励的抽卡结果弹窗', card: CARD_ZERO, action: async (page) => { await gotoCard(page); await spinSpring(page); await waitSpinComplete(page); await page.getByRole('button', { name: '关闭结果' }).waitFor(); } },
  { id: 'OVL-WALL-01', area: 'overlay', route: '/card-wheel', class: 'data', expected: '首次配对的壁纸奖励弹窗', card: cardFixture({ counts: { spring: 1, summer: 1, autumn: 1, winter: 1 } }), action: async (page) => { await gotoCard(page); await spinSpring(page); await waitSpinComplete(page); await page.getByRole('button', { name: /领取壁纸/ }).waitFor(); } },
  { id: 'OVL-WALL-02', area: 'overlay', route: '/card-wheel', class: 'data', expected: '终极奖励双图壁纸弹窗', card: cardFixture({ counts: { spring: 1, summer: 1, autumn: 1, winter: 1 }, wallpapers: { spring: true, summer: true, autumn: true, winter: true } }), action: async (page) => { await gotoCard(page); await spinSpring(page); await waitSpinComplete(page); await page.getByRole('button', { name: '领取终极奖励' }).waitFor(); await page.getByText('夏秋双面折扇').first().waitFor(); } },
  { id: 'OVL-VID-01', area: 'overlay', route: '/card-wheel', class: 'data', expected: '终极视频全屏播放层', card: cardFixture({ counts: { spring: 1, summer: 1, autumn: 1, winter: 1 }, wallpapers: { spring: true, summer: true, autumn: true, winter: true } }), action: async (page) => { await gotoCard(page); await spinSpring(page); await waitSpinComplete(page); await page.getByRole('button', { name: '领取终极奖励' }).click(); await page.locator('video').waitFor(); await page.waitForFunction(() => { const video = document.querySelector('video'); return video && !video.paused && video.readyState >= 2; }, null, { timeout: 8000 }); await page.waitForFunction(() => { const video = document.querySelector('video'); return video && !Array.from(video.parentElement?.children ?? []).some((node) => node.classList.contains('justify-center') && node.querySelector('.animate-spin')); }, null, { timeout: 3000 }); } },
  { id: 'OVL-VID-02', area: 'overlay', route: '/card-wheel', class: 'data', delayVideo: true, expected: '终极视频加载 spinner 瞬间', card: cardFixture({ counts: { spring: 1, summer: 1, autumn: 1, winter: 1 }, wallpapers: { spring: true, summer: true, autumn: true, winter: true } }), action: async (page) => { await gotoCard(page); await spinSpring(page); await waitSpinComplete(page); await page.getByRole('button', { name: '领取终极奖励' }).click(); await page.locator('video').waitFor(); await page.locator('div.animate-spin').last().waitFor({ state: 'visible' }); } },
];

if (candidates.length !== 46) {
  throw new Error(`Enumerated capture matrix must contain 46 candidates, found ${candidates.length}`);
}

function outputFile(id, viewport, index, fullPage) {
  const directory = viewport === 'mobile' ? MOBILE_ROOT : DESKTOP_ROOT;
  const suffix = index > 0 ? `.${index + 1}` : '';
  const viewportSuffix = viewport === 'desktop' ? 'desktop' : viewport;
  return path.join(directory, `${id}.${viewportSuffix}${suffix}${fullPage ? '.full' : ''}.png`);
}

async function fileHash(file) {
  const bytes = await readFile(file);
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function captureOne(context, candidate, viewport, index) {
  const audit = await newAuditPage(context, {
    viewport,
    card: candidate.card,
    monopoly: candidate.monopoly,
    delayCards: candidate.delayCards,
    delayVideo: candidate.delayVideo,
  });
  const { page, consoleErrors, pageErrors } = audit;
  const file = outputFile(candidate.id, viewport, index, candidate.fullPage);
  const startedAt = new Date().toISOString();
  try {
    await candidate.action(page);
    await page.screenshot({ path: file, fullPage: Boolean(candidate.fullPage), animations: 'allow', caret: 'hide' });
    const metadata = await sharp(file).metadata();
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      bodyTextLength: document.body?.innerText.length ?? 0,
    }));
    if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100) {
      throw new Error('Screenshot is empty or has invalid dimensions');
    }
    if (pageErrors.length) throw new Error(`Page error: ${pageErrors.join(' | ')}`);
    return {
      id: candidate.id,
      area: candidate.area,
      route: candidate.route,
      action: candidate.action.name || 'scripted UI flow',
      expected: candidate.expected,
      class: candidate.class,
      viewport,
      viewportSize: [VIEWPORTS[viewport].width, VIEWPORTS[viewport].height],
      file: path.relative(AUDIT_ROOT, file).replaceAll('\\', '/'),
      status: 'ok',
      hash: await fileHash(file),
      width: metadata.width,
      height: metadata.height,
      bytes: (await stat(file)).size,
      fullPage: Boolean(candidate.fullPage),
      horizontalOverflow: layout.scrollWidth > layout.clientWidth,
      documentSize: [layout.scrollWidth, layout.scrollHeight],
      consoleErrors,
      capturedAt: startedAt,
    };
  } catch (error) {
    return {
      id: candidate.id,
      area: candidate.area,
      route: candidate.route,
      expected: candidate.expected,
      class: candidate.class,
      viewport,
      viewportSize: [VIEWPORTS[viewport].width, VIEWPORTS[viewport].height],
      status: 'error',
      reason: error instanceof Error ? error.message : String(error),
      consoleErrors,
      pageErrors,
      capturedAt: startedAt,
    };
  } finally {
    await page.close();
  }
}

async function makeContactSheet(name, records, columns = 3) {
  const selected = records.filter((record) => record.status === 'ok');
  if (!selected.length) return null;
  const thumbWidth = 420;
  const labelHeight = 44;
  const gap = 12;
  const thumbHeight = 280;
  const rows = Math.ceil(selected.length / columns);
  const width = columns * thumbWidth + (columns + 1) * gap;
  const height = rows * (thumbHeight + labelHeight) + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < selected.length; index += 1) {
    const record = selected[index];
    const input = path.join(AUDIT_ROOT, record.file);
    const thumb = await sharp(input).resize(thumbWidth, thumbHeight, { fit: 'contain', background: '#f8fafc' }).png().toBuffer();
    const left = gap + (index % columns) * thumbWidth;
    const top = gap + Math.floor(index / columns) * (thumbHeight + labelHeight);
    composites.push({ input: thumb, left, top });
    const label = Buffer.from(`<svg width="${thumbWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#ffffff"/><text x="12" y="28" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1e293b">${record.id} · ${record.viewport}</text></svg>`);
    composites.push({ input: label, left, top: top + thumbHeight });
  }
  const output = path.join(OVERVIEW_ROOT, `${name}.png`);
  await sharp({ create: { width, height, channels: 4, background: '#e2e8f0' } }).composite(composites).png().toFile(output);
  return path.relative(AUDIT_ROOT, output).replaceAll('\\', '/');
}

function aggregateCandidates(records) {
  return candidates.map((candidate) => {
    if (candidate.class === 'blocked') {
      return { id: candidate.id, area: candidate.area, class: candidate.class, status: 'skipped', expected: candidate.expected, reason: candidate.reason };
    }
    const matches = records.filter((record) => record.id === candidate.id);
    return {
      id: candidate.id,
      area: candidate.area,
      class: candidate.class,
      expected: candidate.expected,
      status: matches.length > 0 && matches.every((record) => record.status === 'ok') ? 'ok' : 'error',
      files: matches.filter((record) => record.file).map((record) => record.file),
      reason: matches.find((record) => record.status === 'error')?.reason,
    };
  });
}

async function main() {
  await prepareDirectories();
  await copyDesignAssets();
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    acceptDownloads: false,
  });
  const records = [];
  try {
    for (const candidate of candidates) {
      if (candidate.class === 'blocked') continue;
      const viewports = candidate.viewports ?? [candidate.viewport ?? 'desktop'];
      for (let index = 0; index < viewports.length; index += 1) {
        const viewport = viewports[index];
        process.stdout.write(`[capture] ${candidate.id} ${viewport} ... `);
        const record = await captureOne(context, candidate, viewport, 0);
        records.push(record);
        process.stdout.write(`${record.status}\n`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const candidateResults = aggregateCandidates(records);
  const overviews = [];
  overviews.push(await makeContactSheet('MON', records.filter((record) => record.area === 'monopoly' && record.viewport !== 'mobile')));
  overviews.push(await makeContactSheet('CARD', records.filter((record) => record.area === 'card' && record.viewport !== 'mobile')));
  overviews.push(await makeContactSheet('OVERLAY', records.filter((record) => record.area === 'overlay')));
  overviews.push(await makeContactSheet('MOBILE', records.filter((record) => record.viewport === 'mobile'), 2));
  overviews.push(await makeContactSheet('ALL', records.filter((record) => record.viewport === 'desktop'), 4));

  const manifest = {
    meta: {
      project: '520live',
      commit: BASELINE_COMMIT,
      capturedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      playwright: (await import('@playwright/test/package.json', { with: { type: 'json' } })).default.version,
      browser: 'chromium',
      deviceScaleFactor: 1,
      browserZoom: 1,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      isolatedContext: true,
      seeded: true,
      declaredCandidateCount: 44,
      candidateCount: candidates.length,
      successfulCandidateCount: candidateResults.filter((item) => item.status === 'ok').length,
      blockedCandidateCount: candidateResults.filter((item) => item.status === 'skipped').length,
      errorCandidateCount: candidateResults.filter((item) => item.status === 'error').length,
      screenshotFileCount: records.filter((item) => item.status === 'ok').length,
    },
    viewports: VIEWPORTS,
    candidates: candidateResults,
    shots: [
      ...records,
      ...candidateResults.filter((item) => item.status === 'skipped').map((item) => ({ ...item, route: '/card-wheel' })),
    ],
    overviews: overviews.filter(Boolean),
  };
  await writeFile(path.join(AUDIT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const failures = records.filter((record) => record.status === 'error');
  if (failures.length) {
    process.exitCode = 1;
    console.error(`Capture completed with ${failures.length} errors. See ui-audit/manifest.json.`);
  }
}

await main();
