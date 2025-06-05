// Serviço para gerenciamento de cache de orçamentos
// Função utilitária para obter a chave do cache de orçamentos por empresa
const getEmpresa = () => localStorage.getItem('empresa_atual') || 'default';
const getStorageKey = () => `orcamentos_cache_${getEmpresa()}`;
const getRascunhoKey = () => `orcamento_rascunho_${getEmpresa()}`;

class OrcamentoCache {
    // Gerar ID único para orçamentos offline
    static gerarId() {
        return `orc_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Salvar rascunho do orçamento
    static async salvarRascunho(orcamento) {
        try {
            const timestamp = new Date().toISOString();
            
            // Se não tem ID, gera um novo
            if (!orcamento.id) {
                orcamento.id = this.gerarId();
            }
            
            orcamento.ultima_modificacao = timestamp;
            orcamento.status = 'rascunho';
            
            localStorage.setItem(getRascunhoKey(), JSON.stringify(orcamento));
            return orcamento;
        } catch (error) {
            console.error('Erro ao salvar rascunho:', error);
            throw new Error('Falha ao salvar rascunho');
        }
    }

    // Obter rascunho do orçamento
    static async obterRascunho() {
        try {
            const rascunho = localStorage.getItem(getRascunhoKey());
            return rascunho ? JSON.parse(rascunho) : null;
        } catch (error) {
            console.error('Erro ao obter rascunho:', error);
            return null;
        }
    }

    // Limpar rascunho
    static async limparRascunho() {
        try {
            localStorage.removeItem(getRascunhoKey());
        } catch (error) {
            console.error('Erro ao limpar rascunho:', error);
        }
    }

    // Salvar orçamento no cache
    static async salvar(orcamento) {
        try {
            const orcamentos = await this.obterTodos();
            const timestamp = new Date().toISOString();
            
            // Se não tem ID, gera um novo
            if (!orcamento.id) {
                orcamento.id = this.gerarId();
            }
            
            orcamento.ultima_modificacao = timestamp;
            orcamento.status = 'pendente';
            
            // Se já existe, atualiza
            const index = orcamentos.findIndex(o => o.id === orcamento.id);
            if (index >= 0) {
                orcamentos[index] = orcamento;
            } else {
                orcamentos.push(orcamento);
            }
            
            localStorage.setItem(getStorageKey(), JSON.stringify(orcamentos));
            return orcamento;
        } catch (error) {
            console.error('Erro ao salvar orçamento no cache:', error);
            throw new Error('Falha ao salvar orçamento no cache');
        }
    }

    // Obter todos os orçamentos do cache
    static async obterTodos() {
        try {
            const orcamentos = localStorage.getItem(getStorageKey());
            return orcamentos ? JSON.parse(orcamentos) : [];
        } catch (error) {
            console.error('Erro ao obter orçamentos do cache:', error);
            return [];
        }
    }

    // Obter orçamentos pendentes de sincronização
    static async obterPendentes() {
        try {
            const todos = await this.obterTodos();
            return todos.filter(orc => orc.status === 'pendente');
        } catch (error) {
            console.error('Erro ao obter orçamentos pendentes:', error);
            return [];
        }
    }

    // Atualizar status do orçamento
    static async atualizarStatus(id, status, numeroServidor = null) {
        try {
            const orcamentos = await this.obterTodos();
            const index = orcamentos.findIndex(orc => orc.id === id);
            
            if (index >= 0) {
                orcamentos[index].status = status;
                if (numeroServidor) {
                    orcamentos[index].numero = numeroServidor;
                }
                localStorage.setItem(getStorageKey(), JSON.stringify(orcamentos));
            }
        } catch (error) {
            console.error('Erro ao atualizar status do orçamento:', error);
            throw new Error('Falha ao atualizar status do orçamento');
        }
    }

    // Remover orçamento do cache
    static async remover(id) {
        try {
            const orcamentos = await this.obterTodos();
            const filtrados = orcamentos.filter(orc => orc.id !== id);
            localStorage.setItem(getStorageKey(), JSON.stringify(filtrados));
        } catch (error) {
            console.error('Erro ao remover orçamento do cache:', error);
            throw new Error('Falha ao remover orçamento do cache');
        }
    }

    // Limpar cache
    static async limpar() {
        try {
            localStorage.removeItem(getStorageKey());
        } catch (error) {
            console.error('Erro ao limpar cache de orçamentos:', error);
            throw new Error('Falha ao limpar cache de orçamentos');
        }
    }

    // Salvar um orçamento no cache
    static async salvarCache(orcamento) {
        try {
            // Obter cache atual
            const cacheAtual = await OrcamentoCache.listar();
            
            // Gerar ID único para o rascunho
            const id = `rascunho_${Date.now()}`;
            
            // Adicionar timestamp e id
            const orcamentoCache = {
                ...orcamento,
                id,
                timestamp: new Date().toISOString(),
                empresa: getEmpresa()
            };
            
            // Adicionar ao cache
            cacheAtual.push(orcamentoCache);
            
            // Salvar no localStorage
            localStorage.setItem(getStorageKey(), JSON.stringify(cacheAtual));
            
            return id;
        } catch (error) {
            console.error('Erro ao salvar orçamento no cache:', error);
            throw error;
        }
    }

    // Listar todos os orçamentos em cache
    static async listar() {
        try {
            const cache = localStorage.getItem(getStorageKey());
            return cache ? JSON.parse(cache) : [];
        } catch (error) {
            console.error('Erro ao listar orçamentos do cache:', error);
            return [];
        }
    }

    // Obter um orçamento específico do cache
    static async obter(id) {
        try {
            const cache = await OrcamentoCache.listar();
            return cache.find(o => o.id === id);
        } catch (error) {
            console.error('Erro ao obter orçamento do cache:', error);
            return null;
        }
    }

    // Remover um orçamento do cache
    static async removerCache(id) {
        try {
            const cache = await OrcamentoCache.listar();
            const novosOrcamentos = cache.filter(o => o.id !== id);
            localStorage.setItem(getStorageKey(), JSON.stringify(novosOrcamentos));
        } catch (error) {
            console.error('Erro ao remover orçamento do cache:', error);
            throw error;
        }
    }

    // Limpar todo o cache
    static async limparTudo() {
        try {
            localStorage.removeItem(getStorageKey());
            localStorage.removeItem(getRascunhoKey());
        } catch (error) {
            console.error('Erro ao limpar tudo:', error);
        }
    }
}

export default OrcamentoCache; 