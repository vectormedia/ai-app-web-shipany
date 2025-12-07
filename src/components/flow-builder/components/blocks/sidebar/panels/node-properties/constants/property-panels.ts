import { BuilderNode } from "@/components/flow-builder/components/blocks/types";
import type { ComponentType } from "react";

export const NODE_PROPERTY_PANEL_COMPONENTS: Record<
  BuilderNode,
  ComponentType<any> | null
> = {
  [BuilderNode.START]: null,
  [BuilderNode.END]: null,
  [BuilderNode.TEXT_MESSAGE]: null,
  [BuilderNode.MENU]: null,
  [BuilderNode.TAGS]: null,
  [BuilderNode.CONDITIONAL_PATH]: null,
};
