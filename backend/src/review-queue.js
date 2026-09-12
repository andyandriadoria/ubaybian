export const EXAM_REVIEW_POLICY_START_AT = Date.parse('2026-09-12T12:45:00Z');

export function reviewKey(row) {
  return `${String(row?.subject_id || '')}::${String(row?.question_id || '')}`;
}

export function mergeReviewEvents(events) {
  const ordered = [...(events || [])]
    .map((row) => ({
      subject_id: String(row?.subject_id || ''),
      question_id: String(row?.question_id || ''),
      correct: Number(row?.correct) === 1 ? 1 : 0,
      event_at: Number(row?.event_at || 0),
      source: String(row?.source || 'practice'),
    }))
    .filter((row) => row.subject_id && row.question_id)
    .sort((a, b) => {
      const time = b.event_at - a.event_at;
      if (time) return time;
      const sourceRank = (value) => value === 'practice' ? 2 : 1;
      return sourceRank(b.source) - sourceRank(a.source);
    });

  const latest = new Map();
  for (const row of ordered) {
    const key = reviewKey(row);
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
}

async function practiceReviewEvents(env, familyId, profileId, subjectId = null) {
  const subjectFilter = subjectId ? ' AND qs.subject_id = ?' : '';
  const query = env.DB.prepare(`
    SELECT qs.subject_id, qa.question_id, qa.correct, qa.answered_at AS event_at, 'practice' AS source
    FROM quiz_answers qa
    JOIN quiz_sessions qs ON qs.id = qa.session_id
    WHERE qs.family_id = ? AND qs.profile_id = ?${subjectFilter}
  `);
  const result = subjectId
    ? await query.bind(familyId, profileId, subjectId).all()
    : await query.bind(familyId, profileId).all();
  return result.results || [];
}

async function examReviewEvents(env, familyId, profileId, subjectId = null) {
  const subjectFilter = subjectId ? ' AND es.subject_id = ?' : '';
  const query = env.DB.prepare(`
    SELECT es.subject_id, q.question_id,
      CASE WHEN a.question_id IS NULL THEN 0 ELSE a.correct END AS correct,
      es.completed_at AS event_at,
      'exam' AS source
    FROM exam_sessions es
    JOIN exam_session_questions q ON q.session_id = es.id
    LEFT JOIN exam_answers a ON a.session_id = q.session_id AND a.question_id = q.question_id
    WHERE es.family_id = ? AND es.profile_id = ?
      AND es.completed_at IS NOT NULL AND es.completed_at >= ?
      AND q.question_type <> 'open-response'${subjectFilter}
  `);
  const args = subjectId
    ? [familyId, profileId, EXAM_REVIEW_POLICY_START_AT, subjectId]
    : [familyId, profileId, EXAM_REVIEW_POLICY_START_AT];
  const result = await query.bind(...args).all();
  return result.results || [];
}

export async function reviewQuestionStates(env, familyId, profileId, subjectId = null) {
  const [practice, exam] = await Promise.all([
    practiceReviewEvents(env, familyId, profileId, subjectId),
    examReviewEvents(env, familyId, profileId, subjectId),
  ]);
  return mergeReviewEvents([...practice, ...exam]).filter((row) => row.correct !== 1);
}

export async function reviewQuestionIds(env, familyId, profileId, subjectId) {
  const states = await reviewQuestionStates(env, familyId, profileId, subjectId);
  return new Set(states.map((row) => row.question_id));
}
