# ShipAny Template Two - API 请求实现

## API 架构概述

ShipAny Template Two 采用 **Next.js 15 App Router API Routes** 构建 RESTful API 系统，提供完整的后端服务。API 设计遵循 **分层架构模式**，包含路由层、服务层、数据访问层和工具层，支持认证授权、错误处理、数据验证等企业级特性。

## 核心文件结构

```
src/
├── app/api/                   # API 路由层
│   ├── auth/[...all]/        # 认证 API
│   ├── chat/                 # 聊天 API
│   ├── payment/              # 支付 API
│   ├── config/               # 配置 API
│   ├── user/                 # 用户 API
│   ├── storage/              # 存储 API
│   └── proxy/                # 代理 API
├── shared/
│   ├── services/             # 业务服务层
│   ├── models/               # 数据访问层
│   └── lib/                  # 工具函数层
└── extensions/               # 扩展模块
    └── payment/              # 支付扩展
```

## 1. API 路由层设计

### 1.1 路由命名规范

使用 **RESTful** 风格的路由设计：

```
GET    /api/resource          # 列表查询
POST   /api/resource          # 创建资源
GET    /api/resource/[id]     # 单个查询
PUT    /api/resource/[id]     # 更新资源
DELETE /api/resource/[id]     # 删除资源
```

### 1.2 API 路由结构

```
src/app/api/
├── auth/[...all]/route.ts           # Better-auth 认证端点
├── chat/
│   ├── route.ts                     # POST 发送消息
│   ├── list/route.ts                # GET 聊天列表
│   ├── new/route.ts                 # POST 创建聊天
│   ├── info/route.ts                # GET 聊天信息
│   └── messages/route.ts            # GET 聊天消息
├── payment/
│   ├── checkout/route.ts            # POST 创建支付
│   ├── callback/route.ts            # GET/POST 支付回调
│   └── notify/[provider]/route.ts   # POST 支付通知
├── config/
│   └── get-configs/route.ts         # GET 获取配置
├── user/
│   ├── get-user-info/route.ts       # GET 用户信息
│   └── get-user-credits/route.ts    # GET 用户积分
├── storage/
│   └── upload-image/route.ts        # POST 图片上传
├── proxy/
│   └── file/route.ts               # GET 文件代理
└── docs/
    └── search/route.ts             # POST 文档搜索
```

## 2. 标准响应格式

### 2.1 响应工具函数 (`src/shared/lib/resp.ts`)

```typescript
// 成功响应
export function respData(data: any) {
  return respJson(0, 'ok', data || []);
}

// 简单成功响应
export function respOk() {
  return respJson(0, 'ok');
}

// 错误响应
export function respErr(message: string) {
  return respJson(-1, message);
}

// 通用 JSON 响应
export function respJson(code: number, message: string, data?: any) {
  let json = {
    code: code,
    message: message,
    data: data,
  };
  if (data) {
    json['data'] = data;
  }

  return Response.json(json);
}
```

### 2.2 标准响应格式

```json
{
  "code": 0,          // 状态码：0=成功，-1=失败
  "message": "ok",    // 状态信息
  "data": {}          // 数据载荷（可选）
}
```

## 3. 认证和授权

### 3.1 用户认证检查

```typescript
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    // 验证用户登录状态
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // 业务逻辑
    // ...
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
```

### 3.2 权限验证示例

```typescript
import { checkPermission } from '@/shared/models/rbac';

export async function POST(req: Request) {
  const user = await getUserInfo();

  // 检查特定权限
  const hasPermission = await checkPermission(user?.id, 'admin.users.write');
  if (!hasPermission) {
    return respErr('insufficient permissions');
  }
}
```

## 4. API 实现案例分析

### 4.1 聊天 API 实现 (`src/app/api/chat/route.ts`)

#### 请求处理流程

