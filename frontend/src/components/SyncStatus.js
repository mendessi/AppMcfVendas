import React, { useState, useEffect } from 'react';
import OrcamentoCache from '../services/OrcamentoCache';
import OrcamentoSync from '../services/OrcamentoSync';

const SyncStatus = () => {
    const [pendentes, setPendentes] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const atualizarPendentes = async () => {
            const orcamentosPendentes = await OrcamentoCache.obterPendentes();
            setPendentes(orcamentosPendentes.length);
        };

        // Atualizar status inicial
        atualizarPendentes();

        // Monitorar mudanças de conexão
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Monitorar mudanças no cache a cada 30 segundos
        const interval = setInterval(atualizarPendentes, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    if (pendentes === 0) return null;

    return (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            isOnline ? 'bg-blue-100' : 'bg-yellow-100'
        }`}>
            <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                    isOnline ? 'bg-blue-500' : 'bg-yellow-500'
                }`}></div>
                <span className={isOnline ? 'text-blue-700' : 'text-yellow-700'}>
                    {isOnline
                        ? `Sincronizando ${pendentes} orçamento${pendentes > 1 ? 's' : ''}...`
                        : `${pendentes} orçamento${pendentes > 1 ? 's' : ''} aguardando sincronização`
                    }
                </span>
            </div>
        </div>
    );
};

export default SyncStatus; 