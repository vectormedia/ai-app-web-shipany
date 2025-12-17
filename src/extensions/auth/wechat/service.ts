/**
 * 微信登录服务 - 处理用户创建和会话管理
 */

import { eq, and } from 'drizzle-orm';

import { db } from '@/core/db';
import * as schema from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { grantCreditsForNewUser } from '@/shared/models/credit';
import { WechatUserInfo } from './api';

const WECHAT_PROVIDER_ID = 'wechat';
const SESSION_EXPIRES_IN_DAYS = 7;

export interface WechatLoginResult {
  success: boolean;
  user?: typeof schema.user.$inferSelect;
  session?: typeof schema.session.$inferSelect;
  error?: string;
}

/**
 * 处理微信登录 - 创建或查找用户，创建会话
 */
export async function handleWechatLogin(
  wechatUser: WechatUserInfo,
  request?: Request
): Promise<WechatLoginResult> {
  try {
    const database = db();
    const openid = wechatUser.unionid || wechatUser.openid;

    // 1. 查找已存在的微信账户关联
    const existingAccount = await database
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.providerId, WECHAT_PROVIDER_ID),
          eq(schema.account.accountId, openid)
        )
      )
      .limit(1);

    let user: typeof schema.user.$inferSelect;

    if (existingAccount.length > 0) {
      // 用户已存在，获取用户信息
      const existingUser = await database
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, existingAccount[0].userId))
        .limit(1);

      if (existingUser.length === 0) {
        return { success: false, error: 'User not found' };
      }

      user = existingUser[0];

      // 更新用户头像（如果有变化）
      if (wechatUser.headimgurl && user.image !== wechatUser.headimgurl) {
        await database
          .update(schema.user)
          .set({ image: wechatUser.headimgurl })
          .where(eq(schema.user.id, user.id));
      }
    } else {
      // 新用户，创建用户和账户关联
      const userId = getUuid();
      const now = new Date();

      // 创建用户
      const newUser = {
        id: userId,
        name: wechatUser.nickname || `微信用户${openid.slice(-6)}`,
        email: `${openid}@wechat.placeholder`, // 微信不提供邮箱，使用占位
        emailVerified: false,
        image: wechatUser.headimgurl || null,
        createdAt: now,
        updatedAt: now,
      };

      await database.insert(schema.user).values(newUser);

      // 创建账户关联
      const accountId = getUuid();
      await database.insert(schema.account).values({
        id: accountId,
        accountId: openid,
        providerId: WECHAT_PROVIDER_ID,
        userId: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 获取创建的用户
      const createdUser = await database
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1);

      user = createdUser[0];

      // 为新用户赠送积分
      try {
        await grantCreditsForNewUser(user);
      } catch (e) {
        console.log('grant credits for new wechat user failed', e);
      }
    }

    // 2. 创建会话
    const sessionId = getUuid();
    const sessionToken = getUuid();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    // 获取请求信息
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        null;
      userAgent = request.headers.get('user-agent') || null;
    }

    await database.insert(schema.session).values({
      id: sessionId,
      token: sessionToken,
      userId: user.id,
      expiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress,
      userAgent,
    });

    // 获取创建的会话
    const createdSession = await database
      .select()
      .from(schema.session)
      .where(eq(schema.session.id, sessionId))
      .limit(1);

    return {
      success: true,
      user,
      session: createdSession[0],
    };
  } catch (error) {
    console.error('Wechat login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 创建认证 Cookie
 */
export function createAuthCookie(sessionToken: string, expiresAt: Date): string {
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  return `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
