import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoCloset, DEMO_CLOSET_SIZE } from '../data/demoCloset';
import { Garment } from '../types';
import { dedupeDetections, demoDetectionSet, scanStageLabel, summariseDetections } from './scan';

const closet = buildDemoCloset(new Date('2026-11-02T12:00:00Z'));

test('the demo rack is deterministic and the promised size', () => {
  assert.equal(closet.garments.length, DEMO_CLOSET_SIZE);
  assert.equal(closet.garments[0].name, buildDemoCloset(new Date('2026-11-02T12:00:00Z')).garments[0].name);
  assert.ok(closet.garments.every((garment) => garment.demo));
});

test('the demo rack mixes categories and colourways', () => {
  const categories = new Set(closet.garments.map((garment) => garment.category));
  assert.deepEqual([...categories].sort(), ['bags', 'bottoms', 'caps', 'jackets', 'shoes', 'tops']);
  const colors = new Set(closet.garments.map((garment) => garment.colorName));
  assert.ok(colors.size > 15, `expected a real colour range, got ${colors.size}`);
});

test('duplicate detections are removed and flagged', () => {
  const duplicate: Garment = { ...closet.garments[0], id: 'duplicate-1' };
  const second: Garment = { ...closet.garments[1], id: 'duplicate-2' };
  const { kept, removed } = dedupeDetections([closet.garments[0], duplicate, closet.garments[1], second]);
  assert.equal(kept.length, 2);
  assert.equal(removed.length, 2);
});

test('demo detections are always marked demo and carry original outfit links', () => {
  const set = demoDetectionSet(closet.garments);
  assert.equal(set.demo, true);
  assert.equal(set.source, 'demo-rack');
  assert.ok(set.items.every((item) => item.demo));
  assert.ok(set.items.some((item) => item.sourceOutfitIds.length > 0));
  assert.equal(new Set(set.items.map((item) => item.id)).size, set.items.length);
});

test('scan stages progress meaningfully and summaries respect the source', () => {
  assert.equal(scanStageLabel(0), 'opening the rack');
  assert.equal(scanStageLabel(0.95), 'hanging everything up');
  const summary = summariseDetections(closet.garments);
  assert.equal(summary.total, DEMO_CLOSET_SIZE);
  assert.equal(summary.demo, true);
  assert.equal(summary.byCategory.tops + summary.byCategory.bottoms, 80);
  const real = summariseDetections([{ ...closet.garments[0], demo: false }]);
  assert.equal(real.demo, false);
});
