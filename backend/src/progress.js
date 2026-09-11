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
    profileId: row.profileId, subjectId: row.subjectId, attempted: Number(row.attempted), correct: Number(row.correct), lastPracticedAt: Number(row.lastPracticedAt),
  }));
}
