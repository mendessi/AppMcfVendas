import React from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, onConfirm, title, message, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative w-full max-w-md transform overflow-hidden rounded-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } p-6 text-left shadow-xl transition-all`}>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FiAlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-lg font-medium leading-6">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`rounded-md ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              } p-1 focus:outline-none`}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="mt-2">
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              {message}
            </p>
          </div>

          {/* Botões */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal; 