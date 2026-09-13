import {
  assessmentReportEntry,
  dashboardForProfile as legacyDashboardForProfile,
  mergeLearningReport,
  progressForFamily,
} from './progress.js';
import { achievementsForDashboard } from './achievements.js';

export { assessmentReportEntry, mergeLearningReport, progressForFamily };

export async function dashboardForProfile(env, familyId, profile) {
  const dashboard = await legacyDashboardForProfile(env, familyId, profile);
  const achievements = await achievementsForDashboard(env, familyId, profile, dashboard);
  return {
    ...dashboard,
    badges: achievements.badges,
    achievementStats: achievements.stats,
  };
}
