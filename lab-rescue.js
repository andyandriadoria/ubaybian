import { apiBase, backendEnabled } from './config.js';
import { findProfile } from './profiles.js';
import {
  LAB_MAX_SCORE,
  createLabShift,
  evaluateLabAction,
  finaliseShiftScore,
  labJobScore,
  labRankForTotalScore,
  rankProgress,
} from './lab-rescue-engine.js';

const SESSION_KEY = 'ubaybian:family-session:v1';
const LOCAL_PREFIX = 'ubaybian:lab-rescue:v2:';
const GAME_ID = 'lab-rescue';
let activeLab = null;
let statusCache = new Map();

function token() {
  try { return localStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
}

async function call(path, options = {}, timeoutMs = 5000) {
  if (!backendEnabled) throw new Error('Backend belum aktif.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  const auth = token();
  if (auth) headers.set('Authorization', `Bearer ${auth}`);
  try {
    const response = await fetch(`${apiBase}${path}`, { ...options, headers, signal: controller.signal });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data?.message || 'Lab Rescue belum tersedia.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function profileFromHash() {
  return findProfile(location.hash.replace(/^#\/?/, '').split('/')[0]);
}

function el(tag, cls = '', text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, cls = '', action) {
  const node = el('button', cls, label);
  node.type = 'button';
  if (action) node.addEventListener('click', action);
  return node;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(totalSeconds) {
  const total = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function loadLocal(profileId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_PREFIX}${profileId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      recentKeys: Array.isArray(parsed.recentKeys) ? parsed.recentKeys.slice(0, 20) : [],
      best: Math.max(0, Number(parsed.best) || 0),
      totalScore: Math.max(0, Number(parsed.totalScore) || 0),
      plays: Math.max(0, Number(parsed.plays) || 0),
    };
  } catch {
    return { recentKeys: [], best: 0, totalScore: 0, plays: 0 };
  }
}

function saveLocal(profileId, value) {
  try { localStorage.setItem(`${LOCAL_PREFIX}${profileId}`, JSON.stringify(value)); } catch {}
}

function gameStateFromStatus(status, local) {
  const game = status?.games?.[GAME_ID] || {};
  return {
    best: Math.max(Number(game.best || 0), Number(local.best || 0)),
    plays: Math.max(Number(game.plays || 0), Number(local.plays || 0)),
    totalScore: Math.max(Number(game.totalScore || 0), Number(local.totalScore || 0)),
    dailyXp: Number(status?.dailyXp || 0),
    dailyXpCap: Number(status?.dailyXpCap || 50),
  };
}

async function loadGameStatus(profile, local, force = false) {
  const cached = statusCache.get(profile.id);
  if (!force && cached && Date.now() - cached.at < 15000) return cached.value;
  const value = await call(`/v1/games/${encodeURIComponent(profile.id)}/status`, {}, 4500);
  statusCache.set(profile.id, { value, at: Date.now() });
  return value;
}

function rankLabel(totalScore) {
  const rank = labRankForTotalScore(totalScore);
  return `${rank.icon} ${rank.label}`;
}

function tileByName(name) {
  return [...document.querySelectorAll('.side-tile')].find(
    (tile) => tile.querySelector('.side-tile-text')?.textContent.trim() === name,
  );
}

function ensureLabTile() {
  const profile = profileFromHash();
  const menu = document.querySelector('.side-menu');
  if (!profile || !menu) return;
  let tile = menu.querySelector('.lab-rescue-tile');
  if (!tile) {
    tile = el('div', 'side-tile clickable-tile lab-rescue-tile');
    tile.setAttribute('role', 'button');
    tile.tabIndex = 0;
    const icon = el('span', 'side-tile-icon lab-rescue-tile-icon', '🧪');
    const copy = el('div', 'lab-rescue-tile-copy');
    copy.append(el('div', 'side-tile-text', 'Lab Rescue'), el('div', 'side-tile-sub', 'Science shift · manage the lab'));
    const accent = el('span', 'lab-rescue-tile-accent', '⚗️');
    tile.append(icon, copy, accent);
    const reward = tileByName('Reward Shop');
    if (reward?.parentNode === menu) menu.insertBefore(tile, reward);
    else menu.append(tile);
    const open = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      openLabRescue(profile);
    };
    tile.addEventListener('click', open);
    tile.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
  }
  syncTile(profile, tile);
}

async function syncTile(profile, tile) {
  if (!tile || tile.dataset.labSync === 'loading') return;
  tile.dataset.labSync = 'loading';
  const local = loadLocal(profile.id);
  try {
    const status = await loadGameStatus(profile, local);
    const state = gameStateFromStatus(status, local);
    tile.querySelector('.side-tile-sub').textContent = `Best ${state.best} · ${rankLabel(state.totalScore)}`;
  } catch {
    tile.querySelector('.side-tile-sub').textContent = local.plays
      ? `Best ${local.best} · ${rankLabel(local.totalScore)}`
      : 'Science shift · manage the lab';
  } finally {
    tile.dataset.labSync = 'done';
  }
}

async function openLabRescue(profile) {
  if (activeLab) activeLab.close(true);
  const previousOverflow = document.body.style.overflow;
  let local = loadLocal(profile.id);
  let bestScore = local.best;
  let totalScore = local.totalScore;
  let dailyXp = 0;
  let dailyCap = 50;
  let pendingShift = createLabShift(profile.id, { recentKeys: local.recentKeys, bestScore });
  let phase = 'ready';
  let stationStates = new Map();
  let queue = [];
  let jobDeck = [];
  let usedKeys = [];
  let selectedStationId = '';
  let scoreValue = 0;
  let stability = 100;
  let combo = 0;
  let bestCombo = 0;
  let completed = 0;
  let missed = 0;
  let endAt = 0;
  let nextSpawnAt = 0;
  let tickTimer = 0;
  let lastTickAt = 0;
  let remoteSession = null;
  let remoteStartPromise = null;
  let finishing = false;

  const overlay = el('div', 'lab-rescue-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Lab Rescue Science shift');
  const shell = el('section', 'lab-rescue-shell');
  shell.dataset.profile = profile.id;

  const top = el('header', 'lab-rescue-top');
  const brand = el('div', 'lab-rescue-brand');
  brand.append(el('span', 'lab-rescue-kicker', 'SCIENCE ARCADE'), el('strong', 'lab-rescue-logo', 'LAB RESCUE'), el('span', 'lab-rescue-subtitle', 'RUN THE LAB · SAVE THE SHIFT'));
  const closeButton = button('×', 'lab-rescue-close', () => close());
  closeButton.setAttribute('aria-label', 'Tutup Lab Rescue');
  top.append(brand, closeButton);

  const stage = el('div', 'lab-rescue-stage');
  const ready = buildReadyView();
  const play = buildPlayView();
  const result = buildResultView();
  stage.append(ready.root, play.root, result.root);
  shell.append(top, stage);
  overlay.append(shell);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  activeLab = { close };

  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const onKey = (event) => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  renderReady();
  hydrateStatus();

  function buildReadyView() {
    const root = el('section', 'lab-rescue-view lab-rescue-ready');
    const alert = el('div', 'lab-ready-alert');
    const incidentIcon = el('div', 'lab-incident-icon');
    const story = el('div', 'lab-incident-story');
    const eyebrow = el('span', 'lab-story-eyebrow', 'INCOMING SHIFT');
    const title = el('h3');
    const brief = el('p');
    const callout = el('div', 'lab-bot-callout');
    story.append(eyebrow, title, brief, callout);
    alert.append(incidentIcon, story);

    const stationPreview = el('div', 'lab-station-preview');
    const stats = el('div', 'lab-ready-stats');
    const best = el('div', 'lab-ready-stat');
    const rank = el('div', 'lab-ready-stat');
    const xp = el('div', 'lab-ready-stat');
    const duration = el('div', 'lab-ready-stat');
    stats.append(best, rank, xp, duration);

    const rankBox = el('div', 'lab-ready-rank');
    const rankLine = el('div', 'lab-ready-rank-line');
    const rankName = el('strong');
    const rankHint = el('span');
    rankLine.append(rankName, rankHint);
    const track = el('div', 'lab-rank-track');
    const fill = el('span', 'lab-rank-fill');
    track.append(fill);
    rankBox.append(rankLine, track);

    const note = el('p', 'lab-rescue-note', 'Start kapan saja. Shift tetap bisa dimainkan kalau koneksi reward sedang lambat.');
    const start = button('START LAB SHIFT →', 'lab-rescue-primary lab-start-shift', startShift);
    root.append(alert, stationPreview, stats, rankBox, start, note);
    return { root, incidentIcon, title, brief, callout, stationPreview, best, rank, xp, duration, rankName, rankHint, fill, note, start };
  }

  function buildPlayView() {
    const root = el('section', 'lab-rescue-view lab-rescue-play');
    root.hidden = true;
    const hud = el('div', 'lab-shift-hud');
    const timer = hudCard('SHIFT', '1:30', 'cyan');
    const stabilityCard = hudCard('LAB STABILITY', '100%', 'green');
    const score = hudCard('SCORE', '0', 'orange');
    const comboCard = hudCard('COMBO', 'x0', 'pink');
    hud.append(timer.card, stabilityCard.card, score.card, comboCard.card);

    const body = el('div', 'lab-shift-body');
    const labFloor = el('div', 'lab-floor');
    const floorHeader = el('div', 'lab-floor-header');
    floorHeader.append(el('div', 'lab-live-label', '● LIVE LAB'), el('div', 'lab-queue-label', 'Incoming 0'));
    const bot = el('div', 'lab-shift-bot');
    const botAvatar = el('div', 'lab-bot-avatar', '🤖');
    const botText = el('p', '', 'Stations online. Watch for the first alert.');
    bot.append(botAvatar, botText);
    const stations = el('div', 'lab-station-grid');
    const queueStrip = el('div', 'lab-queue-strip');
    labFloor.append(floorHeader, bot, stations, queueStrip);

    const workbench = el('aside', 'lab-workbench');
    body.append(labFloor, workbench);
    root.append(hud, body);
    return { root, timer: timer.value, stability: stabilityCard.value, score: score.value, combo: comboCard.value, stations, queueStrip, queueLabel: floorHeader.lastElementChild, botText, workbench };
  }

  function buildResultView() {
    const root = el('section', 'lab-rescue-view lab-rescue-result');
    root.hidden = true;
    const badge = el('div', 'lab-result-badge', 'SHIFT COMPLETE');
    const title = el('h3', '', 'Lab secured!');
    const score = el('div', 'lab-result-score', '0');
    const caption = el('p', 'lab-result-caption', 'Lab Score');
    const grid = el('div', 'lab-result-grid');
    const jobs = resultMetric('🧪 Jobs completed', '0');
    const misses = resultMetric('⚠️ Jobs missed', '0');
    const comboMetric = resultMetric('🔥 Best combo', 'x0');
    const stabilityMetric = resultMetric('🛡️ Stability', '100%');
    const xp = resultMetric('⭐ XP earned', '…');
    grid.append(jobs.card, misses.card, comboMetric.card, stabilityMetric.card, xp.card);
    const rank = el('div', 'lab-result-rank');
    const note = el('p', 'lab-rescue-note');
    const actions = el('div', 'lab-result-actions');
    const replay = button('SHIFT LAGI', 'lab-rescue-primary', () => prepareReplay());
    const done = button('Selesai', 'lab-rescue-ghost', () => close());
    actions.append(replay, done);
    root.append(badge, title, score, caption, grid, rank, actions, note);
    return { root, title, score, jobs: jobs.value, misses: misses.value, combo: comboMetric.value, stability: stabilityMetric.value, xp: xp.value, rank, note, replay, done };
  }

  function hudCard(label, value, tone) {
    const card = el('div', `lab-hud-card ${tone}`);
    card.append(el('span', '', label));
    const strong = el('strong', '', value);
    card.append(strong);
    return { card, value: strong };
  }

  function resultMetric(label, value) {
    const card = el('div', 'lab-result-card');
    card.append(el('span', '', label));
    const strong = el('strong', '', value);
    card.append(strong);
    return { card, value: strong };
  }

  function renderReady() {
    ready.incidentIcon.textContent = pendingShift.incident.emoji;
    ready.title.textContent = pendingShift.incident.title;
    ready.brief.textContent = pendingShift.incident.brief;
    ready.callout.textContent = pendingShift.incident.callout;
    ready.stationPreview.replaceChildren();
    for (const station of pendingShift.stations) {
      const item = el('div', `lab-preview-station ${station.accent}`);
      item.append(el('span', 'lab-preview-icon', station.icon), el('strong', '', station.name), el('small', '', 'READY'));
      ready.stationPreview.append(item);
    }
    ready.best.innerHTML = `<span>🏆 BEST</span><strong>${bestScore}</strong>`;
    ready.rank.innerHTML = `<span>🥼 RANK</span><strong>${labRankForTotalScore(totalScore).label}</strong>`;
    ready.xp.innerHTML = `<span>⭐ GAME XP</span><strong>${dailyXp}/${dailyCap}</strong>`;
    ready.duration.innerHTML = `<span>⏱️ SHIFT</span><strong>${formatTime(pendingShift.config.shiftSeconds)}</strong>`;
    const progress = rankProgress(totalScore);
    ready.rankName.textContent = `${progress.rank.icon} ${progress.rank.label}`;
    ready.rankHint.textContent = progress.rank.nextAt ? `${progress.remaining} energy to next rank` : 'Max rank · keep chasing Best Run';
    ready.fill.style.width = `${progress.progress}%`;
  }

  async function hydrateStatus() {
    try {
      const status = await loadGameStatus(profile, local, true);
      const state = gameStateFromStatus(status, local);
      bestScore = state.best;
      totalScore = state.totalScore;
      dailyXp = state.dailyXp;
      dailyCap = state.dailyXpCap;
      pendingShift = createLabShift(profile.id, { recentKeys: local.recentKeys, bestScore });
      renderReady();
      ready.note.textContent = dailyXp >= dailyCap
        ? 'XP game hari ini sudah penuh. Shift tetap bisa dimainkan untuk Best Score dan Lab Rank.'
        : 'Lab online. Score shift akan tersimpan dan ikut shared game XP cap.';
    } catch {
      ready.note.textContent = 'Offline lab mode siap. Gameplay tetap jalan; XP baru tersimpan saat backend tersedia.';
    }
  }

  function startShift() {
    if (phase !== 'ready') return;
    phase = 'play';
    ready.root.hidden = true;
    result.root.hidden = true;
    play.root.hidden = false;
    shell.classList.add('is-shift-live');
    const shift = pendingShift;
    jobDeck = [...shift.jobs];
    usedKeys = [];
    queue = [];
    selectedStationId = '';
    scoreValue = 0;
    stability = 100;
    combo = 0;
    bestCombo = 0;
    completed = 0;
    missed = 0;
    stationStates = new Map(shift.stations.map((station) => [station.id, { meta: station, job: null }]));
    endAt = Date.now() + (shift.config.shiftSeconds * 1000);
    nextSpawnAt = Date.now() + 5000;
    lastTickAt = Date.now();
    play.botText.textContent = shift.incident.callout;
    renderStations();
    renderQueue();
    renderWorkbench();
    updateHud();
    seedOpeningJobs();
    remoteSession = null;
    remoteStartPromise = beginRemoteSession();
    tickTimer = window.setInterval(tick, 250);
  }

  async function beginRemoteSession() {
    try {
      const data = await call(`/v1/games/${encodeURIComponent(profile.id)}/start`, {
        method: 'POST',
        body: JSON.stringify({ gameId: GAME_ID }),
      }, 4500);
      remoteSession = data?.sessionId ? data : null;
      return remoteSession;
    } catch {
      play.botText.textContent = '🤖 Offline scoring mode active. Keep the lab running—gameplay is unaffected.';
      return null;
    }
  }

  function seedOpeningJobs() {
    const seen = new Set();
    for (let i = 0; i < 2; i += 1) {
      const index = jobDeck.findIndex((job) => !seen.has(job.stationId));
      if (index < 0) break;
      const [job] = jobDeck.splice(index, 1);
      seen.add(job.stationId);
      assignJob(job);
    }
    renderStations();
  }

  function nextJobFromDeck() {
    if (!jobDeck.length) {
      const refill = createLabShift(profile.id, { recentKeys: [...usedKeys, ...local.recentKeys], bestScore });
      jobDeck = refill.jobs.filter((job) => !usedKeys.slice(-6).includes(job.key));
      if (!jobDeck.length) jobDeck = refill.jobs;
    }
    return jobDeck.shift() || null;
  }

  function spawnJob() {
    const job = nextJobFromDeck();
    if (!job) return;
    const station = stationStates.get(job.stationId);
    if (station && !station.job) assignJob(job);
    else if (queue.length < 5) queue.push({ ...job, queuedAt: Date.now() });
    else {
      const dropped = queue.shift();
      if (dropped) missed += 1;
      queue.push({ ...job, queuedAt: Date.now() });
      stability = clamp(stability - 5, 0, 100);
      combo = 0;
      play.botText.textContent = '🤖 Queue overload! Clear a station before more jobs arrive.';
    }
    renderQueue();
    renderStations();
  }

  function assignJob(job) {
    const station = stationStates.get(job.stationId);
    if (!station || station.job) return false;
    station.job = {
      ...job,
      status: 'waiting',
      assignedAt: Date.now(),
      processingEndsAt: 0,
      attempts: 0,
      placements: {},
      sequence: [],
      selectedToolId: '',
    };
    play.botText.textContent = `🤖 ${station.meta.name}: ${job.alert}`;
    return true;
  }

  function promoteQueue() {
    let moved = false;
    for (let i = 0; i < queue.length;) {
      const queued = queue[i];
      const station = stationStates.get(queued.stationId);
      if (station && !station.job) {
        queue.splice(i, 1);
        assignJob(queued);
        moved = true;
      } else i += 1;
    }
    if (moved) renderQueue();
  }

  function tick() {
    if (phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(1000, now - lastTickAt);
    lastTickAt = now;
    const shiftConfig = pendingShift.config;
    let selectedChanged = false;

    for (const state of stationStates.values()) {
      const job = state.job;
      if (!job) continue;
      if (job.status === 'processing' && now >= job.processingEndsAt) {
        job.status = 'ready';
        play.botText.textContent = `🤖 ${state.meta.name} finished processing. Tap COLLECT!`;
        if (selectedStationId === state.meta.id) selectedChanged = true;
      }
      if (job.status === 'waiting') {
        const age = now - job.assignedAt;
        if (age > shiftConfig.patienceMs) {
          stability = clamp(stability - (dt / 1000) * 0.8, 0, 100);
          if (age > shiftConfig.patienceMs + 15000) failStationJob(state);
        }
      }
    }

    for (let i = queue.length - 1; i >= 0; i -= 1) {
      const age = now - queue[i].queuedAt;
      if (age > shiftConfig.patienceMs) stability = clamp(stability - (dt / 1000) * 0.35, 0, 100);
      if (age > shiftConfig.patienceMs + 14000) {
        queue.splice(i, 1);
        missed += 1;
        combo = 0;
        stability = clamp(stability - 7, 0, 100);
      }
    }

    if (now >= nextSpawnAt) {
      spawnJob();
      const span = shiftConfig.spawnMaxMs - shiftConfig.spawnMinMs;
      nextSpawnAt = now + shiftConfig.spawnMinMs + Math.floor(Math.random() * Math.max(1, span));
    }
    promoteQueue();
    updateHud();
    renderStations();
    renderQueue();
    if (selectedChanged) renderWorkbench();

    if (now >= endAt || stability <= 0) finishShift();
  }

  function failStationJob(state) {
    if (!state?.job) return;
    usedKeys.push(state.job.key);
    missed += 1;
    combo = 0;
    stability = clamp(stability - 10, 0, 100);
    play.botText.textContent = `🤖 ${state.meta.name} timed out. Resetting the station.`;
    state.job = null;
    if (selectedStationId === state.meta.id) renderWorkbench();
    promoteQueue();
  }

  function updateHud() {
    play.timer.textContent = formatTime((endAt - Date.now()) / 1000);
    play.stability.textContent = `${Math.round(stability)}%`;
    play.score.textContent = String(Math.min(LAB_MAX_SCORE, Math.floor(scoreValue)));
    play.combo.textContent = `x${combo}`;
    shell.style.setProperty('--lab-stability', `${clamp(stability, 0, 100)}%`);
  }

  function renderStations() {
    play.stations.replaceChildren();
    const now = Date.now();
    for (const state of stationStates.values()) {
      const station = state.meta;
      const job = state.job;
      const card = button('', `lab-station-card ${station.accent}${selectedStationId === station.id ? ' selected' : ''}`, () => selectStation(station.id));
      const topRow = el('div', 'lab-station-card-top');
      topRow.append(el('span', 'lab-station-icon', station.icon), el('strong', '', station.name));
      const status = el('span', 'lab-station-status');
      let label = 'IDLE';
      let progress = 0;
      if (job?.status === 'waiting') {
        label = 'NEEDS YOU';
        progress = clamp(((now - job.assignedAt) / pendingShift.config.patienceMs) * 100, 0, 100);
        card.classList.add(progress > 75 ? 'critical' : 'alert');
      } else if (job?.status === 'processing') {
        label = 'PROCESSING';
        const elapsed = job.processingMs - Math.max(0, job.processingEndsAt - now);
        progress = clamp((elapsed / job.processingMs) * 100, 0, 100);
        card.classList.add('processing');
      } else if (job?.status === 'ready') {
        label = 'COLLECT';
        progress = 100;
        card.classList.add('ready');
      }
      status.textContent = label;
      topRow.append(status);
      const jobTitle = el('p', 'lab-station-job', job ? job.title : 'Station ready for the next science job.');
      const bar = el('div', 'lab-station-bar');
      const fill = el('span');
      fill.style.width = `${progress}%`;
      bar.append(fill);
      card.append(topRow, jobTitle, bar);
      play.stations.append(card);
    }
  }

  function renderQueue() {
    play.queueStrip.replaceChildren();
    play.queueLabel.textContent = `Incoming ${queue.length}`;
    if (!queue.length) {
      play.queueStrip.append(el('span', 'lab-queue-empty', 'Incoming tray clear · keep an eye on the stations'));
      return;
    }
    for (const job of queue) {
      const station = stationStates.get(job.stationId)?.meta;
      const chip = el('div', 'lab-queue-chip');
      chip.append(el('span', '', station?.icon || '🧪'), el('strong', '', job.title), el('small', '', 'waiting'));
      play.queueStrip.append(chip);
    }
  }

  function selectStation(stationId) {
    const state = stationStates.get(stationId);
    if (!state) return;
    if (state.job?.status === 'ready') {
      collectJob(state);
      return;
    }
    selectedStationId = stationId;
    renderStations();
    renderWorkbench();
  }

  function renderWorkbench(message = '') {
    const target = play.workbench;
    target.replaceChildren();
    const state = stationStates.get(selectedStationId);
    if (!state) {
      const idle = el('div', 'lab-workbench-empty');
      idle.append(el('div', 'lab-workbench-hero', '🧑‍🔬'), el('h3', '', 'Choose a station'), el('p', '', 'Tap a flashing station, perform the science action, then manage another station while it processes.'));
      target.append(idle);
      return;
    }
    const station = state.meta;
    const job = state.job;
    const head = el('div', 'lab-workbench-head');
    head.append(el('span', 'lab-workbench-icon', station.icon), el('div', '', undefined));
    head.lastElementChild.append(el('small', '', station.name.toUpperCase()), el('h3', '', job?.title || 'Station idle'));
    target.append(head);

    if (!job) {
      target.append(el('div', 'lab-workbench-empty compact', '✅ Station clear. Check the other stations or incoming tray.'));
      return;
    }
    const alert = el('p', 'lab-workbench-alert', job.alert);
    target.append(alert);

    if (job.status === 'processing') {
      const remaining = Math.max(0, job.processingEndsAt - Date.now());
      const pct = clamp((1 - (remaining / job.processingMs)) * 100, 0, 100);
      const processing = el('div', 'lab-processing-panel');
      processing.append(el('div', 'lab-processing-machine', '⚙️'), el('strong', '', 'PROCESSING…'), el('p', '', 'Good. Leave this station running and help somewhere else.'));
      const track = el('div', 'lab-process-track');
      const fill = el('span'); fill.style.width = `${pct}%`; track.append(fill);
      processing.append(track);
      target.append(processing);
      return;
    }
    if (job.status === 'ready') {
      const collect = el('div', 'lab-collect-panel');
      collect.append(el('div', 'lab-collect-icon', '✨'), el('strong', '', 'RESULT READY'), el('p', '', job.success));
      collect.append(button('COLLECT RESULT', 'lab-rescue-primary', () => collectJob(state)));
      target.append(collect);
      return;
    }

    const actionArea = el('div', 'lab-action-area');
    target.append(actionArea);
    renderMechanic(actionArea, state);
    if (message) target.append(el('div', 'lab-action-hint', message));
  }

  function renderMechanic(target, state) {
    const job = state.job;
    const mechanic = job.mechanic;
    if (mechanic.kind === 'slider') {
      const panel = el('div', 'lab-control-panel');
      const value = el('strong', 'lab-control-value', `${mechanic.start}${mechanic.unit}`);
      const row = el('div', 'lab-control-label'); row.append(el('span', '', mechanic.label), value);
      const input = document.createElement('input');
      input.type = 'range'; input.min = mechanic.min; input.max = mechanic.max; input.step = 1; input.value = mechanic.start;
      input.className = 'lab-range';
      input.addEventListener('input', () => { value.textContent = `${input.value}${mechanic.unit}`; });
      const zone = el('div', 'lab-target-zone', `TARGET ZONE ${mechanic.targetMin}–${mechanic.targetMax}${mechanic.unit}`);
      const run = button('RUN STATION', 'lab-action-button', () => submitAction(state, { value: Number(input.value) }));
      panel.append(row, input, zone, run); target.append(panel); return;
    }
    if (mechanic.kind === 'controls') {
      const values = {};
      const panel = el('div', 'lab-control-panel');
      for (const field of mechanic.fields) {
        values[field.id] = field.start;
        const value = el('strong', 'lab-control-value', `${field.start}${field.unit}`);
        const row = el('div', 'lab-control-label'); row.append(el('span', '', field.label), value);
        const input = document.createElement('input');
        input.type = 'range'; input.min = field.min; input.max = field.max; input.step = 1; input.value = field.start; input.className = 'lab-range';
        input.addEventListener('input', () => { values[field.id] = Number(input.value); value.textContent = `${input.value}${field.unit}`; });
        const zone = el('div', 'lab-target-zone', `TARGET ${field.targetMin}–${field.targetMax}${field.unit}`);
        panel.append(row, input, zone);
      }
      panel.append(button('CALIBRATE', 'lab-action-button', () => submitAction(state, { values })));
      target.append(panel); return;
    }
    if (mechanic.kind === 'tools') {
      const rack = el('div', 'lab-tool-rack');
      const slot = el('div', 'lab-tool-slot', job.selectedToolId ? 'Tool loaded' : 'Tap a tool to load the station');
      for (const tool of mechanic.tools) {
        const toolButton = button('', `lab-tool${job.selectedToolId === tool.id ? ' selected' : ''}`, () => {
          job.selectedToolId = tool.id;
          renderWorkbench();
        });
        toolButton.append(el('span', 'lab-tool-icon', tool.icon), el('strong', '', tool.label));
        rack.append(toolButton);
      }
      const use = button('USE LOADED TOOL', 'lab-action-button', () => submitAction(state, { toolId: job.selectedToolId }));
      use.disabled = !job.selectedToolId;
      target.append(slot, rack, use); return;
    }
    if (mechanic.kind === 'sort') {
      const selected = { id: '' };
      const items = el('div', 'lab-sort-items');
      const bins = el('div', 'lab-sort-bins');
      const draw = () => {
        items.replaceChildren(); bins.replaceChildren();
        for (const item of mechanic.items) {
          if (job.placements[item.id]) continue;
          const itemButton = button('', `lab-sort-token${selected.id === item.id ? ' selected' : ''}`, () => { selected.id = item.id; draw(); });
          itemButton.append(el('span', '', item.icon), el('strong', '', item.label)); items.append(itemButton);
        }
        for (const bin of mechanic.bins) {
          const binButton = button('', 'lab-sort-bin', () => {
            if (!selected.id) return;
            const item = mechanic.items.find((entry) => entry.id === selected.id);
            if (!item) return;
            if (item.bin === bin.id) {
              job.placements[item.id] = bin.id;
              selected.id = '';
              if (mechanic.items.every((entry) => job.placements[entry.id] === entry.bin)) submitAction(state, { placements: job.placements });
              else draw();
            } else {
              selected.id = '';
              stability = clamp(stability - 1, 0, 100);
              play.botText.textContent = `🤖 ${job.hint}`;
              draw();
            }
          });
          const placed = mechanic.items.filter((item) => job.placements[item.id] === bin.id);
          binButton.append(el('span', 'lab-bin-icon', bin.icon), el('strong', '', bin.label), el('small', '', placed.map((item) => item.icon).join(' ') || 'drop here'));
          bins.append(binButton);
        }
      };
      draw(); target.append(items, bins); return;
    }
    if (mechanic.kind === 'connect') {
      const board = el('div', 'lab-connect-board');
      const path = el('div', 'lab-connect-path', 'Start the circuit…');
      const draw = () => {
        board.replaceChildren();
        for (const node of mechanic.nodes) {
          const index = job.sequence.indexOf(node.id);
          const nodeButton = button('', `lab-connect-node${index >= 0 ? ' connected' : ''}`, () => {
            const expected = mechanic.sequence[job.sequence.length];
            if (node.id !== expected) {
              job.sequence = [];
              stability = clamp(stability - 1, 0, 100);
              play.botText.textContent = `🤖 ${job.hint}`;
              path.textContent = 'Path reset · try one continuous route';
              draw();
              return;
            }
            job.sequence.push(node.id);
            path.textContent = job.sequence.map((id) => mechanic.nodes.find((entry) => entry.id === id)?.icon || '•').join('  →  ');
            if (job.sequence.length === mechanic.sequence.length) submitAction(state, { sequence: job.sequence });
            else draw();
          });
          nodeButton.append(el('span', '', node.icon), el('strong', '', node.label));
          board.append(nodeButton);
        }
      };
      draw(); target.append(path, board); return;
    }
  }

  function submitAction(state, payload) {
    const job = state?.job;
    if (!job || job.status !== 'waiting') return;
    if (!evaluateLabAction(job, payload)) {
      job.attempts += 1;
      combo = 0;
      stability = clamp(stability - 2, 0, 100);
      play.botText.textContent = `🤖 ${job.hint}`;
      renderWorkbench(job.hint);
      updateHud();
      return;
    }
    job.status = 'processing';
    job.processingEndsAt = Date.now() + job.processingMs;
    usedKeys.push(job.key);
    play.botText.textContent = `🤖 Nice work. ${state.meta.name} is processing—check another station while it runs.`;
    renderStations();
    renderWorkbench();
  }

  function collectJob(state) {
    const job = state?.job;
    if (!job || job.status !== 'ready') return;
    const gain = labJobScore({ waitedMs: Date.now() - job.assignedAt, patienceMs: pendingShift.config.patienceMs, comboBefore: combo });
    scoreValue = Math.min(LAB_MAX_SCORE, scoreValue + gain);
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    completed += 1;
    stability = clamp(stability + 4, 0, 100);
    play.botText.textContent = `🤖 +${gain} score · ${job.success}`;
    state.job = null;
    if (selectedStationId === state.meta.id) renderWorkbench();
    promoteQueue();
    renderStations();
    renderQueue();
    updateHud();
  }

  async function finishShift() {
    if (phase !== 'play' || finishing) return;
    finishing = true;
    phase = 'result';
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = 0;
    shell.classList.remove('is-shift-live');
    play.root.hidden = true;
    result.root.hidden = false;
    const finalScore = finaliseShiftScore(scoreValue, stability);
    result.score.textContent = String(finalScore);
    result.jobs.textContent = String(completed);
    result.misses.textContent = String(missed);
    result.combo.textContent = `x${bestCombo}`;
    result.stability.textContent = `${Math.round(stability)}%`;
    result.xp.textContent = '…';
    result.title.textContent = stability <= 0 ? 'Lab overload contained' : completed >= 7 ? 'Excellent shift!' : completed >= 4 ? 'Lab secured!' : 'Shift complete';
    result.note.textContent = 'Saving shift result…';
    result.replay.disabled = true;
    result.done.disabled = true;

    const recentKeys = [...usedKeys, ...local.recentKeys.filter((key) => !usedKeys.includes(key))].slice(0, 20);
    let xpEarned = 0;
    let savedRemotely = false;
    try {
      const session = await remoteStartPromise;
      if (session?.sessionId) {
        const data = await call(`/v1/games/${encodeURIComponent(profile.id)}/finish`, {
          method: 'POST',
          body: JSON.stringify({ sessionId: session.sessionId, score: finalScore }),
        }, 5000);
        const state = gameStateFromStatus(data, local);
        bestScore = Math.max(state.best, finalScore);
        totalScore = Math.max(state.totalScore, totalScore + finalScore);
        dailyXp = state.dailyXp;
        dailyCap = state.dailyXpCap;
        xpEarned = Number(data.xpEarned || 0);
        savedRemotely = true;
      }
    } catch {}

    if (!savedRemotely) {
      bestScore = Math.max(bestScore, finalScore);
      totalScore += finalScore;
    }
    local = {
      recentKeys,
      best: Math.max(local.best, bestScore),
      totalScore: Math.max(local.totalScore, totalScore),
      plays: local.plays + 1,
    };
    saveLocal(profile.id, local);
    result.xp.textContent = `+${xpEarned}`;
    result.rank.textContent = `${rankLabel(totalScore)} · Total Lab Energy ${totalScore}`;
    result.note.textContent = savedRemotely
      ? `Shift tersimpan · Game XP hari ini ${dailyXp}/${dailyCap}`
      : 'Shift tersimpan di perangkat. XP belum ditambahkan karena backend Lab Rescue belum merespons.';
    statusCache.delete(profile.id);
    const tile = document.querySelector('.lab-rescue-tile');
    if (tile) { tile.dataset.labSync = ''; syncTile(profile, tile); }
    if (savedRemotely) window.dispatchEvent(new Event('ubaybian:progress-changed'));
    finishing = false;
    result.replay.disabled = false;
    result.done.disabled = false;
  }

  function prepareReplay() {
    if (finishing) return;
    pendingShift = createLabShift(profile.id, { recentKeys: local.recentKeys, bestScore });
    phase = 'ready';
    result.root.hidden = true;
    ready.root.hidden = false;
    renderReady();
    ready.note.textContent = 'New incident loaded. Ready for another shift?';
  }

  function close(force = false) {
    if (!force && phase === 'play' && !confirm('Lab shift masih berjalan. Keluar sekarang?')) return;
    if (tickTimer) clearInterval(tickTimer);
    phase = 'closed';
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.body.style.overflow = previousOverflow;
    if (activeLab?.close === close) activeLab = null;
    ensureLabTile();
  }
}

function scan() { ensureLabTile(); }
const observer = new MutationObserver(() => requestAnimationFrame(scan));
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', () => setTimeout(scan, 60));
window.addEventListener('ubaybian:progress-changed', () => {
  statusCache.clear();
  setTimeout(scan, 80);
});
scan();

export { openLabRescue };
