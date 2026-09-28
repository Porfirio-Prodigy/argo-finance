(function iniciarOrcamentos() {
    const form = document.getElementById("formOrcamentoCategoria");
    if (!form) return;
    const CHAVE = "financeiro_orcamentos";
    const periodo = document.getElementById("tipoPeriodoOrcamento");
    const mesInput = document.getElementById("mesOrcamento");
    const anoInput = document.getElementById("anoOrcamento");
    const hoje = new Date();
    const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    mesInput.value = mesHoje;
    anoInput.value = String(hoje.getFullYear());
    const ler = () => {
        try { const dados = JSON.parse(localStorage.getItem(CHAVE) || "[]"); return Array.isArray(dados) ? dados : []; }
        catch { return []; }
    };
    const salvar = dados => localStorage.setItem(CHAVE, JSON.stringify(dados));
    const mesExibido = () => periodo.value === "anual" ? `${anoInput.value}` : mesInput.value;
    const periodoLabel = () => periodo.value === "anual" ? `ano ${anoInput.value}` : mesInput.value;
    const corresponde = (orcamento, chave) => {
        if (orcamento.tipo === "anual") return chave.slice(0, 4) === String(orcamento.ano);
        if (orcamento.tipo === "recorrente") return chave.length === 4
            ? `${chave}-12` >= (orcamento.inicio || "0000-00")
            : chave >= (orcamento.inicio || "0000-00");
        return orcamento.mes === chave;
    };
    function realizado(chave, categoria) {
        const anual = periodo.value === "anual";
        return carregarDividas().reduce((total, divida) => {
            if (String(divida.categoria || "Sem categoria").trim().toLocaleLowerCase("pt-BR") !== categoria.toLocaleLowerCase("pt-BR")) return total;
            return total + (divida.pagamentos || []).filter(pagamento => anual
                ? pagamento.data?.startsWith(`${chave}-`)
                : pagamento.data?.startsWith(chave)
            ).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
        }, 0);
    }
    function renderizar() {
        document.getElementById("grupoAnoOrcamento").classList.toggle("hidden", periodo.value !== "anual");
        document.getElementById("grupoMesOrcamento").classList.toggle("hidden", periodo.value === "anual");
        const chave = mesExibido();
        const orcamentos = ler().filter(item => corresponde(item, chave));
        const categorias = [...new Set(orcamentos.map(item => item.categoria))];
        const linhas = categorias.map(categoria => {
            const associados = orcamentos.filter(item => item.categoria === categoria);
            const limite = associados.reduce((soma, item) => {
                let fator = 1;
                if (periodo.value === "anual" && item.tipo === "recorrente") {
                    const ano = Number(chave);
                    const inicio = item.inicio || `${ano}-01`;
                    fator = Math.max(0, 13 - (inicio.slice(0, 4) === String(ano) ? Number(inicio.slice(5, 7)) : 1));
                }
                return soma + Number(item.limite || 0) * fator;
            }, 0);
            const gasto = realizado(chave, categoria);
            const diferenca = limite - gasto;
            const percentual = limite > 0 ? gasto / limite * 100 : 0;
            const status = diferenca < 0 ? "Excedido" : percentual >= 80 ? "Atenção" : "Dentro do limite";
            const classe = diferenca < 0 ? "budget-over" : percentual >= 80 ? "budget-near" : "budget-ok";
            return { categoria, limite, gasto, diferenca, percentual, status, classe, ids: associados.map(item => item.id) };
        });
        const totalLimite = linhas.reduce((soma, linha) => soma + linha.limite, 0);
        const totalGasto = linhas.reduce((soma, linha) => soma + linha.gasto, 0);
        const totalDisponivel = totalLimite - totalGasto;
        document.getElementById("resumoOrcamento").innerHTML = `<div class="resumo-grid"><div class="resumo-card"><span class="resumo-label">Limite · ${escaparHtml(periodoLabel())}</span><strong class="resumo-valor">${formatarMoeda(totalLimite)}</strong></div><div class="resumo-card"><span class="resumo-label">Realizado</span><strong class="resumo-valor">${formatarMoeda(totalGasto)}</strong></div><div class="resumo-card ${totalDisponivel < 0 ? "budget-over" : ""}"><span class="resumo-label">${totalDisponivel < 0 ? "Acima do orçamento" : "Disponível"}</span><strong class="resumo-valor">${formatarMoeda(Math.abs(totalDisponivel))}</strong></div></div>`;
        const lista = document.getElementById("listaOrcamento");
        lista.innerHTML = linhas.length ? linhas.map(linha => `<tr><td>${escaparHtml(linha.categoria)}</td><td>${formatarMoeda(linha.limite)}</td><td>${formatarMoeda(linha.gasto)}</td><td class="${linha.diferenca < 0 ? "amount-out" : "amount-in"}">${linha.diferenca < 0 ? "−" : ""}${formatarMoeda(Math.abs(linha.diferenca))}</td><td><div class="budget-progress" role="progressbar" aria-valuenow="${Math.min(100, Math.round(linha.percentual))}" aria-valuemin="0" aria-valuemax="100"><span class="${linha.classe}" style="width:${Math.min(100, Math.max(0, linha.percentual))}%"></span></div><small>${Math.round(linha.percentual)}%</small></td><td><span class="budget-status ${linha.classe}">${linha.status}</span></td><td>${linha.ids.map(id => `<button type="button" class="btn-remover-orcamento" data-id="${escaparHtml(id)}" aria-label="Remover orçamento de ${escaparHtml(linha.categoria)}">Remover</button>`).join(" ")}</td></tr>`).join("") : '<tr><td colspan="7">Nenhuma categoria orçada neste período. Adicione um limite acima para começar.</td></tr>';
        lista.querySelectorAll(".btn-remover-orcamento").forEach(botao => botao.addEventListener("click", () => {
            salvar(ler().filter(item => String(item.id) !== String(botao.dataset.id)));
            renderizar();
        }));
        window.atualizarResumoOrcamentoDashboard?.();
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        const categoria = document.getElementById("categoriaOrcamento").value.trim();
        const limite = Number(document.getElementById("limiteOrcamento").value);
        if (!categoria || !Number.isFinite(limite) || limite <= 0) return;
        const item = { id: crypto.randomUUID(), categoria, limite, tipo: periodo.value };
        if (periodo.value === "anual") item.ano = Number(anoInput.value);
        else if (periodo.value === "recorrente") item.inicio = mesInput.value;
        else item.mes = mesInput.value;
        const todos = ler();
        const indice = todos.findIndex(atual => atual.tipo === item.tipo
            && String(atual.categoria || "").toLocaleLowerCase("pt-BR") === categoria.toLocaleLowerCase("pt-BR")
            && (item.tipo === "mensal" ? atual.mes === item.mes : item.tipo === "anual" ? Number(atual.ano) === item.ano : true));
        if (indice >= 0) todos[indice] = { ...todos[indice], ...item };
        else todos.push(item);
        salvar(todos);
        form.reset();
        renderizar();
    });
    document.getElementById("btnCopiarOrcamento").addEventListener("click", () => {
        if (periodo.value === "anual") { alert("Escolha uma visualização mensal para copiar o orçamento de um mês."); return; }
        const destino = prompt("Qual mês deve receber a cópia? Use AAAA-MM, por exemplo 2026-10.");
        if (!destino) return;
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(destino)) { alert("Informe o mês no formato AAAA-MM."); return; }
        const origem = ler().filter(item => corresponde(item, mesInput.value));
        if (!origem.length) { alert("Não há categorias orçadas neste mês para copiar."); return; }
        if (ler().some(item => item.tipo === "mensal" && item.mes === destino)
            && !confirm(`Já existem limites mensais em ${destino}. Substituí-los pela cópia?`)) return;
        let todos = ler().filter(item => !(item.tipo === "mensal" && item.mes === destino));
        todos.push(...origem.map(item => ({ id: crypto.randomUUID(), categoria: item.categoria, limite: Number(item.limite || 0), tipo: "mensal", mes: destino })));
        salvar(todos);
        periodo.value = "mensal";
        mesInput.value = destino;
        renderizar();
    });
    [periodo, mesInput, anoInput].forEach(input => input.addEventListener("change", renderizar));
    renderizar();
})();