```typescript
export async function POST(req: Request) {
  try {
    // 1. 参数解析和验证
    const {
      chatId, message, model, webSearch, reasoning
    } = await req.json();

    if (!chatId || !model || !message?.parts?.length) {
      throw new Error('invalid params');
    }

    // 2. 用户认证检查
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // 3. 资源权限验证
    const chat = await findChatById(chatId);
    if (!chat || chat.userId !== user.id) {
      throw new Error('no permission to access this chat');
    }

    // 4. 配置获取
    const configs = await getAllConfigs();
    const openrouterApiKey = configs.openrouter_api_key;
    if (!openrouterApiKey) {
      throw new Error('openrouter_api_key is not set');
    }

    // 5. 保存用户消息
    const userMessage: NewChatMessage = {
      id: generateId().toLowerCase(),
      chatId,
      userId: user.id,
      role: 'user',
      parts: JSON.stringify(message.parts),
      // ... 其他字段
    };
    await createChatMessage(userMessage);

    // 6. AI 服务调用
    const openrouter = createOpenRouter({
      apiKey: openrouterApiKey,
      baseURL: openrouterBaseUrl,
    });

    // 7. 流式响应处理
    const result = streamText({
      model: openrouter.chat(model),
      messages: convertToModelMessages(validatedMessages),
    });

    // 8. 响应回调处理
    return result.toUIMessageStreamResponse({
      onFinish: async ({ messages }) => {
        // 保存助手回复
        await createChatMessage(assistantMessage);
      },
    });

  } catch (e: any) {
    console.log('chat failed:', e);
    return new Response(e.message, { status: 500 });
  }
}
```

#### 关键特性

1. **参数验证**: 严格的输入验证
2. **用户认证**: getUserInfo() 检查登录状态
3. **权限控制**: 验证用户对聊天的访问权限
4. **配置管理**: 动态加载 AI 服务配置
5. **数据持久化**: 自动保存聊天记录
6. **流式响应**: 实时返回 AI 生成内容
7. **错误处理**: 统一的异常处理

### 4.2 支付结账 API (`src/app/api/payment/checkout/route.ts`)

#### 业务流程

```typescript
export async function POST(req: Request) {
  try {
    // 1. 参数解析
    const {
      product_id, currency, locale,
      payment_provider, metadata
    } = await req.json();

    // 2. 产品验证（服务端定价验证）
    const t = await getTranslations({ locale: locale || 'en' });
    const pricing = t.raw('pricing');
    const pricingItem = pricing.items.find(
      (item: any) => item.product_id === product_id
    );

    if (!pricingItem) {
      return respErr('pricing item not found');
    }

    // 3. 用户认证
    const user = await getUserInfo();
    if (!user?.email) {
      return respErr('no auth, please sign in');
    }

    // 4. 支付提供商选择和验证
    const configs = await getAllConfigs();
    let paymentProviderName = payment_provider || configs.default_payment_provider;

    // 验证提供商是否支持当前货币
    if (allowedProviders?.length > 0) {
      if (!allowedProviders.includes(paymentProviderName)) {
        return respErr('payment provider not supported for this currency');
      }
    }

    // 5. 价格计算（服务端安全计算）
    let checkoutCurrency = (pricingItem.currency || 'usd').toLowerCase();
    let checkoutAmount = pricingItem.amount;

    // 货币转换验证
    if (currency) {
      const requestedCurrency = currency.toLowerCase();
      const selectedCurrencyData = pricingItem.currencies?.find(
        (c: PricingCurrency) => c.currency.toLowerCase() === requestedCurrency
      );
      if (selectedCurrencyData) {
        checkoutCurrency = requestedCurrency;
        checkoutAmount = selectedCurrencyData.amount;
      }
    }

    // 6. 订单创建
    const orderNo = getSnowId();
    const order: NewOrder = {
      id: getUuid(),
      orderNo: orderNo,
      userId: user.id,
      status: OrderStatus.PENDING,
      amount: checkoutAmount,
      currency: checkoutCurrency,
      // ... 其他字段
    };
    await createOrder(order);

    // 7. 支付服务调用
    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(paymentProviderName);

    const result = await paymentProvider.createPayment({
      order: checkoutOrder,
    });

    // 8. 订单状态更新
    await updateOrderByOrderNo(orderNo, {
      status: OrderStatus.CREATED,
      checkoutUrl: result.checkoutInfo.checkoutUrl,
      paymentSessionId: result.checkoutInfo.sessionId,
    });

    return respData(result.checkoutInfo);

  } catch (e: any) {
    console.log('checkout failed:', e);
    return respErr('checkout failed: ' + e.message);
  }
}
```

