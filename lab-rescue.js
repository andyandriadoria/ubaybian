import { apiBase, backendEnabled } from './config.js';
import { findProfile } from './profiles.js';
import {
  LAB_RUN_SIZE,
  createLabMissionRun,
  finaliseRunScore,
  labRankForTotalScore,
  missionScore,
  rankProgress,
} from './lab-rescue-engine.js';

const SESSION_KEY = 'ubaybian:family-session:v1';
const LOCAL_PREFIX = 'ubaybian:lab-rescue:v1:';
let activeLab = null;
let statusCache = new Map();

function token() {
  try { return localStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
}

async function call(path, options = {}) {
  if (!backendEnabled) throw new Error('Backend belum aktif.');
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  const auth = token();
  if (auth) headers.set('Authorization', `Bearer ${auth}`);
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data?.message || 'Lab Rescue belum tersedia.');
  return data;
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

function button(label, cls, action) {
  const node = el('button', cls, label);
  node.type = 'button';
  if (action) node.addEventListener('click', action);
  return node;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadLocal(profileId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_PREFIX}${profileId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      recentKeys: Array.isArray(parsed.recentKeys) ? parsed.recentKeys.slice(0, 18) : [],
      lastAccuracy: Number.isFinite(Number(parsed.lastAccuracy)) ? Number(parsed.lastAccuracy) : null,
    };
  } catch {
    return { recentKeys: [], lastAccuracy: null };
  }
}

