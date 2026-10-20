# Progress

- [x] Reference downloaded and analysed (references/ig/).
- [x] Project component `packages/viibe-ad` (scene/ = HTML, CSS, frame-driven JS; emoji in assets/).
- [x] Sound synthesized: `python3 productions/editor-ad/sound/make_sound.py` → assets/sound.wav.
- [x] Final render: productions/editor-ad/viibe-edit-ad.mp4 (11.9 s, 1080×1920, 60 fps, -15 LUFS).

## Rebuild
```
npm install
npm run build -w @viibe/ad-scene
hypit runtime use hypit.runtime.json   # chromePath points at the container's headless Chromium
hypit build productions/editor-ad/runs/final.svrun --follow
hypit get <build-id> --output final.video --to productions/editor-ad/viibe-edit-ad.mp4
```
Brand/tagline are attributes on `<ad:Scene>` in authors/ad.svml; copy and timing live in packages/viibe-ad/scene/.

Next: user review. Possible tweaks: wording, colors, brand logo, real portfolio screenshots, voiceover.
