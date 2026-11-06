# crest

a quiet digital wardrobe and a conversational stylist. built with expo, react native and typescript.

three tabs: **closet · stylist · you**. the closet is paper, the stylist and you are black, and the garments supply the colour. no prices, no closet value, no shopping, no source-brand labels.

## start here

the linked repository originally contained only a placeholder readme — no crest logo files, no 188-item catalog, no outfit photos and no existing app. this build therefore recreates the wordmark, the app icons and a deterministic **demo closet** from code. that is documented throughout the app, not hidden.

requirements: node 20.19 or newer.

```bash
npm install
npm run web        # expo web dev server (prints its url/port)
```

for the full experience, open the printed url at a phone-sized viewport or use Expo Go.

### replit

`.replit` runs:

```bash
npm run web:replit   # expo start --web --host lan --port 3000
```

port **3000** is mapped to external port **80**. press Run and keep the dev server running; the replit webview cannot serve the app once the process stops. install packages first if replit has not done so (`npm install`).

### expo go (native)

the same entry point (`index.ts` → `App.tsx`) serves native and web. there is no separate native route tree.

```bash
npm run native          # expo start --go, prints a qr code in your terminal
npm run native:tunnel   # use when the phone and computer are not on the same network
```

scan the terminal's qr code with the latest Expo Go that supports SDK 58. a fixed qr code cannot be supplied from this environment because the url depends on your machine/network. the dev server must remain running while you use Expo Go.

native photo permission strings are configured in `app.json` (`NSPhotoLibraryUsageDescription`). all modules used here are included in Expo Go.

### web export

```bash
npm run export:web      # writes dist/ (gitignored)
python3 -m http.server 8000 -d dist
# or: npx serve dist
```

the export is a single-page app; serve it at the site root. `dist/` is generated and present in the working tree, but it is intentionally ignored by git. the app requires javascript.

## what this build actually does

- **onboarding** — drawn crest (muted strokes → solid ink), curtain reveal, drifting garment splash, explanation, photo/demo choice, local cutout scan, review, ready. every step is skippable and reduced-motion is respected.
- **real photos → cutouts** — choose up to 12 photos of individual pieces. each image is read on this device, the main garment is separated from its surface, the edge is feathered, and the result is stored as a transparent PNG. openings such as a collar or bag handle stay clear. the cutout is auto-titled from its dominant colour and silhouette (for example `striped pale blue short-sleeve shirt`, `navy jeans`, `white sneakers`). photos are never uploaded.
- **review and correction** — every cutout can be removed or restored. tap one to edit its title, change its type (tops/bottoms/jackets/shoes/caps/bags), or remove it. automatic titles are a best guess; the correction step exists because a silhouette cannot always tell a cap from a sneaker.
- **closet** — mixed-category grid, category filters, sort, wear counts (never-worn in red), and a pile containing the whole inventory. pieces can be dragged, their position persists, and tapping opens the garment. shake-to-toggle is implemented with `expo-sensors` (native; unverified here).
- **garment detail** — large cutout, category/colour, description, wear count, last worn, the original photo when one exists, single wear logging per day, and **style this**.
- **stylist** — starts with “good afternoon.” / “how can i style you?”, text input with visible caret, mic, chips, grounded replies, follow-ups, clarification, composing states, looks with plain names, save / shuffle / not for me / wear it, and packing inside the conversation. it only uses pieces actually in the closet; with a small real closet it may return one look instead of two.
- **item ↔ chat** — a garment opened from a look appears in a paper sheet with **back to chat**. the conversation stays mounted and its scroll offset is restored.
- **you** — pieces, wears, never-worn, saved looks, underused pieces, colour distribution, and log out (clears local data).
- **persistence** — garments, cutout PNGs, source photos, wears, saved looks and conversation survive reload through AsyncStorage (`crest.app.v1`).
- **voice** — browser speech recognition feeds the same composer and shows the transcript. unsupported browsers and native builds show an explanatory note; native speech is not bundled.

there is no backend or account. “log out” means clear this device's closet, history, saved looks and conversation.

## how the cutout works

this is local image processing, not a trained segmentation model and not a remote service.

1. **surface estimate** — border colours are clustered to model the rug, bed, floor or table behind the piece.
2. **separation** — colour distance from the surface gives a foreground mask; shadow-coloured pixels are suppressed without eating genuinely black or navy garments.
3. **clean-up** — the largest garment component (plus close fragments, such as a pair of shoes) is kept, true interior openings remain transparent, and the edge is eroded one pixel then feathered.
4. **colour and title** — the dominant colour inside the piece is named, horizontal bands are detected as stripes, and silhouette measurements choose a type and title.
5. **storage** — the cutout is composited onto a transparent square PNG. the original photo is compressed and linked to the piece as its outfit reference.

