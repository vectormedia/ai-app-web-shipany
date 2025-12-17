'use client';

/**
 * 扩展版 SocialProviders 组件
 *
 * 包装原有的 SocialProviders 并添加微信登录按钮
 * 完全非侵入式，不修改原有代码
 */

import { SocialProviders } from '@/shared/blocks/sign/social-providers';
import { WechatLoginButton } from './wechat-login';

export interface ExtendedSocialProvidersProps {
  configs: Record<string, string>;
  callbackUrl: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function ExtendedSocialProviders({
  configs,
  callbackUrl,
  loading,
  setLoading,
}: ExtendedSocialProvidersProps) {
  // 检查是否启用微信登录（从环境变量）
  const isWechatEnabled =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_WECHAT_AUTH_ENABLED === 'true'
      : configs.wechat_auth_enabled === 'true';

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* 原有的 Social Providers (Google, GitHub 等) */}
      <SocialProviders
        configs={configs}
        callbackUrl={callbackUrl}
        loading={loading}
        setLoading={setLoading}
      />

      {/* 微信登录按钮 */}
      {isWechatEnabled && (
        <WechatLoginButton
          callbackUrl={callbackUrl}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </div>
  );
}
