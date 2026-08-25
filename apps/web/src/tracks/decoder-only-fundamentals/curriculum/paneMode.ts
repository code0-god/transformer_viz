export type LearningPaneMode = "explanation" | "visualization";
export type LearningPaneState = { readonly mode: LearningPaneMode };

export const initialLearningPaneState: LearningPaneState = {
  mode: "explanation",
};

export function allowsVisualizationUi(
  visualizationId: string | undefined,
): boolean {
  return visualizationId !== undefined;
}
