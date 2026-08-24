import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";

import type { ArchitectureNodeId } from "./catalog";

type ArchitectureNodeRegistration = (
  nodeId: ArchitectureNodeId,
  element: SVGGElement | null,
) => void;

const ArchitectureLearningContext =
  createContext<ArchitectureNodeRegistration | null>(null);

export function ArchitectureLearningProvider({
  registerNode,
  children,
}: Readonly<{
  registerNode: ArchitectureNodeRegistration;
  children: ReactNode;
}>): ReactElement {
  return (
    <ArchitectureLearningContext value={registerNode}>
      {children}
    </ArchitectureLearningContext>
  );
}

export function useArchitectureNodeRegistration(): ArchitectureNodeRegistration | null {
  return useContext(ArchitectureLearningContext);
}
