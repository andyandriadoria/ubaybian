const LEVELS = Object.freeze([
  { level: 1, minXp: 0, title: 'Rookie Bot', emoji: '🤖' },
  { level: 2, minXp: 100, title: 'Curious Bot', emoji: '🔎' },
  { level: 3, minXp: 300, title: 'Smart Explorer', emoji: '🧠' },
  { level: 4, minXp: 700, title: 'Knowledge Ranger', emoji: '🚀' },
  { level: 5, minXp: 1500, title: 'Brain Commander', emoji: '⚡' },
  { level: 6, minXp: 3000, title: 'UbayBian Legend', emoji: '🌟' },
]);

function levelForXp(xp) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level;
  }
  const index = LEVELS.findIndex((level) => level.level === current.level);
  const next = LEVELS[index + 1] || null;
  return {
    ...current,
    nextXp: next?.minXp ?? null,
    progressPercent: next
      ? Math.max(0, Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)))
      : 100,
  };
}

function jakartaDateKey(timestamp) {
  return new Date(Number(timestamp) + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function dayNumber(dateKey) {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
}

function streakInfo(completedAtValues) {
  const unique = [...new Set(completedAtValues.filter(Boolean).map(jakartaDateKey))]
    .map(dayNumber)
    .sort((a, b) => a - b);
  if (!unique.length) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] === unique[i - 1] + 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }

  const today = dayNumber(jakartaDateKey(Date.now()));
  const last = unique[unique.length - 1];
  if (last < today - 1) return { current: 0, longest };
  let current = 1;
  for (let i = unique.length - 1; i > 0; i -= 1) {
    if (unique[i - 1] === unique[i] - 1) current += 1;
    else break;
  }
  return { current, longest };
}

function scoreForSession(row) {
  const total = Math.max(1, Number(row.total_questions) || 1);
  return Math.round(((Number(row.correct_count) || 0) / total) * 100);
}

function badge(id, name, description, emoji, extra = {}) {
  return { id, name, description, emoji, ...extra };
}

export async function progressForFamily(env, familyId, profileId = null) {
  const sql = profileId
    ? `SELECT p.slug AS profileId, ps.subject_id AS subjectId, ps.attempted, ps.correct, ps.last_practiced_at AS lastPracticedAt
       FROM progress_summary ps JOIN profiles p ON p.id = ps.profile_id
       WHERE ps.family_id = ? AND ps.profile_id = ? ORDER BY ps.subject_id`
    : `SELECT p.slug AS profileId, ps.subject_id AS subjectId, ps.attempted, ps.correct, ps.last_practiced_at AS lastPracticedAt
       FROM progress_summary ps JOIN profiles p ON p.id = ps.profile_id
       WHERE ps.family_id = ? ORDER BY p.id, ps.subject_id`;
  const query = profileId ? env.DB.prepare(sql).bind(familyId, profileId) : env.DB.prepare(sql).bind(familyId);
  const result = await query.all();
  return (result.results || []).map((row) => ({
    profileId: row.profileId,
    subjectId: row.subjectId,
    attempted: Number(row.attempted),
    correct: Number(row.correct),
    lastPracticedAt: Number(row.lastPracticedAt),
  }));
}

