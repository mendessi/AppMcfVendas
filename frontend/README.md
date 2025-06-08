Projeto React com FastAPI
========================

Este frontend React foi desenvolvido para integração com backend FastAPI.
Principais libs: tailwindcss, react-icons, react-router-dom, recharts.

---

# 🚀 Guia Rápido de Instalação

### Dependências obrigatórias do frontend

O projeto AppMendes depende do pacote `react-icons` para exibir ícones como a lupa (FiSearch), carrinho (FiShoppingCart), filtro (FiFilter) e fechar (FiX) no catálogo de produtos e outros componentes.

Após clonar o repositório ou ao configurar o frontend, execute:

```sh
npm install react-icons
```

## 1. Pré-requisitos
- Node.js (recomendado: v18 ou superior)
- npm (geralmente já vem com o Node)

## 2. Clonar o projeto
```bash
git clone https://github.com/mendessi/AppMcfVendas.git
cd AppMcfVendas/frontend
```

## 3. Instalar dependências
```bash
npm install
```
Ou, para garantir tudo:
```bash
npm install $(cat requirements.txt)
```

## 4. Variáveis de ambiente
Se necessário, configure um arquivo `.env` com a URL da API:
```
REACT_APP_API_URL=https://sua-api-em-producao.com
```

## 5. Gerar build de produção
```bash
npm run build
```
Os arquivos finais estarão em `build/`.

## 6. Servir o build
Recomendado: usar um servidor web (Nginx, Apache) ou o pacote `serve`:
```bash
npm install -g serve
serve -s build
```

---

# 📋 Checklist rápido para produção
- [ ] Node e npm instalados
- [ ] Dependências instaladas (`npm install`)
- [ ] Variáveis de ambiente configuradas (se necessário)
- [ ] Build realizado (`npm run build`)
- [ ] Servindo a pasta `build` em produção

---

## 📜 Scripts Disponíveis

No diretório do projeto, você pode executar:

### `npm start`

Inicia o app no modo de desenvolvimento.\
Abra [http://localhost:3000](http://localhost:3000) para visualizá-lo no navegador.

A página será recarregada automaticamente sempre que você fizer alterações.\
Você também verá erros de lint no console, se houver.

### `npm test`

Executa o test runner no modo interativo.\
Consulte a seção sobre [execução de testes](https://facebook.github.io/create-react-app/docs/running-tests) para mais informações.

### `npm run build`

Cria a versão de produção do app na pasta `build`.\
O React será empacotado no modo de produção, com otimizações de desempenho.

O build será minificado e os nomes dos arquivos conterão hash.\
Seu app estará pronto para ser publicado!

Consulte a seção sobre [implantação](https://facebook.github.io/create-react-app/docs/deployment) para mais informações.

### `npm run eject`

**Atenção: esta é uma operação irreversível! Uma vez executado `eject`, não é possível voltar atrás.**

Se você não estiver satisfeito com as escolhas de ferramentas e configurações do Create React App, pode executar `eject` a qualquer momento. Esse comando copia todos os arquivos de configuração e dependências para dentro do seu projeto, dando controle total sobre eles.

Todos os comandos continuarão funcionando, mas agora serão executados a partir dos arquivos copiados. A partir daí, você estará por conta própria.

Você não é obrigado a usar o `eject`. O conjunto de recursos oferecido atende bem a pequenos e médios projetos, mas o `eject` existe para quem precisa de personalizações avançadas.

## 📚 Saiba Mais

Você pode aprender mais na [documentação do Create React App](https://facebook.github.io/create-react-app/docs/getting-started).

Para aprender React, acesse a [documentação oficial do React](https://reactjs.org/).

### Divisão de Código

Esta seção foi movida para: [Divisão de Código](https://facebook.github.io/create-react-app/docs/code-splitting)

### Análise do Tamanho do Bundle

Esta seção foi movida para: [Analisando o Tamanho do Bundle](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Criando um Progressive Web App

Esta seção foi movida para: [Criando um PWA](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Configuração Avançada

Esta seção foi movida para: [Configuração Avançada](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Implantação

Esta seção foi movida para: [Implantação](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` falha ao minificar

Esta seção foi movida para: [Falha ao minificar](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
