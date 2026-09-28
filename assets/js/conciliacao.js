(function iniciarConciliacaoFinanceira() {
    const resumo = document.getElementById("resumoConciliacao");
    const lista = document.getElementById("listaLancamentosConciliacao");
    const somentePendentes = document.getElementById("somentePendentesConciliacao");
    const tituloLancamentos = document.getElementById("tituloLancamentosConciliacao");
    if (!resumo || !lista) return;

    const chaveSaldos = "financeiro_conciliacao_saldos";
    const chaveConciliados = "financeiro_movimentos_conciliados";
    let contaSelecionada = null;
    const ler = (chave, padrao) => {
        try { return JSON.parse(localStorage.getItem(chave) || JSON.stringify(padrao)); }
        catch { return padrao; }
    };
    const getLancamentos = contaId => {
        const contas = carregarContas();
        const movimentos = [];
        const pagamentos = ler("financeiro_historico", []).filter(item => item.dividaId || String(item.tipo || "").toLocaleLowerCase("pt-BR").includes("pagamento de"));
        const idsPagamento = new Set(pagamentos.map(item => String(item.id)));
        pagamentos.filter(item => String(item.contaId) === String(contaId)).forEach(item => movimentos.push({
            id: `pagamento:${item.id}`, data: item.data || "", descricao: item.descricao || "Pagamento de dívida", tipo: "Saída", valor: -Number(item.valor || 0)
        }));
        carregarDividas().forEach(divida => (divida.pagamentos || []).forEach((item, indice) => {
            if (String(item.contaId) !== String(contaId) || (item.id && idsPagamento.has(String(item.id)))) return;
            movimentos.push({ id: `pagamento:${item.id || `${divida.id}:${indice}`}`, data: item.data || "", descricao: divida.nome || "Pagamento de dívida", tipo: "Saída", valor: -Number(item.valor || 0) });
        }));
        ler("financeiro_receitas", []).filter(item => String(item.contaId) === String(contaId)).forEach(item => movimentos.push({
            id: `receita:${item.id}`, data: item.data || "", descricao: item.descricao || "Receita", tipo: "Entrada", valor: Number(item.valor || 0)
        }));
        ler("financeiro_transferencias", []).forEach(item => {
            if (String(item.origemId) === String(contaId)) movimentos.push({ id: `transferencia:${item.id}:saida`, data: item.data || "", descricao: `Transferência para ${item.destinoNome || contas.find(c => String(c.id) === String(item.destinoId))?.nome || "outra conta"}`, tipo: "Transferência · saída", valor: -Number(item.valor || 0) });
            if (String(item.destinoId) === String(contaId)) movimentos.push({ id: `transferencia:${item.id}:entrada`, data: item.data || "", descricao: `Transferência de ${item.origemNome || contas.find(c => String(c.id) === String(item.origemId))?.nome || "outra conta"}`, tipo: "Transferência · entrada", valor: Number(item.valor || 0) });
        });
        return movimentos.sort((a, b) => b.data.localeCompare(a.data));
    };
    const getStatus = conta => {
        const saldos = ler(chaveSaldos, {});
        if (!Object.hasOwn(saldos, String(conta.id))) return { nome: "Pendente", classe: "pending", diferenca: null };
        const diferenca = Number(saldos[String(conta.id)]) - Number(conta.valor || 0);
        if (Math.abs(diferenca) >= 0.01) return { nome: "Divergente", classe: "divergent", diferenca };
        const conciliados = new Set(ler(chaveConciliados, []));
        const pendente = getLancamentos(conta.id).some(item => !conciliados.has(item.id));
        return pendente ? { nome: "Pendente", classe: "pending", diferenca } : { nome: "Conciliado", classe: "reconciled", diferenca };
    };
    const renderizarContas = () => {
        const contas = carregarContas();
        const saldos = ler(chaveSaldos, {});
        resumo.innerHTML = contas.length ? contas.map(conta => {
            const status = getStatus(conta);
            const saldoBanco = Object.hasOwn(saldos, String(conta.id)) ? Number(saldos[String(conta.id)]) : "";
            return `<article class="reconciliation-account ${contaSelecionada === String(conta.id) ? "is-selected" : ""}"><div class="reconciliation-account-heading"><div><h3>${escaparHtml(conta.nome || "Conta")}</h3><span>Saldo Argo: <strong>${formatarMoeda(Number(conta.valor || 0))}</strong></span></div><span class="reconciliation-status is-${status.classe}">${status.nome}</span></div><form class="reconciliation-form" data-conta-id="${escaparHtml(conta.id)}"><label>Saldo informado pelo banco <span class="reconciliation-bank-input"><span>R$</span><input aria-label="Saldo informado pelo banco para ${escaparHtml(conta.nome)}" type="number" step="0.01" value="${saldoBanco}" required></span></label><button type="submit">Comparar saldo</button></form>${status.diferenca !== null ? `<p class="reconciliation-difference">Diferença: <strong>${formatarMoeda(status.diferenca)}</strong> <span>(banco − Argo)</span></p>` : ""}<button type="button" class="reconciliation-open" data-conta-id="${escaparHtml(conta.id)}">Ver lançamentos desta conta</button></article>`;
        }).join("") : '<p class="empty-state">Cadastre uma conta para iniciar a conciliação.</p>';
        resumo.querySelectorAll(".reconciliation-form").forEach(form => form.addEventListener("submit", event => {
            event.preventDefault();
            const input = form.querySelector("input");
            const saldo = Number(input.value);
            if (!Number.isFinite(saldo)) { input.setCustomValidity("Informe um saldo bancário válido."); input.reportValidity(); input.setCustomValidity(""); return; }
            const saldosAtuais = ler(chaveSaldos, {});
            saldosAtuais[String(form.dataset.contaId)] = saldo;
            localStorage.setItem(chaveSaldos, JSON.stringify(saldosAtuais));
            contaSelecionada = String(form.dataset.contaId);
            renderizarContas();
            renderizarLancamentos();
        }));
        resumo.querySelectorAll(".reconciliation-open").forEach(button => button.addEventListener("click", () => {
            contaSelecionada = String(button.dataset.contaId);
            renderizarContas();
            renderizarLancamentos();
            lista.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }));
    };
    const renderizarLancamentos = () => {
        if (!contaSelecionada) return;
        const conta = carregarContas().find(item => String(item.id) === contaSelecionada);
        if (!conta) { contaSelecionada = null; return; }
        const conciliados = new Set(ler(chaveConciliados, []));
        const todosLancamentos = getLancamentos(conta.id);
        const pendentes = todosLancamentos.filter(item => !conciliados.has(item.id));
        const lancamentos = somentePendentes?.checked ? pendentes : todosLancamentos;
        tituloLancamentos.textContent = `${conta.nome} · ${pendentes.length} lançamento(s) pendente(s)`;
        lista.innerHTML = lancamentos.length ? `<div class="tabela-responsiva"><table class="tabela-dividas reconciliation-table"><thead><tr><th>Data</th><th>Movimento</th><th>Descrição</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>${lancamentos.map(item => {
            const conciliado = conciliados.has(item.id);
            return `<tr><td>${item.data ? formatarData(item.data) : "Sem data"}</td><td>${escaparHtml(item.tipo)}</td><td>${escaparHtml(item.descricao)}</td><td class="${item.valor < 0 ? "amount-out" : "amount-in"}">${formatarMoeda(item.valor)}</td><td><span class="reconciliation-status is-${conciliado ? "reconciled" : "pending"}">${conciliado ? "Conciliado" : "Pendente"}</span></td><td><button type="button" class="reconciliation-toggle" data-movimento-id="${escaparHtml(item.id)}">${conciliado ? "Reabrir" : "Conciliar"}</button></td></tr>`;
        }).join("")}</tbody></table></div>` : '<p class="empty-state">Nenhum lançamento encontrado para esta conta no período selecionado.</p>';
        lista.querySelectorAll(".reconciliation-toggle").forEach(button => button.addEventListener("click", () => {
            const itens = new Set(ler(chaveConciliados, []));
            if (itens.has(button.dataset.movimentoId)) itens.delete(button.dataset.movimentoId);
            else itens.add(button.dataset.movimentoId);
            localStorage.setItem(chaveConciliados, JSON.stringify([...itens]));
            renderizarLancamentos();
            renderizarContas();
        }));
    };
    somentePendentes?.addEventListener("change", renderizarLancamentos);
    window.addEventListener("storage", event => {
        if (["financeiro_contas", "financeiro_dividas", "financeiro_historico", "financeiro_receitas", "financeiro_transferencias", chaveSaldos, chaveConciliados].includes(event.key)) {
            renderizarContas();
            renderizarLancamentos();
        }
    });
    window.atualizarConciliacao = () => { renderizarContas(); renderizarLancamentos(); };
    renderizarContas();
})();
