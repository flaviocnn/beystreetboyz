# Character sprite checks

The shared painter in `app/lib/pixel-player.ts` is used by the city (including
visiting and garden NPCs), guild, bank, Wistery previews, mirror and champion's
throne. Avatar IDs, colors, unlocks, collision bounds and saved selections are
unchanged. Each outfit has front/back views and mirrored left/right profiles.

Draw on the 2-world-pixel grid. Keep opaque artwork within x ±24, y -33…29,
including walking bob, so all existing 96×124 Wistery thumbnails remain unclipped.
Draw wings, cloaks and long hair behind the body; headwear goes last. Avoid
front-facing eyes or visors showing on the back of the head. Four walking phases
alternate feet/hands without changing the world position or collision footprint.

`npm test` (or `npm run test:sprites`) checks 3,072 combinations of style, color,
direction and walking phase, grid alignment, bounds, profile reflection, all
24 distinct variants, preserved colors, stable idle and safe ID fallback.

For visual review, run `node scripts/preview-player-sprites.mjs`. This requires
the developer-only `@napi-rs/canvas` package, optionally supplied through an
absolute `CANVAS_MODULE` path. The contact sheet is generated under `.local-data`
and never shipped publicly. It does not query or modify any database.

## Mirror poses

`drawPixelPlayer` accepts an optional final `PlayerPose` argument. Its default
`standing` keeps map movement and the throne unchanged. The mirror uses
`portrait`, `triumphant`, `reclining` and `challenge`: limbs are drawn in pose,
not pasted over the walking sprite. Reclining turns only the torso, keeps the
head upright and folds wings; equipment is repositioned to avoid the face.

`mirror-poses.ts` is shared by PNG export and the four static selector thumbnails.
`node scripts/preview-mirror-poses.mjs` produces a contact sheet using the same
optional native canvas dependency. Tests cover all 768 skin/color/pose combinations
inside the original mirror bounds, distinct poses and unchanged movement.
