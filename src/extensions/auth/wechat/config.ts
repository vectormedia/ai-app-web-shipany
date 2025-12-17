/**
 * 微信扫码登录配置
 *
 * 环境变量说明:
 * - WECHAT_APP_ID: 微信开放平台应用 AppID
 * - WECHAT_APP_SECRET: 微信开放平台应用 AppSecret
 * - NEXT_PUBLIC_WECHAT_AUTH_ENABLED: 是否启用微信登录 ('true' | 'false')
 */

export const wechatConfig = {
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
  enabled: process.env.NEXT_PUBLIC_WECHAT_AUTH_ENABLED === 'true',

  // 微信开放平台 OAuth 相关 URL
  authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect',
  accessTokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
  userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',

  // 授权范围
  scope: 'snsapi_login',
};

export function getWechatCallbackUrl(baseUrl: string): string {
  return `${baseUrl}/api/auth-ext/wechat/callback`;
}

export function isWechatConfigured(): boolean {
  return !!(wechatConfig.appId && wechatConfig.appSecret);
}
