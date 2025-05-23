import React from 'react';
import ConnectionDiagnostic from '../components/ConnectionDiagnostic';

const DiagnosticPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 text-white">
          <h1 className="text-2xl font-bold">Diagnóstico do Sistema</h1>
          <p className="text-sm mt-1">Esta página ajuda a identificar problemas de conexão com o backend</p>
        </div>
        
        <div className="p-6">
          <p className="mb-4">
            Esta ferramenta testa diferentes aspectos da conexão entre o frontend e o backend,
            ajudando a identificar se os problemas estão relacionados ao servidor backend,
            configurações de CORS, ou acesso externo através do Cloudflare Tunnel.
          </p>
          
          <ConnectionDiagnostic />
          
          <div className="mt-8 border-t pt-4">
            <h2 className="text-xl font-semibold mb-4">Resolvendo Problemas Comuns</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">1. Servidor Backend Não Está Rodando</h3>
                <p className="ml-4 text-gray-700">
                  • Certifique-se de que o servidor Python está rodando na porta 8000<br />
                  • Execute o comando: <code className="bg-gray-100 px-2 py-1 rounded">cd backend && python -m uvicorn main:app --host 0.0.0.0 --reload</code>
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">2. Problemas de CORS</h3>
                <p className="ml-4 text-gray-700">
                  • Verifique se a origem do frontend está configurada nas origens permitidas<br />
                  • Verifique se os cabeçalhos CORS estão configurados corretamente<br />
                  • No acesso externo via Cloudflare, certifique-se de que a URL da API está apontando para o mesmo domínio
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">3. Problemas com Acesso Externo</h3>
                <p className="ml-4 text-gray-700">
                  • Verifique se o Cloudflare Tunnel está configurado corretamente<br />
                  • Certifique-se de que a URL da API no frontend está configurada para usar o mesmo domínio quando acessado externamente<br />
                  • Teste se o endpoint <code className="bg-gray-100 px-2 py-1 rounded">/ping</code> está acessível externamente
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">4. Problemas de Seleção de Empresa</h3>
                <p className="ml-4 text-gray-700">
                  • Verifique se o cabeçalho <code className="bg-gray-100 px-2 py-1 rounded">x-empresa-codigo</code> está sendo enviado corretamente<br />
                  • Certifique-se de que a empresa está sendo salva no localStorage após a seleção<br />
                  • Verifique se o backend está processando corretamente o código da empresa (via cabeçalho ou sessão)
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">5. Problemas de Autenticação</h3>
                <p className="ml-4 text-gray-700">
                  • Verifique se o token JWT está sendo enviado corretamente nos cabeçalhos<br />
                  • Verifique se o token JWT não está expirado<br />
                  • Certifique-se de que as informações do vendedor (USU_VEN_CODIGO) estão no token quando o nível é "VENDEDOR"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
