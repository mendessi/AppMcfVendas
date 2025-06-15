import React, { useState, useEffect } from 'react';
import OrcamentoCache from '../services/OrcamentoCache';

const RascunhoDebug = ({ darkMode }) => {
    const [rascunho, setRascunho] = useState(null);

    useEffect(() => {
        const carregarRascunho = async () => {
            const dados = await OrcamentoCache.obterRascunho();
            setRascunho(dados);
        };

        carregarRascunho();
        
        // Atualizar a cada 2 segundos
        const interval = setInterval(carregarRascunho, 2000);
        
        return () => clearInterval(interval);
    }, []);

    if (!rascunho) return null;

    return (
        <div className={`fixed bottom-4 left-4 p-4 rounded-lg shadow-lg ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
            <h3 className="font-bold mb-2">Rascunho Atual:</h3>
            <div className="text-sm">
                <p>ID: {rascunho.id || 'N/A'}</p>
                <p>Cliente: {rascunho.cliente?.nome || 'Não selecionado'}</p>
                <p>Produtos: {rascunho.produtos?.length || 0}</p>
                <p>Última modificação: {new Date(rascunho.ultima_modificacao).toLocaleString()}</p>
            </div>
            <button
                onClick={() => OrcamentoCache.limparRascunho()}
                className={`mt-2 px-2 py-1 text-xs rounded ${
                    darkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
            >
                Limpar Rascunho
            </button>
        </div>
    );
};

export default RascunhoDebug; 