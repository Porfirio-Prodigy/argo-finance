# Argo Finance

Aplicação web para organizar contas, cartões, dívidas, pagamentos, empréstimos e investimentos. Os dados ficam no `localStorage` do navegador usado para abrir o app; não há banco de dados no servidor.

## Requisitos

- Node.js 24.x
- Navegador moderno
- Conexão com a internet para carregar o Bootstrap no relatório

## Como executar

Na pasta do projeto, rode:

```bash
npm start
```

Abra [http://127.0.0.1:8000](http://127.0.0.1:8000). O servidor Node serve os arquivos da aplicação; os dados são gravados no armazenamento local do navegador.

## Armazenamento e exclusão

Contas, dívidas e abatimentos, empréstimos e investimentos são mantidos no `localStorage`. Eles não são sincronizados entre navegadores ou dispositivos e podem ser removidos ao limpar os dados do navegador.

As telas de contas, cartões, dívidas, empréstimos e investimentos permitem excluir registros. A aplicação pede confirmação antes de apagar. Uma compra de cartão também é uma dívida e, por isso, excluir pela tela de cartões remove esse registro da lista de dívidas e seus abatimentos.

Os antigos arquivos SQLite não são mais usados pelo servidor. Eles não são importados automaticamente para o `localStorage`.
