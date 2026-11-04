import test from 'node:test';
import assert from 'node:assert/strict';
import { planUpgrade, towerStats, WAVES, ENEMY_TYPES, waveSummary, resultFor, TOTAL_ENEMIES, comboAfterKill, waveReward, COMBO_WINDOW, forestForRound, FORESTS, planSupport, applyDamage, SUPPORT_COOLDOWN, BEAT_SECONDS, creditEchoes, suggestUpgrade, canResonate, recordForestStars } from '../dist/rules.mjs';

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
  assert.deepEqual(WAVES.map(w => w.enemies.length), [5, 8, 10]);
  for (const wave of WAVES) for (const type of wave.enemies) assert.ok(ENEMY_TYPES[type]);
  assert.equal(waveSummary(2), '3 暗影 · 3 疾影 · 2 重影');
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

test('three fast waves culminate in exactly one final boss', () => {
  assert.equal(TOTAL_ENEMIES, 23);
  assert.equal(WAVES.at(-1).enemies.at(-1), 'boss');
  assert.equal(WAVES.flatMap(w => w.enemies).filter(t => t === 'boss').length, 1);
});
test('combo renews inside the window and expires outside it', () => {
  assert.equal(comboAfterKill(2, 10, 10 + COMBO_WINDOW).count, 3);
  assert.equal(comboAfterKill(2, 10, 10 + COMBO_WINDOW + .01).count, 1);
});
test('combo grants milestones once and caps the score multiplier', () => {
  assert.equal(comboAfterKill(2, 10, 11).reward, 1);
  assert.equal(comboAfterKill(3, 11, 12).reward, 0);
  assert.equal(comboAfterKill(9, 10, 11).reward, 2);
  assert.equal(comboAfterKill(30, 10, 11).multiplier, 2);
});
test('wave healing cannot exceed full health or hide a leaked enemy in the rating', () => {
  assert.deepEqual(waveReward(0, 6), { seeds: 3, health: 6, perfect: true });
  assert.deepEqual(waveReward(1, 5), { seeds: 2, health: 6, perfect: false });
  assert.equal(resultFor({won:true,health:6,points:100,kills:1,duration:60,escaped:1}).stars, 2);
});

test('replays cycle through all three forests without changing tower rules', () => {
  assert.equal(FORESTS.length, 3);
  assert.equal(forestForRound(0).id, 'mist');
  assert.equal(forestForRound(1).id, 'firefly');
  assert.equal(forestForRound(2).id, 'amber');
  assert.equal(forestForRound(3).id, 'mist');
  assert.equal(forestForRound(NaN).id, 'mist');
  assert.equal(forestForRound(-1).id, 'mist');
});
test('support respects its cooldown without consuming a second shot', () => {
  const shot=planSupport(10, 10, 0);
  assert.equal(shot.allowed, true);
  assert.equal(shot.readyAt, 10 + SUPPORT_COOLDOWN);
  assert.deepEqual(planSupport(10.1, shot.readyAt, 0), {allowed:false,readyAt:shot.readyAt,perfect:false,damage:0});
  assert.equal(planSupport(shot.readyAt, shot.readyAt, 0).allowed, true);
});
test('support is forgiving around a beat but still useful away from it', () => {
  assert.equal(planSupport(1, 0, .02).perfect, true);
  assert.equal(planSupport(1, 0, BEAT_SECONDS - .02).perfect, true);
  const offbeat=planSupport(1, 0, BEAT_SECONDS / 2);
  assert.equal(offbeat.perfect, false);
  assert.equal(offbeat.damage, 14);
  assert.equal(planSupport(1, 0, 0).damage, 22);
});
test('overkill and a second attacker cannot award the same kill twice', () => {
  const first=applyDamage(10,22);
  assert.deepEqual(first, {hp:0,applied:10,killed:true});
  assert.deepEqual(applyDamage(first.hp,25), {hp:0,applied:0,killed:false});
  assert.deepEqual(applyDamage(25,-5), {hp:25,applied:0,killed:false});
});

test('echo credits preserve the full value of a partly full reward', () => {
  assert.deepEqual(creditEchoes(8,3), {balance:9,received:1,overflow:2,points:100});
  assert.deepEqual(creditEchoes(9,3), {balance:9,received:0,overflow:3,points:150});
  assert.deepEqual(creditEchoes(0,3), {balance:3,received:3,overflow:0,points:0});
});
test('invalid credits cannot silently create or remove echoes', () => {
  assert.throws(() => creditEchoes(10,1), RangeError);
  assert.throws(() => creditEchoes(3,-1), RangeError);
  assert.throws(() => creditEchoes(3,1.5), RangeError);
});
test('upgrade guidance chooses only one affordable, non-maximal tower', () => {
  const pads=[{index:6,level:2},{index:7,level:1},{index:4,level:1},{index:5,level:3}];
  assert.equal(suggestUpgrade(pads,1),null);
  assert.equal(suggestUpgrade(pads,2),7);
  assert.equal(suggestUpgrade(pads,9),7);
  assert.equal(suggestUpgrade([{index:6,level:3}],9),null);
});
test('resonance is unavailable before six hits and can activate only once per wave', () => {
  assert.equal(canResonate(5,0,1),false);
  assert.equal(canResonate(6,0,1),true);
  assert.equal(canResonate(10,1,1),false);
  assert.equal(canResonate(6,1,2),true);
  assert.equal(canResonate(6,0,0),false);
});
test('forest stars never lose a previous best or accept unknown forests', () => {
  assert.deepEqual(recordForestStars({mist:3},'mist',1),{mist:3,firefly:0,amber:0});
  assert.deepEqual(recordForestStars({mist:2},'amber',3),{mist:2,firefly:0,amber:3});
  assert.deepEqual(recordForestStars(null,'unknown',3),{mist:0,firefly:0,amber:0});
  assert.deepEqual(recordForestStars({mist:99,firefly:'3'},'amber',0),{mist:3,firefly:0,amber:0});
});
