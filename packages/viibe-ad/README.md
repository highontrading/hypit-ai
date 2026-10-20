# Viibe ad scene

One project component that draws the whole Viibe Edit ad: kinetic type, Instagram-style search, brand pill,
emoji, mock AI-editor cards, button/cursor click, app screen and end card. It is a one-off scene, so copy and
beat timing are fixed in `scene/` and only the brand and tagline are attributes.

```svml
<ad:Scene id="ad" timeline={program.timeline} within={canvas.bounds} font={medium} bold={bold}
  during={program.window} brand="Viibe Edit" tagline="Vibe Editing"/>
```

- `scene/scene.html`, `scene/scene.css`, `scene/scene.js`: the HTML visual. `scene.js` is the setup body that
  returns `render(localFrame)`; every frame is computed from its time, so ranges and seeks render directly.
- `assets/*.webp`: Microsoft Fluent Emoji 3D (MIT) via `@lobehub/fluent-emoji-3d`, inlined at build time.
- `npm run build` runs `scripts/bundle.mjs` (inlines scene + emoji into `src/generated.ts`) then `tsc`.

Beats are authored in seconds from the scene's Window start and match `productions/editor-ad/sound/make_sound.py`.