export async function dashboardForProfile(env, familyId, profile) {
  const [sessionResult, answerResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, subject_id, total_questions, correct_count, created_at, completed_at
      FROM quiz_sessions
      WHERE family_id = ? AND profile_id = ? AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
    `).bind(familyId, profile.id).all(),
    env.DB.prepare(`
      SELECT qa.question_id, qa.answer, qa.correct, qa.answered_at, qs.subject_id
      FROM quiz_answers qa
      JOIN quiz_sessions qs ON qs.id = qa.session_id
      WHERE qs.family_id = ? AND qs.profile_id = ?
      ORDER BY qa.answered_at DESC
    `).bind(familyId, profile.id).all(),
  ]);

  const sessions = sessionResult.results || [];
  const answersDesc = answerResult.results || [];
  const totalCorrect = answersDesc.reduce((sum, row) => sum + (Number(row.correct) === 1 ? 1 : 0), 0);
  const totalAnswered = answersDesc.length;
  const perfectSessions = sessions.filter((row) => scoreForSession(row) === 100).length;
  const streak = streakInfo(sessions.map((row) => row.completed_at));
  const streakXpBonus = (streak.longest >= 3 ? 30 : 0) + (streak.longest >= 7 ? 70 : 0);
  const xp = (totalCorrect * 10) + (sessions.length * 20) + streakXpBonus;
  const coins = (totalCorrect * 50) + (perfectSessions * 100);
  const level = levelForXp(xp);

  const subjectStats = new Map();
  for (const row of answersDesc) {
    const id = String(row.subject_id || '');
    const item = subjectStats.get(id) || { subjectId: id, attempted: 0, correct: 0, review: 0 };
    item.attempted += 1;
    if (Number(row.correct) === 1) item.correct += 1;
    subjectStats.set(id, item);
  }

  const latestByQuestion = new Map();
  for (const row of answersDesc) {
    const key = `${row.subject_id}::${row.question_id}`;
    if (!latestByQuestion.has(key)) latestByQuestion.set(key, row);
  }
  for (const row of latestByQuestion.values()) {
    if (Number(row.correct) === 1) continue;
    const subject = subjectStats.get(String(row.subject_id || '')) || { subjectId: String(row.subject_id || ''), attempted: 0, correct: 0, review: 0 };
    subject.review += 1;
    subjectStats.set(subject.subjectId, subject);
  }
  const reviewTotal = [...latestByQuestion.values()].filter((row) => Number(row.correct) !== 1).length;

  const answersAsc = [...answersDesc].reverse();
  const previouslyWrong = new Set();
  const comeback = new Set();
  for (const row of answersAsc) {
    const key = `${row.subject_id}::${row.question_id}`;
    if (Number(row.correct) === 1) {
      if (previouslyWrong.has(key)) comeback.add(key);
    } else {
      previouslyWrong.add(key);
    }
  }

  const badges = [];
  if (perfectSessions >= 1) badges.push(badge('perfect-1', 'Perfect Score x1', 'Mendapat nilai 100% dalam 1 sesi.', '🌟'));
  if (perfectSessions >= 3) badges.push(badge('perfect-3', 'Perfect Score x3', 'Mendapat nilai 100% dalam 3 sesi.', '🌟🌟'));
  if (perfectSessions >= 5) badges.push(badge('perfect-5', 'Perfect Score x5', 'Mendapat nilai 100% dalam 5 sesi.', '🌟🌟🌟'));
  if (perfectSessions >= 10) badges.push(badge('perfect-10', 'Perfect Score x10', 'Mendapat nilai 100% dalam 10 sesi.', '👑'));
  if (streak.longest >= 3) badges.push(badge('on-fire', 'On Fire', 'Belajar pada 3 hari berturut-turut.', '🔥'));
  if (streak.longest >= 14) badges.push(badge('steady-14', 'Steady Learner', 'Menjaga kebiasaan belajar selama 14 hari berturut-turut.', '🗓️'));
  if (sessions.length >= 10) badges.push(badge('study-habit', 'Study Habit', 'Menyelesaikan 10 sesi latihan.', '📚'));
  if (totalAnswered >= 100) badges.push(badge('hundred-questions', '100 Questions', 'Menjawab 100 soal latihan.', '🧠'));
  if (sessions.some((row) => Number(row.total_questions) >= 15)) badges.push(badge('challenge-accepted', 'Challenge Accepted', 'Menyelesaikan sesi 15 soal.', '🚀'));
  if (comeback.size >= 10) badges.push(badge('comeback', 'Comeback', 'Menguasai 10 soal yang sebelumnya masih salah.', '🔁'));

  const masteredSubjects = new Set();
  for (const row of sessions) {
    if (scoreForSession(row) >= 90 && row.subject_id && row.subject_id !== 'mix') masteredSubjects.add(String(row.subject_id));
  }
  for (const subjectId of masteredSubjects) {
    badges.push(badge(`master-${subjectId}`, 'Subject Master', 'Mencapai nilai minimal 90% pada satu mata pelajaran.', '🏆', { subjectId }));
  }

  const report = sessions.slice(0, 10).map((row) => ({
    sessionId: row.id,
    subjectId: row.subject_id,
    total: Number(row.total_questions),
    correct: Number(row.correct_count),
    score: scoreForSession(row),
    completedAt: Number(row.completed_at),
  }));

  return {
    stats: {
      xp,
      coins,
      level,
      streak,
      streakXpBonus,
      totalSessions: sessions.length,
      totalAnswered,
      totalCorrect,
      perfectSessions,
      reviewTotal,
    },
    subjects: [...subjectStats.values()].sort((a, b) => a.subjectId.localeCompare(b.subjectId)),
    badges,
    report,
    rules: {
      correctXp: 10,
      correctCoins: 50,
      completionXp: 20,
      perfectCoins: 100,
      streak3Xp: 30,
      streak7Xp: 70,
    },
  };
}
