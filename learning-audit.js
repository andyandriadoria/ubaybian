// UbayBian v0.5.82 — consistency layer for Practice + Assessment analytics
import { apiBase, backendEnabled } from './config.js';
import { createApiClient } from './api.js?v=0.5.82';
import { findProfile } from './profiles.js';

const main = document.querySelector('#main');
const api = backendEnabled ? createApiClient(apiBase) : null;
if (!main) throw new Error('UbayBian main container not found.');

function setRules(panel) {
  const session = panel?.querySelector('#question-count');
  if (!session) return;
  const wrapper = panel.parentElement;
  const strip = wrapper?.querySelector('.rules-strip');
  const summary = wrapper?.querySelector('.today-summary p');
  const isAssessment = session.value === 'exam';

  if (strip) {
    const items = isAssessment
      ? [
          '✅ Benar +5 XP',
          '🪙 Benar +20 coins',
          '🏁 ≥80% terjawab +50 XP',
          '🔒 Reward 1x per Assessment',
        ]
      : [
          '✅ Benar +10 XP',
          '🪙 Benar +50 coins',
          '🏁 Selesai +20 XP',
          '🌟 Perfect +100 coins',
        ];
    strip.replaceChildren(...items.map((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      return span;
    }));
    strip.dataset.rewardMode = isAssessment ? 'assessment' : 'practice';
  }

  if (summary) {
    summary.textContent = 'Practice dan Assessment sama-sama memberi XP/coins dengan aturan berbeda. Soal auto-scored yang salah atau dilewati masuk Review. Level tidak pernah turun.';
  }

  if (session.dataset.auditRewardBound !== '1') {
    session.dataset.auditRewardBound = '1';
    session.addEventListener('change', () => queueMicrotask(() => setRules(panel)));
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function subjectLabel(profile, subjectId) {
  return profile?.subjects?.find((item) => item[0] === subjectId)?.[1] || subjectId || 'Pelajaran';
}

function makeInsight(icon, label, value, note, kind) {
  const item = document.createElement('div');
  item.className = `report-learning-item ${kind}`;
  const labelEl = document.createElement('span');
  labelEl.className = 'report-learning-label';
  labelEl.textContent = `${icon} ${label}`;
  const valueEl = document.createElement('strong');
  valueEl.className = 'report-learning-value';
  valueEl.textContent = value;
  const noteEl = document.createElement('span');
  noteEl.className = 'report-learning-note';
  noteEl.textContent = note;
  item.append(labelEl, valueEl, noteEl);
  return item;
}

function rebuildLearningInsights(card, report, profile) {
  card.querySelector('.report-learning-insights')?.remove();
  const finalRows = report.filter((row) => row.scoreStatus !== 'auto' && number(row.score) !== null);
  const autoRows = report.filter((row) => row.scoreStatus === 'auto');
  const recent = finalRows.slice(0, 3);
  const recentAverage = recent.length
    ? Math.round(recent.reduce((sum, row) => sum + Number(row.score), 0) / recent.length)
    : null;
  const finalAverage = finalRows.length
    ? Math.round(finalRows.reduce((sum, row) => sum + Number(row.score), 0) / finalRows.length)
    : null;
  const reached50 = finalRows.filter((row) => Number(row.score) >= 50).length;

  const subjectCounts = new Map();
  report.forEach((row) => {
    const label = subjectLabel(profile, row.subjectId);
    subjectCounts.set(label, (subjectCounts.get(label) || 0) + 1);
  });
  let dominantSubject = '—';
  let dominantCount = 0;
  for (const [label, count] of subjectCounts) {
    if (count > dominantCount) {
      dominantSubject = label;
      dominantCount = count;
    }
  }

  const section = document.createElement('section');
  section.className = 'report-learning-insights';
  section.setAttribute('aria-label', 'Insight belajar');
  const head = document.createElement('div');
  head.className = 'report-learning-head';
  const title = document.createElement('h3');
  title.textContent = 'Insight belajar';
  const sub = document.createElement('p');
  sub.textContent = autoRows.length
    ? 'Nilai final tidak mencampur auto-score Assessment yang masih menunggu review open response.'
    : 'Dihitung dari nilai final yang tampil di rapor.';
  head.append(title, sub);

  const grid = document.createElement('div');
  grid.className = 'report-learning-grid';
  const trendNote = recentAverage === null
    ? 'Belum ada nilai final untuk dihitung.'
    : finalAverage === null || recentAverage === finalAverage
      ? 'Sama dengan rata-rata nilai final.'
      : recentAverage > finalAverage
        ? `Naik ${recentAverage - finalAverage} poin dari rata-rata nilai final.`
        : `${finalAverage - recentAverage} poin di bawah rata-rata nilai final.`;
  const benchmarkNote = finalRows.length
    ? `${finalRows.length - reached50} sesi final masih berada di bawah 50%.`
    : 'Assessment dengan open response belum dihitung sebagai nilai final.';
  const focusNote = report.length
    ? `${dominantCount} dari ${report.length} sesi belajar terakhir.`
    : 'Belum ada sesi belajar.';

  grid.append(
    makeInsight('📈', `${Math.min(3, finalRows.length)} nilai final terbaru`, recentAverage === null ? '—' : `${recentAverage}%`, trendNote, 'trend'),
    makeInsight('🎯', 'Nilai final ≥50%', `${reached50}/${finalRows.length}`, benchmarkNote, 'benchmark'),
    makeInsight('📚', 'Fokus belajar', dominantSubject, focusNote, 'subject'),
  );
  section.append(head, grid);
  const mainGrid = card.querySelector('.report-main-grid');
  if (mainGrid) mainGrid.insertAdjacentElement('afterend', section);
  else card.append(section);
}

function syncReportInsights(card, report) {
  const finalRows = report.filter((row) => row.scoreStatus !== 'auto' && number(row.score) !== null);
  const block = card.querySelector('.report-insights');
  if (!block) return;
  const average = finalRows.length
    ? Math.round(finalRows.reduce((sum, row) => sum + Number(row.score), 0) / finalRows.length)
    : null;
  const best = finalRows.length ? Math.max(...finalRows.map((row) => Number(row.score))) : null;
  const sessionValue = block.querySelector('.report-insight.sessions .report-insight-value');
  const avgValue = block.querySelector('.report-insight.avg .report-insight-value');
  const bestValue = block.querySelector('.report-insight.best .report-insight-value');
  const sessionLabel = block.querySelector('.report-insight.sessions .report-insight-label');
  const avgLabel = block.querySelector('.report-insight.avg .report-insight-label');
  const bestLabel = block.querySelector('.report-insight.best .report-insight-label');
  if (sessionLabel) sessionLabel.textContent = 'Nilai final';
  if (avgLabel) avgLabel.textContent = 'Rata-rata final';
  if (bestLabel) bestLabel.textContent = 'Terbaik final';
  if (sessionValue) sessionValue.textContent = `${finalRows.length}/${report.length}`;
  if (avgValue) avgValue.textContent = average === null ? '—' : `${average}%`;
  if (bestValue) bestValue.textContent = best === null ? '—' : `${best}%`;
}

function applyReportData(card, dashboard, profile) {
  const report = Array.isArray(dashboard?.report) ? dashboard.report : [];
  const rows = [...card.querySelectorAll('.report-table tbody tr')];

  rows.forEach((row, index) => {
    const item = report[index];
    if (!item) return;
    row.dataset.sessionKind = item.kind || 'practice';
    row.dataset.scoreStatus = item.scoreStatus || 'final';
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) return;

    const subjectCell = cells[1];
    let badge = subjectCell.querySelector('.report-session-type');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'report-session-type';
      subjectCell.append(badge);
    }
    badge.textContent = item.kind === 'assessment' ? 'Assessment' : 'Practice';
    badge.classList.toggle('assessment', item.kind === 'assessment');

    const scoreCell = cells[2];
    scoreCell.dataset.scoreStatus = item.scoreStatus || 'final';
    const scoreTarget = scoreCell.querySelector('.report-score-pill') || scoreCell;
    const score = number(item.score);
    scoreTarget.textContent = score === null ? 'Pending' : `${score}%${item.scoreStatus === 'auto' ? ' auto' : ''}`;
    scoreTarget.classList.toggle('is-provisional', item.scoreStatus === 'auto');
    if (item.scoreStatus === 'auto') scoreTarget.title = 'Auto-score; open response masih menunggu review.';
    else scoreTarget.removeAttribute('title');

    const correctTarget = cells[3].querySelector('.report-correct-pill') || cells[3];
    correctTarget.textContent = `${Number(item.correct) || 0} / ${Number(item.total) || 0}`;
  });

  const chartRows = [...card.querySelectorAll('.report-bar-wrap')];
  const reverse = [...report].reverse();
  chartRows.forEach((wrap, index) => {
    const item = reverse[index];
    if (!item) return;
    const bar = wrap.querySelector('.report-bar');
    const value = wrap.querySelector('.report-bar-value');
    if (value) value.textContent = `${Number(item.score) || 0}%${item.scoreStatus === 'auto' ? '*' : ''}`;
    if (bar) {
      bar.classList.toggle('is-provisional', item.scoreStatus === 'auto');
      bar.title = item.scoreStatus === 'auto' ? 'Auto-score; open response masih menunggu review.' : '';
    }
  });

  const header = card.querySelector('.report-header');
  const subtitle = header?.querySelector('p');
  if (subtitle) subtitle.textContent = 'Ringkasan maksimal 10 sesi belajar terakhir · Practice + Assessment.';
  const badge = header?.querySelector('.report-badge');
  const finalRows = report.filter((row) => row.scoreStatus !== 'auto' && number(row.score) !== null);
  const average = finalRows.length
    ? Math.round(finalRows.reduce((sum, row) => sum + Number(row.score), 0) / finalRows.length)
    : null;
  if (badge) badge.textContent = report.length
    ? `${dashboard.stats?.totalSessions || report.length} sesi · ${average === null ? 'nilai final menunggu' : `${average}% avg final`}`
    : 'Belum ada sesi';

  card.querySelector('.report-auto-note')?.remove();
  if (report.some((row) => row.scoreStatus === 'auto')) {
    const note = document.createElement('p');
    note.className = 'report-auto-note';
    note.textContent = '* Auto-score hanya menghitung soal yang dapat dinilai otomatis. Open response tetap menunggu review dan belum menjadi nilai final.';
    const mainGrid = card.querySelector('.report-main-grid');
    if (mainGrid) mainGrid.insertAdjacentElement('afterend', note);
    else card.append(note);
  }

  syncReportInsights(card, report);
  rebuildLearningInsights(card, report, profile);
}

