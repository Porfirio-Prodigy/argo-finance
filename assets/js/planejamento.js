(function iniciarPlanejamento() {
    const horizonInput = document.getElementById("horizonteFluxoCaixa");
    const chart = document.getElementById("graficoFluxoCaixa");
    if (!horizonInput || !chart) return;

    const storage = {
        metas: "financeiro_metas",
        rendas: "financeiro_receitas_recorrentes",
        parcelasEmprestimos: "financeiro_parcelas_emprestimos"
    };
    const ler = (chave, padrao = []) => {
        try {
            const valor = JSON.parse(localStorage.getItem(chave) || JSON.stringify(padrao));
            return Array.isArray(valor) ? valor : padrao;
        } catch { return padrao; }
    };
    const salvar = (chave, valor) => localStorage.setItem(chave, JSON.stringify(valor));
    const hoje = () => {
        const agora = new Date();
        return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    };
    const iso = data => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    const formatarDataLocal = valor => {
        if (!valor) return "";
        const [ano, mes, dia] = valor.split("-").map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    };
    const escapar = valor => escaparHtml(String(valor || ""));

    function construirEventos(dias) {
        const inicio = hoje();
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + dias);
        const eventos = [];
        const entre = data => data >= inicio && data <= fim;
        const dataDe = (ano, mesIndex, dia) => new Date(ano, mesIndex, Math.min(dia, new Date(ano, mesIndex + 1, 0).getDate()));
        const mesInicio = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
        const quantidadeMeses = (fim.getFullYear() - mesInicio.getFullYear()) * 12 + fim.getMonth() - mesInicio.getMonth();

        const rendasRegistradas = ler(storage.rendas);
        const rendas = typeof carregarRendasRecorrentes === "function" ? carregarRendasRecorrentes() : rendasRegistradas;
        rendas.forEach(renda => {
            for (let deslocamento = 0; deslocamento <= quantidadeMeses; deslocamento++) {
                const data = dataDe(mesInicio.getFullYear(), mesInicio.getMonth() + deslocamento, Math.max(1, Math.min(31, Number(renda.dia) || 1)));
                const mesEvento = iso(data).slice(0, 7);
                const recebida = renda.contaId && ler("financeiro_receitas").some(receita => String(receita.contaId) === String(renda.contaId) && receita.data?.startsWith(mesEvento));
                if (entre(data) && !recebida) eventos.push({ data, nome: renda.nome, tipo: renda.origemContaSalario ? "Salário previsto" : "Renda mensal", valor: Number(renda.valor || 0), direcao: 1, grupo: "receita" });
            }
        });

        ler(storage.parcelasEmprestimos).forEach(agenda => {
            const emprestimo = ler("financeiro_emprestimos").find(item => String(item.id) === String(agenda.emprestimoId));
            if (!emprestimo || !agenda.proximoVencimento) return;
            let restante = Math.max(0, Number(emprestimo.valor || 0) - Number(emprestimo.pago || 0));
            let data = new Date(`${agenda.proximoVencimento}T12:00:00`);
            const dia = data.getDate();
            while (data < inicio) data = dataDe(data.getFullYear(), data.getMonth() + 1, dia);
            while (data <= fim && restante > 0) {
                if (entre(data)) {
                    const valor = Math.min(restante, Number(agenda.valorMensal || 0));
                    const emprestei = emprestimo.direcao === "emprestei";
                    eventos.push({ data: new Date(data), nome: `${emprestei ? "Receber de" : "Pagar a"} ${emprestimo.pessoa || "empréstimo"}`, tipo: "Parcela de empréstimo", valor, direcao: emprestei ? 1 : -1, grupo: "emprestimo" });
                    restante -= valor;
                }
                data = dataDe(data.getFullYear(), data.getMonth() + 1, dia);
            }
        });

        ler("financeiro_receitas").forEach(receita => {
            if (!receita.data || receita.contaId) return;
            const data = new Date(`${receita.data}T12:00:00`);
            if (entre(data)) eventos.push({ data, nome: receita.descricao || "Receita prevista", tipo: "Receita", valor: Number(receita.valor || 0), direcao: 1, grupo: "receita" });
        });

        carregarDividas().forEach(divida => {
            const origem = divida.data || (divida.inicio ? `${divida.inicio}-01` : "");
            if (!origem) return;
            const [anoInicio, mesInicioDivida] = origem.slice(0, 7).split("-").map(Number);
            const distanciaInicial = Math.max(0, (inicio.getFullYear() - anoInicio) * 12 + inicio.getMonth() + 1 - mesInicioDivida);
            const pontual = (divida.tipo || "pontual") === "pontual";
            const parcelas = Math.max(1, Number(divida.parcelas || 1));
            const totalCentavos = Math.max(0, Math.round(Number(divida.valor || 0) * 100));
            const centavosBase = Math.floor(totalCentavos / parcelas);
            const restantePorParcela = pontual
                ? new Map(calcularAbatimentoParcelas(divida, parcelas).map(item => [item.parcela, item.valor]))
                : null;
            for (let deslocamento = distanciaInicial; deslocamento <= quantidadeMeses + 1; deslocamento++) {
                if (pontual && deslocamento >= parcelas) break;
                const ano = anoInicio + Math.floor((mesInicioDivida - 1 + deslocamento) / 12);
                const mesIndex = (mesInicioDivida - 1 + deslocamento) % 12;
                const diaBase = Number(divida.diaVencimento) || Number(origem.slice(8, 10)) || 1;
                let data = dataDe(ano, mesIndex, diaBase);
                const dataBase = iso(data);
                if (data < inicio && ano === inicio.getFullYear() && mesIndex === inicio.getMonth()) data = new Date(inicio);
                if (!entre(data)) continue;
                const mesChave = `${ano}-${String(mesIndex + 1).padStart(2, "0")}`;
                if (!pontual && !recorrenciaAtivaNoMes(divida, mesChave)) continue;
                const excecao = pontual ? null : (divida.ocorrencias || []).find(item => item.dataBase === dataBase);
                if (excecao?.status === "cancelada") continue;
                if (excecao?.data) data = new Date(`${excecao.data}T12:00:00`);
                const numeroParcela = deslocamento + 1;
                const valorPrevisto = pontual ? (centavosBase + (numeroParcela <= totalCentavos % parcelas ? 1 : 0)) / 100 : Number(excecao?.valor ?? divida.valor ?? 0);
                const pagamentosDoMes = (divida.pagamentos || []).filter(item => item.data?.startsWith(mesChave));
                const pagos = pagamentosDoMes.reduce((soma, item) => soma + Number(item.valor || 0), 0);
                const aberto = pontual ? (restantePorParcela.get(numeroParcela) || 0) : Math.max(0, valorPrevisto - pagos);
                if (aberto <= 0) continue;
                const cartao = String(divida.formaPagamento || (divida.cartao ? "cartao_proprio" : "")).startsWith("cartao_");
                eventos.push({ data, nome: excecao?.nome || divida.nome || "Despesa", tipo: pontual ? `Parcela ${numeroParcela}/${parcelas}` : "Despesa recorrente", valor: aberto, direcao: -1, grupo: cartao ? "cartao" : "despesa" });
            }
        });

        ler("financeiro_investimentos").forEach(movimento => {
            if (!movimento.data) return;
            const data = new Date(`${movimento.data}T12:00:00`);
            if (!entre(data)) return;
            const resgate = movimento.tipo === "resgate";
            eventos.push({ data, nome: movimento.nome || "Investimento", tipo: resgate ? "Resgate previsto" : "Aporte previsto", valor: Number(movimento.valor || 0), direcao: resgate ? 1 : -1, grupo: "investimento" });
        });
        return { eventos: eventos.sort((a, b) => a.data - b.data), fim };
    }

    function desenharFluxo() {
        const dias = Number(horizonInput.value) || 30;
        const { eventos, fim } = construirEventos(dias);
        const saldoInicial = carregarContas().reduce((soma, conta) => soma + Number(conta.valor || 0), 0);
        const porDia = new Map();
        eventos.forEach(evento => {
            const chave = iso(evento.data);
            porDia.set(chave, (porDia.get(chave) || 0) + evento.valor * evento.direcao);
        });
        const saldoProjetadoHoje = saldoInicial + (porDia.get(iso(hoje())) || 0);
        const pontos = [{ data: hoje(), saldo: saldoProjetadoHoje }];
        let saldo = saldoProjetadoHoje;
        const primeiroNegativo = saldo < 0 ? [{ data: hoje(), saldo }] : [];
        let menorSaldo = saldo;
        for (let indice = 1; indice <= dias; indice++) {
            const data = hoje();
            data.setDate(data.getDate() + indice);
            saldo += porDia.get(iso(data)) || 0;
            pontos.push({ data, saldo });
            menorSaldo = Math.min(menorSaldo, saldo);
            if (saldo < 0 && !primeiroNegativo.length) primeiroNegativo.push({ data, saldo });
        }

        document.getElementById("saldoAtualFluxo").textContent = formatarMoeda(saldoInicial);
        document.getElementById("saldoFinalFluxo").textContent = formatarMoeda(saldo);
        document.getElementById("menorSaldoFluxo").textContent = formatarMoeda(menorSaldo);
        document.getElementById("periodoFluxoTexto").textContent = `Em ${formatarDataLocal(iso(fim))}`;
        const alerta = document.getElementById("alertaSaldoNegativo");
        if (primeiroNegativo.length) {
            alerta.classList.remove("hidden");
            alerta.textContent = `A projeção fica abaixo de zero em ${formatarDataLocal(iso(primeiroNegativo[0].data))}. Revise os compromissos e as rendas cadastradas.`;
        } else {
            alerta.classList.add("hidden");
            alerta.textContent = "";
        }

        const width = 900, height = 250, pad = { x: 54, y: 24 };
        const minValue = Math.min(0, ...pontos.map(ponto => ponto.saldo));
        const maxValue = Math.max(1, ...pontos.map(ponto => ponto.saldo));
        const range = maxValue - minValue || 1;
        const x = index => pad.x + index / (pontos.length - 1) * (width - pad.x * 2);
        const y = value => height - pad.y - (value - minValue) / range * (height - pad.y * 2);
        const coords = pontos.map((ponto, index) => `${x(index).toFixed(1)},${y(ponto.saldo).toFixed(1)}`).join(" ");
        const zeroY = y(0);
        const labelZero = formatarMoeda(minValue).replace(",00", "");
        const labelMax = formatarMoeda(maxValue).replace(",00", "");
        chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Saldo projetado entre ${formatarDataLocal(iso(hoje()))} e ${formatarDataLocal(iso(fim))}"><line x1="${pad.x}" y1="${zeroY}" x2="${width - pad.x}" y2="${zeroY}" class="cashflow-zero-line"/><polyline points="${coords}" class="cashflow-line"/><text x="${pad.x}" y="14" class="cashflow-label">${escapar(labelMax)}</text><text x="${pad.x}" y="${height - 4}" class="cashflow-label">${escapar(labelZero)}</text><text x="${pad.x}" y="${height - pad.y + 18}" class="cashflow-date">Hoje</text><text x="${width - pad.x}" y="${height - pad.y + 18}" class="cashflow-date" text-anchor="end">${formatarDataLocal(iso(fim))}</text></svg>`;

        const limiteProximos = new Date(hoje());
        limiteProximos.setDate(limiteProximos.getDate() + 45);
        const proximos = eventos.filter(evento => evento.data <= limiteProximos).slice(0, 7);
        const listaEventos = document.getElementById("eventosFluxoCaixa");
        listaEventos.innerHTML = `<h3>Próximos compromissos e entradas</h3>${proximos.length ? `<ul>${proximos.map(evento => `<li><span><strong>${escapar(formatarDataLocal(iso(evento.data)))}</strong> · ${escapar(evento.nome)} <small>${escapar(evento.tipo)}</small></span><b class="${evento.direcao > 0 ? "amount-in" : "amount-out"}">${evento.direcao > 0 ? "+" : "−"}${formatarMoeda(evento.valor)}</b></li>`).join("")}</ul>` : '<p class="empty-state">Nenhum compromisso futuro cadastrado neste período. Confira se suas despesas e rendas estão atualizadas.</p>'}`;
    }

    const formRenda = document.getElementById("formRendaRecorrente");
    function desenharRendas() {
        const lista = document.getElementById("listaRendasRecorrentes");
        const rendas = ler(storage.rendas);
        const exibidas = typeof carregarRendasRecorrentes === "function" ? carregarRendasRecorrentes() : rendas;
        lista.innerHTML = exibidas.length ? exibidas.map(renda => `<article><div><strong>${escapar(renda.nome)}</strong><span>${formatarMoeda(Number(renda.valor || 0))} · todo dia ${Number(renda.dia)}${renda.origemContaSalario ? " · prevista pela conta salário" : ""}</span></div>${renda.origemContaSalario ? "<a href=\"contas.html\">Editar conta</a>" : `<button type="button" class="btn-remover-renda" data-id="${escapar(renda.id)}">Remover</button>`}</article>`).join("") : '<p class="empty-state">Ainda não há renda mensal cadastrada. Se sua renda varia, deixe este espaço vazio.</p>';
        lista.querySelectorAll(".btn-remover-renda").forEach(button => button.addEventListener("click", () => {
            salvar(storage.rendas, rendas.filter(renda => String(renda.id) !== String(button.dataset.id)));
            desenharRendas(); desenharFluxo();
        }));
    }
    formRenda.addEventListener("submit", event => {
        event.preventDefault();
        const nome = document.getElementById("nomeRendaRecorrente").value.trim();
        const valor = Number(document.getElementById("valorRendaRecorrente").value);
        const dia = Number(document.getElementById("diaRendaRecorrente").value);
        if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isInteger(dia) || dia < 1 || dia > 31) return;
        const rendas = ler(storage.rendas);
        rendas.push({ id: crypto.randomUUID(), nome, valor, dia });
        salvar(storage.rendas, rendas);
        formRenda.reset();
        document.getElementById("diaRendaRecorrente").value = "1";
        desenharRendas(); desenharFluxo();
    });

    const formParcelaEmprestimo = document.getElementById("formParcelaEmprestimo");
    const selectEmprestimo = document.getElementById("emprestimoPlanejado");
    document.getElementById("dataParcelaEmprestimo").value = iso(hoje());
    function desenharParcelasEmprestimos() {
        const emprestimos = ler("financeiro_emprestimos");
        const abertos = emprestimos.filter(item => Number(item.valor || 0) > Number(item.pago || 0));
        const idsAbertos = new Set(abertos.map(item => String(item.id)));
        const agendas = ler(storage.parcelasEmprestimos).filter(item => idsAbertos.has(String(item.emprestimoId)));
        selectEmprestimo.innerHTML = '<option value="">Selecione</option>' + abertos.map(item => `<option value="${escapar(item.id)}">${escapar(item.pessoa)} · ${item.direcao === "emprestei" ? "a receber" : "a pagar"} · falta ${formatarMoeda(Number(item.valor) - Number(item.pago || 0))}</option>`).join("");
        document.getElementById("listaParcelasEmprestimos").innerHTML = agendas.length ? agendas.map(agenda => {
            const item = emprestimos.find(registro => String(registro.id) === String(agenda.emprestimoId));
            if (!item) return "";
            return `<article><div><strong>${escapar(item.pessoa)}</strong><span>${formatarMoeda(Number(agenda.valorMensal || 0))}/mês · próximo vencimento ${formatarDataLocal(agenda.proximoVencimento)}</span></div><button type="button" class="btn-remover-agenda-emprestimo" data-id="${escapar(agenda.emprestimoId)}">Remover previsão</button></article>`;
        }).join("") : '<p class="empty-state">Se tiver um empréstimo com parcelas, informe o próximo vencimento para considerá-lo no fluxo de caixa.</p>';
        document.querySelectorAll(".btn-remover-agenda-emprestimo").forEach(button => button.addEventListener("click", () => {
            salvar(storage.parcelasEmprestimos, ler(storage.parcelasEmprestimos).filter(item => String(item.emprestimoId) !== String(button.dataset.id)));
            desenharParcelasEmprestimos(); desenharFluxo();
        }));
    }
    selectEmprestimo.addEventListener("change", () => {
        const emprestimo = ler("financeiro_emprestimos").find(item => String(item.id) === String(selectEmprestimo.value));
        const agenda = ler(storage.parcelasEmprestimos).find(item => String(item.emprestimoId) === String(selectEmprestimo.value));
        const parcelas = Number(emprestimo?.parcelasCombinadas || 0);
        const valorCalculado = parcelas > 0 ? Math.ceil(Number(emprestimo.valor || 0) / parcelas * 100) / 100 : 0;
        document.getElementById("valorParcelaEmprestimo").value = agenda?.valorMensal || emprestimo?.valorParcela || valorCalculado || "";
        document.getElementById("dataParcelaEmprestimo").value = agenda?.proximoVencimento || iso(hoje());
    });
    formParcelaEmprestimo.addEventListener("submit", event => {
        event.preventDefault();
        const emprestimoId = selectEmprestimo.value;
        const valorMensal = Number(document.getElementById("valorParcelaEmprestimo").value);
        const proximoVencimento = document.getElementById("dataParcelaEmprestimo").value;
        const emprestimo = ler("financeiro_emprestimos").find(item => String(item.id) === String(emprestimoId));
        if (!emprestimo || !Number.isFinite(valorMensal) || valorMensal <= 0 || !proximoVencimento || new Date(`${proximoVencimento}T12:00:00`) < hoje()) return;
        const agendas = ler(storage.parcelasEmprestimos).filter(item => String(item.emprestimoId) !== String(emprestimoId));
        agendas.push({ emprestimoId, valorMensal, proximoVencimento });
        salvar(storage.parcelasEmprestimos, agendas);
        const emprestimos = ler("financeiro_emprestimos");
        const emprestimoAtualizado = emprestimos.find(item => String(item.id) === String(emprestimoId));
        if (emprestimoAtualizado) {
            emprestimoAtualizado.valorParcela = valorMensal;
            if (!Number(emprestimoAtualizado.parcelasCombinadas)) emprestimoAtualizado.parcelasCombinadas = Math.ceil(Number(emprestimoAtualizado.valor || 0) / valorMensal);
            salvar("financeiro_emprestimos", emprestimos);
        }
        formParcelaEmprestimo.reset();
        document.getElementById("dataParcelaEmprestimo").value = iso(hoje());
        desenharParcelasEmprestimos(); desenharFluxo();
    });
    horizonInput.addEventListener("change", desenharFluxo);

    const formMeta = document.getElementById("formMetaFinanceira");
    const modalMeta = document.getElementById("modalMetaFinanceira");
    const selectRelacionamento = document.getElementById("relacionamentoMeta");
    let metaEditando = null;
    function carregarRelacionamentos(valorAtual = "") {
        const opcoes = [];
        carregarContas().forEach(conta => opcoes.push({ id: `conta:${conta.id}`, nome: `Conta · ${conta.nome}` }));
        const nomesInvestidos = [...new Set(ler("financeiro_investimentos").map(item => item.nome).filter(Boolean))];
        nomesInvestidos.forEach(nome => opcoes.push({ id: `investimento:${nome}`, nome: `Investimento · ${nome}` }));
        selectRelacionamento.innerHTML = '<option value="">Não vincular</option>' + opcoes.map(opcao => `<option value="${escapar(opcao.id)}">${escapar(opcao.nome)}</option>`).join("");
        if (valorAtual && !opcoes.some(opcao => opcao.id === valorAtual)) selectRelacionamento.insertAdjacentHTML("beforeend", `<option value="${escapar(valorAtual)}">${escapar(valorAtual.replace(/^(conta|investimento):/, ""))}</option>`);
        selectRelacionamento.value = valorAtual;
    }
    const fecharModalMeta = () => { modalMeta.classList.add("hidden"); formMeta.reset(); metaEditando = null; };
    document.getElementById("btnNovaMeta").addEventListener("click", () => {
        metaEditando = null;
        formMeta.reset();
        document.getElementById("valorAtualMeta").value = "0";
        document.getElementById("aporteMeta").value = "0";
        document.getElementById("tituloModalMeta").textContent = "Nova meta";
        document.getElementById("btnSalvarMeta").textContent = "Salvar meta";
        carregarRelacionamentos();
        modalMeta.classList.remove("hidden");
        document.getElementById("nomeMeta").focus();
    });
    ["btnFecharMeta", "btnCancelarMeta"].forEach(id => document.getElementById(id).addEventListener("click", fecharModalMeta));
    function estimarConclusao(valorAtual, objetivo, aporte) {
        if (valorAtual >= objetivo) return "Meta atingida";
        if (aporte <= 0) return "Informe um aporte mensal para estimar";
        const meses = Math.ceil((objetivo - valorAtual) / aporte);
        if (meses > 120) return "Mais de 10 anos no ritmo atual";
        const data = hoje();
        data.setMonth(data.getMonth() + meses);
        return formatarDataLocal(iso(data));
    }
    function desenharMetas() {
        const lista = document.getElementById("listaMetasFinanceiras");
        const metas = ler(storage.metas);
        lista.innerHTML = metas.length ? metas.map(meta => {
            const objetivo = Number(meta.objetivo || 0), atual = Number(meta.atual || 0), aporte = Number(meta.aporte || 0);
            const percentual = objetivo > 0 ? Math.min(100, atual / objetivo * 100) : 0;
            const restante = Math.max(0, objetivo - atual);
            const mesesPrazo = meta.prazo ? Math.max(1, Math.ceil((new Date(`${meta.prazo}T12:00:00`) - hoje()) / (30.4375 * 86400000))) : 1;
            const aporteNecessario = restante === 0 ? 0 : restante / mesesPrazo;
            return `<article class="goal-card"><div class="goal-heading"><div><h3>${escapar(meta.nome)}</h3><p>${formatarMoeda(atual)} / ${formatarMoeda(objetivo)}</p></div><span class="goal-percent">${Math.round(percentual)}%</span></div><div class="goal-progress" role="progressbar" aria-valuenow="${Math.round(percentual)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da meta ${escapar(meta.nome)}"><span style="width:${percentual}%"></span></div><div class="goal-facts"><div><span>Falta</span><strong>${formatarMoeda(restante)}</strong></div><div><span>Aporte mensal desejado</span><strong>${formatarMoeda(aporte)}</strong></div><div><span>Para cumprir o prazo</span><strong>${formatarMoeda(aporteNecessario)}/mês</strong></div><div><span>Previsão no ritmo atual</span><strong>${escapar(estimarConclusao(atual, objetivo, aporte))}</strong></div></div>${meta.prazo ? `<p class="goal-deadline">Prazo: ${formatarDataLocal(meta.prazo)}${aporte < aporteNecessario ? " · o aporte atual está abaixo do necessário" : ""}</p>` : ""}${meta.relacionamento ? `<p class="goal-related">Relacionado a: ${escapar(meta.relacionamento.replace(/^(conta|investimento):/, ""))}</p>` : ""}${meta.descricao ? `<p class="goal-description">${escapar(meta.descricao)}</p>` : ""}<div class="goal-actions"><button type="button" class="goal-edit" data-id="${escapar(meta.id)}">Editar</button><button type="button" class="goal-delete" data-id="${escapar(meta.id)}">Excluir</button></div></article>`;
        }).join("") : '<p class="empty-state">Nenhuma meta cadastrada. Comece por um objetivo importante, como quitar uma dívida ou formar uma reserva.</p>';
        lista.querySelectorAll(".goal-edit").forEach(button => button.addEventListener("click", () => {
            const meta = ler(storage.metas).find(item => String(item.id) === String(button.dataset.id));
            if (!meta) return;
            metaEditando = meta.id;
            document.getElementById("nomeMeta").value = meta.nome;
            document.getElementById("objetivoMeta").value = meta.objetivo;
            document.getElementById("valorAtualMeta").value = meta.atual;
            document.getElementById("prazoMeta").value = meta.prazo;
            document.getElementById("aporteMeta").value = meta.aporte;
            document.getElementById("descricaoMeta").value = meta.descricao || "";
            document.getElementById("tituloModalMeta").textContent = "Editar meta";
            document.getElementById("btnSalvarMeta").textContent = "Salvar alterações";
            carregarRelacionamentos(meta.relacionamento || "");
            modalMeta.classList.remove("hidden");
        }));
        lista.querySelectorAll(".goal-delete").forEach(button => button.addEventListener("click", () => {
            const meta = ler(storage.metas).find(item => String(item.id) === String(button.dataset.id));
            if (!meta || !confirm(`Excluir a meta “${meta.nome}”?`)) return;
            salvar(storage.metas, ler(storage.metas).filter(item => String(item.id) !== String(button.dataset.id)));
            desenharMetas();
        }));
    }
    formMeta.addEventListener("submit", event => {
        event.preventDefault();
        const nome = document.getElementById("nomeMeta").value.trim();
        const objetivo = Number(document.getElementById("objetivoMeta").value);
        const atual = Number(document.getElementById("valorAtualMeta").value);
        const aporte = Number(document.getElementById("aporteMeta").value);
        const prazo = document.getElementById("prazoMeta").value;
        if (!nome || !Number.isFinite(objetivo) || objetivo <= 0 || !Number.isFinite(atual) || atual < 0 || !Number.isFinite(aporte) || aporte < 0 || !prazo) return;
        if (new Date(`${prazo}T12:00:00`) < hoje()) { alert("Escolha um prazo de hoje em diante."); return; }
        const metas = ler(storage.metas);
        const meta = { id: metaEditando || crypto.randomUUID(), nome, objetivo, atual, prazo, aporte, relacionamento: selectRelacionamento.value, descricao: document.getElementById("descricaoMeta").value.trim() };
        const atualizadas = metaEditando ? metas.map(item => String(item.id) === String(metaEditando) ? meta : item) : [...metas, meta];
        salvar(storage.metas, atualizadas);
        fecharModalMeta();
        desenharMetas();
    });

    window.addEventListener("storage", event => {
        if (!event.key || Object.values(storage).includes(event.key) || ["financeiro_contas", "financeiro_dividas", "financeiro_receitas", "financeiro_investimentos", "financeiro_emprestimos"].includes(event.key)) {
            desenharFluxo(); desenharRendas(); desenharParcelasEmprestimos(); desenharMetas();
        }
    });
    desenharFluxo();
    desenharRendas();
    desenharParcelasEmprestimos();
    desenharMetas();
})();
