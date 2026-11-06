import assert from 'node:assert/strict';
import test from 'node:test';
import { composeCutoutSquare, composePhotoCutout, segmentGarment } from './segment';

function makeImage(
  width: number,
  height: number,
  background: [number, number, number],
  inside: (x: number, y: number) => [number, number, number] | null,
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const garment = inside(x, y);
      const noise = ((x * 37 + y * 61) % 17) - 8;
      const rgba = garment ?? background;
      data[index] = Math.max(0, Math.min(255, rgba[0] + noise));
      data[index + 1] = Math.max(0, Math.min(255, rgba[1] + noise));
      data[index + 2] = Math.max(0, Math.min(255, rgba[2] + noise));
      data[index + 3] = 255;
    }
  }
  return data;
}

function box(x: number, y: number, left: number, top: number, right: number, bottom: number): boolean {
  return x >= left && x <= right && y >= top && y <= bottom;
}

function shirt(x: number, y: number, color: [number, number, number], stripe: boolean): [number, number, number] | null {
  // Torso plus short sleeves, with a notch at the neckline.
  const torso = box(x, y, 66, 70, 174, 250);
  const sleeves = box(x, y, 28, 78, 212, 116);
  const neck = y < 84 && x > 104 && x < 136;
  if (!neck && (torso || sleeves)) {
    if (stripe && y > 130 && Math.floor((y - 70) / 18) % 2 === 0) return [32, 50, 76];
    return color;
  }
  return null;
}

function trousers(x: number, y: number, color: [number, number, number]): [number, number, number] | null {
  const waist = box(x, y, 78, 35, 162, 85);
  const leftLeg = box(x, y, 80, 85, 112, 255);
  const rightLeg = box(x, y, 128, 85, 160, 255);
  return waist || leftLeg || rightLeg ? color : null;
}

function sneaker(x: number, y: number, color: [number, number, number]): [number, number, number] | null {
  const body = box(x, y, 35, 105, 225, 175) || box(x, y, 65, 88, 155, 110);
  return body ? color : null;
}

function cap(x: number, y: number, color: [number, number, number]): [number, number, number] | null {
  const dome = x >= 65 && x <= 175 && y >= 58 && y <= 135 && (x - 120) ** 2 + (y - 105) ** 2 < 62 ** 2;
  const brim = box(x, y, 55, 120, 205, 145);
  return dome || brim ? color : null;
}

function bag(x: number, y: number, color: [number, number, number]): [number, number, number] | null {
  const body = box(x, y, 65, 95, 175, 245);
  const leftHandle = x >= 92 && x <= 102 && y >= 48 && y <= 98;
  const rightHandle = x >= 138 && x <= 148 && y >= 48 && y <= 98;
  const topHandle = y >= 48 && y <= 58 && x >= 92 && x <= 148;
  return body || leftHandle || rightHandle || topHandle ? color : null;
}

function upperWear(x: number, y: number, kind: 'tee' | 'longtee' | 'hoodie' | 'coat' | 'flannel' | 'shirt'): [number, number, number] | null {
  const on = (l: number, t: number, r: number, b: number) => box(x, y, l, t, r, b);
  const plain: [number, number, number] = [60, 78, 96];
  if (kind === 'tee') {
    const body = on(95, 90, 195, 230) || on(55, 100, 95, 140) || on(195, 100, 235, 140);
    const neck = y < 104 && x > 132 && x < 158;
    return !neck && body ? plain : null;
  }
  if (kind === 'longtee') {
    const body = on(100, 80, 190, 250) || on(65, 90, 100, 235) || on(190, 90, 225, 235);
    const neck = y < 96 && x > 135 && x < 155;
    return !neck && body ? plain : null;
  }
  if (kind === 'shirt') {
    const body = on(100, 80, 190, 240) || on(65, 90, 100, 225) || on(190, 90, 225, 225);
    // a collar band, wide at the shoulders, and a narrower waist
    const waist = y > 200 && (x < 118 || x > 172);
    return body && !waist ? plain : null;
  }
  if (kind === 'hoodie') {
    const hood = on(120, 55, 170, 85);
    const body = on(95, 85, 195, 250) || on(55, 95, 95, 240) || on(195, 95, 235, 240);
    return hood || body ? plain : null;
  }
  if (kind === 'coat') {
    const body = on(110, 60, 185, 290) || on(70, 70, 110, 275) || on(185, 70, 225, 275);
    return body ? plain : null;
  }
  // flannel: a checked weave, dark in crossing bands
  const body = on(100, 80, 190, 250) || on(65, 90, 100, 235) || on(190, 90, 225, 235);
  if (!body) return null;
  const band = Math.floor((y - 80) / 16) % 2 === 0 || Math.floor((x - 65) / 20) % 2 === 0;
  return band ? [46, 32, 32] : [150, 120, 100];
}

