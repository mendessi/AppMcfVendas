import React, { createContext, useState, useContext } from 'react';
import { FiX } from 'react-icons/fi';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    show: false,
    title: '',
    content: null,
    size: 'md',
    onClose: null
  });

  const showModal = ({
    title,
    content,
    size = 'md',
    onClose = null
  }) => {
    setModal({
      show: true,
      title,
      content,
      size,
      onClose: () => {
        if (onClose) onClose();
        setModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const closeModal = () => {
    if (modal.onClose) modal.onClose();
    setModal(prev => ({ ...prev, show: false }));
  };

  const getSize = (size) => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'lg':
        return 'max-w-4xl';
      case 'xl':
        return 'max-w-6xl';
      default:
        return 'max-w-2xl';
    }
  };

  return (
    <ModalContext.Provider value={{ showModal, closeModal }}>
      {children}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${getSize(modal.size)} w-full mx-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {modal.title}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-4">
              {modal.content}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export default ModalContext; 