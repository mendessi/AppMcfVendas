import React from 'react';
import { useParams } from 'react-router-dom';
import OrcamentoForm from './OrcamentoForm';

const Orcamento = ({ darkMode }) => {
  const { numero } = useParams();

  return (
    <div className={`p-6 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
      <OrcamentoForm numero={numero} darkMode={darkMode} />
    </div>
  );
};

export default Orcamento; 