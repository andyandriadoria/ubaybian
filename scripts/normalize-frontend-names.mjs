import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const RENAMES = Object.freeze({
  'styles-v040.css': 'base.css',
  'profile-v040.css': 'profile.css',
  'layout-v041.css': 'layout.css',
  'extras-v042.css': 'extras.css',
  'extras-v042.js': 'extras.js',
  'app-v040.js': 'app.js',
  'api-v040.js': 'api.js',

  'brain-games-v043.css': 'brain-games-base.css',
  'brain-games-v045.css': 'brain-games-theme.css',
  'brain-games-v0527.css': 'brain-games-cosmic.css',
  'brain-games-v0528.css': 'brain-games-arcade.css',
  'brain-games-v0529.css': 'brain-games-polish.css',
  'brain-games-v0530.css': 'brain-games-lock.css',
  'brain-games-v043.js': 'brain-games.js',
  'brain-games-v0528.js': 'brain-games-arcade.js',
  'brain-games-v0529.js': 'brain-games-polish.js',

  'memory-grid-v046.css': 'memory-grid-base.css',
  'memory-grid-v046-fix.css': 'memory-grid-state-fix.css',
  'memory-grid-v047.css': 'memory-grid-layout.css',
  'memory-grid-v048.css': 'memory-grid-sizing.css',
  'memory-grid-v0531.css': 'memory-grid-lab.css',
  'memory-grid-v0532.css': 'memory-grid-neon.css',
  'memory-grid-v0533.css': 'memory-grid-gameplay.css',
  'memory-grid-v0534.css': 'memory-grid-chamber.css',
  'memory-grid-v0535.css': 'memory-grid-depth.css',
  'memory-grid-v0536.css': 'memory-grid-clarity.css',
  'memory-grid-v0537.css': 'memory-grid-contrast.css',
  'memory-grid-v0538.css': 'memory-grid-hint-contrast.css',
  'memory-grid-tablet-v0587.css': 'memory-grid-tablet.css',
  'memory-grid-tablet-v0588.css': 'memory-grid-tablet-polish.css',
  'memory-grid-v046.js': 'memory-grid.js',
  'memory-grid-v0531.js': 'memory-grid-lab.js',
  'memory-grid-v0533.js': 'memory-grid-gameplay.js',
  'memory-grid-v0534.js': 'memory-grid-chamber.js',
  'memory-grid-v0535.js': 'memory-grid-depth.js',
  'memory-grid-tablet-v0588.js': 'memory-grid-tablet.js',

  'adventure-v050.css': 'home.css',
  'adventure-v051.css': 'home-mission.css',
  'adventure-v052.css': 'home-polish.css',
  'adventure-v053.css': 'home-dedup.css',
  'adventure-v050.js': 'home.js',
  'adventure-v051.js': 'home-mission.js',
  'adventure-v052.js': 'home-polish.js',

  'login-gateway-v054.css': 'login.css',
  'login-gateway-v055.css': 'login-polish.css',
  'login-gateway-v056.css': 'login-password.css',

  'profile-select-v057.css': 'profile-select.css',
  'profile-select-v058.css': 'profile-select-polish.css',
  'profile-select-v059.css': 'profile-select-final.css',
  'profile-select-v0510.css': 'profile-select-simple.css',

  'transition-v0511.css': 'transition.css',
  'quiz-adventure-v0512.css': 'practice.css',
  'quiz-adventure-v0512.js': 'practice.js',
  'quiz-polish-v0513.css': 'practice-polish.css',
  'quiz-polish-v0513.js': 'practice-polish.js',
  'typography-v0514.css': 'typography.css',
  'unified-shell-v0515.css': 'shell.css',
  'unified-shell-v0515.js': 'shell.js',
  'transition-unified-v0516.css': 'transition-unified.css',
  'unified-cards-v0517.css': 'cards.css',

  'report-adventure-v0518.css': 'report.css',
  'report-adventure-v0518.js': 'report.js',
  'report-polish-v0519.css': 'report-polish.css',
  'report-polish-v0519.js': 'report-polish.js',
  'report-final-v0520.css': 'report-final.css',
  'report-final-v0520.js': 'report-final.js',

  'robot-lab-v0521.css': 'robot-lab.css',
  'robot-lab-v0521.js': 'robot-lab.js',
  'robot-lab-v0522.css': 'robot-lab-polish.css',
  'robot-lab-v0522.js': 'robot-lab-polish.js',
  'robot-lab-v0523.css': 'robot-lab-evolution.css',
  'robot-lab-v0523.js': 'robot-lab-evolution.js',
  'robot-lab-v0524.css': 'robot-lab-micro.css',
  'robot-lab-v0525.css': 'robot-lab-state.css',
  'robot-lab-v0526.css': 'robot-lab-terminal.css',

  'reward-shop-v0540.css': 'reward-shop.css',
  'reward-shop-v0540.js': 'reward-shop.js',
  'reward-shop-v0541.css': 'reward-shop-depth.css',
  'reward-shop-v0541.js': 'reward-shop-depth.js',
  'reward-shop-v0542.css': 'reward-shop-lock.css',
  'reward-shop-v0543.css': 'reward-shop-hierarchy.css',
  'reward-shop-v0543.js': 'reward-shop-hierarchy.js',

  'parent-access-v0545.css': 'parent-access.css',
  'parent-access-v0545.js': 'parent-access.js',

  'learning-deck-v0546.css': 'learning-deck.css',
  'learning-deck-v0546.js': 'learning-deck.js',
  'learning-deck-v0547.css': 'learning-deck-polish.css',
  'learning-deck-v0547.js': 'learning-deck-polish.js',
  'learning-deck-v0548.css': 'learning-deck-lock.css',
  'learning-deck-v0556.css': 'learning-deck-session.css',

  'stimulus-v0549.css': 'stimulus.css',

  'exam-simulation-v0550.css': 'assessment-base.css',
  'exam-simulation-v0551.css': 'assessment.css',
  'exam-simulation-v0551.js': 'assessment.js',
  'exam-result-v0557.css': 'assessment-result.css',
  'exam-result-v0557.js': 'assessment-result.js',
  'exam-theme-v0558.css': 'assessment-theme.css',
  'exam-reward-v0559.css': 'assessment-reward.css',
  'exam-result-practice-v0561.css': 'assessment-result-practice.css',
  'exam-result-practice-v0561.js': 'assessment-result-practice.js',
});

const SKIP_DIRS = new Set(['.git', 'node_modules']);
const TEXT_EXTS = new Set(['.html', '.js', '.css', '.md', '.json', '.jsonc', '.yml', '.yaml', '.sql']);

for (const [from, to] of Object.entries(RENAMES)) {
  if (!existsSync(from)) continue;
  if (existsSync(to)) throw new Error(`Cannot rename ${from}: ${to} already exists.`);
  renameSync(from, to);
  console.log(`rename ${from} -> ${to}`);
}

function walk(dir = '.') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile() && TEXT_EXTS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const file of walk()) {
  let source = readFileSync(file, 'utf8');
  const before = source;
  for (const [from, to] of Object.entries(RENAMES)) source = source.split(from).join(to);
  if (source !== before) {
    writeFileSync(file, source);
    console.log(`refs ${file}`);
  }
}

console.log(`Semantic frontend rename complete (${Object.keys(RENAMES).length} mappings).`);
