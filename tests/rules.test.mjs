import test from 'node:test';
import assert from 'node:assert/strict';
import { planUpgrade, towerStats, WAVES, ENEMY_TYPES, waveSummary, resultFor } from '../dist/rules.mjs';

test('an unaffordable upgrade preserves level and all currency', () => {
  assert.deepEqual(planUpgrade(1, 1), { allowed: false, reason: 'funds', balance: 1, level: 1, cost: 2 });
});
test('upgrading at the exact balance cannot overspend', () => {
  assert.equal(planUpgrade(1, 2).balance, 0);
  assert.equal(planUpgrade(1, 2).level, 2);
  assert.equal(planUpgrade(2, 3).balance, 0);
  assert.equal(planUpgrade(2, 3).level, 3);
});
test('a maximum-level tower cannot consume currency again', () => {
  assert.deepEqual(planUpgrade(3, 9), { allowed: false, reason: 'max', balance: 9, level: 3, cost: 0 });
});
test('upgrades improve damage and range without accepting corrupt levels', () => {
  for (let level = 1; level < 3; level++) {
    assert.ok(towerStats(level + 1).damage > towerStats(level).damage);
    assert.ok(towerStats(level + 1).range > towerStats(level).range);
  }
  assert.throws(() => planUpgrade(0, 9), RangeError);
  assert.throws(() => planUpgrade(1, -1), RangeError);
});
test('every declared wave has a valid roster matching its preview', () => {
  assert.deepEqual(WAVES.map(w => w.enemies.length), [7, 9, 11]);
  for (const wave of WAVES) for (const type of wave.enemies) assert.ok(ENEMY_TYPES[type]);
  assert.equal(waveSummary(2), '4 暗影 · 3 疾影 · 2 重影');
  assert.equal(waveSummary(4), '');
});
test('a loss never awards completion stars and zero health gives no bonus', () => {
  const result = resultFor({ won: false, health: 0, points: 300, kills: 3, duration: 20.9 });
  assert.equal(result.stars, 0);
  assert.equal(result.score, 300);
  assert.equal(result.duration, 20);
});
test('only a perfect core earns three stars', () => {
  const make = health => resultFor({ won: true, health, points: 100, kills: 1, duration: 60 });
  assert.equal(make(6).stars, 3);
  assert.equal(make(5).stars, 2);
  assert.equal(make(2).stars, 1);
  assert.equal(make(6).score, 1000);
});
