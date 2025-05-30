import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import OrcamentosList from './components/OrcamentosList';
import Orcamento from './components/Orcamento';
import ClientesList from './components/ClientesList';
import Cliente from './components/Cliente';
import ProdutosList from './components/ProdutosList';
import Produto from './components/Produto';
import Configuracoes from './components/Configuracoes';
import NotFound from './components/NotFound';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/orcamentos"
          element={
            <PrivateRoute>
              <OrcamentosList />
            </PrivateRoute>
          }
        />

        <Route
          path="/orcamentos/novo"
          element={
            <PrivateRoute>
              <Orcamento />
            </PrivateRoute>
          }
        />

        <Route
          path="/orcamentos/:numero"
          element={
            <PrivateRoute>
              <Orcamento />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <PrivateRoute>
              <ClientesList />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes/novo"
          element={
            <PrivateRoute>
              <Cliente />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes/:codigo"
          element={
            <PrivateRoute>
              <Cliente />
            </PrivateRoute>
          }
        />

        <Route
          path="/produtos"
          element={
            <PrivateRoute>
              <ProdutosList />
            </PrivateRoute>
          }
        />

        <Route
          path="/produtos/novo"
          element={
            <PrivateRoute>
              <Produto />
            </PrivateRoute>
          }
        />

        <Route
          path="/produtos/:codigo"
          element={
            <PrivateRoute>
              <Produto />
            </PrivateRoute>
          }
        />

        <Route
          path="/configuracoes"
          element={
            <PrivateRoute>
              <Configuracoes />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes; 