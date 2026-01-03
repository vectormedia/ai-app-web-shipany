# Creem 支付接入指南

本文档详细介绍如何在项目中接入 Creem 支付服务。

## 1. Creem 简介

Creem 是一个面向 SaaS 应用的支付服务提供商，支持一次性支付和订阅支付，特别适合独立开发者和小型团队。

- 官网：https://creem.io/
- 文档：https://docs.creem.io/

## 2. 注册 Creem 账号

1. 访问 [Creem 官网](https://creem.io/) 注册账号
2. 完成账号验证和企业/个人信息填写
3. 登录 [Creem Dashboard](https://www.creem.io/dashboard)

## 3. 获取 API 密钥

### 3.1 API Key

1. 登录 Creem Dashboard
2. 进入 **Settings** > **API Keys**
3. 创建新的 API Key（格式为 `creem_xxx`）
4. 保存 API Key，稍后需要填入系统配置

### 3.2 Signing Secret (Webhook 密钥)

1. 在 Creem Dashboard 中进入 **Settings** > **Webhooks**
2. 创建新的 Webhook endpoint，URL 填写：
   ```
   https://你的域名/api/payment/notify/creem
   ```
3. 选择需要监听的事件类型（推荐全选）：
   - `checkout.completed` - 支付完成
   - `subscription.paid` - 订阅付款
   - `subscription.update` - 订阅更新
   - `subscription.paused` - 订阅暂停
   - `subscription.active` - 订阅激活
   - `subscription.canceled` - 订阅取消
4. 创建后会生成 Signing Secret（格式为 `whsec_xxx`）
5. 保存此密钥，用于验证 Webhook 通知

## 4. 在 Creem 中创建产品

1. 进入 [Creem Products](https://www.creem.io/dashboard/products)
2. 点击 **Create Product** 创建新产品
3. 填写产品信息：
   - **Name**: 产品名称
   - **Description**: 产品描述
   - **Price**: 价格
   - **Currency**: 货币类型
   - **Billing Period**: 计费周期
     - `once` - 一次性付款
     - `every-month` - 每月
     - `every-three-months` - 每三个月
     - `every-six-months` - 每六个月
     - `every-year` - 每年
4. 保存后获取 Product ID（格式为 `prod_xxx`）

## 5. 系统配置

### 5.1 后台管理配置

1. 访问系统后台管理：`https://你的域名/admin/settings`
2. 切换到 **支付** 标签
3. 找到 **Creem** 配置组，填写以下配置：

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| Creem Enabled | 是否启用 Creem | `true` |
| Creem Environment | 环境选择 | `sandbox`（测试）/ `production`（生产） |
| Creem API Key | API 密钥 | `creem_xxx` |
| Creem Signing Secret | Webhook 签名密钥 | `whsec_xxx` |
| Creem Product IDs Mapping | 产品 ID 映射 | 见下方说明 |

### 5.2 产品 ID 映射配置

将 pricing 表中的 `product_id` 映射到 Creem 中创建的产品 ID：

```json
{
  "starter": "prod_xxx1",
  "standard-monthly": "prod_xxx2",
  "premium-yearly": "prod_xxx3"
}
```

**多币种支持：** 如果同一产品有多个币种版本，可以使用 `product_id_currency` 格式：

```json
{
  "starter": "prod_xxx_usd",
  "starter_cny": "prod_xxx_cny",
  "premium-yearly": "prod_xxx_usd",
  "premium-yearly_cny": "prod_xxx_cny"
}
```

### 5.3 默认支付提供商

如果需要将 Creem 设为默认支付提供商：

1. 在后台设置中找到 **基础支付** 配置组
2. 将 **Default Payment Provider** 设置为 `creem`

## 6. 价格表配置

在 `src/config/locale/messages/{locale}/pricing.json` 中配置产品信息：

```json
{
  "pricing": {
    "items": [
      {
        "product_id": "starter",
        "product_name": "Starter Plan",
        "plan_name": "Starter",
        "description": "适合个人用户",
        "amount": 9.99,
        "currency": "usd",
        "interval": "month",
        "credits": 100,
        "valid_days": 30,
        "payment_product_id": "prod_xxx",
        "payment_providers": ["creem", "stripe"]
      }
    ]
  }
}
```

**关键字段说明：**

| 字段 | 说明 |
|------|------|
| `product_id` | 系统内部产品标识 |
| `payment_product_id` | Creem 产品 ID（可选，也可在后台配置映射） |
| `payment_providers` | 允许使用的支付提供商列表 |
| `interval` | 计费周期：`one-time`、`month`、`year` |
| `credits` | 赠送积分数量 |
| `valid_days` | 积分有效天数 |

## 7. 支付流程说明

### 7.1 一次性支付流程

```
用户选择产品 -> 调用 /api/payment/checkout -> Creem 创建 Checkout Session
    -> 用户跳转到 Creem 支付页面 -> 支付完成
    -> Creem 发送 checkout.completed Webhook -> 系统处理订单
    -> 用户跳转回成功页面
```

### 7.2 订阅支付流程

```
用户选择订阅 -> 调用 /api/payment/checkout -> Creem 创建 Checkout Session
    -> 用户完成首次支付 -> checkout.completed Webhook -> 创建订单和订阅
    -> 订阅续费 -> subscription.paid Webhook -> 创建续费订单
    -> 订阅取消 -> subscription.canceled Webhook -> 更新订阅状态
```

### 7.3 Webhook 事件处理

系统通过 `/api/payment/notify/creem` 接收 Creem 的 Webhook 通知：

| Creem 事件 | 系统处理 |
|------------|----------|
| `checkout.completed` | 处理首次支付成功，创建订单和订阅 |
| `subscription.paid` | 处理订阅续费，创建续费订单 |
| `subscription.update` | 更新订阅状态 |
| `subscription.paused` | 标记订阅暂停 |
| `subscription.active` | 标记订阅激活 |
| `subscription.canceled` | 标记订阅已取消 |

## 8. 测试环境

### 8.1 使用 Sandbox 环境

1. 在后台配置中将 **Creem Environment** 设置为 `sandbox`
2. 使用 Creem 提供的测试卡进行支付测试
3. 测试 API 地址：`https://test-api.creem.io`

### 8.2 切换到生产环境

确认测试无误后：

1. 将 **Creem Environment** 改为 `production`
2. 确保 Webhook URL 已在 Creem 生产环境中配置
3. 生产 API 地址：`https://api.creem.io`

## 9. 用户账单管理

Creem 提供客户门户功能，用户可以管理自己的订阅：

1. 系统会自动获取客户门户链接
2. 用户可在 **设置 > 账单** 页面访问客户门户
3. 在门户中可以：
   - 查看账单历史
   - 更新支付方式
   - 取消订阅

## 10. 常见问题

### Q1: Webhook 通知收不到？

1. 确认 Webhook URL 配置正确：`https://你的域名/api/payment/notify/creem`
2. 确认 Signing Secret 配置正确
3. 检查服务器日志查看错误信息
4. 确保服务器能被公网访问

### Q2: 支付完成但订单状态未更新？

1. 检查 Webhook 是否正常接收
2. 查看服务器日志中的错误信息
3. 确认产品 ID 映射配置正确

### Q3: 如何处理多币种？

1. 在 Creem 中为每个币种创建独立产品
2. 在产品 ID 映射中配置多币种：
   ```json
   {
     "product_id_usd": "prod_xxx_usd",
     "product_id_cny": "prod_xxx_cny"
   }
   ```

### Q4: 如何取消订阅？

用户可以：
1. 通过客户门户自行取消
2. 联系管理员后台取消

系统会自动处理 `subscription.canceled` 事件并更新订阅状态。

## 11. 相关代码文件

| 文件路径 | 说明 |
|----------|------|
| `src/extensions/payment/creem.ts` | Creem Provider 实现 |
| `src/extensions/payment/index.ts` | 支付管理器 |
| `src/shared/services/payment.ts` | 支付服务配置 |
| `src/app/api/payment/checkout/route.ts` | 结账 API |
| `src/app/api/payment/notify/[provider]/route.ts` | Webhook 处理 |
| `src/shared/services/settings.ts` | 后台设置配置项 |

## 12. 更多资源

- [Creem 官方文档](https://docs.creem.io/)
- [Creem API 参考](https://docs.creem.io/api-reference/)
- [Creem Dashboard](https://www.creem.io/dashboard)
