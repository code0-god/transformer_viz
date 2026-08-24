import type { ArchitectureState } from "../../architecture";
import type {
  ArchitectureRouteCatalog,
  ArchitectureRouteDefinition,
  LearningRouteId,
} from "../types";

export type DecoderOnlyRoute =
  | { readonly kind: "decoder-root" }
  | { readonly kind: "decoder-block"; readonly layer: number }
  | {
      readonly kind: "decoder-self-attention";
      readonly layer: number;
      readonly head: number;
    };

const routeDefinitions: readonly ArchitectureRouteDefinition[] = [
  {
    id: "decoder.root",
    title: "GPT",
    subtitle: "Decoder-only Transformer",
    guidePageId: "decoder-guide-root",
    terminal: false,
  },
  {
    id: "decoder.block",
    title: "Transformer Block",
    subtitle: "Pre-LN Decoder Block",
    guidePageId: "decoder-guide-block",
    terminal: false,
  },
  {
    id: "decoder.self-attention",
    title: "Self-Attention",
    subtitle: "Causal Multi-Head Self-Attention",
    guidePageId: "decoder-guide-self-attention",
    terminal: true,
  },
];

export const decoderRouteCatalog: ArchitectureRouteCatalog = {
  initialRouteId: "decoder.root",
  definitions: routeDefinitions,
};

export function decoderRoute(state: ArchitectureState): DecoderOnlyRoute {
  switch (state.view) {
    case "root":
      return { kind: "decoder-root" };
    case "transformer-block":
      return { kind: "decoder-block", layer: state.selectedLayer };
    case "self-attention":
      return {
        kind: "decoder-self-attention",
        layer: state.selectedLayer,
        head: state.selectedHead,
      };
  }
}

export function decoderRouteId(route: DecoderOnlyRoute): LearningRouteId {
  switch (route.kind) {
    case "decoder-root":
      return "decoder.root";
    case "decoder-block":
      return "decoder.block";
    case "decoder-self-attention":
      return "decoder.self-attention";
  }
}
