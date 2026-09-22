import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  charLimit?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  charLimit,
  value,
  id,
  className = '',
  rows = 4,
  style,
  ...props
}) => {
  const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const currentLength = typeof value === 'string' ? value.length : 0;

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
      <textarea
        id={inputId}
        value={value}
        rows={rows}
        className={`cblx-textarea ${className}`}
        style={{
          padding: '10px 12px',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          borderRadius: 'var(--cblx-radius-md, 6px)',
          border: error ? '1px solid var(--cblx-spell-color, #ef4444)' : '1px solid var(--cblx-border, #cbd5e1)',
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          resize: 'vertical',
        }}
        {...props}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {error ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--cblx-spell-color, #ef4444)' }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--cblx-text-muted, #64748b)' }}>
            {helperText}
          </span>
        ) : <span />}
        {charLimit && (
          <span style={{ fontSize: '0.75rem', color: 'var(--cblx-text-muted, #64748b)' }}>
            {currentLength}/{charLimit}
          </span>
        )}
      </div>
    </div>
  );
};
