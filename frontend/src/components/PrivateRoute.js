import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const empresa = localStorage.getItem('empresa_atual');

  if (!token || !empresa) {
    // Redireciona para o login se não houver token ou empresa
    return <Navigate to="/login" replace />;
  }

  // Se tiver token e empresa, renderiza o componente filho
  return children;
};

export default PrivateRoute; 