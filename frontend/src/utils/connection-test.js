/**
 * Utilitário para testar a conexão com o backend em diferentes ambientes
 */

// Função para testar a conexão com o backend
const testBackendConnection = async (baseUrl = null) => {
  try {
    // Se não foi fornecida uma URL base, usar a configuração atual
    const url = baseUrl || (window.location.hostname.includes('mendessolucao.site') || 
                         window.location.hostname.includes('ngrok.io'))
      ? `${window.location.protocol}//${window.location.hostname}/ping`
      : 'http://localhost:8000/ping';
    
    console.log(`Testando conexão com: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data,
      responseTime,
      url,
      status: response.status
    };
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return {
      success: false,
      error: error.message,
      url: baseUrl
    };
  }
};

// Função para testar conexão com diferentes URLs
const testMultipleConnections = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    local: null,
    external: null,
    cloud: null,
    current: null
  };
  
  // Testar conexão usando a configuração atual
  results.current = await testBackendConnection();
  
  // Testar conexão local
  results.local = await testBackendConnection('http://localhost:8000/ping');
  
  // Testar conexão com Cloudflare
  if (window.location.hostname.includes('mendessolucao.site')) {
    results.cloud = await testBackendConnection(`${window.location.protocol}//app.mendessolucao.site/ping`);
  }
  
  // Testar conexão com External Test API
  const externalApiUrl = window.location.hostname.includes('mendessolucao.site')
    ? `${window.location.protocol}//${window.location.hostname}/teste-externo`
    : 'http://localhost:8000/teste-externo';
  
  try {
    const response = await fetch(externalApiUrl);
    const text = await response.text();
    results.external = {
      success: response.ok,
      data: text,
      url: externalApiUrl,
      status: response.status
    };
  } catch (error) {
    results.external = {
      success: false,
      error: error.message,
      url: externalApiUrl
    };
  }
  
  console.log('Resultados dos testes de conexão:', results);
  return results;
};

// Exportar as funções de teste
export { testBackendConnection, testMultipleConnections };
