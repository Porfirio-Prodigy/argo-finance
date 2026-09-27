# Argo Finance

Aplicação web estática para organizar contas, cartões, dívidas e abatimentos, empréstimos e investimentos. Toda a lógica roda no navegador, e os registros ficam no `localStorage`.

## Como abrir

- Localmente: abra `index.html` no navegador.
- Publicação: envie o projeto para uma hospedagem de sites estáticos, como a Vercel. O `vercel.json` publica os arquivos da pasta raiz sem etapa de build.

Não é necessário instalar Node.js nem dependências.

## Armazenamento

Os dados ficam no navegador e na origem (endereço) usados para abrir o app. Eles não são sincronizados entre dispositivos e podem ser apagados ao limpar os dados do navegador. Ao trocar o endereço de publicação, o navegador trata o `localStorage` como um espaço separado.

As telas de contas, cartões, dívidas, empréstimos e investimentos permitem excluir registros, com confirmação. Uma compra de cartão também é uma dívida; apagá-la remove também seus abatimentos.

Os arquivos SQLite antigos não são usados nem importados automaticamente para o `localStorage`.
