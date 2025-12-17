/**
 * 微信登录回调 API
 * GET /api/auth-ext/wechat/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

import { envConfigs } from '@/config';
import {
  getAccessToken,
  getUserInfo,
  isWechatError,
  handleWechatLogin,
} from '@/extensions/auth/wechat/server';

const STATE_COOKIE_NAME = 'wechat_oauth_state';
const CALLBACK_COOKIE_NAME = 'wechat_oauth_callback';

/**
 * 对 session token 进行 HMAC 签名（与 Better Auth 兼容）
 * Better Auth 期望签名是 base64 格式（带 padding，长度 44）
 */
function signSessionToken(token: string, secret: string): string {
  // 使用标准 base64，然后转换为 URL 安全格式
  const hmac = crypto.createHmac('sha256', secret).update(token).digest('base64');
  // 转换为 URL 安全的 base64（替换 + 为 -，/ 为 _）
  const urlSafeHmac = hmac.replace(/\+/g, '-').replace(/\//g, '_');
  return `${token}.${urlSafeHmac}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE_NAME)?.value;
  const callbackUrl = cookieStore.get(CALLBACK_COOKIE_NAME)?.value || '/';

  // 清理 cookies
  cookieStore.delete(STATE_COOKIE_NAME);
  cookieStore.delete(CALLBACK_COOKIE_NAME);

  // 错误处理函数
  const redirectWithError = (error: string) => {
    const baseUrl = envConfigs.app_url || request.nextUrl.origin;
    const errorUrl = new URL('/sign-in', baseUrl);
    errorUrl.searchParams.set('error', error);
    return NextResponse.redirect(errorUrl);
  };

  // 验证参数
  if (!code) {
    return redirectWithError('missing_code');
  }

  if (!state || state !== savedState) {
    return redirectWithError('invalid_state');
  }

  try {
    // 1. 使用授权码获取 access_token
    const tokenResult = await getAccessToken(code);

    if (isWechatError(tokenResult)) {
      console.error('WeChat token error:', tokenResult);
      return redirectWithError('token_error');
    }

    // 2. 获取用户信息
    const userInfo = await getUserInfo(tokenResult.access_token, tokenResult.openid);

    if (isWechatError(userInfo)) {
      console.error('WeChat user info error:', userInfo);
      return redirectWithError('userinfo_error');
    }

    // 3. 处理登录（创建或查找用户，创建会话）
    const loginResult = await handleWechatLogin(userInfo, request);

    if (!loginResult.success || !loginResult.session) {
      console.error('WeChat login error:', loginResult.error);
      return redirectWithError('login_error');
    }

    // 4. 设置认证 Cookie 并重定向
    const baseUrl = envConfigs.app_url || request.nextUrl.origin;
    const redirectUrl = new URL(callbackUrl, baseUrl);

    const response = NextResponse.redirect(redirectUrl);

    // 对 session token 进行签名（与 Better Auth 兼容）
    const signedToken = signSessionToken(
      loginResult.session.token,
      envConfigs.auth_secret
    );

    console.log('=== WeChat Login Debug ===');
    console.log('Session token:', loginResult.session.token);
    console.log('Auth secret (first 10 chars):', envConfigs.auth_secret.substring(0, 10));
    console.log('Signed token:', signedToken);
    console.log('Redirect URL:', redirectUrl.toString());

    // 设置 Better Auth 兼容的 session cookie
    response.cookies.set('better-auth.session_token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: loginResult.session.expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WeChat callback error:', error);
    return redirectWithError('server_error');
  }
}
