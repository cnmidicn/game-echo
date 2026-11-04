// Shared game rules. No rendering, timers, or browser state live here.
export const BUILD_COST = 1;
export const BEAT_SECONDS = 60 / 96 / 2;
export const TOWER_LEVELS = Object.freeze([
  Object.freeze({ level: 1, damage: 25, range: 13 }),
  Object.freeze({ level: 2, damage: 40, range: 14 }),
  Object.freeze({ level: 3, damage: 60, range: 15 }),
]);
export const ENEMY_TYPES = Object.freeze({
  shade: Object.freeze({ name: '暗影', hp: 76, speed: 1.8, scale: 1, points: 100, color: 0x53636a }),
  runner: Object.freeze({ name: '疾影', hp: 58, speed: 2.65, scale: .78, points: 80, color: 0x9b8868 }),
  brute: Object.freeze({ name: '重影', hp: 225, speed: 1.12, scale: 1.38, points: 160, color: 0x756c86 }),
});
const rosters = [
  ['shade', 'shade', 'shade', 'shade', 'shade', 'shade', 'shade'],
  ['shade', 'runner', 'shade', 'runner', 'brute', 'runner', 'shade', 'shade', 'brute'],
  ['runner', 'shade', 'brute', 'runner', 'shade', 'brute', 'runner', 'shade', 'brute', 'runner', 'brute'],
];
export const WAVES = Object.freeze(rosters.map((roster, index) => Object.freeze({
  enemies: Object.freeze(roster), interval: [3.1, 2.65, 2.3][index],
})));
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
export function resultFor({ won, health, points, kills, duration }) {
  return {
    won, stars: won ? (health === 6 ? 3 : health >= 3 ? 2 : 1) : 0,
    score: points + Math.max(0, health) * 150,
    kills, health, duration: Math.floor(duration),
  };
}
