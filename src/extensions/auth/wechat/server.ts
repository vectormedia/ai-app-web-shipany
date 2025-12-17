/**
 * 微信扫码登录 - 服务端模块
 *
 * 仅在 API 路由中使用，不要在客户端组件中导入
 */

export {
  generateAuthUrl,
  getAccessToken,
  getUserInfo,
  isWechatError,
  generateState,
  type WechatAccessToken,
  type WechatUserInfo,
  type WechatError,
} from './api';

export { handleWechatLogin, createAuthCookie, type WechatLoginResult } from './service';

export { wechatConfig, isWechatConfigured, getWechatCallbackUrl } from './config';
