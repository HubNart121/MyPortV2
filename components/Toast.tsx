'use client';

import { useState, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;
let toastFn: ((msg: string, type: 'success' | 'error') => void) | null = null;

export function useToast() {
  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastFn) toastFn(message, type);
  }, []);
  return { show };
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  toastFn = (message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