#### 安全设计

1. **服务端定价**: 从服务端配置获取价格，不信任客户端
2. **货币验证**: 严格验证支持的货币和汇率
3. **提供商验证**: 检查支付提供商对特定货币的支持
4. **订单追踪**: 完整的订单生命周期管理
5. **错误回滚**: 支付失败时的状态恢复

## 5. 服务层架构

### 5.1 支付服务 (`src/shared/services/payment.ts`)

#### 多提供商管理

```typescript
export function getPaymentServiceWithConfigs(configs: Configs) {
  const paymentManager = new PaymentManager();
  const defaultProvider = configs.default_payment_provider;

  // Stripe 提供商
  if (configs.stripe_enabled === 'true') {
    paymentManager.addProvider(
      new StripeProvider({
        secretKey: configs.stripe_secret_key,
        publishableKey: configs.stripe_publishable_key,
        signingSecret: configs.stripe_signing_secret,
        allowedPaymentMethods: JSON.parse(configs.stripe_payment_methods || '[]'),
        allowPromotionCodes: configs.stripe_allow_promotion_codes === 'true',
      }),
      defaultProvider === 'stripe'
    );
  }

  // PayPal 提供商
  if (configs.paypal_enabled === 'true') {
    paymentManager.addProvider(
      new PayPalProvider({
        clientId: configs.paypal_client_id,
        clientSecret: configs.paypal_client_secret,
        environment: configs.paypal_environment === 'production'
          ? 'production' : 'sandbox',
      }),
      defaultProvider === 'paypal'
    );
  }

  return paymentManager;
}
```

#### 支付回调处理

```typescript
export async function handleCheckoutSuccess({
  order, session
}: {
  order: Order;
  session: PaymentSession;
}) {
  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    // 更新订单状态
    const updateOrder: UpdateOrder = {
      status: OrderStatus.PAID,
      paymentResult: JSON.stringify(session.paymentResult),
      paymentAmount: session.paymentInfo?.paymentAmount,
      paidAt: session.paymentInfo?.paidAt,
    };

    // 创建订阅记录（如果是订阅支付）
    let newSubscription: NewSubscription | undefined;
    if (session.subscriptionInfo) {
      newSubscription = {
        id: getUuid(),
        subscriptionNo: getSnowId(),
        userId: order.userId,
        status: SubscriptionStatus.ACTIVE,
        // ... 其他字段
      };
    }

    // 授予积分
    let newCredit: NewCredit | undefined;
    if (order.creditsAmount > 0) {
      newCredit = {
        id: getUuid(),
        userId: order.userId,
        credits: order.creditsAmount,
        transactionType: CreditTransactionType.GRANT,
        // ... 其他字段
      };
    }

    // 事务性更新
    await updateOrderInTransaction({
      orderNo: order.orderNo,
      updateOrder,
      newSubscription,
      newCredit,
    });
  }
}
```

## 6. 数据访问层

### 6.1 模型层设计

数据访问层位于 `src/shared/models/`，提供类型安全的数据库操作：

```typescript
// 示例：用户模型
export async function getUserInfo(): Promise<User | null> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: headers() as any,
    });
    return session?.user || null;
  } catch (e) {
    return null;
  }
}

// 示例：聊天消息模型
export async function createChatMessage(data: NewChatMessage): Promise<void> {
  await db().insert(chatMessage).values(data);
}

export async function getChatMessages(params: {
  chatId: string;
  status: ChatMessageStatus;
  page: number;
  limit: number;
}): Promise<ChatMessage[]> {
  return await db()
    .select()
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.chatId, params.chatId),
        eq(chatMessage.status, params.status)
      )
    )
    .orderBy(desc(chatMessage.createdAt))
    .limit(params.limit)
    .offset((params.page - 1) * params.limit);
}
```

### 6.2 事务处理

```typescript
// 复杂业务事务
export async function updateOrderInTransaction({
  orderNo, updateOrder, newSubscription, newCredit
}: {
  orderNo: string;
  updateOrder: UpdateOrder;
  newSubscription?: NewSubscription;
  newCredit?: NewCredit;
}) {
  await db().transaction(async (tx) => {
    // 更新订单
    await tx.update(order)
      .set(updateOrder)
      .where(eq(order.orderNo, orderNo));

    // 创建订阅（如果需要）
    if (newSubscription) {
      await tx.insert(subscription).values(newSubscription);
    }

    // 创建积分记录（如果需要）
    if (newCredit) {
      await tx.insert(credit).values(newCredit);
    }
  });
}
```

