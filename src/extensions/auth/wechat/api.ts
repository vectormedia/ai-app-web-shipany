/**
 * 微信 OAuth API 封装
 */

import { wechatConfig, getWechatCallbackUrl } from './config';

export interface WechatAccessToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

export interface WechatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

export interface WechatError {
  errcode: number;
  errmsg: string;
}

/**
 * 生成微信授权 URL（用于扫码登录）
 */
export function generateAuthUrl(baseUrl: string, state: string): string {
  const params = new URLSearchParams({
    appid: wechatConfig.appId,
    redirect_uri: getWechatCallbackUrl(baseUrl),
    response_type: 'code',
    scope: wechatConfig.scope,
    state: state,
  });

  return `${wechatConfig.authorizeUrl}?${params.toString()}#wechat_redirect`;
}

/**
 * 使用授权码获取 access_token
 */
export async function getAccessToken(
  code: string
): Promise<WechatAccessToken | WechatError> {
  const params = new URLSearchParams({
    appid: wechatConfig.appId,
    secret: wechatConfig.appSecret,
    code: code,
    grant_type: 'authorization_code',
  });

  const response = await fetch(`${wechatConfig.accessTokenUrl}?${params.toString()}`);
  const data = await response.json();

  return data;
}

/**
 * 获取微信用户信息
 */
export async function getUserInfo(
  accessToken: string,
  openid: string
): Promise<WechatUserInfo | WechatError> {
  const params = new URLSearchParams({
    access_token: accessToken,
    openid: openid,
    lang: 'zh_CN',
  });

  const response = await fetch(`${wechatConfig.userInfoUrl}?${params.toString()}`);
  const data = await response.json();

  return data;
}

/**
 * 检查是否为错误响应
 */
export function isWechatError(data: any): data is WechatError {
  return typeof data.errcode === 'number' && data.errcode !== 0;
}

/**
 * 生成随机 state 用于防止 CSRF
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
