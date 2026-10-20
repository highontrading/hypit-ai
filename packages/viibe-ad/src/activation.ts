import { assertAttributes, assertEmptyElement, createMarkupSurfaceFacet, textAttribute } from "@hypit/hypit/markup";
import { canonicalize, sameType } from "@hypit/hypit/protocol";
import { sealGraphFragment } from "@hypit/hypit/author";
import type { ProducerPackage } from "@hypit/hypit/producer";
import type { AdmissionPackage } from "@hypit/hypit/admission";
import { createAdmissionPackageFacet } from "@hypit/hypit/admission";
import { createProducerPackageFacet } from "@hypit/hypit/producer";
import type { ModuleManifest, TypeRef } from "@hypit/hypit/protocol";
import type { StructuredSurfaceHandler, SurfaceResolvedReference } from "@hypit/hypit/markup";
import { compositionTypes } from "@hypit/composition";
import { mediaTypes } from "@hypit/media";
import type { FontStackRef } from "@hypit/media";
import type { Timeline } from "@hypit/timeline";
import { timelineTypes } from "@hypit/timeline";
import { spatialTypes } from "@hypit/spatial";
import type { SpatialFrame } from "@hypit/spatial";
import { temporalTypes } from "@hypit/temporal";
import type { TemporalWindow } from "@hypit/temporal";
import { resolveTemporalContext, resolveTemporalWindowReference, temporalContextAttributeVocabulary,
  temporalWindowAttributeNames, temporalWindowAttributeVocabulary } from "@hypit/temporal/markup";
import { renderAd } from "./render.js";
import type { AdOptions } from "./render.js";

const module = { name: "@viibe/ad-scene", version: "1" } as const;
const optionsType: TypeRef = { module, name: "Options" };
const renderProducer = { module, name: "render" };
export const manifest: ModuleManifest = { format: "hypit.module@1", ...module,
  dependencies: [compositionTypes.visualTrack, mediaTypes.fontStack, timelineTypes.timeline, spatialTypes.frame, temporalTypes.window].map(type => ({ module: type.module })),
  types: [{ name: optionsType.name }], capabilities: [], producers: [
    { name: "render", inputs: [{ name: "options", type: optionsType }, { name: "timeline", type: timelineTypes.timeline },
      { name: "within", type: spatialTypes.frame }, { name: "window", type: temporalTypes.window },
      { name: "font", type: mediaTypes.fontStack }, { name: "bold", type: mediaTypes.fontStack }],
      outputs: [{ name: "visual", type: compositionTypes.visualTrack }], needs: [] },
  ],
};
const inline = <T>(record: { value: { kind: string; value?: unknown } } | undefined): T => {
  if (record?.value.kind !== "inline") throw new Error("Ad scene inputs must be inline values.");
  return record.value.value as T;
};
const value = (data: unknown) => ({ kind: "inline" as const, value: canonicalize(data) });
const component: ProducerPackage & AdmissionPackage = { producers: [
  { producer: renderProducer, handler: ({ inputs }) => ({ outputs: { visual: value(renderAd(inline<Timeline>(inputs.timeline),
    inline<SpatialFrame>(inputs.within), inline<TemporalWindow>(inputs.window), inline<FontStackRef>(inputs.font),
    inline<FontStackRef>(inputs.bold), inline<AdOptions>(inputs.options))) }, needs: {} }) },
] };

export const decodeSurface: StructuredSurfaceHandler = ({ element, resolveReference }) => {
  assertAttributes(element, ["id", "timeline", "within", "font", "bold", "brand", "tagline", ...temporalWindowAttributeNames]);
  assertEmptyElement(element);
  const id = textAttribute(element, "id"), context = resolveTemporalContext({ element, resolveReference });
  const window = resolveTemporalWindowReference({ element, resolveReference });
  const reference = (name: string, type: TypeRef): SurfaceResolvedReference => {
    const raw = element.attributes[name];
    if (typeof raw !== "object" || raw.kind !== "reference") throw new Error(`${name} must be a reference.`);
    const found = resolveReference(raw.path);
    if (found === undefined || !sameType(found.type, type)) throw new Error(`${name} has the wrong Type.`);
    return found;
  };
  const options: AdOptions = { id, brand: textAttribute(element, "brand"), tagline: textAttribute(element, "tagline") };
  const records = [{ id: `${id}.options`, type: optionsType, value: value(options), range: element.range }];
  const inputs = [{ name: "timeline", type: timelineTypes.timeline }, { name: "within", type: spatialTypes.frame },
    { name: "font", type: mediaTypes.fontStack }, { name: "bold", type: mediaTypes.fontStack },
    { name: "window", type: temporalTypes.window }, { name: "options", type: optionsType }];
  const bindings: Record<string, SurfaceResolvedReference["ref"]> = { timeline: context.timeline.ref, within: reference("within", spatialTypes.frame).ref,
    font: reference("font", mediaTypes.fontStack).ref, bold: reference("bold", mediaTypes.fontStack).ref,
    window: window.ref, options: { kind: "record", id: `${id}.options` } };
  const input = (name: string) => ({ kind: "fragment-input" as const, name });
  const fragment = sealGraphFragment({ inputs, operations: [{ id: "render", producer: renderProducer, inputs: { options: input("options"),
    timeline: input("timeline"), within: input("within"), font: input("font"), bold: input("bold"), window: input("window") },
    result: { kind: "output", name: "visual" } }],
    exports: [{ name: "visual", type: compositionTypes.visualTrack, root: { kind: "fragment-operation", operation: "render" } }] });
  return { records, fragments: [fragment], components:
    [{ id, fragment: fragment.id, inputs: bindings, outputs: { visual: `${id}.visual` }, range: element.range }], exports: [`${id}.visual`] };
};
const declaration = { name: "scene", tag: "Scene", mode: "structured" as const,
  outputs: [compositionTypes.visualTrack, optionsType],
  vocabulary: { summary: "The Viibe Edit ad: search for an editor, find the brand, see AI edits, start one, get it done.", attributes: [
    ...temporalContextAttributeVocabulary, ...temporalWindowAttributeVocabulary,
    { name: "id", kind: "expression" as const, required: true, summary: "Names the scene and its `.visual` output." },
    { name: "within", kind: "expression" as const, required: true, summary: "Frame the 9:16 scene fills." },
    { name: "font", kind: "expression" as const, required: true, summary: "Medium FontStack for body copy." },
    { name: "bold", kind: "expression" as const, required: true, summary: "Bold FontStack for headlines and the brand." },
    { name: "brand", kind: "literal" as const, required: true, summary: "Brand shown in the search result pill." },
    { name: "tagline", kind: "literal" as const, required: true, summary: "Text after the brand in the pill." },
  ], ports: [{ name: "visual", type: compositionTypes.visualTrack, summary: "The complete animated ad picture." }],
    example: '<ad:Scene id="ad" timeline={program.timeline} within={canvas.bounds} font={font} bold={bold} during={program.window} brand="Viibe Edit" tagline="Vibe Editing"/>',
  },
};
export const hypitPackage = { format: "hypit.package@1" as const, modules: [{ manifest }],
  facets: [createProducerPackageFacet(component), createAdmissionPackageFacet(component),
    createMarkupSurfaceFacet({ module, declaration, handler: decodeSurface })] };
export default hypitPackage;