test('a light shirt on a textured rug becomes a titled cutout with transparency', () => {
  const image = makeImage(240, 300, [121, 92, 70], (x, y, ) => shirt(x, y, [174, 202, 209], false));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.segmentation.category, 'tops');
  assert.match(outcome.segmentation.name, /tee|shirt/);
  assert.match(outcome.segmentation.name, /blue|stone|grey|seafoam/);
  assert.ok(outcome.segmentation.bounds.width > 100);
  assert.ok(outcome.segmentation.confidence > 0.4);

  const square = composeCutoutSquare(
    image,
    240,
    300,
    outcome.segmentation.alpha,
    outcome.segmentation.bounds,
    420,
  );
  assert.equal(square.length, 420 * 420 * 4);
  assert.equal(square[3], 0);
  assert.equal(square[square.length - 1], 0);
  const center = ((210 * 420 + 210) * 4 + 3);
  assert.ok(square[center] > 200, 'garment should be opaque in the middle');
});

test('horizontal bands are described as stripes', () => {
  const image = makeImage(240, 300, [121, 92, 70], (x, y) => shirt(x, y, [188, 208, 214], true));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.segmentation.pattern, 'striped');
  assert.match(outcome.segmentation.name, /^striped /);
});

test('a split silhouette is read as bottoms, not a top', () => {
  const image = makeImage(240, 300, [218, 213, 203], (x, y) => trousers(x, y, [50, 62, 76]));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.segmentation.category, 'bottoms');
  assert.match(outcome.segmentation.kind, /jeans|trousers/);
  assert.equal(outcome.segmentation.shape.splitRows >= 2, true);
});

test('wide low silhouettes become shoes and domed brims become caps', () => {
  const shoe = segmentGarment(
    makeImage(260, 220, [168, 168, 164], (x, y) => sneaker(x, y, [28, 28, 27])),
    260,
    220,
  );
  assert.equal(shoe.ok, true);
  if (shoe.ok) {
    assert.equal(shoe.segmentation.category, 'shoes');
    assert.match(shoe.segmentation.name, /sneakers/);
  }

  const capImage = segmentGarment(
    makeImage(240, 220, [90, 110, 126], (x, y) => cap(x, y, [42, 64, 92])),
    240,
    220,
  );
  assert.equal(capImage.ok, true);
  if (capImage.ok) assert.equal(capImage.segmentation.category, 'caps');
});

test('a handle opening is kept transparent and read as a bag', () => {
  const image = makeImage(240, 300, [205, 200, 188], (x, y) => bag(x, y, [96, 66, 49]));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.segmentation.category, 'bags');
  const alphaAtHandle = outcome.segmentation.alpha[75 * 240 + 120];
  assert.equal(alphaAtHandle, 0, 'the opening under the handle should stay cut out');
});

test('a dark garment is titled from the fabric, not the pale surface around it', () => {
  const image = makeImage(240, 300, [231, 225, 210], (x, y) => shirt(x, y, [34, 34, 36], false));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.match(outcome.segmentation.name, /black|charcoal/);
  assert.ok(outcome.segmentation.color.luminance < 0.3, 'a black tee must not be read as a pale surface');
});

