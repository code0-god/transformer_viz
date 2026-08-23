import type { ArchitectureNodeId } from "../architecture/catalog";

export interface NotationEntry {
  readonly id: ArchitectureNodeId;
  readonly title: string;
  readonly plainText: string;
  readonly tex: string;
  readonly diagramDetail: string;
  readonly symbolicInput: string;
  readonly symbolicOutput: string;
  readonly accessibleName: string;
  readonly description: string;
}
