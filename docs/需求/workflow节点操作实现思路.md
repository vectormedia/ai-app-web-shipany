# Workflow 节点操作实现思路

## 目录
1. [系统架构概览](#系统架构概览)
2. [改变节点属性](#改变节点属性)
3. [添加预设节点](#添加预设节点)
4. [修改节点UI样式](#修改节点ui样式)
5. [完整开发流程示例](#完整开发流程示例)

---

## 系统架构概览

### 核心文件结构
```
src/
├── app/[locale]/workflow/[id]/
│   └── page.tsx                      # 页面入口，初始化workflow
├── components/flow-builder/
│   ├── flow-builder.tsx              # ReactFlow主组件
│   └── components/blocks/
│       ├── types.ts                  # 节点类型定义
│       ├── index.ts                  # 节点注册中心
│       ├── utils.ts                  # 工具函数
│       ├── nodes/                    # 节点实现
│       │   ├── start.node.tsx
│       │   ├── text-message.node.tsx
│       │   └── ...
│       └── sidebar/                  # 侧边栏（属性面板）
│           └── panels/
│               └── node-properties/  # 节点属性编辑面板
└── stores/
    └── flow-store.ts                 # Zustand状态管理
```

### 数据流
```
Page -> ReactFlowProvider -> FlowBuilder -> ReactFlow
                                ↓
                          FlowStore (Zustand)
                                ↓
                    ┌───────────┴───────────┐
                  Nodes                   Edges
                    ↓                       ↓
              Node Components         Edge Components
                    ↓
            Property Panels (Sidebar)
```

---

## 改变节点属性

### 1. 理解节点数据结构

每个节点都有以下结构：
```typescript
interface Node {
  id: string;              // 唯一标识
  type: BuilderNodeType;   // 节点类型
  position: { x: number; y: number };
  data: {                  // 节点自定义数据
    deletable?: boolean;
    // ... 其他属性
  };
}
```

### 2. 修改节点属性的三种方式

#### 方式A：通过Store直接修改
**位置**: `src/stores/flow-store.ts`

**实现步骤**:
1. 在Store的actions中添加新方法
```typescript
// src/stores/flow-store.ts
nodes: {
  // 现有方法...
  updateNodeData: (nodeId: string, newData: Partial<any>) =>
    set((state) =>
      produce(state, (draft) => {
        const node = draft.workflow.nodes.find(n => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, ...newData };
        }
      })
    ),
}
```

2. 在组件中使用
```typescript
const updateNodeData = useFlowStore(s => s.actions.nodes.updateNodeData);
updateNodeData(nodeId, { message: "新消息内容" });
```

#### 方式B：通过ReactFlow的onNodesChange
**位置**: `src/components/flow-builder/flow-builder.tsx`

适用场景：位置、选择状态等由ReactFlow自动管理的变化

```typescript
const onNodesChange = useFlowStore((s) => s.actions.nodes.onNodesChange);
// Store中的实现
onNodesChange: (changes) => {
  set((state) =>
    produce(state, (draft) => {
      draft.workflow.nodes = applyNodeChanges(changes, draft.workflow.nodes);
    })
  );
}
```

#### 方式C：通过属性面板（推荐用于用户编辑）
**位置**: `src/components/flow-builder/components/blocks/sidebar/panels/node-properties/`

**实现步骤**:

1. **创建属性面板组件**
```typescript
// src/components/flow-builder/components/blocks/sidebar/panels/node-properties/
// property-panels/text-message-property-panel.tsx

import { useFlowStore } from "@/stores/flow-store";
import { TextMessageNodeData } from "@/components/flow-builder/components/blocks/nodes/text-message.node";

export function TextMessagePropertyPanel() {
  const selectedNode = useFlowStore(
    (s) => s.workflow.sidebar.panels.nodeProperties.selectedNode
  );
  const updateNodeData = useFlowStore(s => s.actions.nodes.updateNodeData);

  const handleMessageChange = (message: string) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { message });
    }
  };

  return (
    <div className="p-4">
      <label>消息内容</label>
      <textarea
        onChange={(e) => handleMessageChange(e.target.value)}
        placeholder="输入消息..."
      />
    </div>
  );
}
```

2. **注册属性面板**
```typescript
// src/components/flow-builder/components/blocks/sidebar/panels/node-properties/
// constants/property-panels.ts

import { TextMessagePropertyPanel } from "../property-panels/text-message-property-panel";

export const NODE_PROPERTY_PANEL_COMPONENTS: Record<
  BuilderNode,
  ComponentType<any> | null
> = {
  [BuilderNode.TEXT_MESSAGE]: TextMessagePropertyPanel, // 修改这里
  // 其他节点...
};
```

3. **在节点元数据中声明**
```typescript
// src/components/flow-builder/components/blocks/nodes/text-message.node.tsx

export const metadata: RegisterNodeMetadata<TextMessageNodeData> = {
  type: NODE_TYPE,
  node: memo(TextMessageNode),
  propertyPanel: TextMessagePropertyPanel, // 添加这行
  // 其他配置...
};
```

---

## 添加预设节点

### 完整流程

#### 步骤1：定义节点类型
**文件**: `src/components/flow-builder/components/blocks/types.ts`

```typescript
export enum BuilderNode {
  START = "start",
  END = "end",
  TEXT_MESSAGE = "text-message",
  // 添加新节点类型
  AI_CHAT = "ai-chat",  // 示例：AI聊天节点
}
```

#### 步骤2：创建节点组件
**文件**: `src/components/flow-builder/components/blocks/nodes/ai-chat.node.tsx`

```typescript
import { type Node, type NodeProps, Position } from "@xyflow/react";
import { nanoid } from "nanoid";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseNodeData, BuilderNode, RegisterNodeMetadata } from "../types";
import { getNodeDetail } from "../utils";
import { useFlowStore } from "@/stores/flow-store";
import CustomHandle from "@/components/flow-builder/components/handles/custom-handler";
import {
  NodeCard,
  NodeCardContent,
  NodeCardDescription,
  NodeCardFooter,
  NodeCardHeader,
} from "../../ui/node-card";

const NODE_TYPE = BuilderNode.AI_CHAT;

// 1. 定义节点数据类型
export interface AiChatNodeData extends BaseNodeData {
  model: string;           // AI模型
  prompt: string;          // 提示词
  temperature: number;     // 温度参数
  maxTokens: number;       // 最大token数
}

type AiChatNodeProps = NodeProps<Node<AiChatNodeData, typeof NODE_TYPE>>;

// 2. 实现节点UI组件
export function AiChatNode({
  id,
  isConnectable,
  selected,
  data,
}: AiChatNodeProps) {
  const meta = useMemo(() => getNodeDetail(NODE_TYPE), []);

  const showNodePropertiesOf = useFlowStore(
    (s) => s.actions.sidebar.showNodePropertiesOf
  );
  const deleteNode = useFlowStore((s) => s.actions.nodes.deleteNode);
  const nodes = useFlowStore((s) => s.workflow.nodes);

  const [sourceHandleId] = useState<string>(nanoid());
  const [targetHandleId] = useState<string>(nanoid());

  const handleDeleteNode = () => {
    const node = nodes.find((n) => n.id === id);
    if (node) deleteNode(node);
  };

  const handleShowNodeProperties = useCallback(() => {
    showNodePropertiesOf({ id, type: NODE_TYPE });
  }, [id, showNodePropertiesOf]);

  return (
    <NodeCard data-selected={selected} onDoubleClick={handleShowNodeProperties}>
      <NodeCardHeader
        icon={meta.icon}
        title={meta.title}
        handleDeleteNode={handleDeleteNode}
        handleShowNodeProperties={handleShowNodeProperties}
        gradientColor={meta.gradientColor}
      />

      <NodeCardContent>
        <div className="flex flex-col p-4 gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium">Model:</span>
            <span className="text-xs text-muted-foreground">{data.model || 'Not set'}</span>
          </div>

          <div className="text-xs font-medium">Prompt:</div>
          <div className="line-clamp-3 text-sm text-muted-foreground">
            {data.prompt || <i>No prompt set...</i>}
          </div>
        </div>

        <NodeCardDescription description="AI chat interaction node" />
        <NodeCardFooter nodeId={id} />
      </NodeCardContent>

      {/* 输入连接点 */}
      <CustomHandle
        type="target"
        id={targetHandleId}
        position={Position.Left}
        isConnectable={isConnectable}
      />

      {/* 输出连接点 */}
      <CustomHandle
        type="source"
        id={sourceHandleId}
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </NodeCard>
  );
}

// 3. 导出节点元数据
export const metadata: RegisterNodeMetadata<AiChatNodeData> = {
  type: NODE_TYPE,
  node: memo(AiChatNode),
  detail: {
    icon: "mdi:robot",                    // Iconify图标
    title: "AI Chat",
    description: "Interact with AI models",
    gradientColor: "purple",              // 可选：header渐变色
  },
  connection: {
    inputs: 1,    // 可以有1个输入
    outputs: 1,   // 可以有1个输出
  },
  available: true,  // 是否在可用节点列表中显示
  defaultData: {    // 默认数据
    model: "gpt-4",
    prompt: "",
    temperature: 0.7,
    maxTokens: 2000,
  },
};
```

#### 步骤3：注册节点
**文件**: `src/components/flow-builder/components/blocks/index.ts`

```typescript
import { metadata as AiChatNodeMetadata } from "./nodes/ai-chat.node";

export const NODES: RegisterNodeMetadata[] = [
  StartNodeMetadata,
  EndNodeMetadata,
  TextMessageNodeMetadata,
  TagsNodeMetadata,
  MenuNodeMetadata,
  AiChatNodeMetadata,  // 添加新节点
];
```

#### 步骤4：（可选）创建属性面板
**文件**: `src/components/flow-builder/components/blocks/sidebar/panels/node-properties/property-panels/ai-chat-property-panel.tsx`

```typescript
import { useFlowStore } from "@/stores/flow-store";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Slider } from "@/shared/components/ui/slider";

export function AiChatPropertyPanel() {
  const selectedNode = useFlowStore(
    (s) => s.workflow.sidebar.panels.nodeProperties.selectedNode
  );
  const nodes = useFlowStore((s) => s.workflow.nodes);
  const updateNodeData = useFlowStore(s => s.actions.nodes.updateNodeData);

  if (!selectedNode) return null;

  const node = nodes.find((n) => n.id === selectedNode.id);
  const data = node?.data || {};

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label>AI Model</Label>
        <Input
          value={data.model || ""}
          onChange={(e) => updateNodeData(selectedNode.id, { model: e.target.value })}
          placeholder="gpt-4"
        />
      </div>

      <div>
        <Label>Prompt</Label>
        <Textarea
          value={data.prompt || ""}
          onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
          placeholder="Enter your prompt..."
          rows={4}
        />
      </div>

      <div>
        <Label>Temperature: {data.temperature || 0.7}</Label>
        <Slider
          value={[data.temperature || 0.7]}
          onValueChange={([value]) => updateNodeData(selectedNode.id, { temperature: value })}
          min={0}
          max={2}
          step={0.1}
        />
      </div>

      <div>
        <Label>Max Tokens</Label>
        <Input
          type="number"
          value={data.maxTokens || 2000}
          onChange={(e) => updateNodeData(selectedNode.id, { maxTokens: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
}
```

#### 步骤5：注册属性面板
**文件**: `src/components/flow-builder/components/blocks/sidebar/panels/node-properties/constants/property-panels.ts`

```typescript
import { AiChatPropertyPanel } from "../property-panels/ai-chat-property-panel";

export const NODE_PROPERTY_PANEL_COMPONENTS: Record<
  BuilderNode,
  ComponentType<any> | null
> = {
  // 现有节点...
  [BuilderNode.AI_CHAT]: AiChatPropertyPanel,
};
```

---

## 修改节点UI样式

### 1. 节点卡片样式

节点UI使用 `NodeCard` 组件系统，位于 `src/components/flow-builder/components/ui/node-card.tsx`

#### 修改整体节点样式
```typescript
// 在节点组件中自定义className
<NodeCard
  data-selected={selected}
  className="w-80 shadow-lg" // 自定义宽度和阴影
  onDoubleClick={handleShowNodeProperties}
>
```

#### 修改Header颜色
```typescript
// types.ts中定义的渐变色
export const HeaderGradientColors = {
  purple: "from-purple-700",
  red: "from-red-700",
  // 添加新颜色
  custom: "from-amber-700",
};

// 在节点metadata中使用
export const metadata: RegisterNodeMetadata<YourNodeData> = {
  detail: {
    gradientColor: "purple", // 使用预定义颜色
  },
};
```

### 2. 节点内容布局

#### 方式A：使用现有组件
```typescript
<NodeCardContent>
  {/* 主要内容区 */}
  <div className="flex flex-col p-4">
    <div className="text-xs font-medium">标题</div>
    <div className="text-sm mt-2">内容</div>
  </div>

  {/* 描述区 */}
  <NodeCardDescription description="节点说明" />

  {/* 页脚区（显示节点ID等） */}
  <NodeCardFooter nodeId={id} />
</NodeCardContent>
```

#### 方式B：完全自定义
```typescript
<NodeCardContent>
  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50">
    {/* 自定义布局 */}
    <div className="flex items-center gap-2">
      <Icon icon="mdi:robot" className="size-8" />
      <div>
        <h3 className="font-bold">{data.title}</h3>
        <p className="text-xs text-muted-foreground">{data.subtitle}</p>
      </div>
    </div>
  </div>
</NodeCardContent>
```

### 3. 连接点样式

位置: `src/components/flow-builder/components/handles/custom-handler.tsx`

```typescript
// 修改连接点位置和样式
<CustomHandle
  type="target"
  id={targetHandleId}
  position={Position.Top}    // 改为顶部
  isConnectable={isConnectable}
  className="!bg-green-500"  // 自定义颜色
/>
```

### 4. 选中状态样式

```typescript
<NodeCard
  data-selected={selected}
  className={cn(
    "transition-all",
    selected && "ring-2 ring-primary ring-offset-2" // 选中时的样式
  )}
>
```

### 5. 节点图标

使用Iconify图标库，在节点metadata中配置：
```typescript
detail: {
  icon: "mdi:robot",  // 从 https://icon-sets.iconify.design/ 选择
  // 或使用其他图标集
  // icon: "heroicons:chat-bubble-left-right",
  // icon: "fluent:chat-24-filled",
}
```

---

## 完整开发流程示例

### 场景：添加一个"数据库查询"节点

#### 1. 规划节点功能
- **输入**: 上一个节点的输出
- **功能**: 执行SQL查询
- **输出**: 查询结果
- **配置项**: 数据库连接、SQL语句、超时时间

#### 2. 定义类型 (`types.ts`)
```typescript
export enum BuilderNode {
  // ...现有类型
  DATABASE_QUERY = "database-query",
}
```

#### 3. 创建节点组件 (`nodes/database-query.node.tsx`)
```typescript
const NODE_TYPE = BuilderNode.DATABASE_QUERY;

export interface DatabaseQueryNodeData extends BaseNodeData {
  connectionString: string;
  sqlQuery: string;
  timeout: number;
}

export function DatabaseQueryNode({ id, isConnectable, selected, data }: NodeProps) {
  // ... 实现节点UI
}

export const metadata: RegisterNodeMetadata<DatabaseQueryNodeData> = {
  type: NODE_TYPE,
  node: memo(DatabaseQueryNode),
  detail: {
    icon: "mdi:database",
    title: "Database Query",
    description: "Execute SQL queries",
    gradientColor: "blue",
  },
  connection: {
    inputs: 1,
    outputs: 1,
  },
  defaultData: {
    connectionString: "",
    sqlQuery: "SELECT * FROM users",
    timeout: 30,
  },
};
```

#### 4. 注册节点 (`index.ts`)
```typescript
import { metadata as DatabaseQueryNodeMetadata } from "./nodes/database-query.node";

export const NODES: RegisterNodeMetadata[] = [
  // ...现有节点
  DatabaseQueryNodeMetadata,
];
```

#### 5. 创建属性面板 (`property-panels/database-query-property-panel.tsx`)
```typescript
export function DatabaseQueryPropertyPanel() {
  const selectedNode = useFlowStore(/* ... */);
  const updateNodeData = useFlowStore(/* ... */);

  return (
    <div className="p-4 space-y-4">
      {/* 数据库连接 */}
      <div>
        <Label>Connection String</Label>
        <Input /* ... */ />
      </div>

      {/* SQL查询 */}
      <div>
        <Label>SQL Query</Label>
        <Textarea /* ... */ />
      </div>

      {/* 超时时间 */}
      <div>
        <Label>Timeout (seconds)</Label>
        <Input type="number" /* ... */ />
      </div>
    </div>
  );
}
```

#### 6. 注册属性面板 (`property-panels.ts`)
```typescript
export const NODE_PROPERTY_PANEL_COMPONENTS = {
  // ...
  [BuilderNode.DATABASE_QUERY]: DatabaseQueryPropertyPanel,
};
```

#### 7. 测试节点
1. 启动开发服务器: `pnpm dev`
2. 打开workflow页面: `/workflow/test-id`
3. 从侧边栏拖拽新节点到画布
4. 双击节点打开属性面板
5. 修改节点属性，验证数据同步

---

## 最佳实践

### 1. 节点设计原则
- **单一职责**: 每个节点只做一件事
- **清晰的输入输出**: 明确节点的数据流向
- **合理的默认值**: 提供常用的默认配置

### 2. 性能优化
- 使用 `memo` 包装节点组件
- 使用 `useMemo` 缓存复杂计算
- 避免在节点组件中订阅整个store

```typescript
// ❌ 不好：订阅整个nodes数组
const nodes = useFlowStore((s) => s.workflow.nodes);

// ✅ 好：只订阅需要的数据
const deleteNode = useFlowStore((s) => s.actions.nodes.deleteNode);
```

### 3. 类型安全
- 为每个节点定义严格的 `Data` 类型
- 使用TypeScript的类型推断
- 避免使用 `any`

### 4. UI一致性
- 复用 `NodeCard` 组件系统
- 遵循现有的间距和颜色规范
- 使用统一的图标库 (Iconify)

### 5. 状态管理
- 通过Store集中管理状态
- 避免在节点组件中维护本地状态（除了UI状态）
- 使用immer简化不可变更新

---

## 常见问题

### Q: 如何让节点支持多个输出?
A: 在节点组件中添加多个 `CustomHandle` (type="source")，并赋予不同的 `id`:

```typescript
<CustomHandle type="source" id="output-success" position={Position.Right} />
<CustomHandle type="source" id="output-error" position={Position.Bottom} />
```

### Q: 如何限制节点的连接规则?
A: 实现自定义的 `isValidConnection` 函数并传递给 `ReactFlow`:

```typescript
// flow-builder.tsx
const isValidConnection = useCallback((connection: Connection) => {
  // 自定义连接验证逻辑
  return true;
}, []);

<ReactFlow
  isValidConnection={isValidConnection}
  // ...
/>
```

### Q: 如何实现节点的验证?
A: 在节点数据中添加验证状态，并在UI中显示:

```typescript
export interface YourNodeData extends BaseNodeData {
  isValid: boolean;
  errors: string[];
}

// 在节点UI中显示错误
{data.errors.length > 0 && (
  <div className="text-red-500 text-xs">
    {data.errors.join(", ")}
  </div>
)}
```

### Q: 如何实现节点的条件输出?
A: 在metadata中配置多个输出，并在业务逻辑中决定使用哪个输出:

```typescript
connection: {
  inputs: 1,
  outputs: 2,  // 例如：成功和失败两个输出
}
```

---

## 相关资源

- [XYFlow官方文档](https://reactflow.dev/)
- [Zustand文档](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Iconify图标库](https://icon-sets.iconify.design/)
- [参考项目](https://github.com/nobruf/shadcn-next-workflows)

---

## 开发检查清单

添加新节点时，确保完成以下步骤：

- [ ] 在 `types.ts` 中添加节点类型枚举
- [ ] 创建节点数据接口 (extends BaseNodeData)
- [ ] 实现节点UI组件
- [ ] 导出节点metadata（包含type、node、detail、connection、defaultData）
- [ ] 在 `index.ts` 中注册节点
- [ ] （可选）创建属性面板组件
- [ ] （可选）在 `property-panels.ts` 中注册属性面板
- [ ] 测试节点的拖拽、连接、删除功能
- [ ] 测试属性面板的数据修改和同步
- [ ] 验证节点在选中/未选中状态下的显示
- [ ] 检查TypeScript类型是否正确
