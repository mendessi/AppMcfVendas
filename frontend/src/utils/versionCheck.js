import { APP_VERSION, UPDATE_CONFIG } from '../config';

/**
 * Verifica se a versão atual do aplicativo corresponde à versão armazenada.
 * @returns {Object} Um objeto contendo:
 *   - needsUpdate: boolean - Se precisa atualizar (true) ou não (false)
 *   - storedVersion: string - A versão armazenada anteriormente
 */
export function checkAppVersion() {
  const storedVersion = localStorage.getItem(UPDATE_CONFIG.versionKey);
  const lastCheck = localStorage.getItem(UPDATE_CONFIG.lastCheckKey);
  const now = new Date().getTime();
  
  // Verificar se é o momento de verificar atualizações
  const shouldCheck = !lastCheck || (now - parseInt(lastCheck, 10)) > UPDATE_CONFIG.checkInterval;
  
  // Sempre atualiza o timestamp do último check
  localStorage.setItem(UPDATE_CONFIG.lastCheckKey, now.toString());
  
  if (shouldCheck) {
    // Se não há versão armazenada, esta é a primeira visita
    if (!storedVersion) {
      localStorage.setItem(UPDATE_CONFIG.versionKey, APP_VERSION);
      return { needsUpdate: false, storedVersion: APP_VERSION };
    }
    
    // Se a versão é diferente, precisa atualizar
    if (storedVersion !== APP_VERSION) {
      return { needsUpdate: true, storedVersion };
    }
  }
  
  return { needsUpdate: false, storedVersion: storedVersion || APP_VERSION };
}

/**
 * Atualiza a versão armazenada para a versão atual.
 */
export function updateStoredVersion() {
  localStorage.setItem(UPDATE_CONFIG.versionKey, APP_VERSION);
}

/**
 * Força a atualização da página, limpando o cache.
 */
export function forceRefresh() {
  // Atualiza a versão no localStorage antes de recarregar
  updateStoredVersion();
  
  // Forçar recarga da página sem cache
  window.location.reload(true);
}
