# Argo Finance

Aplicação web local para organizar contas, cartões, dívidas, empréstimos e investimentos. Os dados são persistidos em SQLite.

## Requisitos

- Node.js 24.x (`node:sqlite` é usado pelo servidor)
- Navegador moderno
- Conexão com a internet para carregar o Bootstrap no relatório

Não é necessário instalar dependências npm.

## Como executar

Na pasta do projeto, inicie o servidor:

```bash
npm start
```

Abra [http://127.0.0.1:8000](http://127.0.0.1:8000) no navegador e mantenha o servidor ativo durante o uso. Não abra os arquivos HTML diretamente.

## Funcionalidades

- **Visão geral:** saldos, resumo de dívidas e gráfico interativo de despesas por categoria.
- **Contas:** cadastro e consulta de contas e saldos.
- **Cartões:** acompanhamento das compras próprias e de terceiros, com gráfico mensal.
- **Dívidas:** cadastro de despesas e registro de pagamentos parciais, com saldo em aberto.
- **Empréstimos:** controle de valores a pagar e a receber.
- **Investimentos:** registro de aportes e resgates, com gráfico mensal.
- **Relatórios:** seleção das seções, período e opção de imprimir ou salvar como PDF.

Os gráficos permitem consultar valores ao passar o cursor, alternar séries pela legenda e abrir detalhes das barras disponíveis.

## Armazenamento

Na primeira inicialização, o servidor cria `financeiro.sqlite3` na pasta do projeto e aplica o esquema de [`emprestimos.sql`](emprestimos.sql). Contas, dívidas, pagamentos, empréstimos e investimentos são salvos na tabela `app_data`.

O app pode importar dados antigos do `localStorage` quando eles estiverem acessíveis para o mesmo endereço no navegador. Dados armazenados sob `file://` ou outro endereço não são compartilhados automaticamente com `http://127.0.0.1:8000`.

O banco permanece local neste computador. Para fazer uma cópia de segurança, pare o servidor e copie `financeiro.sqlite3` para um local seguro.

## Estrutura principal

```text
server.js          Servidor HTTP e API local
emprestimos.sql    Esquema SQLite da aplicação
script.js          Lógica das páginas, formulários e gráficos
style.css          Estilos responsivos
*.html             Páginas da aplicação
financeiro.sqlite3 Banco de dados criado na execução
```
