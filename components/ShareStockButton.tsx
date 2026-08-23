'use client';

import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { useState } from 'react';
import { useToast } from './Toast';

interface ShareStockButtonProps {
  stockId: string;
  symbol: string;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}

function getStockUrl(stockId: string) {
  if (typeof window === 'undefined') {
    return `/stocks/${stockId}`;
  }

  return new URL(`/stocks/${stockId}`, window.location.origin).toString();
}

function copyWithTextareaFallback(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';

  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Copy command failed');
  }
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  copyWithTextareaFallback(text);
}

export function ShareStockButton({
  stockId,
  symbol,
  className = 'btn btn-secondary btn-sm',
  style,
  compact = false,
}: ShareStockButtonProps) {
  const toast = useToast();
  const [copying, setCopying] = useState(false);

  const handleShare = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (copying) return;

    setCopying(true);
    try {
      await copyText(getStockUrl(stockId));
      toast.show(`คัดลอกลิงก์ ${symbol} แล้ว`, 'success');
    } catch {
      toast.show('คัดลอกลิงก์ไม่สำเร็จ', 'error');
    } finally {
      setCopying(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={handleShare}
      onKeyDown={handleKeyDown}
      disabled={copying}
      aria-label={`คัดลอกลิงก์หุ้น ${symbol}`}
      title={`คัดลอกลิงก์หุ้น ${symbol}`}
    >
      {copying ? '...' : compact ? '↗ Share' : '↗ Share'}
    </button>
  );
}
