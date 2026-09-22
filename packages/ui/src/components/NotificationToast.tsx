import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationToastProps {
  type: ToastType;
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  type,
  title,
  message,
  onDismiss,
}) => {
  const borderColors: Record<ToastType, string> = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#0284c7',
  };

  const bgColors: Record<ToastType, string> = {
    success: '#ecfdf5',
    error: '#fef2f2',
    warning: '#fffbeb',
    info: '#f0f9ff',
  };

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: bgColors[type],
        borderLeft: `4px solid ${borderColors[type]}`,
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: '400px',
        boxSizing: 'border-box',
      }}
    >
      <div>
        {title && (
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '2px' }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: '0.8rem', color: '#334155' }}>{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: '#64748b',
            marginLeft: '12px',
          }}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};
