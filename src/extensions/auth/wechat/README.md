# 微信扫码登录扩展

这是一个**完全非侵入式**的微信扫码登录扩展模块，不需要修改任何原有代码。

## 前置条件

1. 在 [微信开放平台](https://open.weixin.qq.com/) 注册开发者账号
2. 创建网站应用，获取 AppID 和 AppSecret
3. 配置授权回调域名为你的应用域名

## 配置步骤

### 1. 添加环境变量

在 `.env.local` 文件中添加：

```bash
# 微信开放平台配置
WECHAT_APP_ID=你的微信AppID
WECHAT_APP_SECRET=你的微信AppSecret
NEXT_PUBLIC_WECHAT_AUTH_ENABLED=true
```

### 2. 在微信开放平台配置回调地址

授权回调域名设置为：`你的域名`（不带协议和端口）

回调 URL 为：`https://你的域名/api/auth-ext/wechat/callback`

## 使用方式

### 方式一：使用独立的微信登录按钮

在任何需要微信登录的页面中：

```tsx
import { WechatLoginButton } from '@/extensions/auth/wechat';

export default function MyPage() {
  return (
    <div>
      <WechatLoginButton callbackUrl="/" />
    </div>
  );
}
```

### 方式二：使用扩展版 SocialProviders（推荐）

创建一个新的登录页面或组件，使用 `ExtendedSocialProviders` 替换原有的 `SocialProviders`：

```tsx
// 例如创建 src/app/[locale]/(auth)/sign-in-ext/page.tsx
import { ExtendedSocialProviders } from '@/extensions/auth/wechat';

// ... 其他代码保持不变，只需将 SocialProviders 替换为 ExtendedSocialProviders
```

### 方式三：在现有登录页面旁边添加微信按钮

如果只想在现有登录页面添加微信登录，可以创建一个包装组件：

```tsx
// src/app/[locale]/(auth)/sign-in/wechat-addition.tsx
'use client';

import { WechatLoginButton } from '@/extensions/auth/wechat';

export function WechatAddition({ callbackUrl }: { callbackUrl: string }) {
  const isEnabled = process.env.NEXT_PUBLIC_WECHAT_AUTH_ENABLED === 'true';

  if (!isEnabled) return null;

  return <WechatLoginButton callbackUrl={callbackUrl} />;
}
```

## API 端点

扩展模块提供以下 API 端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth-ext/wechat/authorize` | GET | 获取微信授权 URL |
| `/api/auth-ext/wechat/callback` | GET | 处理微信授权回调 |

## 文件结构

```
src/extensions/auth/wechat/
├── index.ts                # 模块导出入口
├── config.ts               # 微信配置
├── api.ts                  # 微信 OAuth API 封装
├── service.ts              # 用户登录服务
├── components/
│   ├── index.ts
│   ├── wechat-login.tsx           # 微信登录按钮组件
│   └── extended-social-providers.tsx  # 扩展版社交登录组件

src/app/api/auth-ext/wechat/
├── authorize/route.ts      # 授权 API
└── callback/route.ts       # 回调处理 API
```

## 特性

- **完全非侵入式**：不修改任何原有代码文件
- **与 Better Auth 兼容**：使用相同的 session cookie 格式
- **自动创建用户**：首次微信登录自动创建用户账户
- **自动关联账户**：创建 wechat provider 的账户关联
- **新用户赠送积分**：复用原有的积分赠送逻辑
- **支持 unionid**：优先使用 unionid 作为唯一标识（如果有）

## 注意事项

1. 微信不提供用户邮箱，系统会使用 `openid@wechat.placeholder` 作为占位邮箱
2. 用户名默认使用微信昵称，如果获取不到则使用 "微信用户" + openid 后6位
3. 微信开放平台的网站应用需要审核通过才能使用扫码登录
4. 开发环境测试时，需要配置内网穿透或使用测试账号

## 更新源码时

由于所有代码都在 `src/extensions/auth/wechat/` 和 `src/app/api/auth-ext/` 目录下，更新 ShipAny 源码时：

1. 这些目录不会与原有代码冲突
2. 只需保留这些扩展目录即可
3. 如果需要迁移，只需复制这两个目录到新项目
