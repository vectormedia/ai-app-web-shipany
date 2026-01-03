import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { BuilderNode, BuilderNodeType } from "../../../../types";
import { getNodeDetail } from "../../../../utils";

export function useNodeList(nodes: Node[]) {
  return useMemo(() => {
    return nodes
      .filter((n): n is Node & { type: BuilderNodeType } => !!n.type)
      .slice()
      .sort((a, b) => {
        if (a.type === BuilderNode.START) return -1;
        if (b.type === BuilderNode.START) return 1;
        if (a.type === BuilderNode.END) return 1;
        if (b.type === BuilderNode.END) return -1;
        return 0;
      })
      .map((n) => ({
        ...n,
        detail: getNodeDetail(n.type),
      }));
  }, [nodes]);
}