async function auditReport(card) {
  if (!api || !card || card.dataset.learningAudit === 'loading' || card.dataset.learningAudit === 'done') return;
  const profileId = document.body.dataset.profile || '';
  const profile = findProfile(profileId);
  if (!profile) return;
  card.dataset.learningAudit = 'loading';
  try {
    const dashboard = await api.dashboard(profileId);
    if (!card.isConnected || document.body.dataset.profile !== profileId) return;
    applyReportData(card, dashboard, profile);
    card.dataset.learningAudit = 'done';
  } catch (error) {
    card.dataset.learningAudit = 'error';
    console.error('LEARNING_AUDIT_REPORT_FAILED', error);
  }
}

function scan(root = document) {
  const panels = [];
  if (root.nodeType === 1 && root.matches?.('.controls-panel')) panels.push(root);
  root.querySelectorAll?.('.controls-panel').forEach((panel) => panels.push(panel));
  panels.forEach(setRules);

  const reports = [];
  if (root.nodeType === 1 && root.matches?.('.report-card')) reports.push(root);
  root.querySelectorAll?.('.report-card').forEach((card) => reports.push(card));
  reports.forEach(auditReport);
}

scan();
const observer = new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType === 1) scan(node);
    }
  }
});
observer.observe(main, { childList: true, subtree: true });
