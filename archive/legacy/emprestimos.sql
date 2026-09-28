-- SQLite para persistência das quatro coleções da aplicação.
-- Cada chave identifica uma coleção e dados contém a lista de registros JSON.
CREATE TABLE IF NOT EXISTS app_data (
    chave TEXT PRIMARY KEY CHECK (chave IN (
        'financeiro_contas',
        'financeiro_dividas',
        'financeiro_emprestimos',
        'financeiro_investimentos'
    )),
    dados TEXT NOT NULL CHECK (json_valid(dados) AND json_type(dados) = 'array'),
    atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