test('the photo cutout keeps the photographed garment and a border of surface', () => {
  const image = makeImage(240, 300, [231, 225, 210], (x, y) => shirt(x, y, [34, 34, 36], false));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  const square = composePhotoCutout(image, 240, 300, outcome.segmentation.bounds, 420);
  assert.equal(square.length, 420 * 420 * 4);
  assert.equal(square[3], 0, 'corners outside the crop stay empty');
  const center = (210 * 420 + 210) * 4;
  assert.equal(square[center + 3], 255);
  const centerLuma = 0.299 * square[center] + 0.587 * square[center + 1] + 0.114 * square[center + 2];
  assert.ok(centerLuma < 90, 'the cutout must show the dark garment, not a blank screen');
});

test('a long-sleeve polo with sleeve gaps is a top, not a pair of shorts', () => {
  // The gaps between the sleeves and the body split the silhouette into three
  // runs, which used to be read as legs. The hem is solid, so it is a top.
  const image = makeImage(240, 300, [236, 232, 224], (x, y) => {
    if (y > 200) return null;
    const torso = box(x, y, 60, 60, 180, 260);
    const sleeve = box(x, y, 10, 70, 54, 250) || box(x, y, 186, 70, 230, 250);
    const neck = y < 74 && x > 105 && x < 135;
    return !neck && (torso || sleeve) ? [64, 78, 96] : null;
  });
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.segmentation.category, 'tops');
  assert.match(outcome.segmentation.kind, /shirt|tee|knit/);
  assert.ok(outcome.segmentation.shape.splitRows >= 2, 'the sleeve gaps do split the silhouette');
  assert.ok(outcome.segmentation.shape.sleeveRows >= 2);
  // sleeves hanging past the hem end the piece in three runs, not two legs
  assert.ok(outcome.segmentation.shape.bottomRuns >= 2);
});

test('a wide split piece with two legs at the hem is still bottoms', () => {
  const image = makeImage(240, 300, [228, 224, 212], (x, y) => {
    const waist = box(x, y, 45, 40, 195, 120);
    const legs = box(x, y, 47, 120, 112, 175) || box(x, y, 128, 120, 193, 175);
    return waist || legs ? [78, 74, 70] : null;
  });
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.segmentation.category, 'bottoms');
  assert.equal(outcome.segmentation.kind, 'shorts');
  assert.ok(outcome.segmentation.shape.bottomRuns >= 2);
});

test('the cutout is the photographed piece with a transparent surround', () => {
  const image = makeImage(240, 300, [231, 225, 210], (x, y) => shirt(x, y, [34, 34, 36], false));
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  const square = composeCutoutSquare(
    image,
    240,
    300,
    outcome.segmentation.alpha,
    outcome.segmentation.bounds,
    420,
  );
  assert.equal(square.length, 420 * 420 * 4);
  // The surface the piece lay on is deleted, corners included.
  assert.equal(square[3], 0);
  assert.equal(square[square.length - 1], 0);
  const pixel = (210 * 420 + 210) * 4;
  assert.equal(square[pixel + 3], 255, 'the piece itself stays opaque');
  const luma = 0.299 * square[pixel] + 0.587 * square[pixel + 1] + 0.114 * square[pixel + 2];
  assert.ok(luma < 60, 'the cutout shows the photographed fabric, never a recoloured square');
});

test('a piece clipped by one edge does not become the estimated surface', () => {
  // The garment covers most of the frame and touches the frame edge, so it is
  // also sampled as "border". It must still be read as the piece, not the surface.
  const image = makeImage(240, 300, [181, 157, 124], (x, y) =>
    x > 4 && x < 172 && y > 20 && y < 282 ? [232, 224, 210] : null,
  );
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.match(outcome.segmentation.name, /cream|white|stone/);
  assert.ok(outcome.segmentation.color.luminance > 0.7, 'the pale garment must not be read as the surface');
});

test('an ambiguous surface never returns the surface as the piece', () => {
  // The piece and the surface each hug two frame sides, so the border evidence
  // is genuinely ambiguous. Either refusal or the piece is acceptable, but the
  // surface must never come back as the piece.
  const image = makeImage(240, 300, [181, 157, 124], (x, y) =>
    x > 60 && y > 60 ? [232, 224, 210] : null,
  );
  const outcome = segmentGarment(image, 240, 300);
  if (outcome.ok) {
    assert.match(outcome.segmentation.name, /cream|white|stone/);
    assert.ok(outcome.segmentation.color.luminance > 0.7, 'the surface must not be reported as the piece');
  }
});

