/**
 * 微信扫码登录扩展模块
 *
 * 使用方法:
 * 1. 配置环境变量:
 *    - WECHAT_APP_ID: 微信开放平台应用 AppID
 *    - WECHAT_APP_SECRET: 微信开放平台应用 AppSecret
 *    - NEXT_PUBLIC_WECHAT_AUTH_ENABLED: 'true'
 *
 * 2. 在登录页面导入微信登录组件:
 *    import { WechatLoginButton } from '@/extensions/auth/wechat';
 *
 * 3. 或使用扩展版 SocialProviders:
 *    import { ExtendedSocialProviders } from '@/extensions/auth/wechat';
 */

// 配置（客户端安全）
export { wechatConfig, isWechatConfigured, getWechatCallbackUrl } from './config';

// 客户端组件导出
export {
  WechatLoginButton,
  ExtendedSocialProviders,
  ExtendedSignIn,
  ExtendedSignInForm,
  ExtendedSignModal,
  type WechatLoginButtonProps,
  type ExtendedSocialProvidersProps,
} from './components';

// 注意：服务端模块 (api.ts, service.ts) 只在 API 路由中直接导入使用
// 不要在客户端组件中导入它们
