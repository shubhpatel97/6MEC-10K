import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoCloset } from '../data/demoCloset';
import { Garment, GarmentKind, GarmentView, emptyContext } from '../types';
import { KIND_CATEGORY } from '../lib/garmentFacts';
import { buildPackingPlan, composeLooks, respond } from './stylistEngine';

const closet = buildDemoCloset(new Date('2026-11-02T09:00:00Z'));
const views: GarmentView[] = closet.garments.map((garment, index) => ({
  ...garment,
  wearCount: index % 5,
  lastWornAt: index % 3 === 0 ? '2026-10-01T10:00:00Z' : null,
  lastWornDays: index % 3 === 0 ? 32 : null,
}));

function fixture(kind: GarmentKind, colorName: string, name: string, id: string): GarmentView {
  const base: Garment = {
    id,
    name,
    category: KIND_CATEGORY[kind],
    kind,
    colorName,
    color: '#222222',
    accent: '#333333',
    colorFamily: 'neutral',
    description: 'test piece',
    addedAt: '2026-01-01T00:00:00Z',
    sourceOutfitIds: [],
    demo: false,
  };
  return { ...base, wearCount: 1, lastWornAt: '2026-10-01T10:00:00Z', lastWornDays: 30 };
}

const fixtureWardrobe: GarmentView[] = [
  fixture('jacket', 'black', 'black wool jacket', 'f1'),
  fixture('tee', 'bone', 'bone boxy tee', 'f2'),
  fixture('shirt', 'ecru', 'ecru oxford shirt', 'f3'),
  fixture('jeans', 'indigo', 'indigo straight jeans', 'f4'),
  fixture('trousers', 'charcoal', 'charcoal pressed trousers', 'f5'),
  fixture('boot', 'black', 'black chelsea boots', 'f6'),
  fixture('sneaker', 'bone', 'bone leather sneakers', 'f7'),
  fixture('cap', 'black', 'black wool cap', 'f8'),
  fixture('bag', 'black', 'black tote bag', 'f9'),
];

const base = { garments: fixtureWardrobe, context: { ...emptyContext }, weather: null, now: new Date('2026-11-02T09:00:00Z') };

test('a dinner request returns two grounded looks with plain names', () => {
  const result = respond('what should i wear for dinner?', base);
  assert.equal(result.reply.kind, 'looks');
  if (result.reply.kind !== 'looks') return;
  assert.equal(result.reply.looks.length, 2);
  assert.deepEqual(
    result.reply.looks.map((look) => look.title),
    ['tonight', 'dinner, later'],
  );
  const ids = new Set(fixtureWardrobe.map((garment) => garment.id));
  result.reply.looks.forEach((look) => look.itemIds.forEach((id) => assert.ok(ids.has(id))));
  assert.equal(result.lookRequest?.occasion, 'dinner');
});

test('an anchored request keeps the named jacket in both looks', () => {
  const result = respond('build a look around my black jacket', base);
  assert.equal(result.reply.kind, 'looks');
  if (result.reply.kind !== 'looks') return;
  result.reply.looks.forEach((look) => assert.ok(look.itemIds.includes('f1')));
  assert.equal(result.lookRequest?.anchorIds[0], 'f1');
});

test('ambiguous requests clarify instead of guessing', () => {
  const result = respond('what should i wear?', base);
  assert.equal(result.reply.kind, 'clarify');
  if (result.reply.kind !== 'clarify') return;
  assert.ok(result.reply.chips.includes('dinner'));
});

test('two pieces with the same description produce a clarifying question', () => {
  const ambiguous = [
    ...fixtureWardrobe,
    fixture('jacket', 'black', 'black field jacket', 'f10'),
  ];
  const result = respond('build around my black jacket', { ...base, garments: ambiguous });
  assert.equal(result.reply.kind, 'clarify');
});

test('underused pieces are named from the real wardrobe', () => {
  const result = respond('what haven’t i worn lately?', base);
  assert.equal(result.reply.kind, 'message');
  if (result.reply.kind !== 'message') return;
  assert.ok((result.reply.pieces ?? []).length > 0);
  const ids = new Set(fixtureWardrobe.map((garment) => garment.id));
  (result.reply.pieces ?? []).forEach((id) => assert.ok(ids.has(id)));
});

test('similarity without a reference asks which piece', () => {
  const result = respond('do i own something similar?', base);
  assert.equal(result.reply.kind, 'clarify');
});

test('similarity with a reference compares against owned pieces', () => {
  const result = respond('do i own anything similar to the black chelsea boots?', base);
  assert.equal(result.reply.kind, 'message');
  if (result.reply.kind !== 'message') return;
  assert.ok((result.reply.pieces ?? []).length >= 1);
});

test('packing for five days stays inside the stylist reply', () => {
  const result = respond('pack for five days', base);
  assert.equal(result.reply.kind, 'packing');
  if (result.reply.kind !== 'packing') return;
  assert.equal(result.reply.plan.days, 5);
  assert.equal(result.reply.plan.title, 'five days, one bag');
  assert.ok(result.reply.plan.sections.length >= 4);
  assert.ok(result.reply.plan.looks.length >= 1);
});

test('follow-up modifiers compose fresh looks', () => {
  const first = respond('what should i wear for dinner?', base);
  const second = respond('make it warmer', {
    ...base,
    context: first.context,
    weather: first.context.weather,
  });
  assert.equal(second.reply.kind, 'looks');
  if (second.reply.kind !== 'looks') return;
  assert.ok(second.context.lastLookKeys.length > first.context.lastLookKeys.length);
});

test('ordinary conversation stays ordinary', () => {
  const result = respond('hi', base);
  assert.equal(result.reply.kind, 'message');
  const thanks = respond('thanks', base);
  assert.equal(thanks.reply.kind, 'message');
});

test('composeLooks avoids repeating pieces between the two looks', () => {
  const looks = composeLooks(views, { occasion: 'work', anchorIds: [], salt: 2, weather: null });
  assert.equal(looks.length, 2);
  const [first, second] = looks;
  const overlap = first.itemIds.filter((id) => second.itemIds.includes(id));
  assert.ok(overlap.length <= 2, `expected distinct looks, got ${overlap.length} shared pieces`);
});

test('composeLooks can exclude previously seen combinations', () => {
  const request = { occasion: 'casual' as const, anchorIds: [], salt: 1, weather: null };
  const first = composeLooks(views, request);
  const second = composeLooks(views, request, { excludeKeys: first.map((look) => look.key) });
  assert.ok(second.every((look) => !first.some((previous) => previous.key === look.key)));
});

test('packing plan degrades when the closet is small', () => {
  const tiny = fixtureWardrobe.slice(0, 3);
  const plan = buildPackingPlan(tiny, 3, 'mild', 1);
  assert.ok(plan);
  assert.ok(plan!.sections.length >= 2);
});