test('an empty surface is rejected instead of inventing a garment', () => {
  const image = makeImage(240, 300, [121, 92, 70], () => null);
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.failure.code, 'no-garment');
});

test('a garment that fills the whole frame is rejected', () => {
  const image = makeImage(240, 300, [174, 202, 209], () => [174, 202, 209]);
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, false);
});

test('a close-up cropped by both sides is rejected instead of returning a clipped cutout', () => {
  const image = makeImage(240, 300, [121, 92, 70], (x, y) =>
    box(x, y, 1, 80, 238, 240) ? [174, 202, 209] : null,
  );
  const outcome = segmentGarment(image, 240, 300);
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.match(outcome.failure.code, /no-garment|no-background/);
});

test('sleeve length separates a tee from a long-sleeve tee', () => {
  const shortSleeve = segmentGarment(
    makeImage(300, 340, [228, 224, 212], (x, y) => upperWear(x, y, 'tee')),
    300,
    340,
  );
  assert.equal(shortSleeve.ok, true);
  if (shortSleeve.ok) {
    assert.equal(shortSleeve.segmentation.kind, 'tee');
    assert.match(shortSleeve.segmentation.name, / tee$/);
    assert.ok(!/long-sleeve/.test(shortSleeve.segmentation.name));
    assert.ok(shortSleeve.segmentation.shape.sleeveReach < 0.55);
  }

  const longSleeve = segmentGarment(
    makeImage(300, 340, [228, 224, 212], (x, y) => upperWear(x, y, 'longtee')),
    300,
    340,
  );
  assert.equal(longSleeve.ok, true);
  if (longSleeve.ok) {
    assert.equal(longSleeve.segmentation.kind, 'tee');
    assert.match(longSleeve.segmentation.name, /long-sleeve tee$/);
    assert.ok(longSleeve.segmentation.shape.sleeveReach >= 0.55);
  }
});

test('a hood above the shoulders reads as a hoodie, a plain collar as a shirt', () => {
  const hoodie = segmentGarment(
    makeImage(300, 340, [228, 224, 212], (x, y) => upperWear(x, y, 'hoodie')),
    300,
    340,
  );
  assert.equal(hoodie.ok, true);
  if (hoodie.ok) {
    assert.equal(hoodie.segmentation.kind, 'hoodie');
    assert.equal(hoodie.segmentation.category, 'tops');
    assert.match(hoodie.segmentation.name, /hoodie$/);
    assert.ok(hoodie.segmentation.shape.crownWidth < 0.52);
  }

  const shirt = segmentGarment(
    makeImage(300, 340, [228, 224, 212], (x, y) => upperWear(x, y, 'shirt')),
    300,
    340,
  );
  assert.equal(shirt.ok, true);
  if (shirt.ok) {
    assert.equal(shirt.segmentation.kind, 'shirt');
    assert.match(shirt.segmentation.name, /shirt$/);
  }
});

test('a long silhouette is a coat and a checked one is a flannel', () => {
  const coat = segmentGarment(
    makeImage(300, 340, [228, 224, 212], (x, y) => upperWear(x, y, 'coat')),
    300,
    340,
  );
  assert.equal(coat.ok, true);
  if (coat.ok) {
    assert.equal(coat.segmentation.kind, 'coat');
    assert.equal(coat.segmentation.category, 'jackets');
    assert.match(coat.segmentation.name, /coat$/);
  }

  const flannel = segmentGarment(
    makeImage(300, 340, [228, 224, 212], (x, y) => upperWear(x, y, 'flannel')),
    300,
    340,
  );
  assert.equal(flannel.ok, true);
  if (flannel.ok) {
    assert.equal(flannel.segmentation.pattern, 'plaid');
    assert.equal(flannel.segmentation.kind, 'flannel');
    assert.match(flannel.segmentation.name, /flannel$/);
  }
});
