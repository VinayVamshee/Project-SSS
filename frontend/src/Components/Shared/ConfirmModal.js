import React from 'react';

/**
 * ConfirmModal — A custom confirmation modal to replace window.confirm.
 *
 * Props:
 *   isOpen      - boolean
 *   title       - string
 *   message     - string
 *   onConfirm   - function
 *   onCancel    - function
 *   confirmText - string (default: "Yes, Proceed")
 *   cancelText  - string (default: "Cancel")
 *   type        - 'danger' | 'warning' | 'primary' (default: 'primary')
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  type = 'primary'
}) {
  if (!isOpen) return null;

  const typeColor = type === 'danger' ? '#dc3545'
    : type === 'warning' ? '#ffc107'
      : 'var(--button-color, #0d6efd)';

  const typeHeaderColor = type === 'danger' ? '#f8d7da'
    : type === 'warning' ? '#fff3cd'
      : '#e2f0fe';

  const typeHeaderTextColor = type === 'danger' ? '#842029'
    : type === 'warning' ? '#664d03'
      : '#0b5ed7';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: '450px',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: typeHeaderColor,
            color: typeHeaderTextColor,
            padding: '16px 20px',
            fontSize: '1.1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: `1px solid ${type === 'danger' ? '#f5c2c7' : type === 'warning' ? '#ffecb5' : '#b6d4fe'}`
          }}
        >
          <i className={`fas ${type === 'danger' ? 'fa-triangle-exclamation' : type === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-question'}`}></i>
          {title || 'Confirmation Required'}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', color: '#495057', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message || 'Are you sure you want to proceed?'}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'end',
            gap: '10px'
          }}
        >
          <button
            onClick={onCancel}
            className="btn btn-sm btn-outline-secondary px-3 py-1.5 fw-semibold"
            style={{ borderRadius: '6px' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-sm text-white px-3 py-1.5 fw-semibold"
            style={{
              backgroundColor: typeColor,
              border: 'none',
              borderRadius: '6px'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