function saveLocal(profileId, value) {
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${profileId}`, JSON.stringify(value));
  } catch {}
}

function gameStateFromStatus(status) {
  const game = status?.games?.['lab-rescue'] || {};
  return {
    best: Number(game.best || 0),
    plays: Number(game.plays || 0),
    totalScore: Number(game.totalScore || 0),
    dailyXp: Number(status?.dailyXp || 0),
    dailyXpCap: Number(status?.dailyXpCap || 50),
  };
}

async function loadGameStatus(profile, force = false) {
  const cached = statusCache.get(profile.id);
  if (!force && cached && Date.now() - cached.at < 15000) return cached.value;
  const value = await call(`/v1/games/${encodeURIComponent(profile.id)}/status`);
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
    copy.append(el('div', 'side-tile-text', 'Lab Rescue'), el('div', 'side-tile-sub', 'Science mission · 5 per run'));
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
  try {
    const status = await loadGameStatus(profile);
    const state = gameStateFromStatus(status);
    const sub = tile.querySelector('.side-tile-sub');
    if (sub) sub.textContent = `Best ${state.best} · ${rankLabel(state.totalScore)}`;
  } catch {
    const sub = tile.querySelector('.side-tile-sub');
    if (sub) sub.textContent = 'Science mission · 5 per run';
  } finally {
    tile.dataset.labSync = 'done';
  }
}

function renderVisual(target, visual) {
  target.replaceChildren();
  if (!visual) return;

  if (visual.kind === 'meters') {
    for (const [label, value] of visual.items || []) {
      const item = el('div', 'lab-meter');
      const head = el('div', 'lab-meter-head');
      head.append(el('span', '', label), el('strong', '', `${value}%`));
      const track = el('div', 'lab-meter-track');
      const fill = el('span', 'lab-meter-fill');
      fill.style.width = `${clamp(Number(value) || 0, 0, 100)}%`;
      track.append(fill); item.append(head, track); target.append(item);
    }
    return;
  }

  if (visual.kind === 'table') {
    const table = el('div', 'lab-data-table');
    for (const row of visual.rows || []) {
      const line = el('div', 'lab-data-row');
      row.forEach((cell) => line.append(el('span', '', String(cell))));
      table.append(line);
    }
    target.append(table); return;
  }

  if (visual.kind === 'variables') {
    const grid = el('div', 'lab-variable-grid');
    for (const [label, value] of visual.items || []) {
      const card = el('div', 'lab-variable-card');
      card.append(el('span', '', label), el('strong', '', value));
      grid.append(card);
    }
    target.append(grid); return;
  }

  if (visual.kind === 'particles') {
    const chamber = el('div', `lab-particles ${visual.state === 'spread' ? 'spread' : 'close'}`);
    for (let i = 0; i < 18; i += 1) chamber.append(el('span', 'lab-particle'));
    target.append(chamber); return;
  }

  if (visual.kind === 'chain') {
    const chain = el('div', 'lab-chain');
    String(visual.text || '').split('→').map((part) => part.trim()).forEach((part, index, arr) => {
      chain.append(el('span', 'lab-chain-node', part));
      if (index < arr.length - 1) chain.append(el('span', 'lab-chain-arrow', '→'));
    });
    target.append(chain); return;
  }

  if (visual.kind === 'sequence') {
    const sequence = el('div', 'lab-sequence-visual');
    (visual.steps || []).forEach((step, index) => {
      sequence.append(el('span', 'lab-sequence-step', step));
      if (index < visual.steps.length - 1) sequence.append(el('span', 'lab-sequence-arrow', '›'));
    });
    target.append(sequence); return;
  }

  if (visual.kind === 'beam') {
    const beam = el('div', 'lab-beam');
    (visual.items || []).forEach((item, index) => {
      beam.append(el('span', 'lab-beam-node', item));
      if (index < visual.items.length - 1) beam.append(el('span', 'lab-beam-line'));
    });
    target.append(beam); return;
  }

  if (visual.kind === 'stations') {
    const stations = el('div', 'lab-stations');
    (visual.items || []).forEach((item) => stations.append(el('span', 'lab-station', item)));
    target.append(stations); return;
  }

  if (visual.kind === 'circuit') {
    const circuit = el('div', 'lab-circuit');
    circuit.append(el('span', 'lab-circuit-node', '🔋'), el('span', 'lab-circuit-wire'), el('span', 'lab-circuit-node', visual.state === 'open' ? '⛓️‍💥' : '🔌'), el('span', 'lab-circuit-wire'), el('span', 'lab-circuit-node', '💡'));
    target.append(circuit); return;
  }

  if (visual.kind === 'habitat') {
    const hero = el('div', 'lab-visual-hero', visual.emoji || '🌍');
    const labels = el('div', 'lab-mini-labels');
    (visual.labels || []).forEach((label) => labels.append(el('span', '', label)));
    target.append(hero, labels); return;
  }

  const hero = el('div', 'lab-visual-hero', visual.emoji || '🧪');
  if (visual.badge) hero.append(el('small', '', visual.badge));
  target.append(hero);
}

async function openLabRescue(profile) {
  if (activeLab) activeLab.close(true);
  const previousOverflow = document.body.style.overflow;
  let sessionId = '';
  let bestScore = 0;
  let totalScore = 0;
  let dailyXp = 0;
  let dailyCap = 50;
  let missions = [];
  let missionIndex = 0;
  let scoreValue = 0;
  let solved = 0;
  let combo = 0;
  let bestCombo = 0;
  let phase = 'ready';
  let saving = false;
  let runKeys = [];
  let local = loadLocal(profile.id);

  const overlay = el('div', 'lab-rescue-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Lab Rescue Science game');
  const shell = el('section', 'lab-rescue-shell');
  shell.dataset.profile = profile.id;
  const top = el('header', 'lab-rescue-top');
  const brand = el('div', 'lab-rescue-brand');
  const brandIcon = el('div', 'lab-rescue-brand-icon', '🧪');
  const brandCopy = el('div');
  brandCopy.append(el('p', 'lab-rescue-kicker', 'SCIENCE ARCADE'), el('h2', '', 'Lab Rescue'), el('p', 'lab-rescue-subtitle', 'Diagnose · test · reason · rescue the lab'));
  brand.append(brandIcon, brandCopy);
  const closeButton = button('×', 'lab-rescue-close', () => close());
  closeButton.setAttribute('aria-label', 'Tutup Lab Rescue');
  top.append(brand, closeButton);
  const stage = el('div', 'lab-rescue-stage');
  shell.append(top, stage);
  overlay.append(shell);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  const ready = el('section', 'lab-rescue-view lab-rescue-ready');
  const readyOrb = el('div', 'lab-rescue-orb', '⚗️');
  const readyTitle = el('h3', '', profile.id === 'bian' ? 'Science Lab needs you!' : 'Emergency science mission');
  const readyCopy = el('p', 'lab-rescue-ready-copy', profile.id === 'bian'
    ? 'Selesaikan 5 science missions. Setiap run punya kombinasi baru.'
    : 'Solve 5 procedural science missions. Each run mixes concepts, evidence, variables, and predictions.');
  const readyChips = el('div', 'lab-rescue-chips');
  const bestChip = el('span', 'lab-rescue-chip', '🏆 Best …');
  const rankChip = el('span', 'lab-rescue-chip', '🥼 Junior Researcher');
  readyChips.append(el('span', 'lab-rescue-chip', '🧪 5 missions'), bestChip, rankChip, el('span', 'lab-rescue-chip', '⭐ up to +10 XP/run'));
  const rankCard = el('div', 'lab-rank-card');
  const rankRow = el('div', 'lab-rank-row');
  const rankName = el('strong', '', 'Junior Researcher');
  const rankHint = el('span', '', 'Loading progress…');
  rankRow.append(rankName, rankHint);
  const rankTrack = el('div', 'lab-rank-track');
  const rankFill = el('span', 'lab-rank-fill'); rankTrack.append(rankFill);
  const xpLine = el('p', 'lab-rescue-xp-line', 'Game XP hari ini: … / 50');
  const readyNote = el('p', 'lab-rescue-note', 'Menyiapkan science lab…');
  const startButton = button('Mulai Rescue →', 'lab-rescue-primary', () => beginRun(startButton, readyNote));
  startButton.disabled = true;
  ready.append(readyOrb, readyTitle, readyCopy, readyChips, rankCard, xpLine, startButton, readyNote);
  rankCard.append(rankRow, rankTrack);

  const play = el('section', 'lab-rescue-view lab-rescue-play');
  play.hidden = true;
  const hud = el('div', 'lab-rescue-hud');
  const missionStat = statCard('MISSION', '1 / 5');
  const energyStat = statCard('LAB ENERGY', '0');
  const comboStat = statCard('COMBO', 'x0');
  hud.append(missionStat.card, energyStat.card, comboStat.card);
  const missionHead = el('div', 'lab-mission-head');
  const typeChip = el('span', 'lab-mission-type', '🔍 DIAGNOSE');
  const topicChip = el('span', 'lab-mission-topic', 'Science');
  missionHead.append(typeChip, topicChip);
  const missionTitle = el('h3', 'lab-mission-title', 'Mission');
  const scenario = el('p', 'lab-mission-scenario', '');
  const visual = el('div', 'lab-mission-visual');
  const question = el('p', 'lab-mission-question', '');
  const options = el('div', 'lab-mission-options');
  const feedback = el('div', 'lab-mission-feedback'); feedback.hidden = true;
  const nextButton = button('Mission berikutnya →', 'lab-rescue-primary lab-next', nextMission);
  nextButton.hidden = true;
  play.append(hud, missionHead, missionTitle, scenario, visual, question, options, feedback, nextButton);

  const result = el('section', 'lab-rescue-view lab-rescue-result');
  result.hidden = true;
  const complete = el('div', 'lab-rescue-complete', '🧪 LAB RUN COMPLETE');
  const resultTitle = el('h3', '', 'Lab rescued!');
  const resultEnergy = el('div', 'lab-result-energy', '0');
  const resultCaption = el('p', 'lab-result-caption', 'Lab Energy');
  const resultStats = el('div', 'lab-result-grid');
  const solvedCard = metricCard('✅ Missions', '0/5');
  const comboCard = metricCard('🔥 Best combo', 'x0');
  const bestCard = metricCard('🏆 Best run', '0');
  const xpCard = metricCard('⭐ XP didapat', '+0');
  resultStats.append(solvedCard.card, comboCard.card, bestCard.card, xpCard.card);
  const resultRank = el('div', 'lab-result-rank');
  const resultNote = el('p', 'lab-rescue-note', '');
  const resultActions = el('div', 'lab-result-actions');
  const replay = button('Main Lagi', 'lab-rescue-primary', () => beginRun(replay, resultNote));
  const done = button('Selesai', 'lab-rescue-ghost', () => close());
  resultActions.append(replay, done);
  result.append(complete, resultTitle, resultEnergy, resultCaption, resultStats, resultRank, resultActions, resultNote);

  stage.append(ready, play, result);
  activeLab = { close };

  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const onKey = (event) => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  loadStatus();

  function statCard(label, value) {
    const card = el('div', 'lab-hud-stat');
    card.append(el('span', '', label));
    const strong = el('strong', '', value); card.append(strong);
    return { card, value: strong };
  }

  function metricCard(label, value) {
    const card = el('div', 'lab-result-card');
    card.append(el('span', '', label));
    const strong = el('strong', '', value); card.append(strong);
    return { card, value: strong };
  }

  function syncRank() {
    const state = rankProgress(totalScore);
    rankName.textContent = `${state.rank.icon} ${state.rank.label}`;
    rankChip.textContent = `${state.rank.icon} ${state.rank.label}`;
    rankFill.style.width = `${state.progress}%`;
    rankHint.textContent = state.rank.nextAt ? `${state.remaining} energy to next rank` : 'Max rank · keep chasing Best Run';
  }

  async function loadStatus() {
    try {
      const status = await loadGameStatus(profile, true);
      const state = gameStateFromStatus(status);
      bestScore = state.best; totalScore = state.totalScore; dailyXp = state.dailyXp; dailyCap = state.dailyXpCap;
      bestChip.textContent = `🏆 Best ${bestScore}`;
      xpLine.textContent = `Game XP hari ini: ${dailyXp} / ${dailyCap}`;
      syncRank();
      readyNote.textContent = dailyXp >= dailyCap
        ? 'XP game harian sudah penuh. Lab Rescue tetap bisa dimainkan untuk Best Run dan Lab Rank.'
        : 'Science lab online. Setiap run menghasilkan 5 mission baru.';
      startButton.disabled = false;
    } catch (error) {
      readyNote.textContent = error.message;
      readyNote.classList.add('error');
    }
  }

  async function beginRun(trigger, note) {
    if (saving || phase === 'play') return;
    trigger.disabled = true; note.textContent = 'Menyalakan science lab…'; note.classList.remove('error');
    try {
      const start = await call(`/v1/games/${encodeURIComponent(profile.id)}/start`, {
        method: 'POST', body: JSON.stringify({ gameId: 'lab-rescue' }),
      });
      sessionId = start.sessionId;
      const generated = createLabMissionRun(profile.id, {
        recentKeys: local.recentKeys,
        bestScore,
        lastAccuracy: local.lastAccuracy,
      });
      missions = generated.missions;
      runKeys = missions.map((item) => item.key);
      missionIndex = 0; scoreValue = 0; solved = 0; combo = 0; bestCombo = 0; phase = 'play';
      ready.hidden = true; result.hidden = true; play.hidden = false;
      energyStat.value.textContent = '0'; comboStat.value.textContent = 'x0';
      renderMission();
    } catch (error) {
      trigger.disabled = false; note.textContent = error.message; note.classList.add('error');
    }
  }

  function renderMission() {
    const mission = missions[missionIndex];
    if (!mission) return;
    missionStat.value.textContent = `${missionIndex + 1} / ${LAB_RUN_SIZE}`;
    typeChip.textContent = `${mission.typeIcon} ${mission.typeLabel}`;
    topicChip.textContent = mission.topic;
    missionTitle.textContent = mission.title;
    scenario.textContent = mission.scenario;
    question.textContent = mission.question;
    renderVisual(visual, mission.visual);
    feedback.hidden = true; feedback.className = 'lab-mission-feedback'; feedback.replaceChildren();
    nextButton.hidden = true;
    options.replaceChildren();
    for (const choice of mission.choices) {
      const option = button('', 'lab-mission-option', () => answerMission(choice.id, option));
      option.dataset.choice = choice.id;
      option.append(el('span', 'lab-option-letter', choice.id), el('span', 'lab-option-text', choice.text));
      options.append(option);
    }
  }

  function answerMission(choiceId, clicked) {
    if (phase !== 'play') return;
    phase = 'feedback';
    const mission = missions[missionIndex];
    const correct = choiceId === mission.answer;
    for (const option of options.querySelectorAll('button')) {
      option.disabled = true;
      if (option.dataset.choice === mission.answer) option.classList.add('correct');
    }
    if (correct) {
      const gain = missionScore(true, combo);
      combo += 1; bestCombo = Math.max(bestCombo, combo); solved += 1; scoreValue += gain;
      clicked.classList.add('correct');
      feedback.classList.add('success');
      feedback.append(el('strong', '', `✓ LAB STABLE · +${gain} energy`), el('p', '', mission.explanation));
    } else {
      combo = 0; clicked.classList.add('wrong'); feedback.classList.add('error');
      feedback.append(el('strong', '', '⚠ Experiment still unstable'), el('p', '', mission.explanation));
    }
    energyStat.value.textContent = String(scoreValue);
    comboStat.value.textContent = `x${combo}`;
    feedback.hidden = false;
    nextButton.textContent = missionIndex < LAB_RUN_SIZE - 1 ? 'Mission berikutnya →' : 'Lihat hasil →';
    nextButton.hidden = false;
  }

  function nextMission() {
    if (phase !== 'feedback') return;
    if (missionIndex < LAB_RUN_SIZE - 1) {
      missionIndex += 1; phase = 'play'; renderMission();
    } else {
      finishRun();
    }
  }

  async function finishRun() {
    if (saving) return;
    saving = true; phase = 'result';
    const finalScore = finaliseRunScore(scoreValue, solved);
    play.hidden = true; result.hidden = false;
    resultEnergy.textContent = String(finalScore);
    solvedCard.value.textContent = `${solved}/${LAB_RUN_SIZE}`;
    comboCard.value.textContent = `x${bestCombo}`;
    bestCard.value.textContent = String(Math.max(bestScore, finalScore));
    xpCard.value.textContent = '…';
    resultTitle.textContent = solved === LAB_RUN_SIZE ? 'Perfect rescue!' : solved >= 3 ? 'Lab rescued!' : 'Lab run complete';
    resultNote.textContent = 'Menyimpan hasil science mission…'; resultNote.classList.remove('error');
    replay.disabled = true; done.disabled = true;

    try {
      const data = await call(`/v1/games/${encodeURIComponent(profile.id)}/finish`, {
        method: 'POST', body: JSON.stringify({ sessionId, score: finalScore }),
      });
      const state = gameStateFromStatus(data);
      const previousBest = bestScore;
      bestScore = state.best || Math.max(previousBest, finalScore);
      totalScore = state.totalScore || (totalScore + finalScore);
      dailyXp = state.dailyXp; dailyCap = state.dailyXpCap;
      const xpEarned = Number(data.xpEarned || 0);
      bestCard.value.textContent = String(bestScore);
      xpCard.value.textContent = `+${xpEarned}`;
      const rank = labRankForTotalScore(totalScore);
      resultRank.textContent = `${rank.icon} ${rank.label} · Total Lab Energy ${totalScore}`;
      resultNote.textContent = dailyXp >= dailyCap
        ? 'XP game harian sudah penuh. Main lagi tetap menambah Best Run dan Lab Rank.'
        : `Hasil tersimpan · Game XP hari ini ${dailyXp}/${dailyCap}`;
      if (finalScore > previousBest) resultTitle.textContent = 'New Best Run! 🌟';
      local = {
        recentKeys: [...runKeys, ...local.recentKeys.filter((key) => !runKeys.includes(key))].slice(0, 18),
        lastAccuracy: solved / LAB_RUN_SIZE,
      };
      saveLocal(profile.id, local);
      statusCache.delete(profile.id);
      const tile = document.querySelector('.lab-rescue-tile');
      if (tile) { tile.dataset.labSync = ''; syncTile(profile, tile); }
      window.dispatchEvent(new Event('ubaybian:progress-changed'));
    } catch (error) {
      resultNote.textContent = `Hasil belum tersimpan: ${error.message}`; resultNote.classList.add('error');
    } finally {
      saving = false; replay.disabled = false; done.disabled = false;
    }
  }

  function close(force = false) {
    if (!force && (phase === 'play' || phase === 'feedback' || saving)) {
      if (!confirm('Lab Rescue masih berjalan atau sedang menyimpan hasil. Yakin mau keluar?')) return;
    }
    phase = 'closed';
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.body.style.overflow = previousOverflow;
    if (activeLab?.close === close) activeLab = null;
    ensureLabTile();
  }
}

function scan() {
  ensureLabTile();
}

const observer = new MutationObserver(() => requestAnimationFrame(scan));
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', () => setTimeout(scan, 60));
window.addEventListener('ubaybian:progress-changed', () => {
  statusCache.clear();
  setTimeout(scan, 80);
});
scan();

export { openLabRescue };
