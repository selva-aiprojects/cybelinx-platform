import React, { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
  initialValue?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  className = '',
  initialValue = '',
}) => {
  const [value, setValue] = useState(initialValue);
  const debouncedQuery = useDebounce(value, debounceMs);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="search"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`cblx-search-input ${className}`}
        style={{
          width: '100%',
          padding: '8px 12px 8px 36px',
          fontSize: '0.9rem',
          borderRadius: 'var(--cblx-radius-md, 6px)',
          border: '1px solid var(--cblx-border, #cbd5e1)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--cblx-text-muted, #64748b)',
          pointerEvents: 'none',
          fontSize: '0.85rem',
        }}
      >
        🔍
      </span>
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--cblx-text-muted, #64748b)',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};
