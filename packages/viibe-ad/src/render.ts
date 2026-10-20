import { sealVisualTrack } from "@hypit/composition";
import type { VisualElement } from "@hypit/composition";
import { htmlVisual } from "@hypit/html-program";
import type { FontStackRef } from "@hypit/media";
import type { Timeline } from "@hypit/timeline";
import type { SpatialFrame } from "@hypit/spatial";
import { assertTemporalWindowFor } from "@hypit/temporal";
import type { TemporalWindow } from "@hypit/temporal";
import { sceneCss, sceneHtml, sceneSetup } from "./generated.js";

export type AdOptions = { id: string; brand: string; tagline: string };

/** The whole ad is one coordinated scene; its beats are authored relative to the Window's start. */
export function renderAd(timeline: Timeline, within: SpatialFrame, window: TemporalWindow,
  font: FontStackRef, bold: FontStackRef, options: AdOptions) {
  assertTemporalWindowFor(window, { subjectId: options.id, timeline });
  const fps = timeline.frameRate.numerator / timeline.frameRate.denominator;
  // The probes carry the exact faces; the scene reads their families for all of its own text.
  const probe = (id: string, faces: FontStackRef, text: string): VisualElement => ({
    id, kind: "text", parent: "ad", order: id === "font-medium" ? 1 : 2, text, fonts: faces.faces,
    style: [{ name: "font-size", value: "40px" }],
  });
  const program = htmlVisual({
    html: sceneHtml,
    css: sceneCss,
    data: { fps, brand: options.brand, tagline: options.tagline },
    setup: sceneSetup,
  });
  return sealVisualTrack({ id: options.id, timelineId: timeline.id, visualIr: "hypit.visual-ir@1",
    presents: [{ id: options.id, order: 0, z: 0, span: window.span,
      elements: [{ id: "ad", kind: "program", order: 0, program,
        style: [{ name: "position", value: "absolute" }, { name: "left", value: `${within.xPx}px` },
          { name: "top", value: `${within.yPx}px` },
          { name: "width", value: `${within.widthPx}px` }, { name: "height", value: `${within.heightPx}px` }] },
        probe("font-medium", font, "Still looking for an editor 0123456789 ‹ · … ✓"),
        probe("font-bold", bold, "Viibe Edit | Vibe Editing ✓ …")] }] });
}
