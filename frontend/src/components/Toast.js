import React, { useEffect } from 'react';
import { FiCheck, FiAlertTriangle, FiX } from 'react-icons/fi';

const Toast = ({ 
  message, 
  type = 'success', 
  onClose, 
  darkMode = false,
  duration = 3000,
  position = 'bottom-right'
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
      default:
        return 'bottom-4 right-4';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck className="w-5 h-5" />;
      case 'warning':
      case 'error':
        return <FiAlertTriangle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getColors = () => {
    if (darkMode) {
      switch (type) {
        case 'success':
          return 'bg-green-900/30 text-green-400 border-green-800';
        case 'warning':
          return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
        case 'error':
          return 'bg-red-900/30 text-red-400 border-red-800';
        default:
          return 'bg-gray-800 text-gray-300 border-gray-700';
      }
    } else {
      switch (type) {
        case 'success':
          return 'bg-green-50 text-green-800 border-green-200';
        case 'warning':
          return 'bg-yellow-50 text-yellow-800 border-yellow-200';
        case 'error':
          return 'bg-red-50 text-red-800 border-red-200';
        default:
          return 'bg-white text-gray-800 border-gray-200';
      }
    }
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-50 animate-fade-in-up`}>
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${getColors()}`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-4 focus:outline-none hover:opacity-75"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast; 