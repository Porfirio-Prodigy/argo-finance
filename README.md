# Argo Finance

Aplicação estática de gestão financeira pessoal. O navegador executa a interface e guarda os registros em `localStorage`; o projeto não tem backend nem API.

## Estrutura

```text
/
├── index.html                 # Entrada e dashboard
├── ajuda.html                 # Guia para usuários
├── contas.html                # Contas, histórico e conciliação
├── dividas.html               # Despesas, pagamentos e recorrências
├── cartoes.html               # Compras associadas a cartões
├── parcelamentos.html         # Parcelas e antecipações
├── calendario.html            # Eventos e vencimentos
├── orcamento.html             # Limites por categoria
├── planejamento.html          # Fluxo de caixa e metas
├── emprestimos.html           # Valores emprestados e recebidos
├── investimentos.html         # Aportes e resgates
├── relatorios.html            # Relatórios para impressão/PDF
├── assets/
│   ├── css/style.css           # Estilos compartilhados
│   ├── images/favicon.svg      # Ícone
│   └── js/                     # Inicialização e lógica das telas
└── archive/legacy/             # Arquivos antigos, não usados pelo app
```

As páginas HTML permanecem na raiz para preservar os endereços diretos e a publicação estática. `vercel.json` publica essa raiz sem etapa de build.

## Abrir e publicar

- Localmente, abra `index.html` ou sirva a pasta com qualquer servidor de arquivos estáticos.
- Na Vercel, publique o repositório com a configuração atual. Não há dependências para instalar ou comando de build.

## Onde os dados ficam

Os dados são separados por navegador e endereço do site. As chaves principais do `localStorage` incluem `financeiro_contas`, `financeiro_dividas`, `financeiro_receitas`, `financeiro_investimentos`, `financeiro_emprestimos`, `financeiro_metas` e `financeiro_orcamentos`. O conteúdo não é sincronizado entre dispositivos.

O banco SQLite e o SQL em `archive/legacy/` são referências antigas; o app não os lê nem importa automaticamente. Consulte [ajuda.html](ajuda.html) para o guia de funcionalidades, exemplos e limites atuais do sistema.
