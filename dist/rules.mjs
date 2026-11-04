// Shared game rules. No rendering, timers, or browser state live here.
export const BUILD_COST = 1;
export const STARTER_PADS = Object.freeze([6, 7, 4]);
export const FIRST_COUNTDOWN = 5;
export const BREAK_SECONDS = 8;
export const COMBO_WINDOW = 6;
export const BEAT_SECONDS = 60 / 96 / 2;
export const TOWER_LEVELS = Object.freeze([
  Object.freeze({ level: 1, damage: 25, range: 13 }),
  Object.freeze({ level: 2, damage: 40, range: 14 }),
  Object.freeze({ level: 3, damage: 60, range: 15 }),
]);
export const ENEMY_TYPES = Object.freeze({
  shade: Object.freeze({ name: '暗影', hp: 76, speed: 1.8, scale: 1, points: 100, color: 0x53636a }),
  runner: Object.freeze({ name: '疾影', hp: 58, speed: 2.65, scale: .78, points: 80, color: 0x9b8868 }),
  boss: Object.freeze({ name: '巨影', hp: 360, speed: 1.05, scale: 1.75, points: 300, color: 0x947c72 }),
  brute: Object.freeze({ name: '重影', hp: 225, speed: 1.12, scale: 1.38, points: 160, color: 0x756c86 }),
});
const rosters = [
  ['shade', 'shade', 'shade', 'shade', 'shade'],
  ['shade', 'runner', 'shade', 'runner', 'brute', 'runner', 'shade', 'brute'],
  ['runner', 'shade', 'brute', 'runner', 'shade', 'brute', 'runner', 'brute', 'brute', 'boss'],
];
export const WAVES = Object.freeze(rosters.map((roster, index) => Object.freeze({
  enemies: Object.freeze(roster), interval: [2.2, 1.8, 1.6][index],
})));
export const TOTAL_ENEMIES = WAVES.reduce((total, wave) => total + wave.enemies.length, 0);
export function comboAfterKill(previousCount, lastTime, now) {
  const count = previousCount > 0 && now - lastTime <= COMBO_WINDOW ? previousCount + 1 : 1;
  return {
    count,
    multiplier: count >= 10 ? 2 : count >= 6 ? 1.5 : count >= 3 ? 1.25 : 1,
    reward: count === 10 ? 2 : count === 3 || count === 6 ? 1 : 0,
  };
}
export function waveReward(leaks, health) {
  return { seeds: leaks === 0 ? 3 : 2, health: Math.min(6, health + 1), perfect: leaks === 0 };
}
export function towerStats(level = 1) {
  if (!Number.isInteger(level) || level < 1 || level > 3) throw new RangeError('Invalid tower level');
  return TOWER_LEVELS[level - 1];
}
export function planUpgrade(level, balance) {
  towerStats(level);
  if (!Number.isInteger(balance) || balance < 0) throw new RangeError('Invalid balance');
  if (level === 3) return { allowed: false, reason: 'max', balance, level, cost: 0 };
  const cost = level + 1;
  if (balance < cost) return { allowed: false, reason: 'funds', balance, level, cost };
  return { allowed: true, reason: null, balance: balance - cost, level: level + 1, cost };
}
export function waveSummary(waveNumber) {
  const wave = WAVES[waveNumber - 1];
  if (!wave) return '';
  const counts = {};
  for (const type of wave.enemies) counts[type] = (counts[type] || 0) + 1;
  return Object.entries(counts).map(([type, count]) => `${count} ${ENEMY_TYPES[type].name}`).join(' · ');
}
export function resultFor({ won, health, points, kills, duration, escaped = 0, maxCombo = 0 }) {
  return {
    won, stars: won ? (health === 6 && escaped === 0 ? 3 : health >= 3 ? 2 : 1) : 0,
    score: points + Math.max(0, health) * 150,
    kills, health, maxCombo, duration: Math.floor(duration),
  };
}