## 7. 错误处理策略

### 7.1 分层错误处理

```typescript
export async function POST(req: Request) {
  try {
    // 业务逻辑
    const result = await businessLogic();
    return respData(result);

  } catch (e: any) {
    console.log('API error:', e);

    // 根据错误类型返回不同状态码
    if (e.message.includes('no auth')) {
      return new Response(e.message, { status: 401 });
    }

    if (e.message.includes('permission')) {
      return new Response(e.message, { status: 403 });
    }

    if (e.message.includes('not found')) {
      return new Response(e.message, { status: 404 });
    }

    return new Response(e.message, { status: 500 });
  }
}
```

### 7.2 业务异常处理

```typescript
// 参数验证错误
if (!product_id) {
  return respErr('product_id is required');
}

// 业务规则错误
if (!allowedProviders.includes(paymentProvider)) {
  return respErr('payment provider not supported');
}

// 系统配置错误
if (!openrouterApiKey) {
  throw new Error('openrouter_api_key is not set');
}
```

## 8. 中间件和拦截器

### 8.1 认证中间件

```typescript
// 认证检查中间件
export async function withAuth<T>(
  handler: (user: User, ...args: any[]) => Promise<T>
) {
  return async (...args: any[]): Promise<T> => {
    const user = await getUserInfo();
    if (!user) {
      throw new Error('Authentication required');
    }
    return handler(user, ...args);
  };
}

// 使用示例
export const POST = withAuth(async (user: User, req: Request) => {
  // 已认证的业务逻辑
});
```

### 8.2 速率限制

```typescript
// API 速率限制（示例）
export async function POST(req: Request) {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';

  // 检查速率限制
  const isAllowed = await checkRateLimit(clientIP, 'chat-api', 10, 60); // 每分钟10次
  if (!isAllowed) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // 业务逻辑
}
```

## 9. API 版本控制

### 9.1 版本化路由

```
src/app/api/
├── v1/
│   ├── chat/route.ts
│   └── payment/route.ts
└── v2/
    ├── chat/route.ts
    └── payment/route.ts
```

### 9.2 向后兼容性

```typescript
export async function POST(req: Request) {
  const version = req.headers.get('api-version') || 'v1';

  switch (version) {
    case 'v1':
      return handleV1Request(req);
    case 'v2':
      return handleV2Request(req);
    default:
      return respErr('Unsupported API version');
  }
}
```

## 10. 性能优化

### 10.1 响应缓存

```typescript
export async function GET(req: Request) {
  const cacheKey = `user-info-${userId}`;

  // 尝试从缓存获取
  const cached = await getFromCache(cacheKey);
  if (cached) {
    return respData(cached);
  }

  // 数据库查询
  const userInfo = await getUserInfo();

  // 缓存结果
  await setCache(cacheKey, userInfo, 300); // 5分钟缓存

  return respData(userInfo);
}
```

### 10.2 数据库优化

```typescript
// 使用索引优化查询
export async function getChatMessages(chatId: string) {
  return await db()
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.chatId, chatId))  // 使用 chatId 索引
    .orderBy(desc(chatMessage.createdAt))    // 使用创建时间索引
    .limit(20);
}
```

## 11. API 文档和测试

### 11.1 OpenAPI 规范

```typescript
// API 文档注释示例
/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send chat message
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *               - message
 *               - model
 *             properties:
 *               chatId:
 *                 type: string
 *               message:
 *                 type: object
 *               model:
 *                 type: string
 */
```

### 11.2 集成测试

```typescript
// API 测试示例
describe('/api/chat', () => {
  it('should send message successfully', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: 'test-chat-id',
        message: { parts: [{ text: 'Hello' }] },
        model: 'gpt-3.5-turbo'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.code).toBe(0);
  });
});
```

这个 API 实现提供了完整的后端服务能力，包括认证授权、数据验证、业务逻辑处理、错误处理和性能优化，为构建企业级 SaaS 应用提供了坚实的基础。