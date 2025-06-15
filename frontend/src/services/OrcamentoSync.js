import OrcamentoCache from './OrcamentoCache';
import api from '../services/api';  // Ajuste o caminho conforme sua estrutura

class OrcamentoSync {
    static isOnline = false;

    // Inicializar listeners de conexão
    static inicializar() {
        // Configurar listeners de conexão
        window.addEventListener('online', () => {
            console.log('Conexão restaurada. Iniciando sincronização...');
            this.isOnline = true;
            this.sincronizarPendentes();
        });

        window.addEventListener('offline', () => {
            console.log('Conexão perdida. Operando em modo offline...');
            this.isOnline = false;
        });

        // Verificar estado inicial
        this.isOnline = navigator.onLine;
        if (this.isOnline) {
            this.sincronizarPendentes();
        }
    }

    // Salvar orçamento (tenta online, senão salva offline)
    static async salvar(orcamento) {
        try {
            if (this.isOnline) {
                // Tenta salvar no servidor
                const response = await api.post('/orcamentos', orcamento);
                
                // Se salvou no servidor, salva no cache como sincronizado
                orcamento.status = 'sincronizado';
                orcamento.numero = response.data.numero;
                await OrcamentoCache.salvar(orcamento);
                
                return response.data;
            } else {
                // Modo offline: salva apenas no cache
                console.log('Salvando orçamento em modo offline');
                return await OrcamentoCache.salvar(orcamento);
            }
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            // Se der erro, salva no cache como pendente
            return await OrcamentoCache.salvar(orcamento);
        }
    }

    // Sincronizar orçamentos pendentes
    static async sincronizarPendentes() {
        try {
            const pendentes = await OrcamentoCache.obterPendentes();
            console.log(`Sincronizando ${pendentes.length} orçamentos pendentes...`);

            for (const orcamento of pendentes) {
                try {
                    // Tenta enviar para o servidor
                    const response = await api.post('/orcamentos', orcamento);
                    
                    // Atualiza status no cache
                    await OrcamentoCache.atualizarStatus(
                        orcamento.id,
                        'sincronizado',
                        response.data.numero
                    );

                    console.log(`Orçamento ${orcamento.id} sincronizado com sucesso`);
                } catch (error) {
                    console.error(`Erro ao sincronizar orçamento ${orcamento.id}:`, error);
                    await OrcamentoCache.atualizarStatus(orcamento.id, 'erro');
                }
            }
        } catch (error) {
            console.error('Erro na sincronização de orçamentos:', error);
        }
    }

    // Verificar status de conexão
    static estaOnline() {
        return this.isOnline;
    }
}

export default OrcamentoSync; 