import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  mask?: 'currency' | 'phone' | 'date';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  style,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cblx-text, #0f172a)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`cblx-input ${className}`}
        style={{
          padding: '8px 12px',
          fontSize: '0.95rem',
          borderRadius: 'var(--cblx-radius-md, 6px)',
          border: error ? '1px solid var(--cblx-spell-color, #ef4444)' : '1px solid var(--cblx-border, #cbd5e1)',
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--cblx-spell-color, #ef4444)' }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: '0.75rem', color: 'var(--cblx-text-muted, #64748b)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