web uses a canvas for decode/encode. native uses Expo ImageManipulator plus a small PNG codec; the native path is implemented but was not run on a physical device here.

**best results:** one garment per photo, the whole piece in frame, a surface that contrasts with the fabric, and soft, even light. low-contrast or busy photos are rejected with a reason instead of producing a fabricated cutout. the app does not split a full outfit into multiple garments.

## architecture

```
index.ts / App.tsx          single expo entry; no navigation framework
src/screens/                closet, stylist, you, garment sheet, onboarding
src/state/                  WardrobeProvider, persistence and wear rules
src/storage/                AsyncStorage validation
src/extraction/             local cutout segmentation, naming, image pipelines, scan helpers
src/stylist/                pure deterministic intent/look/packing engine
src/art/                    vector garment silhouettes, studio art, flat-lay boards
src/ui/                     shared chat/tiles/buttons/sheets/cutout visual
src/data/                   deterministic 188-piece demo closet and boards
src/theme/                  tokens, type, motion
assets/                     generated icon, adaptive/monochrome icon, splash, favicon
```

the app deliberately uses app state rather than a route stack: the stylist feed stays alive underneath garment sheets, which is what makes scroll restoration reliable.

## verification (chromium, 390 × 844, browser upload)

checked end to end against the dev server with four flat-lay test images uploaded through the real file picker (polo, trousers, sneaker, tee):

- onboarding skip paths, photo picker, local processing, all four transparent cutouts, auto-titles (`striped pale blue short-sleeve shirt`, `navy jeans`, `white sneakers`, `black shirt`).
- edit the sneaker title to `white leather sneakers`, save, keep four pieces, open closet, see the four real cutouts in the grid.
- remove a cutout through the editor (4 → 3 kept) and restore it (3 → 4 kept).
- garment detail shows the cutout, `shoes · white`, the linked original photo, **worn today** logs once, and the closet updates to `worn 1×`.
- stylist with the real closet returns two grounded dinner looks using the uploaded pieces; `save`, `shuffle`, `not for me` and `wear it` remain available.
- reload restores the closet, edited title and wear count. localStorage payload for four cutouts + source photos was **648,116 characters**.
- no page errors or failed requests in the final runs; only React Native Web's known development `collapsable` warning.
- the same upload → cutout → keep → closet → reload flow was checked against the static `dist/` export (two pieces), with no page or request errors.
- a real close-up photograph filling the frame was rejected with the “leave a margin of surface” message instead of producing a clipped cutout.

automated checks:

- `npx tsc --noEmit` passes.
- `npm test` passes **26/26** (14 stylist, 4 scan, 8 segmentation/cutout).
- `npx expo-doctor` passes **20/20**.
- web export builds to a single-page bundle (about 828 KB).

### not verified here

- Expo Go on a physical iPhone/Android, including the native cutout path (`expo-image-manipulator` + UPNG), safe areas, keyboard avoidance, native denied/limited photo permission UI, shake sensor, and native voice.
- low-contrast, heavily patterned or multiple-garment photos; the local segmenter is deliberately conservative and may reject them.
- HEIC files and very large camera-roll photos on native.
- storage pressure from twelve high-detail cutouts on a device with a small AsyncStorage quota.
- voice recognition in a browser with the Web Speech API (headless Chromium does not expose it); the visible transcript path is implemented but not exercised end to end.
- replit's runtime and webview themselves; the `web:replit` command and port binding were verified locally (`*:3000`).
- ios/android native builds and Home Screen icon appearance.
- edge/safari/firefox rendering (chromium only).

## demo-only, explicitly

- the **188 demo closet pieces are vector illustrations**, not photos. their wear history, boards and saved looks are seeded for demonstration and are labelled demo throughout.
- real cutouts are **local heuristic cutouts**, not the output of a trained segmentation model or an AI styling service. automatic titles describe colour and silhouette; they can be wrong and are editable in review.
- the **stylist is a local deterministic engine**, not an LLM or a live styling service.
- **weather is manual**, not live.
- voice uses the browser's Web Speech API; there is no native speech integration.
- there is no analytics, account system, remote database or commerce integration.

these are demo surfaces, not production extraction or production styling. the ui is labelled accordingly (demo rack, demo piece, illustrated cutouts).

## checks

```bash
npx tsc --noEmit
npm test
npx expo-doctor
npm run export:web
```
