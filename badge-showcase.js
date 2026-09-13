import { apiBase, backendEnabled } from './config.js';
import { createApiClient } from './api.js?v=0.5.52';

const api = backendEnabled ? createApiClient(apiBase) : null;
const cache = new Map();
const rackState = new WeakMap();
const CATEGORY_ORDER = ['consistency', 'practice', 'mastery', 'growth', 'assessment'];
const CATEGORY_META = Object.freeze({
  consistency: { label: 'Consistency', icon: '🔥' },
  practice: { label: 'Practice', icon: '🌟' },
  mastery: { label: 'Mastery', icon: '🏆' },
  growth: { label: 'Growth', icon: '🌱' },
  assessment: { label: 'Assessment', icon: '📝' },
});
const RARITY_LABEL = Object.freeze({ common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' });
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function node(tag, cls = '', text = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== '') el.textContent = text;
  return el;
}

function profileId() {
  return String(document.body.dataset.profile || location.hash.replace(/^#\/?/, '').split('/')[0] || '').trim();
}

async function loadBadges(id, force = false) {
  if (!api || !id) return [];
  const cached = cache.get(id);
  if (!force && cached && Date.now() - cached.at < 60000) return cached.badges;
  const dashboard = await api.dashboard(id);
  const badges = Array.isArray(dashboard?.badges) ? dashboard.badges : [];
  cache.set(id, { at: Date.now(), badges });
  return badges;
}

function badgeKey(item) {
  return String(item?.id || `${item?.badgeId || 'badge'}:${item?.scopeKey || ''}`);
}

function uniquePush(target, item) {
  if (!item || target.some((entry) => badgeKey(entry) === badgeKey(item))) return;
  target.push(item);
}

function selectFeatured(badges) {
  const byPriority = [...badges].sort((a, b) =>
    Number(b.priority || 0) - Number(a.priority || 0)
    || Number(b.tier || 1) - Number(a.tier || 1)
    || Number(b.upgradedAt || b.unlockedAt || 0) - Number(a.upgradedAt || a.unlockedAt || 0)
  );
  const newest = [...badges].sort((a, b) => Number(b.upgradedAt || b.unlockedAt || 0) - Number(a.upgradedAt || a.unlockedAt || 0))[0];
  const featured = [];
  uniquePush(featured, byPriority.find((item) => item.category === 'mastery' && Number(item.tier || 1) >= 2) || byPriority[0]);
  uniquePush(featured, newest);
  for (const item of byPriority) {
    if (featured.length >= 3) break;
    uniquePush(featured, item);
  }
  return featured.slice(0, 3);
}

function displayName(item) {
  return String(item?.name || 'Achievement');
}

function createBadgeChip(item, { spotlight = false, latest = false } = {}) {
  const chip = node('div', `badge-chip badge-showcase-item${spotlight ? ' is-spotlight' : ''}${latest ? ' is-latest' : ''}`);
  chip.dataset.badgeKey = badgeKey(item);
  const emoji = node('span', 'emoji', item?.emoji || '🏅');
  const copy = node('div', 'badge-text');
  const nameRow = node('div', 'badge-showcase-name-row');
  nameRow.append(node('span', 'badge-name', displayName(item)));
  if (spotlight) nameRow.append(node('span', 'badge-spotlight-label', 'SPOTLIGHT'));
  else if (latest) nameRow.append(node('span', 'badge-new-label', 'NEW'));
  copy.append(nameRow, node('span', 'badge-desc', String(item?.description || 'Achievement terbuka.')));
  chip.append(emoji, copy);
  return chip;
}

function latestKey(badges) {
  return badgeKey([...badges].sort((a, b) => Number(b.upgradedAt || b.unlockedAt || 0) - Number(a.upgradedAt || a.unlockedAt || 0))[0]);
}

function replaceSpotlight(slot, item) {
  if (!slot || !item) return;
  const next = createBadgeChip(item, { spotlight: true });
  next.classList.add('badge-spotlight-enter');
  slot.replaceChildren(...next.childNodes);
  slot.dataset.badgeKey = badgeKey(item);
  slot.className = 'badge-chip badge-showcase-item is-spotlight badge-spotlight-enter';
  requestAnimationFrame(() => slot.classList.remove('badge-spotlight-enter'));
}

function stopRack(card) {
  const old = rackState.get(card);
  if (old?.timer) clearInterval(old.timer);
  rackState.delete(card);
}

function contextLabel(item) {
  const parts = [];
  if (item?.tierLabel) parts.push(item.tierLabel);
  if (item?.rarity) parts.push(RARITY_LABEL[item.rarity] || item.rarity);
  if (item?.grade) parts.push(`Grade ${item.grade}`);
  if (item?.semester) parts.push(`Semester ${item.semester}`);
  if (item?.academicYear) parts.push(item.academicYear);
  return parts.join(' · ');
}

function closeGallery(overlay) {
  if (!overlay) return;
  overlay.classList.add('is-closing');
  document.body.classList.remove('badge-gallery-open');
  setTimeout(() => overlay.remove(), reduceMotion ? 0 : 160);
}

function openGallery(badges, id) {
  document.querySelector('.badge-gallery-overlay')?.remove();
  const overlay = node('div', 'badge-gallery-overlay');
  overlay.setAttribute('role', 'presentation');
  const dialog = node('section', 'badge-gallery-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'badge-gallery-title');

  const top = node('div', 'badge-gallery-top');
  const heading = node('div', 'badge-gallery-heading');
  const icon = node('span', 'badge-gallery-icon', '🏅');
  const headingCopy = node('div');
  const kicker = node('span', 'badge-gallery-kicker', 'ACHIEVEMENT COLLECTION');
  const title = node('h2', '', 'Badge Collection');
  title.id = 'badge-gallery-title';
  headingCopy.append(kicker, title, node('p', '', `${badges.length} badge sudah terbuka untuk ${id === 'ubay' ? 'Ubay' : id === 'bian' ? 'Bian' : 'profil ini'}.`));
  heading.append(icon, headingCopy);
  const close = node('button', 'badge-gallery-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Tutup koleksi badge');
  top.append(heading, close);

  const body = node('div', 'badge-gallery-body');
  for (const category of CATEGORY_ORDER) {
    const items = badges.filter((item) => item.category === category);
    if (!items.length) continue;
    const meta = CATEGORY_META[category];
    const section = node('section', 'badge-gallery-section');
    const sectionHead = node('div', 'badge-gallery-section-head');
    sectionHead.append(node('h3', '', `${meta.icon} ${meta.label}`), node('span', '', `${items.length} badge`));
    const grid = node('div', 'badge-gallery-grid');
    for (const item of items) {
      const card = node('article', `badge-gallery-card rarity-${item.rarity || 'common'}`);
      const emblem = node('div', 'badge-gallery-emblem', item.emoji || '🏅');
      const copy = node('div', 'badge-gallery-card-copy');
      copy.append(node('strong', '', displayName(item)), node('p', '', String(item.description || 'Achievement terbuka.')));
      const metaLine = contextLabel(item);
      if (metaLine) copy.append(node('small', '', metaLine));
      card.append(emblem, copy);
      grid.append(card);
    }
    section.append(sectionHead, grid);
    body.append(section);
  }

  dialog.append(top, body);
  overlay.append(dialog);
  document.body.append(overlay);
  document.body.classList.add('badge-gallery-open');
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  close.focus();

  const onKey = (event) => {
    if (event.key !== 'Escape') return;
    document.removeEventListener('keydown', onKey);
    closeGallery(overlay);
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', () => {
    document.removeEventListener('keydown', onKey);
    closeGallery(overlay);
  });
  overlay.addEventListener('click', (event) => {
    if (event.target !== overlay) return;
    document.removeEventListener('keydown', onKey);
    closeGallery(overlay);
  });
}

function renderRack(card, badges, id) {
  stopRack(card);
  const list = card.querySelector('.badge-list');
  if (!list) return;
  card.querySelector('.badge-more')?.remove();
  card.querySelector('.badge-showcase-footer')?.remove();

  if (!badges.length) {
    card.classList.add('badge-showcase-empty');
    card.classList.remove('has-badge-spotlight');
    return;
  }
  card.classList.remove('badge-showcase-empty');
  list.replaceChildren();

  const featured = selectFeatured(badges);
  const latest = latestKey(badges);
  featured.forEach((item) => list.append(createBadgeChip(item, { latest: badgeKey(item) === latest })));
  const featuredKeys = new Set(featured.map(badgeKey));
  const rotating = badges
    .filter((item) => !featuredKeys.has(badgeKey(item)))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || Number(b.upgradedAt || 0) - Number(a.upgradedAt || 0));

  let spotlight = null;
  card.classList.toggle('has-badge-spotlight', rotating.length > 0);
  if (rotating.length) {
    spotlight = createBadgeChip(rotating[0], { spotlight: true });
    list.append(spotlight);
  }

  const footer = node('div', 'badge-showcase-footer');
  const count = node('span', 'badge-showcase-total', `${badges.length} unlocked`);
  const viewAll = node('button', 'badge-view-all', 'Lihat semua badge');
  viewAll.type = 'button';
  viewAll.addEventListener('click', () => openGallery(badges, id));
  footer.append(count, viewAll);
  card.append(footer);

  if (!spotlight || rotating.length < 2 || reduceMotion) return;
  const state = { index: 0, paused: false, timer: null };
  const advance = () => {
    if (state.paused || !card.isConnected) {
      if (!card.isConnected && state.timer) clearInterval(state.timer);
      return;
    }
    state.index = (state.index + 1) % rotating.length;
    spotlight.classList.add('is-swapping');
    setTimeout(() => {
      if (!card.isConnected) return;
      replaceSpotlight(spotlight, rotating[state.index]);
      spotlight.classList.remove('is-swapping');
    }, 160);
  };
  state.timer = setInterval(advance, 6500);
  card.addEventListener('pointerenter', () => { state.paused = true; });
  card.addEventListener('pointerleave', () => { state.paused = false; });
  card.addEventListener('focusin', () => { state.paused = true; });
  card.addEventListener('focusout', () => { state.paused = false; });
  rackState.set(card, state);
}

let scheduled = false;
async function enhance() {
  scheduled = false;
  const card = document.querySelector('.badge-card');
  const id = profileId();
  if (!card || !id || card.dataset.badgeShowcaseLoading === '1') return;
  const signature = `${id}:${document.querySelector('.xp-main')?.textContent || ''}:${document.querySelector('.hero-meta')?.textContent || ''}`;
  if (card.dataset.badgeShowcaseSignature === signature && card.dataset.badgeShowcaseReady === '1') return;
  card.dataset.badgeShowcaseLoading = '1';
  try {
    // A new Home card should always reflect achievements just unlocked in the previous session.
    const badges = await loadBadges(id, true);
    if (!card.isConnected || profileId() !== id) return;
    renderRack(card, badges, id);
    card.dataset.badgeShowcaseReady = '1';
    card.dataset.badgeShowcaseSignature = signature;
  } catch {
    // Keep the server-rendered badge list if the enhancement fetch fails.
  } finally {
    if (card.isConnected) card.dataset.badgeShowcaseLoading = '0';
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(enhance);
}

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', schedule);
window.addEventListener('pageshow', schedule);
schedule();
