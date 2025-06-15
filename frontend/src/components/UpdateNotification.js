import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { APP_VERSION } from '../config';
import { forceRefresh } from '../utils/versionCheck';

/**
 * Componente que exibe uma notificação de atualização quando 
 * há uma nova versão do aplicativo disponível.
 */
const UpdateNotification = ({ storedVersion, darkMode }) => {
  return (
    <div className={`fixed bottom-0 inset-x-0 z-50 ${
      darkMode ? 'bg-blue-900 text-white' : 'bg-blue-500 text-white'
    } p-2 shadow-lg transform transition-transform duration-300`}>
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <FiRefreshCw className="h-5 w-5 mr-2 animate-spin-slow" />
          <div>
            <p className="text-sm font-medium">
              Nova versão disponível! ({APP_VERSION})
            </p>
            <p className="text-xs opacity-80">
              Você está usando a versão {storedVersion}
            </p>
          </div>
        </div>
        <button
          onClick={forceRefresh}
          className={`px-4 py-1.5 mt-2 sm:mt-0 rounded text-sm font-medium ${
            darkMode
              ? 'bg-white text-blue-900 hover:bg-gray-100'
              : 'bg-white text-blue-500 hover:bg-gray-100'
          } shadow transition-colors duration-200`}
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;
