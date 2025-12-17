'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

// 微信图标 SVG
function WechatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.49.49 0 0 1-.011-.153.49.49 0 0 1 .19-.401c1.527-1.124 2.5-2.786 2.5-4.636 0-3.238-3.006-6.06-7.061-6.107zm-2.746 3.148a.976.976 0 0 1 .968.984.976.976 0 0 1-.968.984.976.976 0 0 1-.969-.984.976.976 0 0 1 .969-.984zm4.844 0a.976.976 0 0 1 .969.984.976.976 0 0 1-.969.984.976.976 0 0 1-.968-.984.976.976 0 0 1 .968-.984z" />
    </svg>
  );
}

export interface WechatLoginButtonProps {
  callbackUrl?: string;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export function WechatLoginButton({
  callbackUrl = '/',
  loading: externalLoading,
  setLoading: externalSetLoading,
  className,
  variant = 'outline',
  size = 'default',
  children,
}: WechatLoginButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const loading = externalLoading ?? internalLoading;
  const setLoading = externalSetLoading ?? setInternalLoading;

  const handleWechatLogin = async () => {
    if (loading) return;

    setLoading(true);

    try {
      // 调用授权 API 获取微信授权 URL
      const response = await fetch(
        `/api/auth-ext/wechat/authorize?callbackUrl=${encodeURIComponent(callbackUrl)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get WeChat auth URL');
      }

      // 重定向到微信授权页面
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('WeChat login error:', error);
      toast.error(error instanceof Error ? error.message : '微信登录失败');
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('w-full gap-2', className)}
      disabled={loading}
      onClick={handleWechatLogin}
    >
      <WechatIcon className="h-4 w-4" />
      {children || <span>微信登录</span>}
    </Button>
  );
}
