import { nanoid } from "nanoid";
import type { Node } from "@xyflow/react";
import { NODES_METADATA, NODES } from "./index";
import { BuilderNode, BuilderNodeType } from "./types";

export const getNodeDetail = (type: BuilderNodeType) => {
  return NODES_METADATA[type].__details;
};

export const getNodeMetadata = (type: BuilderNodeType) => {
  return NODES_METADATA[type];
};

export function createNodeData<T extends BuilderNodeType>(
  type: T,
  data: unknown
) {
  return {
    id: nanoid(),
    type,
    data,
  };
}

export function createNodeWithDefaultData(
  type: BuilderNodeType,
  data?: Partial<Node>
) {
  const defaultData = NODES.find((node) => node.type === type)?.defaultData;
  if (!defaultData)
    throw new Error(`No default data found for node type "${type}"`);
  return Object.assign(createNodeData(type, defaultData), data) as Node;
}

export function createNodeWithData<T>(
  type: BuilderNode,
  data: T,
  node: Partial<Node> = {}
) {
  return Object.assign(createNodeData(type, data), node) as Node;
}
