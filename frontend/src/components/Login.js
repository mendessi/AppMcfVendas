import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // URL da API
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Faz a chamada à API de login
      const response = await axios.post(`${API_URL}/login`, {
        email,
        senha
      });

      // Armazena o token e informações do usuário
      const { access_token, usuario_id, usuario_nome, usuario_nivel } = response.data;
      
      // Salva o token no localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('usuario_id', usuario_id);
      localStorage.setItem('usuario_nome', usuario_nome);
      localStorage.setItem('usuario_nivel', usuario_nivel);
      
      // Configura o axios para incluir o token em todas as requisições futuras
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Notifica o componente pai sobre o login bem-sucedido
      onLogin({
        id: usuario_id,
        name: usuario_nome,
        role: usuario_nivel
      });
      
      // Redireciona para a seleção de empresa
      navigate('/selecionar-empresa');
    } catch (err) {
      console.error('Erro de login:', err);
      
      // Exibe mensagem de erro apropriada
      if (err.response) {
        switch (err.response.status) {
          case 401:
            setError(err.response.data.detail || 'Email ou senha incorretos');
            break;
          case 403:
            setError('Usuário inativo. Contate o suporte.');
            break;
          default:
            setError(`Erro ao fazer login: ${err.response.data.detail || 'Tente novamente'}`);
        }
      } else {
        setError('Erro de conexão com o servidor. Verifique sua internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">Força de Vendas</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu.email@exemplo.com"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Entre com seu email e senha cadastrados no sistema</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
