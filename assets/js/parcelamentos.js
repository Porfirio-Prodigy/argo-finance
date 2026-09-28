(function iniciarParcelamentos() {
    const container = document.getElementById("listaParcelamentos");
    if (!container) return;
    const resumo = document.getElementById("resumoParcelamentos");
    const busca = document.getElementById("buscaParcelamentos");
    const filtroStatus = document.getElementById("filtroStatusParcelamento");
    const filtroPessoa = document.getElementById("filtroPessoaParcelamento");
    const filtroCartao = document.getElementById("filtroCartaoParcelamento");
    const moeda = valor => formatarMoeda(Number(valor || 0));
    const escapar = valor => escaparHtml(String(valor ?? ""));
    const dataParcela = (origem, indice, diaVencimento) => {
        const [ano, mes, dia] = origem.split("-").map(Number);
        const data = new Date(ano, mes - 1 + indice, 1);
        const maxDia = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
        data.setDate(Math.min(Number(diaVencimento) || dia || 1, maxDia));
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    };
    const obterParcelas = divida => {
        const total = Math.max(1, Number(divida.parcelas || 1));
        const valorCentavos = Math.max(0, Math.round(Number(divida.valor || 0) * 100));
        const centavosBase = Math.floor(valorCentavos / total);
        const resto = valorCentavos % total;
        const parcelas = Array.from({ length: total }, (_, indice) => ({
            numero: indice + 1,
            total,
            centavos: centavosBase + (indice < resto ? 1 : 0),
            pagoCentavos: indice < Math.min(total, Math.max(0, Number(divida.parcelasPagasInicial) || 0))
                ? centavosBase + (indice < resto ? 1 : 0)
                : 0,
            pagamentos: [],
            vencimento: dataParcela(divida.data || (divida.inicio ? `${divida.inicio}-01` : "2000-01-01"), indice, divida.diaVencimento)
        }));
        const pagamentosSemParcela = [];
        (divida.pagamentos || []).forEach(pagamento => {
            const centavos = Math.max(0, Math.round(Number(pagamento.valor || 0) * 100));
            const numero = Number(pagamento.parcela);
            const parcela = Number.isInteger(numero) ? parcelas[numero - 1] : null;
            if (!parcela || centavos <= 0) { pagamentosSemParcela.push({ ...pagamento, centavos }); return; }
            const aplicado = Math.min(centavos, Math.max(0, parcela.centavos - parcela.pagoCentavos));
            parcela.pagoCentavos += aplicado;
            parcela.pagamentos.push(pagamento);
            if (centavos > aplicado) pagamentosSemParcela.push({ ...pagamento, centavos: centavos - aplicado });
        });
        pagamentosSemParcela.forEach(pagamento => {
            let restante = pagamento.centavos;
            for (const parcela of parcelas) {
                if (!restante) break;
                const aplicado = Math.min(restante, Math.max(0, parcela.centavos - parcela.pagoCentavos));
                if (!aplicado) continue;
                parcela.pagoCentavos += aplicado;
                parcela.pagamentos.push(pagamento);
                restante -= aplicado;
            }
        });
        return parcelas.map(parcela => {
            const valor = parcela.centavos / 100;
            const pago = Math.min(parcela.centavos, parcela.pagoCentavos) / 100;
            const restante = Math.max(0, parcela.centavos - parcela.pagoCentavos) / 100;
            const status = restante <= 0 ? "paga" : pago > 0 ? "parcial" : "pendente";
            return { ...parcela, valor, pago, restante, status };
        });
    };
    const formaPagamento = divida => {
        const forma = divida.formaPagamento || (divida.cartao ? "cartao_proprio" : "pix");
        if (forma.startsWith("cartao_")) return `Cartão · ${divida.cartao || "não informado"}`;
        return { pix: "Pix", boleto: "Boleto", dinheiro: "Dinheiro / físico" }[forma] || forma;
    };
    const statusLabel = { pendente: "Não paga", parcial: "Parcial", paga: "Paga" };

    const pessoaDaCompra = divida => (divida.responsavelCompra || "eu") === "outra_pessoa" ? (divida.pessoaCompra || "Outra pessoa") : "Eu";
    const cartaoDaCompra = divida => {
        if (divida.cartao) return divida.cartao;
        return (divida.formaPagamento || "").startsWith("cartao_") ? "Cartao sem nome" : "";
    };
    function atualizarOpcoes(select, opcoes, rotulo) {
        const selecionado = select.value;
        select.innerHTML = `<option value="">${rotulo}</option>` + opcoes.map(opcao => `<option value="${escapar(opcao)}">${escapar(opcao)}</option>`).join("");
        if (opcoes.includes(selecionado)) select.value = selecionado;
    }
    function renderizar() {
        const dividas = carregarDividas().filter(item => (item.tipo || "pontual") === "pontual" && Math.max(1, Number(item.parcelas || 1)) > 1);
        atualizarOpcoes(filtroPessoa, [...new Set(dividas.flatMap(divida => [pessoaDaCompra(divida), divida.titularCartao].filter(Boolean)))].sort((a, b) => a.localeCompare(b, "pt-BR")), "Todas as pessoas");
        atualizarOpcoes(filtroCartao, [...new Set(dividas.map(cartaoDaCompra).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), "Todos os cartoes");
        const todas = dividas.map(divida => ({ divida, parcelas: obterParcelas(divida) }));
        const todosOsItens = todas.flatMap(({ divida, parcelas }) => parcelas.map(parcela => ({ divida, parcela })));
        const restante = todosOsItens.reduce((soma, item) => soma + item.parcela.restante, 0);
        const parcelasAbertas = todosOsItens.filter(item => item.parcela.restante > 0).length;
        const comprometimento = todosOsItens.filter(item => item.parcela.restante > 0).reduce((soma, item) => soma + item.parcela.restante, 0);
        resumo.innerHTML = `<div class="resumo-card monthly-debt-total"><span class="resumo-label">Total restante</span><strong class="resumo-valor">${moeda(restante)}</strong></div><div class="resumo-card"><span class="resumo-label">Parcelas restantes</span><strong class="resumo-valor">${parcelasAbertas}</strong></div><div class="resumo-card"><span class="resumo-label">Comprometimento futuro</span><strong class="resumo-valor">${moeda(comprometimento)}</strong><p>Soma das parcelas ainda nao pagas</p></div>`;
        const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
        const filtrados = todas.filter(({ divida, parcelas }) => {
            const texto = `${divida.nome || ""} ${divida.cartao || ""} ${divida.titularCartao || ""} ${divida.categoria || ""} ${divida.grupoCompra || ""} ${divida.referenciaFatura || ""} ${pessoaDaCompra(divida)}`.toLocaleLowerCase("pt-BR");
            return (!termo || texto.includes(termo))
                && (!filtroPessoa.value || pessoaDaCompra(divida) === filtroPessoa.value || divida.titularCartao === filtroPessoa.value)
                && (!filtroCartao.value || cartaoDaCompra(divida) === filtroCartao.value)
                && (!filtroStatus.value || parcelas.some(parcela => parcela.status === filtroStatus.value));
        });
        const grupos = new Map();
        filtrados.forEach(item => {
            const divida = item.divida;
            const grupoInformado = String(divida.grupoCompra || "").trim();
            const chave = grupoInformado
                ? `${grupoInformado.toLocaleLowerCase("pt-BR")}|${cartaoDaCompra(divida)}|${divida.titularCartao || ""}|${pessoaDaCompra(divida)}`
                : `compra:${divida.id}`;
            if (!grupos.has(chave)) grupos.set(chave, { nome: grupoInformado || divida.nome || "Compra parcelada", itens: [] });
            grupos.get(chave).itens.push(item);
        });
        container.innerHTML = grupos.size ? [...grupos.values()].map(grupo => {
            const totalGrupo = grupo.itens.reduce((total, item) => total + Number(item.divida.valor || 0), 0);
            const quantidadeCompras = grupo.itens.length;
            const compras = grupo.itens.map(({ divida, parcelas }) => {
                const parcelasVisiveis = filtroStatus.value ? parcelas.filter(parcela => parcela.status === filtroStatus.value) : parcelas;
                const restanteCompra = parcelas.reduce((soma, parcela) => soma + parcela.restante, 0);
                const abertas = parcelas.filter(parcela => parcela.restante > 0).length;
                const forma = formaPagamento(divida);
                const conta = divida.contaNome ? `Conta - ${divida.contaNome}` : forma;
                const responsavel = pessoaDaCompra(divida);
                const titular = divida.titularCartao ? ` | titular ${divida.titularCartao}` : "";
                const referencia = divida.referenciaFatura ? `<p>Na fatura: <strong>${escapar(divida.referenciaFatura)}</strong></p>` : "";
                return `<article class="installment-card"><header class="installment-card-heading"><div><h3>${escapar(divida.nome || "Compra parcelada")}</h3><p>${moeda(Number(divida.valor || 0))} - ${parcelas.length} parcelas - ${escapar(responsavel)}${titular}</p><p>Categoria: ${escapar(divida.categoria || "Sem categoria")} - ${escapar(divida.cartao ? `Cartao ${divida.cartao}` : conta)}</p>${referencia}</div><div class="installment-card-summary"><strong>${moeda(restanteCompra)} restantes</strong><span>${abertas} parcela(s) em aberto</span></div></header><div class="tabela-responsiva"><table class="tabela-dividas installment-table"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Restante</th><th>Status</th><th>Conta / cartao</th><th>Categoria</th></tr></thead><tbody>${parcelasVisiveis.map(parcela => {
                    const contaPagamento = parcela.pagamentos.find(item => item.contaNome)?.contaNome;
                    const fonte = contaPagamento ? `Conta - ${contaPagamento}` : forma;
                    return `<tr><td>${parcela.numero}/${parcela.total}</td><td>${formatarData(parcela.vencimento)}</td><td>${moeda(parcela.valor)}</td><td>${moeda(parcela.pago)}</td><td>${moeda(parcela.restante)}</td><td><span class="payment-status is-${parcela.status === "paga" ? "paid" : parcela.status === "parcial" ? "partial" : "due"}">${statusLabel[parcela.status]}</span></td><td>${escapar(fonte)}</td><td>${escapar(divida.categoria || "Sem categoria")}</td></tr>`;
                }).join("")}</tbody></table></div><footer class="installment-card-actions"><span>Compra em ${formatarData(divida.data || `${divida.inicio}-01`)}</span>${abertas ? `<a class="button-link" href="dividas.html?antecipar=${encodeURIComponent(divida.id)}">Antecipar parcelas</a>` : '<span class="installment-complete">Parcelamento quitado</span>'}</footer></article>`;
            }).join("");
            return `<section class="installment-purchase-group"><header><div><h2>${escapar(grupo.nome)}</h2><p>${quantidadeCompras} compra(s) agrupada(s)</p></div><strong>${moeda(totalGrupo)}</strong></header>${compras}</section>`;
        }).join("") : '<p class="empty-state">Nenhum parcelamento corresponde aos filtros. Cadastre uma compra com mais de uma parcela em Dividas.</p>';
    }
    busca.addEventListener("input", renderizar);
    filtroStatus.addEventListener("change", renderizar);
    filtroPessoa.addEventListener("change", renderizar);
    filtroCartao.addEventListener("change", renderizar);
    window.addEventListener("storage", event => { if (!event.key || ["financeiro_dividas", "financeiro_contas"].includes(event.key)) renderizar(); });
    renderizar();
})();
