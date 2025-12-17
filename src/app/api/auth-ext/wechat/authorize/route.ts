/**
 * 微信登录授权 API - 生成授权 URL
 * GET /api/auth-ext/wechat/authorize
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { envConfigs } from '@/config';
import {
  wechatConfig,
  isWechatConfigured,
  generateAuthUrl,
  generateState,
} from '@/extensions/auth/wechat/server';

const STATE_COOKIE_NAME = 'wechat_oauth_state';
const CALLBACK_COOKIE_NAME = 'wechat_oauth_callback';

export async function GET(request: NextRequest) {
  // 检查微信登录是否已配置
  if (!isWechatConfigured()) {
    return NextResponse.json(
      { error: 'WeChat login is not configured' },
      { status: 500 }
    );
  }

  if (!wechatConfig.enabled) {
    return NextResponse.json(
      { error: 'WeChat login is disabled' },
      { status: 403 }
    );
  }

  // 获取回调 URL
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // 生成防 CSRF 的 state
  const state = generateState();

  // 生成微信授权 URL
  const baseUrl = envConfigs.app_url || request.nextUrl.origin;
  const authUrl = generateAuthUrl(baseUrl, state);

  // 设置 state cookie 用于验证回调
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 分钟有效
    path: '/',
  });

  // 保存回调 URL
  cookieStore.set(CALLBACK_COOKIE_NAME, callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  // 返回授权 URL，前端可以重定向或在新窗口打开
  return NextResponse.json({ authUrl });
}
