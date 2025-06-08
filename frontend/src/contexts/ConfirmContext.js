import React, { createContext, useState, useContext } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [confirm, setConfirm] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning'
  });

  const showConfirm = ({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning'
  }) => {
    setConfirm({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirm(prev => ({ ...prev, show: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirm(prev => ({ ...prev, show: false }));
      },
      confirmText,
      cancelText,
      type
    });
  };

  const getColor = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-yellow-500 hover:bg-yellow-600';
    }
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <FiAlertTriangle className={`w-6 h-6 mr-2 ${
                confirm.type === 'danger' ? 'text-red-500' :
                confirm.type === 'success' ? 'text-green-500' :
                'text-yellow-500'
              }`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {confirm.title}
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {confirm.message}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={confirm.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {confirm.cancelText}
              </button>
              <button
                onClick={confirm.onConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${getColor(confirm.type)}`}
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export default ConfirmContext; 