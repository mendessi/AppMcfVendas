import React, { useEffect } from 'react';

const Toast = ({ message, onClose, darkMode }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 5000); // 5 segundos
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: darkMode ? '#23272f' : '#e53e3e',
      color: '#fff',
      padding: '20px 40px',
      borderRadius: 12,
      boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
      zIndex: 99999,
      minWidth: 260,
      maxWidth: '90vw',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: 18,
      letterSpacing: 0.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }}>
      <span style={{flex: 1}}>{message}</span>
      <button onClick={onClose} style={{
        marginLeft: 16,
        background: darkMode ? '#444' : '#fff',
        border: 'none',
        color: darkMode ? '#fff' : '#e53e3e',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: 22,
        borderRadius: 6,
        padding: '2px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
      }}>×</button>
    </div>
  );
};

export default Toast; 