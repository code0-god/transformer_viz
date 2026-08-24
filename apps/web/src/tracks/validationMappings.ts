import { architectureNodeCatalog } from "../architecture/catalog";
import type { LearningGuidePage } from "./guideTypes";
import type {
  LearningProfileIssue,
  LearningProfileValidationInput,
} from "./validationTypes";
import type { LearningRouteId } from "./workspaceTypes";

function nodeRoute(
  nodeId: string,
  routes: readonly LearningRouteId[],
): LearningRouteId | undefined {
  if (nodeId.startsWith("decoder.root.")) return "decoder.root";
  if (nodeId.startsWith("decoder.block.")) return "decoder.block";
  if (nodeId.startsWith("decoder.attention.")) {
    return "decoder.self-attention";
  }
  return routes.find((routeId) => nodeId.startsWith(`${routeId}.`));
}

type MappingScan<Id extends string> = {
  readonly page: LearningGuidePage<Id>;
  readonly pagePath: string;
  readonly profile: LearningProfileValidationInput<Id>;
};

export function mappingIssues<Id extends string>({
  page,
  pagePath,
  profile,
}: MappingScan<Id>): readonly LearningProfileIssue[] {
  const issues: LearningProfileIssue[] = [];
  const associated = new Set<string>();
  const primaryNodes = new Set<string>();
  const routeTransitionExemptions = new Set<string>();
  const routeIds = profile.routes.definitions.map(({ id }) => id);

  profile.routes.definitions.forEach((route, routeIndex) => {
    if (route.id !== page.routeId) return;
    route.guideCoverageExemptNodeIds?.forEach((nodeId, nodeIndex) => {
      const path = `routes.definitions[${routeIndex}].guideCoverageExemptNodeIds[${nodeIndex}]`;
      const architectureNodeId = profile.architecture.nodeMap[nodeId];
      if (architectureNodeId === undefined) {
        issues.push({
          code: "unknown-route-transition-exemption",
          path,
          relatedId: nodeId,
        });
        return;
      }
      if (
        nodeRoute(nodeId, routeIds) !== route.id ||
        architectureNodeCatalog[architectureNodeId].capability !== "drill-down"
      ) {
        issues.push({
          code: "invalid-route-transition-exemption",
          path,
          relatedId: nodeId,
        });
        return;
      }
      routeTransitionExemptions.add(nodeId);
    });
  });

  page.sections.forEach((section, sectionIndex) => {
    const sectionPath = `${pagePath}.sections[${sectionIndex}]`;
    const associatedNodeIds = section.associatedNodeIds ?? [];
    associatedNodeIds.forEach((nodeId, nodeIndex) => {
      const path = `${sectionPath}.associatedNodeIds[${nodeIndex}]`;
      const architectureNodeId = profile.architecture.nodeMap[nodeId];
      if (architectureNodeId === undefined) {
        issues.push({
          code: "unknown-associated-node",
          path,
          relatedId: nodeId,
        });
        return;
      }
      const routeId = nodeRoute(nodeId, routeIds);
      if (routeId !== page.routeId) {
        issues.push({
          code: "associated-node-route-mismatch",
          path,
          relatedId: nodeId,
        });
        return;
      }
      associated.add(nodeId);
    });

    const primaryNodeId = section.primaryNodeId;
    if (primaryNodeId === undefined) return;
    const primaryPath = `${sectionPath}.primaryNodeId`;
    const architectureNodeId = profile.architecture.nodeMap[primaryNodeId];
    if (architectureNodeId === undefined) {
      issues.push({
        code: "unknown-primary-node",
        path: primaryPath,
        relatedId: primaryNodeId,
      });
    } else if (
      architectureNodeCatalog[architectureNodeId].capability === "static"
    ) {
      issues.push({
        code: "primary-node-not-interactive",
        path: primaryPath,
        relatedId: primaryNodeId,
      });
    }
    if (!associatedNodeIds.includes(primaryNodeId)) {
      issues.push({
        code: "primary-not-associated",
        path: primaryPath,
        relatedId: primaryNodeId,
      });
    }
    if (primaryNodes.has(primaryNodeId)) {
      issues.push({
        code: "duplicate-primary-node",
        path: primaryPath,
        relatedId: primaryNodeId,
      });
    }
    primaryNodes.add(primaryNodeId);
  });

  for (const [nodeId, architectureNodeId] of Object.entries(
    profile.architecture.nodeMap,
  )) {
    if (
      architectureNodeId === undefined ||
      nodeRoute(nodeId, routeIds) !== page.routeId ||
      architectureNodeCatalog[architectureNodeId].capability === "static" ||
      associated.has(nodeId) ||
      routeTransitionExemptions.has(nodeId)
    ) {
      continue;
    }
    issues.push({
      code: "uncovered-interactive-node",
      path: `architecture.nodeMap.${nodeId}`,
      relatedId: nodeId,
    });
  }
  return issues;
}
