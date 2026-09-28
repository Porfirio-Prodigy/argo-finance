const STORAGE_KEY = "financeiro_contas";

// =========================
// FUNÇÕES GERAIS
// =========================

function formatarMoeda(valor) {

    return valor.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


function carregarContas() {

    return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || [];

}


function salvarContas(contas) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(contas)
    );

}


// =========================
// VISÃO GERAL
// =========================

function carregarVisaoGeral() {

    const contas = carregarContas();


    const receitaTotal =
        contas.reduce(
            (total, conta) =>
                total + conta.valor,
            0
        );


    const investimentos =
        contas
            .filter(
                conta =>
                    conta.tipo === "Investimento"
            )
            .reduce(
                (total, conta) =>
                    total + conta.valor,
                0
            );
    const movimentosInvestimentos = JSON.parse(localStorage.getItem("financeiro_investimentos") || "[]");
    const saldoMovimentosInvestimentos = movimentosInvestimentos.reduce((total, item) =>
        total + (item.tipo === "resgate" ? -Number(item.valor || 0) : Number(item.valor || 0)), 0);
    const totalInvestido = movimentosInvestimentos.length ? saldoMovimentosInvestimentos : investimentos;


    const receitaLiquida =
        receitaTotal - investimentos;


    const dividas = JSON.parse(localStorage.getItem("financeiro_dividas") || "[]");
    const somarTipo = tipo => dividas
        .filter(divida => (divida.tipo || "pontual") === tipo)
        .reduce((total, divida) => total + (tipo === "pontual"
            ? Math.max(0, Number(divida.valor || 0) - (divida.pagamentos || []).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0))
            : Number(divida.valor || 0)), 0);
    const dividasFixas = somarTipo("fixa");
    const dividasVariaveis = somarTipo("variavel");
    const assinaturas = somarTipo("assinatura");
    const gastosPontuais = somarTipo("pontual");
    const dividasTotais = dividas.reduce((total, divida) => total + ((divida.tipo || "pontual") === "pontual"
        ? Math.max(0, Number(divida.valor || 0) - (divida.pagamentos || []).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0))
        : Number(divida.valor || 0)), 0);
    const emprestimos = JSON.parse(localStorage.getItem("financeiro_emprestimos") || "[]");
    const saldoEmprestimos = direcao => emprestimos
        .filter(item => item.direcao === direcao)
        .reduce((total, item) => total + Math.max(0, Number(item.valor || 0) - Number(item.pago || 0)), 0);


    const receitaTotalElemento =
        document.getElementById(
            "receitaTotal"
        );

    if (receitaTotalElemento) {

        receitaTotalElemento.textContent =
            formatarMoeda(receitaTotal);

    }


    const receitaLiquidaElemento =
        document.getElementById(
            "receitaLiquida"
        );

    if (receitaLiquidaElemento) {

        receitaLiquidaElemento.textContent =
            formatarMoeda(receitaLiquida);

    }


    const investimentosElemento =
        document.getElementById(
            "investimentos"
        );

    if (investimentosElemento) {

        investimentosElemento.textContent =
            formatarMoeda(totalInvestido);

    }


    const dividasFixasElemento =
        document.getElementById(
            "dividasFixas"
        );

    if (dividasFixasElemento) {

        dividasFixasElemento.textContent =
            formatarMoeda(dividasFixas);

    }


    const dividasVariaveisElemento =
        document.getElementById(
            "dividasVariaveis"
        );

    if (dividasVariaveisElemento) {

        dividasVariaveisElemento.textContent =
            formatarMoeda(dividasVariaveis);

    }

    const assinaturasElemento = document.getElementById("assinaturasTotal");
    if (assinaturasElemento) {
        assinaturasElemento.textContent = formatarMoeda(assinaturas);
    }

    const gastosPontuaisElemento = document.getElementById("gastosPontuaisTotal");
    if (gastosPontuaisElemento) {
        gastosPontuaisElemento.textContent = formatarMoeda(gastosPontuais);
    }

    const dividasTotaisElemento = document.getElementById("dividasTotais");
    if (dividasTotaisElemento) {
        dividasTotaisElemento.textContent = formatarMoeda(dividasTotais);
    }

    const emprestimosAPagar = document.getElementById("emprestimosAPagar");
    if (emprestimosAPagar) emprestimosAPagar.textContent = formatarMoeda(saldoEmprestimos("recebi"));
    const emprestimosAReceber = document.getElementById("emprestimosAReceber");
    if (emprestimosAReceber) emprestimosAReceber.textContent = formatarMoeda(saldoEmprestimos("emprestei"));
    atualizarResumoFinanceiroMensal();
    if (typeof window.atualizarGraficoDespesas === "function") window.atualizarGraficoDespesas();

}

function dataAtualISO() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

let renderizarMovimentacoes = () => {};


// =========================
// CONTAS
// =========================

function iniciarContas() {

    let contas = carregarContas();

    let contaEditandoId = null;


    const modalConta =
        document.getElementById("modalConta");

    const btnNovaConta =
        document.getElementById("btnNovaConta");

    const btnFecharModal =
        document.getElementById("btnFecharModal");

    const btnCancelarConta =
        document.getElementById("btnCancelarConta");

    const formConta =
        document.getElementById("formConta");

    const listaContas =
        document.getElementById("listaContas");

    const tituloModal =
        document.getElementById("tituloModal");

    const btnSalvarConta =
        document.getElementById("btnSalvarConta");

    const modalTransferencia = document.getElementById("modalTransferencia");
    if (modalTransferencia) {
        const formTransferencia = document.getElementById("formTransferencia");
        const selectOrigem = document.getElementById("contaOrigemTransferencia");
        const selectDestino = document.getElementById("contaDestinoTransferencia");
        const fechar = () => { modalTransferencia.classList.add("hidden"); formTransferencia.reset(); };
        document.getElementById("btnTransferirConta").addEventListener("click", () => {
            if (contas.length < 2) { alert("Cadastre pelo menos duas contas para transferir."); return; }
            const opcoes = contas.map(c => `<option value="${escaparHtml(c.id)}">${escaparHtml(c.nome)} — ${formatarMoeda(c.valor)}</option>`).join("");
            selectOrigem.innerHTML = opcoes; selectDestino.innerHTML = opcoes; selectDestino.selectedIndex = 1;
            document.getElementById("dataTransferencia").value = dataAtualISO();
            modalTransferencia.classList.remove("hidden");
        });
        ["btnFecharTransferencia", "btnCancelarTransferencia"].forEach(id => document.getElementById(id).addEventListener("click", fechar));
        formTransferencia.addEventListener("submit", event => {
            event.preventDefault();
            const origem = contas.find(c => String(c.id) === selectOrigem.value), destino = contas.find(c => String(c.id) === selectDestino.value);
            const valor = Number(document.getElementById("valorTransferencia").value);
            const data = document.getElementById("dataTransferencia").value;
            if (!origem || !destino || origem === destino || valor <= 0 || valor > Number(origem.valor || 0) || !data) { alert("Escolha contas diferentes e um valor disponivel na conta de origem."); return; }
            const transferencias = JSON.parse(localStorage.getItem("financeiro_transferencias") || "[]");
            transferencias.push({ id: crypto.randomUUID(), data, valor, origemId: origem.id, origemNome: origem.nome, destinoId: destino.id, destinoNome: destino.nome });
            localStorage.setItem("financeiro_transferencias", JSON.stringify(transferencias));
            origem.valor = Number(origem.valor || 0) - valor; destino.valor = Number(destino.valor || 0) + valor;
            salvarContas(contas); renderizarContas(); carregarVisaoGeral(); renderizarMovimentacoes(); fechar();
        });
    }


    // =========================
    // NOVA CONTA
    // =========================

    btnNovaConta.addEventListener(
        "click",
        () => {

            contaEditandoId = null;

            tituloModal.textContent =
                "Nova conta";

            btnSalvarConta.textContent =
                "Adicionar conta";

            formConta.reset();

            modalConta.classList.remove(
                "hidden"
            );

            document
                .getElementById("nomeConta")
                .focus();

        }
    );


    // =========================
    // FECHAR MODAL
    // =========================

    function fecharModal() {

        modalConta.classList.add(
            "hidden"
        );

        formConta.reset();

        contaEditandoId = null;

    }


    btnFecharModal.addEventListener(
        "click",
        fecharModal
    );


    btnCancelarConta.addEventListener(
        "click",
        fecharModal
    );


    // =========================
    // SALVAR CONTA
    // =========================

    formConta.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const nome =
                document
                    .getElementById("nomeConta")
                    .value
                    .trim();


            const tipo =
                document
                    .getElementById("tipoConta")
                    .value;


            const valor =
                Number(
                    document
                        .getElementById("valorConta")
                        .value
                );


            // EDITAR

            if (contaEditandoId) {

                const conta =
                    contas.find(
                        conta =>
                            conta.id ===
                            contaEditandoId
                    );


                if (conta) {

                    conta.nome = nome;

                    conta.tipo = tipo;

                    conta.valor = valor;

                }

            }


            // NOVA CONTA

            else {

                const novaConta = {

                    id: crypto.randomUUID(),

                    nome: nome,

                    tipo: tipo,

                    valor: valor

                };


                contas.push(
                    novaConta
                );

            }


            salvarContas(contas);

            renderizarContas();

            fecharModal();

        }
    );


    // =========================
    // EDITAR CONTA
    // =========================

    function editarConta(id) {

        const conta =
            contas.find(
                conta =>
                    conta.id === id
            );


        if (!conta) {
            return;
        }


        contaEditandoId = id;


        tituloModal.textContent =
            "Editar conta";


        btnSalvarConta.textContent =
            "Salvar alterações";


        document
            .getElementById("nomeConta")
            .value = conta.nome;


        document
            .getElementById("tipoConta")
            .value = conta.tipo;


        document
            .getElementById("valorConta")
            .value = conta.valor;


        modalConta.classList.remove(
            "hidden"
        );


        document
            .getElementById("nomeConta")
            .focus();

    }


    // =========================
    // RENDERIZAR CONTAS
    // =========================

    function renderizarContas() {

        listaContas.innerHTML = "";


        if (contas.length === 0) {

            listaContas.innerHTML = `

                <div class="empty-state">

                    <h3>
                        Nenhuma conta cadastrada
                    </h3>

                    <p>
                        Clique em "Nova conta"
                        para adicionar sua primeira conta.
                    </p>

                </div>

            `;

            return;

        }


        const totalContas = contas.reduce((total, conta) => total + Number(conta.valor || 0), 0);
        listaContas.innerHTML = `
            <div class="tabela-responsiva"><table class="tabela-dividas tabela-contas">
                <thead><tr><th>Conta</th><th>Tipo</th><th>Saldo</th><th>Participa??o</th><th></th></tr></thead>
                <tbody>${contas.map(conta => {
                    const percentual = totalContas > 0 ? Number(conta.valor || 0) / totalContas * 100 : 0;
                    return `<tr><td>${conta.nome || "-"}</td><td>${conta.tipo || "-"}</td><td>${formatarMoeda(Number(conta.valor || 0))}</td><td>${percentual.toFixed(2)}%</td><td><button class="btn-editar" data-id="${conta.id}">Editar</button></td></tr>`;
                }).join("")}</tbody>
                <tfoot><tr><th colspan="2">Total</th><th>${formatarMoeda(totalContas)}</th><th colspan="2"></th></tr></tfoot>
            </table></div>`;

        listaContas.querySelectorAll(".btn-editar").forEach(botao => {
            botao.addEventListener("click", () => editarConta(botao.dataset.id));
        });
        adicionarAcoesExcluir(listaContas, ".btn-editar", contas, conta => `a conta \"${conta.nome}\"`, id => {
            contas = contas.filter(item => String(item.id) !== String(id));
            salvarContas(contas);
            renderizarContas();
            carregarVisaoGeral();
        });
    }


    renderizarContas();

}


// =========================
// IDENTIFICAR PÁGINA
// =========================

if (
    document.getElementById(
        "listaContas"
    )
) {

    iniciarContas();

}


if (
    document.getElementById(
        "receitaTotal"
    )
) {

    carregarVisaoGeral();

}

// =========================
// DÍVIDAS
// =========================

const DIVIDAS_STORAGE_KEY =
    "financeiro_dividas";


function carregarDividas() {

    return JSON.parse(
        localStorage.getItem(
            DIVIDAS_STORAGE_KEY
        )
    ) || [];

}


function salvarDividas(dividas) {

    localStorage.setItem(
        DIVIDAS_STORAGE_KEY,
        JSON.stringify(dividas)
    );

}


function iniciarDividas() {

    let dividas = carregarDividas();

    let dividaEditandoId = null;


    const modalDivida =
        document.getElementById(
            "modalDivida"
        );

    const btnNovaDivida =
        document.getElementById(
            "btnNovaDivida"
        );

    const btnFecharModal =
        document.getElementById(
            "btnFecharModal"
        );

    const btnCancelarDivida =
        document.getElementById(
            "btnCancelarDivida"
        );

    const formDivida =
        document.getElementById(
            "formDivida"
        );

    const listaDividas =
        document.getElementById(
            "listaDividas"
        );

    const tituloModal =
        document.getElementById(
            "tituloModal"
        );

    const btnSalvarDivida =
        document.getElementById(
            "btnSalvarDivida"
        );

    const valorParcelaPreview =
        document.getElementById(
            "valorParcelaPreview"
        );

    const tipoDividaInput = document.getElementById("tipoDivida");
    const grupoParcelas = document.getElementById("grupoParcelasDivida");
    const parcelasInput = document.getElementById("parcelasDivida");
    const cartaoInput = document.getElementById("cartaoDivida");
    const pagamentoInput = document.getElementById("formaPagamentoDivida");
    const detalhesCartao = document.getElementById("detalhesCartaoDivida");
    const titularCartaoInput = document.getElementById("titularCartaoDivida");
    const grupoTitularCartao = document.getElementById("grupoTitularCartao");
    const responsavelCompraInput = document.getElementById("responsavelCompra");
    const grupoResponsavelCompra = document.getElementById("grupoResponsavelCompra");
    const pessoaCompraInput = document.getElementById("pessoaCompra");
    const grupoPessoaCompra = document.getElementById("grupoPessoaCompra");
    const filtroBusca = document.getElementById("filtroBuscaDividas");
    const filtroMes = document.getElementById("filtroMesDividas");
    const filtroTipo = document.getElementById("filtroTipoDividas");
    const filtroPagamento = document.getElementById("filtroPagamentoDividas");
    const filtroResponsavel = document.getElementById("filtroResponsavelDividas");
    const diaVencimentoInput = document.getElementById("diaVencimentoDivida");
    const grupoDiaVencimento = document.getElementById("grupoDiaVencimento");

    if (filtroMes && !filtroMes.value) {
        const agora = new Date();
        filtroMes.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    }

    const modalPagamento = document.getElementById("modalPagamentoDivida");
    const formPagamento = document.getElementById("formPagamentoDivida");
    const selectDividaPagamento = document.getElementById("dividaPagamento");
    const inputValorPagamento = document.getElementById("valorPagamentoDivida");
    const inputDataPagamento = document.getElementById("dataPagamentoDivida");
    const tipoAbatimento = document.getElementById("tipoAbatimentoDivida");
    const quantidadeParcelas = document.getElementById("quantidadeParcelasAbatimento");
    const grupoQuantidadeParcelas = document.getElementById("grupoQuantidadeParcelasAbatimento");
    const selectContaPagamento = document.getElementById("contaPagamentoDivida");
    const saldoPagamento = document.getElementById("saldoPagamentoDivida");
    const totalPago = divida => (divida.pagamentos || []).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
    const saldoDevedor = divida => {
        if ((divida.tipo || "pontual") !== "pontual") {
            const agora = new Date();
            const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
            const pagoNoMes = (divida.pagamentos || []).filter(pagamento => pagamento.data?.startsWith(mesAtual)).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
            return Math.max(0, Number(divida.valor || 0) - pagoNoMes);
        }
        return Math.max(0, Number(divida.valor || 0) - totalPago(divida));
    };

    function atualizarSaldoPagamento() {
        const divida = dividas.find(item => String(item.id) === String(selectDividaPagamento.value));
        const saldo = divida ? saldoDevedor(divida) : 0;
        saldoPagamento.textContent = divida ? `Saldo em aberto: ${formatarMoeda(saldo)}` : "Não há dívidas em aberto.";
        inputValorPagamento.max = saldo.toFixed(2);
        if (divida) {
            tipoAbatimento.querySelector('option[value="parcelas"]').disabled = (divida.tipo || "pontual") !== "pontual";
            if ((divida.tipo || "pontual") !== "pontual" && tipoAbatimento.value === "parcelas") tipoAbatimento.value = "valor";
            const contas = carregarContas();
            selectContaPagamento.innerHTML = `<option value="">Não registrar saída de conta</option>` + contas.map(c => `<option value="${escaparHtml(c.id)}">${escaparHtml(c.nome)} — ${formatarMoeda(c.valor)}</option>`).join("");
        }
        atualizarTipoAbatimento();
    }
    function atualizarTipoAbatimento() {
        const divida = dividas.find(item => String(item.id) === String(selectDividaPagamento.value));
        const porParcelas = tipoAbatimento.value === "parcelas" && (divida?.tipo || "pontual") === "pontual";
        grupoQuantidadeParcelas.classList.toggle("hidden", !porParcelas);
        inputValorPagamento.readOnly = porParcelas;
        inputValorPagamento.required = !porParcelas;
        if (porParcelas && divida) {
            quantidadeParcelas.max = String(Math.max(1, Number(divida.parcelas || 1)));
            const valor = calcularAbatimentoParcelas(divida, quantidadeParcelas.value, saldoDevedor(divida)).reduce((soma, item) => soma + item.valor, 0);
            inputValorPagamento.value = valor.toFixed(2);
        } else if (divida) {
            inputValorPagamento.value = "";
            inputValorPagamento.max = saldoDevedor(divida).toFixed(2);
        }
    }
    selectDividaPagamento.addEventListener("change", atualizarSaldoPagamento);
    tipoAbatimento.addEventListener("change", atualizarTipoAbatimento);
    quantidadeParcelas.addEventListener("input", atualizarTipoAbatimento);
    function abrirModalPagamento() {
        const abertas = dividas.filter(divida => saldoDevedor(divida) > 0);
        if (!abertas.length) {
            alert("Não há dívidas com saldo em aberto para abater.");
            return;
        }
        selectDividaPagamento.innerHTML = abertas.map(divida =>
            `<option value="${escaparHtml(divida.id)}">${escaparHtml(divida.nome || "Dívida")} — ${formatarMoeda(saldoDevedor(divida))}</option>`
        ).join("");
        formPagamento.reset();
        const agora = new Date();
        inputDataPagamento.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
        modalPagamento.classList.remove("hidden");
        atualizarSaldoPagamento();
    }

    function fecharModalPagamento() {
        modalPagamento.classList.add("hidden");
        formPagamento.reset();
    }

    document.getElementById("btnAbaterDivida").addEventListener("click", abrirModalPagamento);
    document.getElementById("btnFecharPagamentoDivida").addEventListener("click", fecharModalPagamento);
    document.getElementById("btnCancelarPagamentoDivida").addEventListener("click", fecharModalPagamento);
    selectDividaPagamento.addEventListener("change", atualizarSaldoPagamento);
    formPagamento.addEventListener("submit", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const divida = dividas.find(item => String(item.id) === String(selectDividaPagamento.value));
        const quantidade = tipoAbatimento.value === "parcelas" ? Number(quantidadeParcelas.value) : 0;
        const parcelas = divida && quantidade ? calcularAbatimentoParcelas(divida, quantidade, saldoDevedor(divida)) : [];
        const valor = quantidade ? parcelas.reduce((soma, item) => soma + item.valor, 0) : Number(inputValorPagamento.value);
        if (!divida || !Number.isFinite(valor) || valor <= 0 || valor > saldoDevedor(divida)) {
            inputValorPagamento.setCustomValidity("Informe um abatimento válido, dentro do saldo em aberto.");
            inputValorPagamento.reportValidity();
            inputValorPagamento.setCustomValidity("");
            return;
        }
        const contaId = selectContaPagamento.value || null;
        const conta = contaId ? carregarContas().find(item => String(item.id) === String(contaId)) : null;
        if (contaId && (!conta || Number(conta.valor || 0) < valor)) { alert("O saldo da conta selecionada não cobre esse pagamento."); return; }
        if (!salvarAbatimentoDivida(divida, valor, inputDataPagamento.value, contaId, quantidade)) { alert("Não foi possível registrar esse abatimento."); return; }
        renderizarDividas();
        carregarVisaoGeral();
        fecharModalPagamento();
    });
    function atualizarCamposPorTipo() {
        const pontual = tipoDividaInput.value === "pontual";
        const cartao = pagamentoInput.value.startsWith("cartao_");
        const cartaoTerceiros = pagamentoInput.value === "cartao_terceiros";
        const compraDeOutraPessoa = responsavelCompraInput.value === "outra_pessoa";
        grupoParcelas.classList.toggle("hidden", !pontual);
        detalhesCartao.classList.toggle("hidden", !cartao);
        grupoTitularCartao.classList.toggle("hidden", !cartaoTerceiros);
        grupoResponsavelCompra.classList.toggle("hidden", !cartao);
        grupoPessoaCompra.classList.toggle("hidden", !cartao || !compraDeOutraPessoa);
        grupoDiaVencimento.classList.toggle("hidden", pontual);
        parcelasInput.required = pontual;
        cartaoInput.required = cartao;
        titularCartaoInput.required = cartaoTerceiros;
        pessoaCompraInput.required = cartao && compraDeOutraPessoa;
        valorParcelaPreview.classList.toggle("hidden", !pontual);
        document.querySelector('label[for="valorDivida"]').textContent = pontual ? "Valor total" : "Valor mensal";
        atualizarValorParcela();
    }

    tipoDividaInput.addEventListener("change", atualizarCamposPorTipo);
    pagamentoInput.addEventListener("change", atualizarCamposPorTipo);
    responsavelCompraInput.addEventListener("change", atualizarCamposPorTipo);
    [filtroBusca, filtroMes, filtroTipo, filtroPagamento, filtroResponsavel].forEach(filtro => {
        filtro.addEventListener(filtro === filtroBusca ? "input" : "change", renderizarDividas);
    });


    // =========================
    // CALCULAR PARCELA
    // =========================

    function atualizarValorParcela() {

        const valor =
            Number(
                document.getElementById(
                    "valorDivida"
                ).value
            ) || 0;


        const parcelas =
            Number(
                document.getElementById(
                    "parcelasDivida"
                ).value
            ) || 0;


        const valorParcela =
            parcelas > 0
                ? valor / parcelas
                : 0;


        valorParcelaPreview.textContent =
            `Valor da parcela: ${formatarMoeda(
                valorParcela
            )}`;

    }


    document
        .getElementById("valorDivida")
        .addEventListener(
            "input",
            atualizarValorParcela
        );


    document
        .getElementById("parcelasDivida")
        .addEventListener(
            "input",
            atualizarValorParcela
        );

    atualizarCamposPorTipo();


    // =========================
    // NOVA DÍVIDA
    // =========================

    btnNovaDivida.addEventListener(
        "click",
        () => {

            dividaEditandoId = null;

            tituloModal.textContent =
                "Nova dívida";

            btnSalvarDivida.textContent =
                "Adicionar dívida";

            formDivida.reset();
            tipoDividaInput.value = "fixa";
            atualizarCamposPorTipo();

            atualizarValorParcela();

            modalDivida.classList.remove(
                "hidden"
            );

            document
                .getElementById("nomeDivida")
                .focus();

        }
    );


    // =========================
    // FECHAR MODAL
    // =========================

    function fecharModalDivida() {

        modalDivida.classList.add(
            "hidden"
        );

        formDivida.reset();

        dividaEditandoId = null;

        atualizarCamposPorTipo();
        atualizarValorParcela();

    }


    btnFecharModal.addEventListener(
        "click",
        fecharModalDivida
    );


    btnCancelarDivida.addEventListener(
        "click",
        fecharModalDivida
    );


    // =========================
    // SALVAR
    // =========================

    formDivida.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const nome =
                document
                    .getElementById(
                        "nomeDivida"
                    )
                    .value
                    .trim();

            const tipo = tipoDividaInput.value;


            const descricao =
                document
                    .getElementById(
                        "descricaoDivida"
                    )
                    .value
                    .trim();


            const valor =
                Number(
                    document
                        .getElementById(
                            "valorDivida"
                        )
                        .value
                );


            const parcelas = tipo === "pontual" ?
                Number(
                    document
                        .getElementById(
                            "parcelasDivida"
                        )
                        .value
                ) : 1;


            const dataCompra =
                document
                    .getElementById(
                        "dataDivida"
                    )
                    .value;
            const inicio = dataCompra.slice(0, 7);


            const formaPagamento = pagamentoInput.value;
            const cartao = formaPagamento.startsWith("cartao_") ? cartaoInput.value.trim() : "";
            const titularCartao = formaPagamento === "cartao_terceiros" ? titularCartaoInput.value.trim() : "";
            const responsavelCompra = formaPagamento.startsWith("cartao_") ? responsavelCompraInput.value : "";
            const pessoaCompra = responsavelCompra === "outra_pessoa" ? pessoaCompraInput.value.trim() : "";
            const diaVencimento = tipo === "pontual" ? null : (Number(diaVencimentoInput.value) || null);


            const valorParcela =
                valor / parcelas;

            const dividaAtual = dividaEditandoId ? dividas.find(item => item.id === dividaEditandoId) : null;
            const agora = new Date();
            const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
            const totalJaPago = dividaAtual ? (dividaAtual.tipo === "pontual"
                ? (dividaAtual.pagamentos || []).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0)
                : (dividaAtual.pagamentos || []).filter(pagamento => pagamento.data?.startsWith(mesAtual)).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0)) : 0;
            if (valor < totalJaPago) {
                alert(`O valor total não pode ser menor que o já pago (${formatarMoeda(totalJaPago)}).`);
                return;
            }


            // EDITAR

            if (dividaEditandoId) {

                const divida =
                    dividas.find(
                        divida =>
                            divida.id ===
                            dividaEditandoId
                    );


                if (divida) {

                    divida.tipo = tipo;
                    divida.formaPagamento = formaPagamento;
                    divida.titularCartao = titularCartao;
                    divida.responsavelCompra = responsavelCompra;
                    divida.pessoaCompra = pessoaCompra;
                    divida.diaVencimento = diaVencimento;

                    divida.nome =
                        nome;

                    divida.descricao =
                        descricao;

                    divida.valor =
                        valor;

                    divida.parcelas =
                        parcelas;

                    divida.inicio =
                        inicio;

                    divida.data = dataCompra;

                    divida.cartao =
                        cartao;

                    divida.valorParcela =
                        valorParcela;

                }

            }


            // NOVA

            else {

                const novaDivida = {

                    id: crypto.randomUUID(),

                    nome: nome,

                    tipo: tipo,

                    formaPagamento: formaPagamento,

                    titularCartao: titularCartao,

                    responsavelCompra: responsavelCompra,

                    pessoaCompra: pessoaCompra,

                    diaVencimento: diaVencimento,

                    descricao: descricao,

                    valor: valor,

                    parcelas: parcelas,

                    inicio: inicio,

                    data: dataCompra,

                    cartao: cartao,

                    valorParcela:
                        valorParcela

                };


                dividas.push(
                    novaDivida
                );

            }


            salvarDividas(dividas);

            renderizarDividas();

            fecharModalDivida();

        }
    );


    // =========================
    // EDITAR
    // =========================

    function editarDivida(id) {

        const divida =
            dividas.find(
                divida =>
                    divida.id === id
            );


        if (!divida) {
            return;
        }


        dividaEditandoId = id;


        tituloModal.textContent =
            "Editar dívida";


        btnSalvarDivida.textContent =
            "Salvar alterações";


        document
            .getElementById("nomeDivida")
            .value =
                divida.nome;

        tipoDividaInput.value = divida.tipo || "pontual";
        pagamentoInput.value = divida.formaPagamento || (divida.cartao ? "cartao_proprio" : "pix");


        document
            .getElementById("descricaoDivida")
            .value =
                divida.descricao;


        document
            .getElementById("valorDivida")
            .value =
                divida.valor;


        document
            .getElementById("parcelasDivida")
            .value =
                divida.parcelas;


        document
            .getElementById("dataDivida")
            .value =
                divida.data || (divida.inicio ? `${divida.inicio}-01` : "");


        document
            .getElementById("cartaoDivida")
            .value =
                divida.cartao;

        titularCartaoInput.value = divida.titularCartao || "";
        responsavelCompraInput.value = divida.responsavelCompra || "eu";
        pessoaCompraInput.value = divida.pessoaCompra || "";
        diaVencimentoInput.value = divida.diaVencimento || "";
        atualizarCamposPorTipo();


        atualizarValorParcela();


        modalDivida.classList.remove(
            "hidden"
        );


        document
            .getElementById("nomeDivida")
            .focus();

    }


    // =========================
    // RENDERIZAR
    // =========================

    function renderizarDividas() {

        listaDividas.innerHTML = "";


        if (dividas.length === 0) {

            listaDividas.innerHTML = `

                <div class="empty-state">

                    <h3>
                        Nenhuma dívida cadastrada
                    </h3>

                    <p>
                        Clique em "Nova dívida"
                        para adicionar sua primeira dívida.
                    </p>

                </div>

            `;

            return;

        }


        const nomesTipos = { fixa: "Fixa", variavel: "Vari\u00e1vel", assinatura: "Assinatura", pontual: "Gasto pontual" };
        const textoBusca = filtroBusca.value.trim().toLocaleLowerCase("pt-BR");
        const mesSelecionado = filtroMes.value;
        const dividasFiltradas = dividas.filter(divida => {
            const tipo = divida.tipo || "pontual";
            const forma = divida.formaPagamento || (divida.cartao ? "cartao_proprio" : "pix");
            const responsavel = divida.responsavelCompra || (forma.startsWith("cartao_") ? "eu" : "");
            const data = divida.data || (divida.inicio ? `${divida.inicio}-01` : "");
            const texto = [divida.nome, divida.descricao, divida.cartao, divida.titularCartao, divida.pessoaCompra].join(" ").toLocaleLowerCase("pt-BR");
            const mesDistancia = diferencaMeses(data.slice(0, 7), mesSelecionado);
            const noMes = !mesSelecionado || (mesDistancia >= 0 && (tipo !== "pontual" || mesDistancia < Math.max(1, Number(divida.parcelas || 1))));
            return (!textoBusca || texto.includes(textoBusca))
                && noMes
                && (!filtroTipo.value || tipo === filtroTipo.value)
                && (!filtroPagamento.value || forma === filtroPagamento.value)
                && (!filtroResponsavel.value || responsavel === filtroResponsavel.value);
        });
        if (mesSelecionado) {
            const itensMes = dividas.filter(divida => {
                const data = divida.data || (divida.inicio ? `${divida.inicio}-01` : "");
                const distancia = diferencaMeses(data.slice(0, 7), mesSelecionado);
                return distancia >= 0 && ((divida.tipo || "pontual") !== "pontual" || distancia < Math.max(1, Number(divida.parcelas || 1)));
            });
            const previsto = itensMes.reduce((s, d) => s + ((d.tipo || "pontual") === "pontual" ? Number(d.valor || 0) / Math.max(1, Number(d.parcelas || 1)) : Number(d.valor || 0)), 0);
            const pago = itensMes.reduce((s, d) => s + (d.pagamentos || []).filter(p => p.data?.startsWith(mesSelecionado)).reduce((a, p) => a + Number(p.valor || 0), 0), 0);
            listaDividas.innerHTML = `<div class="resumo-grid monthly-debt-summary"><div class="resumo-card monthly-debt-total"><span class="resumo-label">Total mensal a pagar · ${formatarMes(mesSelecionado)}</span><strong class="resumo-valor">${formatarMoeda(previsto)}</strong><p>Parcelas ativas e despesas recorrentes do mês</p></div><div class="resumo-card"><span class="resumo-label">Pago no mês</span><strong class="resumo-valor">${formatarMoeda(pago)}</strong></div><div class="resumo-card"><span class="resumo-label">Em aberto do mês</span><strong class="resumo-valor">${formatarMoeda(Math.max(0, previsto - pago))}</strong></div></div>`;
        }
        listaDividas.innerHTML = `
            ${mesSelecionado ? listaDividas.innerHTML : ""}<div class="tabela-responsiva"><table class="tabela-dividas">
                <thead><tr><th>Tipo</th><th>Nome</th><th>Descrição</th><th>Valor por mês/parcela</th><th>Valor total da dívida/compra</th><th>Pago</th><th>Saldo aberto</th><th>Data</th><th>Situação</th><th>Parcelas</th><th>Pagamento</th><th>Cartão / titular</th><th>Comprador</th><th>Vencimento</th><th></th></tr></thead>
                <tbody>${dividasFiltradas.length ? dividasFiltradas.map(divida => {
                    const tipo = divida.tipo || "pontual";
                    const unitario = tipo === "pontual" ? Number(divida.valorParcela || divida.valor || 0) : Number(divida.valor || 0);
                    const faltamParcelas = tipo === "pontual" ? Math.min(Math.max(1, Number(divida.parcelas || 1)), Math.ceil(Math.max(0, saldoDevedor(divida) - 0.001) / Math.max(unitario, 0.01))) : null;
                    const saldoAtual = saldoDevedor(divida);
                    const pagoAtual = tipo === "pontual" ? totalPago(divida) : Math.max(0, Number(divida.valor || 0) - saldoAtual);
                    const statusPagamento = saldoAtual <= 0 ? "Paga" : pagoAtual > 0 ? "Pago parcial" : "A pagar";
                    const classeStatus = saldoAtual <= 0 ? "is-paid" : pagoAtual > 0 ? "is-partial" : "is-due";
                    const forma = divida.formaPagamento || (divida.cartao ? "cartao_proprio" : "pix");
                    const responsavel = divida.responsavelCompra || (forma.startsWith("cartao_") ? "eu" : "");
                    const comprador = !forma.startsWith("cartao_") ? "-" : responsavel === "outra_pessoa" ? (divida.pessoaCompra || "Outra pessoa") : "Eu";
                    const nomesPagamento = { cartao_proprio: "Cartão próprio", cartao_terceiros: "Cartão de terceiros", pix: "Pix", dinheiro: "Dinheiro / físico" };
                    const cartaoExibicao = forma === "cartao_proprio" || forma === "cartao_terceiros" ? `${divida.cartao || "-"}${forma === "cartao_terceiros" ? ` (${divida.titularCartao || "titular não informado"})` : ""}` : "-";
                    return `<tr><td><span class="divida-tipo">${nomesTipos[tipo] || "Gasto pontual"}</span></td><td>${divida.nome || "-"}</td><td>${divida.descricao || "-"}</td><td>${formatarMoeda(unitario)}</td><td>${formatarMoeda(Number(divida.valor || 0))}</td><td>${formatarMoeda(pagoAtual)}</td><td>${formatarMoeda(saldoAtual)}</td><td>${formatarData(divida.data || (divida.inicio ? `${divida.inicio}-01` : ""))}</td><td><span class="payment-status ${classeStatus}">${statusPagamento}</span></td><td>${tipo === "pontual" ? `${divida.parcelas || 1}x · faltam ${faltamParcelas}` : "Mensal"}</td><td>${nomesPagamento[forma] || "-"}</td><td>${cartaoExibicao}</td><td>${comprador}</td><td>${divida.diaVencimento ? `Dia ${divida.diaVencimento}` : "-"}</td><td><button class="btn-editar-divida" data-id="${divida.id}">Editar</button></td></tr>`;
                }).join("") : `<tr><td colspan="15">Nenhuma dívida corresponde aos filtros.</td></tr>`}</tbody>
            </table></div>`;

        const botoesEditar =
            document.querySelectorAll(
                ".btn-editar-divida"
            );


        botoesEditar.forEach(
            function (botao) {

                botao.addEventListener(
                    "click",
                    function () {

                        editarDivida(
                            botao.dataset.id
                        );

                    }
                );

            }
        );

        adicionarAcoesExcluir(listaDividas, ".btn-editar-divida", dividas, divida => `a dívida \"${divida.nome || "sem nome"}\" e seus abatimentos`, id => {
            salvarDividas(dividas.filter(item => String(item.id) !== String(id)));
            window.location.reload();
        });

    }


    renderizarDividas();

}


// =========================
// FORMATAR MÊS
// =========================

function formatarMes(valor) {

    if (!valor) {
        return "-";
    }


    const [ano, mes] =
        valor.split("-");


    const data =
        new Date(
            Number(ano),
            Number(mes) - 1
        );


    return data.toLocaleDateString(
        "pt-BR",
        {
            month: "long",
            year: "numeric"
        }
    );

}

function formatarData(valor) {
    if (!valor) return "-";
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}


// =========================
// INICIAR DÍVIDAS
// =========================

if (
    document.getElementById(
        "listaDividas"
    )
) {

    iniciarDividas();

}

// Empréstimos: valores recebidos são passivos; valores emprestados são a receber.
function iniciarEmprestimos() {
    const chave = "financeiro_emprestimos";
    let registros = JSON.parse(localStorage.getItem(chave) || "[]");
    let editandoId = null;
    const form = document.getElementById("formEmprestimo");
    const modal = document.getElementById("modalEmprestimo");
    const lista = document.getElementById("listaEmprestimos");
    const direcao = document.getElementById("direcaoEmprestimo");
    const filtroMes = document.getElementById("filtroMesEmprestimos");
    const filtroBusca = document.getElementById("filtroBuscaEmprestimos");
    const salvar = () => localStorage.setItem(chave, JSON.stringify(registros));

    function renderizar() {
        if (!registros.length) {
            lista.innerHTML = '<p class="empty-state">Nenhum empréstimo cadastrado.</p>';
            return;
        }
        const busca = filtroBusca.value.trim().toLocaleLowerCase("pt-BR");
        const filtrados = registros.filter(item => {
            const data = item.data || (item.inicio ? `${item.inicio}-01` : "");
            return (!filtroMes.value || data.startsWith(filtroMes.value))
                && (!busca || `${item.pessoa} ${item.descricao || ""}`.toLocaleLowerCase("pt-BR").includes(busca));
        });
        lista.innerHTML = `<div class="tabela-responsiva"><table class="tabela-dividas"><thead><tr><th>Movimento</th><th>Pessoa / instituição</th><th>Valor original</th><th>Pago / recebido</th><th>Saldo em aberto</th><th>Data</th><th>Observações</th><th></th></tr></thead><tbody>${filtrados.length ? filtrados.map(item => {
            const restante = Math.max(0, Number(item.valor) - Number(item.pago || 0));
            const movimento = item.direcao === "emprestei" ? "Emprestei · a receber" : "Peguei · a pagar";
            return `<tr><td>${movimento}</td><td>${escaparHtml(item.pessoa)}</td><td>${formatarMoeda(Number(item.valor))}</td><td>${formatarMoeda(Number(item.pago || 0))}</td><td>${formatarMoeda(restante)}</td><td>${formatarData(item.data || (item.inicio ? `${item.inicio}-01` : ""))}</td><td>${escaparHtml(item.descricao || "-")}</td><td><button class="btn-editar-emprestimo" data-id="${escaparHtml(item.id)}">Editar</button></td></tr>`;
        }).join("") : '<tr><td colspan="8">Nenhum empréstimo corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
        lista.querySelectorAll(".btn-editar-emprestimo").forEach(button => button.addEventListener("click", () => editar(button.dataset.id)));
        adicionarAcoesExcluir(lista, ".btn-editar-emprestimo", registros, item => `o empréstimo de ${item.pessoa}`, id => {
            registros = registros.filter(item => String(item.id) !== String(id));
            salvar();
            renderizar();
        });
    }

    function editar(id) {
        const item = registros.find(registro => registro.id === id);
        if (!item) return;
        editandoId = id;
        document.getElementById("tituloModalEmprestimo").textContent = "Editar empréstimo";
        document.getElementById("btnSalvarEmprestimo").textContent = "Salvar alterações";
        direcao.value = item.direcao;
        document.getElementById("pessoaEmprestimo").value = item.pessoa;
        document.getElementById("valorEmprestimo").value = item.valor;
        document.getElementById("valorPagoEmprestimo").value = item.pago || 0;
        document.getElementById("dataEmprestimo").value = item.data || (item.inicio ? `${item.inicio}-01` : "");
        document.getElementById("descricaoEmprestimo").value = item.descricao || "";
        modal.classList.remove("hidden");
    }

    function fechar() { modal.classList.add("hidden"); form.reset(); editandoId = null; }
    document.getElementById("btnNovoEmprestimo").addEventListener("click", () => {
        editandoId = null; form.reset();
        document.getElementById("tituloModalEmprestimo").textContent = "Novo empréstimo";
        document.getElementById("btnSalvarEmprestimo").textContent = "Salvar empréstimo";
        modal.classList.remove("hidden");
    });
    document.getElementById("btnFecharEmprestimo").addEventListener("click", fechar);
    document.getElementById("btnCancelarEmprestimo").addEventListener("click", fechar);
    direcao.addEventListener("change", () => {
        document.getElementById("labelPessoaEmprestimo").textContent = direcao.value === "emprestei" ? "Quem recebeu o empréstimo" : "Quem emprestou";
    });
    filtroMes.addEventListener("change", renderizar);
    filtroBusca.addEventListener("input", renderizar);
    form.addEventListener("submit", event => {
        event.preventDefault();
        const valor = Number(document.getElementById("valorEmprestimo").value);
        const pago = Number(document.getElementById("valorPagoEmprestimo").value);
        const campoPago = document.getElementById("valorPagoEmprestimo");
        const pessoa = document.getElementById("pessoaEmprestimo").value.trim();
        if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(pago) || pago < 0 || !pessoa) return;
        if (pago > valor) { campoPago.setCustomValidity("O valor pago/recebido não pode superar o valor total."); campoPago.reportValidity(); campoPago.setCustomValidity(""); return; }
        const registro = {
            id: editandoId || crypto.randomUUID(),
            direcao: direcao.value,
            pessoa,
            valor,
            pago,
            data: document.getElementById("dataEmprestimo").value,
            inicio: document.getElementById("dataEmprestimo").value.slice(0, 7),
            descricao: document.getElementById("descricaoEmprestimo").value.trim()
        };
        if (editandoId) registros = registros.map(item => item.id === editandoId ? registro : item);
        else registros.push(registro);
        salvar(); renderizar(); fechar();
    });
    renderizar();
}

if (document.getElementById("listaEmprestimos")) iniciarEmprestimos();

function iniciarCartoes() {
    const dividas = carregarDividas();
    const lista = document.getElementById("listaCartoes");
    const mes = document.getElementById("filtroMesCartoes");
    const dono = document.getElementById("filtroDonoCartoes");
    const pessoa = document.getElementById("filtroPessoaCartoes");
    const busca = document.getElementById("filtroBuscaCartoes");
    const modalAbate = document.getElementById("modalAbatimentoCartao");
    const selectDividaAbate = document.getElementById("dividaAbatimentoCartao");
    const modoAbate = document.getElementById("modoAbatimentoCartao");
    const valorAbate = document.getElementById("valorAbatimentoCartao");
    const qtdAbate = document.getElementById("qtdAbatimentoCartao");
    const grupoQtdAbate = document.getElementById("grupoQtdAbatimentoCartao");
    const selectContaAbate = document.getElementById("contaAbatimentoCartao");
    const formAbate = document.getElementById("formAbatimentoCartao");

    function atualizarAbateCartao() {
        const divida = dividas.find(item => String(item.id) === String(selectDividaAbate.value));
        if (!divida) return;
        const saldo = Math.max(0, Number(divida.valor || 0) - (divida.pagamentos || []).reduce((s, p) => s + Number(p.valor || 0), 0));
        document.getElementById("saldoAbatimentoCartao").textContent = `Saldo em aberto: ${formatarMoeda(saldo)}`;
        modoAbate.querySelector('option[value="parcelas"]').disabled = (divida.tipo || "pontual") !== "pontual";
        if ((divida.tipo || "pontual") !== "pontual" && modoAbate.value === "parcelas") modoAbate.value = "valor";
        const porParcelas = modoAbate.value === "parcelas" && (divida.tipo || "pontual") === "pontual";
        grupoQtdAbate.classList.toggle("hidden", !porParcelas);
        valorAbate.readOnly = porParcelas;
        valorAbate.required = !porParcelas;
        if (porParcelas) {
            qtdAbate.max = String(Math.max(1, Number(divida.parcelas || 1)));
            valorAbate.value = calcularAbatimentoParcelas(divida, qtdAbate.value, saldo).reduce((s, p) => s + p.valor, 0).toFixed(2);
        } else {
            valorAbate.value = "";
            valorAbate.max = saldo.toFixed(2);
        }
        const contas = carregarContas();
        selectContaAbate.innerHTML = `<option value="">Sem debito de conta</option>` + contas.map(conta => `<option value="${escaparHtml(conta.id)}">${escaparHtml(conta.nome)} - ${formatarMoeda(conta.valor)}</option>`).join("");
    }
    function abrirAbateCartao(id) {
        const comprasAbertas = dividas.filter(item => (item.formaPagamento || (item.cartao ? "cartao_proprio" : "")).startsWith("cartao_") && Number(item.valor || 0) > (item.pagamentos || []).reduce((s, p) => s + Number(p.valor || 0), 0));
        if (!comprasAbertas.length) { alert("Nao ha compras de cartao com saldo em aberto."); return; }
        selectDividaAbate.innerHTML = comprasAbertas.map(item => `<option value="${escaparHtml(item.id)}">${escaparHtml(item.nome || "Compra")} - ${formatarMoeda(Number(item.valor || 0) - (item.pagamentos || []).reduce((s, p) => s + Number(p.valor || 0), 0))}</option>`).join("");
        formAbate.reset();
        if (id) selectDividaAbate.value = id;
        const agora = new Date();
        document.getElementById("dataAbatimentoCartao").value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
        atualizarAbateCartao();
        modalAbate.classList.remove("hidden");
    }
    const fecharAbateCartao = () => { modalAbate.classList.add("hidden"); formAbate.reset(); };
    document.getElementById("btnAbaterCartao").addEventListener("click", () => abrirAbateCartao());
    lista.addEventListener("click", event => {
        const button = event.target.closest(".btn-abater-cartao");
        if (button) abrirAbateCartao(button.dataset.id);
    });
    document.getElementById("btnFecharAbatimentoCartao").addEventListener("click", fecharAbateCartao);
    document.getElementById("btnCancelarAbatimentoCartao").addEventListener("click", fecharAbateCartao);
    selectDividaAbate.addEventListener("change", atualizarAbateCartao);
    modoAbate.addEventListener("change", atualizarAbateCartao);
    qtdAbate.addEventListener("input", atualizarAbateCartao);
    formAbate.addEventListener("submit", event => {
        event.preventDefault();
        const divida = dividas.find(item => String(item.id) === String(selectDividaAbate.value));
        if (!divida) return;
        const saldo = Math.max(0, Number(divida.valor || 0) - (divida.pagamentos || []).reduce((s, p) => s + Number(p.valor || 0), 0));
        const quantidade = modoAbate.value === "parcelas" ? Number(qtdAbate.value) : 0;
        const valor = quantidade ? calcularAbatimentoParcelas(divida, quantidade, saldo).reduce((s, p) => s + p.valor, 0) : Number(valorAbate.value);
        const contaId = selectContaAbate.value || null;
        const conta = contaId ? carregarContas().find(item => String(item.id) === String(contaId)) : null;
        if (valor <= 0 || valor > saldo || (contaId && (!conta || Number(conta.valor || 0) < valor))) { alert("Confira o valor do abatimento e o saldo da conta escolhida."); return; }
        if (!salvarAbatimentoDivida(divida, valor, document.getElementById("dataAbatimentoCartao").value, contaId, quantidade)) { alert("Nao foi possivel registrar o abatimento."); return; }
        renderizar(); carregarVisaoGeral(); fecharAbateCartao();
    });
    if (!mes.value) {
        const agora = new Date();
        mes.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    }

    function renderizar() {
        const compras = dividas.filter(item => (item.formaPagamento || (item.cartao ? "cartao_proprio" : "" )).startsWith("cartao_"));
        const filtradas = compras.filter(item => {
            const forma = item.formaPagamento || "cartao_proprio";
            const responsavel = item.responsavelCompra || "eu";
            const data = item.data || (item.inicio ? `${item.inicio}-01` : "");
            const distancia = diferencaMeses(data.slice(0, 7), mes.value);
            const ativoNoMes = distancia >= 0 && ((item.tipo || "pontual") !== "pontual" || distancia < Math.max(1, Number(item.parcelas || 1)));
            const texto = `${item.nome || ""} ${item.cartao || ""} ${item.titularCartao || ""} ${item.pessoaCompra || ""}`.toLocaleLowerCase("pt-BR");
            return (!mes.value || ativoNoMes)
                && (!dono.value || forma === dono.value)
                && (!pessoa.value || responsavel === pessoa.value)
                && (!busca.value.trim() || texto.includes(busca.value.trim().toLocaleLowerCase("pt-BR")));
        });
        const total = filtradas.reduce((soma, item) => soma + Number(item.valor || 0), 0);
        const mensal = filtradas.reduce((soma, item) => soma + ((item.tipo || "pontual") === "pontual" ? Number(item.valor || 0) / Math.max(1, Number(item.parcelas || 1)) : Number(item.valor || 0)), 0);
        const gastosTerceiros = filtradas.filter(item => (item.responsavelCompra || "eu") === "outra_pessoa").reduce((soma, item) => soma + Number(item.valor || 0), 0);
        document.getElementById("resumoCartoes").innerHTML = `<div class="resumo-card"><span class="resumo-label">Compras no período</span><strong class="resumo-valor">${formatarMoeda(total)}</strong></div><div class="resumo-card"><span class="resumo-label">Compras de outras pessoas</span><strong class="resumo-valor">${formatarMoeda(gastosTerceiros)}</strong></div>`;
        lista.innerHTML = `<div class="tabela-responsiva"><table class="tabela-dividas"><thead><tr><th>Data</th><th>Compra</th><th>Cartão</th><th>Tipo de cartão</th><th>Quem comprou</th><th>Parcela mensal</th><th>Total original</th><th>Parcelas</th><th></th></tr></thead><tbody>${filtradas.length ? filtradas.map(item => {
            const forma = item.formaPagamento || "cartao_proprio";
            const quem = item.responsavelCompra === "outra_pessoa" ? (item.pessoaCompra || "Outra pessoa") : "Eu";
            return `<tr><td>${formatarData(item.data || (item.inicio ? `${item.inicio}-01` : ""))}</td><td>${item.nome || "-"}</td><td>${item.cartao || "-"}</td><td>${forma === "cartao_terceiros" ? `De ${item.titularCartao || "terceiros"}` : "Meu cartão"}</td><td>${quem}</td><td>${formatarMoeda((item.tipo || "pontual") === "pontual" ? Number(item.valor || 0) / Math.max(1, Number(item.parcelas || 1)) : Number(item.valor || 0))}</td><td>${(item.tipo || "pontual") === "pontual" ? formatarMoeda(Number(item.valor || 0)) : "-"}</td><td>${item.parcelas || 1}x</td><td><button type="button" class="btn-abater-cartao" data-id="${item.id}">Abater</button> <a href="dividas.html">Editar em Dívidas</a></td></tr>`;
        }).join("") : '<tr><td colspan="9">Nenhuma compra no cartão corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
        document.getElementById("resumoCartoes").innerHTML = `<div class="resumo-card monthly-debt-total"><span class="resumo-label">Total mensal a pagar · ${formatarMes(mes.value)}</span><strong class="resumo-valor">${formatarMoeda(mensal)}</strong><p>Parcelas ativas e despesas recorrentes no cartão</p></div><div class="resumo-card"><span class="resumo-label">Valor total das compras ativas</span><strong class="resumo-valor">${formatarMoeda(total)}</strong></div><div class="resumo-card"><span class="resumo-label">Parte de outras pessoas (valor original)</span><strong class="resumo-valor">${formatarMoeda(gastosTerceiros)}</strong></div>`;
        lista.querySelectorAll('tbody tr').forEach((linha, indice) => {
            const link = linha.querySelector('a[href="dividas.html"]');
            if (link && filtradas[indice]) link.dataset.id = filtradas[indice].id;
        });
        adicionarAcoesExcluir(lista, 'a[href="dividas.html"]', filtradas, item => `a compra "${item.nome || "sem nome"}"`, id => {
            salvarDividas(carregarDividas().filter(item => String(item.id) !== String(id)));
            window.location.reload();
        });
    }

    [mes, dono, pessoa].forEach(input => input.addEventListener("change", renderizar));
    busca.addEventListener("input", renderizar);
    renderizar();
}

if (document.getElementById("listaCartoes")) iniciarCartoes();

function iniciarInvestimentos() {
    const chave = "financeiro_investimentos";
    let movimentos = JSON.parse(localStorage.getItem(chave) || "[]");
    let editandoId = null;
    const form = document.getElementById("formInvestimento");
    const modal = document.getElementById("modalInvestimento");
    const lista = document.getElementById("listaInvestimentos");
    const mes = document.getElementById("filtroMesInvestimentos");
    const tipoFiltro = document.getElementById("filtroTipoInvestimentos");
    const busca = document.getElementById("filtroBuscaInvestimentos");

    function renderizar() {
        const texto = busca.value.trim().toLocaleLowerCase("pt-BR");
        const filtrados = movimentos.filter(item => (!mes.value || item.data.startsWith(mes.value))
            && (!tipoFiltro.value || item.tipo === tipoFiltro.value)
            && (!texto || `${item.nome} ${item.descricao || ""}`.toLocaleLowerCase("pt-BR").includes(texto)));
        const saldoPeriodo = filtrados.reduce((total, item) => total + (item.tipo === "resgate" ? -Number(item.valor) : Number(item.valor)), 0);
        const saldoGeral = movimentos.reduce((total, item) => total + (item.tipo === "resgate" ? -Number(item.valor) : Number(item.valor)), 0);
        document.getElementById("resumoInvestimentos").innerHTML = `<div class="resumo-card"><span class="resumo-label">Movimentações no período</span><strong class="resumo-valor">${formatarMoeda(saldoPeriodo)}</strong></div><div class="resumo-card"><span class="resumo-label">Saldo líquido registrado</span><strong class="resumo-valor">${formatarMoeda(saldoGeral)}</strong></div>`;
        lista.innerHTML = `<div class="tabela-responsiva"><table class="tabela-dividas"><thead><tr><th>Data</th><th>Movimentação</th><th>Investimento</th><th>Valor</th><th>Observações</th><th></th></tr></thead><tbody>${filtrados.length ? filtrados.map(item => `<tr><td>${formatarData(item.data)}</td><td>${item.tipo === "resgate" ? "Resgate" : "Aporte"}</td><td>${item.nome}</td><td>${formatarMoeda(Number(item.valor))}</td><td>${item.descricao || "-"}</td><td><button class="btn-editar-investimento" data-id="${item.id}">Editar</button></td></tr>`).join("") : '<tr><td colspan="6">Nenhuma movimentação corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
        lista.querySelectorAll(".btn-editar-investimento").forEach(button => button.addEventListener("click", () => editar(button.dataset.id)));
        adicionarAcoesExcluir(lista, ".btn-editar-investimento", movimentos, item => `a movimentação \"${item.nome}\"`, id => {
            movimentos = movimentos.filter(item => String(item.id) !== String(id));
            localStorage.setItem(chave, JSON.stringify(movimentos));
            renderizar();
        });
    }
    function fechar() { modal.classList.add("hidden"); form.reset(); editandoId = null; }
    function editar(id) {
        const item = movimentos.find(registro => registro.id === id);
        if (!item) return;
        editandoId = id;
        document.getElementById("tituloModalInvestimento").textContent = "Editar movimentação";
        document.getElementById("btnSalvarInvestimento").textContent = "Salvar alterações";
        document.getElementById("tipoInvestimento").value = item.tipo;
        document.getElementById("nomeInvestimento").value = item.nome;
        document.getElementById("valorInvestimento").value = item.valor;
        document.getElementById("dataInvestimento").value = item.data;
        document.getElementById("descricaoInvestimento").value = item.descricao || "";
        modal.classList.remove("hidden");
    }
    document.getElementById("btnNovoInvestimento").addEventListener("click", () => {
        editandoId = null; form.reset();
        document.getElementById("tituloModalInvestimento").textContent = "Nova movimentação";
        document.getElementById("btnSalvarInvestimento").textContent = "Salvar";
        modal.classList.remove("hidden");
    });
    document.getElementById("btnFecharInvestimento").addEventListener("click", fechar);
    document.getElementById("btnCancelarInvestimento").addEventListener("click", fechar);
    [mes, tipoFiltro].forEach(input => input.addEventListener("change", renderizar));
    busca.addEventListener("input", renderizar);
    form.addEventListener("submit", event => {
        event.preventDefault();
        const item = {
            id: editandoId || crypto.randomUUID(),
            tipo: document.getElementById("tipoInvestimento").value,
            nome: document.getElementById("nomeInvestimento").value.trim(),
            valor: Number(document.getElementById("valorInvestimento").value),
            data: document.getElementById("dataInvestimento").value,
            descricao: document.getElementById("descricaoInvestimento").value.trim()
        };
        if (editandoId) movimentos = movimentos.map(registro => registro.id === editandoId ? item : registro);
        else movimentos.push(item);
        localStorage.setItem(chave, JSON.stringify(movimentos));
        renderizar(); fechar();
    });
    renderizar();
}

if (document.getElementById("listaInvestimentos")) iniciarInvestimentos();

function iniciarCalendario() {
    const inputMes = document.getElementById("mesCalendario");
    const grade = document.getElementById("gradeCalendarioDividas");
    const resumo = document.getElementById("resumoCalendario");
    const agora = new Date();
    const mesAtual = () => `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    inputMes.value = mesAtual();
    const formatarValor = value => formatarMoeda(Number(value || 0));
    const modalPagamento = document.getElementById("modalPagamentoCalendario");
    const formPagamento = document.getElementById("formPagamentoCalendario");
    const inputValor = document.getElementById("valorPagamentoCalendario");
    const selectConta = document.getElementById("contaPagamentoCalendario");
    let pagamentoCalendario = null;
    const fecharPagamento = () => { modalPagamento.classList.add("hidden"); formPagamento.reset(); pagamentoCalendario = null; };
    document.getElementById("btnFecharPagamentoCalendario").addEventListener("click", fecharPagamento);
    document.getElementById("btnCancelarPagamentoCalendario").addEventListener("click", fecharPagamento);
    grade.addEventListener("click", event => {
        const botao = event.target.closest(".calendar-pay-button");
        if (!botao) return;
        const divida = carregarDividas().find(item => String(item.id) === String(botao.dataset.id));
        if (!divida) return;
        pagamentoCalendario = { divida, parcela: Number(botao.dataset.parcela) || null, limite: Number(botao.dataset.valor) };
        inputValor.value = pagamentoCalendario.limite.toFixed(2);
        inputValor.max = pagamentoCalendario.limite.toFixed(2);
        document.getElementById("infoPagamentoCalendario").textContent = `${divida.nome || "Dívida"}${pagamentoCalendario.parcela ? ` - parcela ${pagamentoCalendario.parcela}` : " - recorrência do mês"}`;
        const contas = carregarContas();
        selectConta.innerHTML = `<option value="">Registrar sem alterar saldo</option>` + contas.map(conta => `<option value="${escaparHtml(conta.id)}">${escaparHtml(conta.nome)} - ${formatarMoeda(conta.valor)}</option>`).join("");
        const data = `${inputMes.value}-${String(botao.dataset.dia).padStart(2, "0")}`;
        document.getElementById("dataPagamentoCalendario").value = data;
        modalPagamento.classList.remove("hidden");
    });
    formPagamento.addEventListener("submit", event => {
        event.preventDefault();
        if (!pagamentoCalendario) return;
        const valor = Number(inputValor.value);
        const contaId = selectConta.value || null;
        const conta = contaId ? carregarContas().find(item => String(item.id) === String(contaId)) : null;
        if (!Number.isFinite(valor) || valor <= 0 || valor > pagamentoCalendario.limite || (contaId && (!conta || Number(conta.valor || 0) < valor))) {
            alert("Informe um valor valido e confira o saldo da conta.");
            return;
        }
        if (!salvarAbatimentoDivida(pagamentoCalendario.divida, valor, document.getElementById("dataPagamentoCalendario").value, contaId, 0, pagamentoCalendario.parcela)) {
            alert("Nao foi possivel registrar o pagamento.");
            return;
        }
        fecharPagamento();
        renderizar();
        carregarVisaoGeral();
    });

    function renderizar() {
        const [ano, mesNumero] = inputMes.value.split("-").map(Number);
        if (!ano || !mesNumero) return;
        const mesChave = inputMes.value;
        const primeiroDia = new Date(ano, mesNumero - 1, 1);
        const diasNoMes = new Date(ano, mesNumero, 0).getDate();
        const deslocamento = (primeiroDia.getDay() + 6) % 7;
        const hoje = new Date();
        const pagamentosPrevistos = [];
        carregarDividas().forEach(divida => {
            const dataInicio = divida.data || (divida.inicio ? `${divida.inicio}-01` : "");
            if (!dataInicio) return;
            const mesInicio = dataInicio.slice(0, 7);
            const distancia = diferencaMeses(mesInicio, mesChave);
            if (distancia < 0) return;
            const pontual = (divida.tipo || "pontual") === "pontual";
            const totalParcelas = Math.max(1, Number(divida.parcelas || 1));
            if (pontual && distancia >= totalParcelas) return;
            const diaBase = pontual ? Number(dataInicio.slice(8, 10)) || 1 : Number(divida.diaVencimento) || Number(dataInicio.slice(8, 10)) || 1;
            const diaVencimento = Math.min(diaBase, diasNoMes);
            const parcela = distancia + 1;
            const valorPrevisto = pontual ? Number(divida.valor || 0) / totalParcelas : Number(divida.valor || 0);
            const pagamentos = divida.pagamentos || [];
            const pagoNaParcela = pontual ? pagamentos.filter(item => Number(item.parcela) === parcela).reduce((s, item) => s + Number(item.valor || 0), 0) : 0;
            const pagoSemParcelaNoMes = pagamentos.filter(item => !item.parcela && item.data?.startsWith(mesChave)).reduce((s, item) => s + Number(item.valor || 0), 0);
            const pagoNoMes = pontual ? Math.min(valorPrevisto, pagoNaParcela + pagoSemParcelaNoMes) : Math.min(valorPrevisto, pagamentos.filter(item => item.data?.startsWith(mesChave)).reduce((s, item) => s + Number(item.valor || 0), 0));
            const saldo = pontual
                ? Math.max(0, Number(divida.valor || 0) - pagamentos.reduce((s, item) => s + Number(item.valor || 0), 0))
                : Math.max(0, Number(divida.valor || 0) - pagamentos.filter(item => item.data?.startsWith(mesChave)).reduce((s, item) => s + Number(item.valor || 0), 0));
            const valorUnitario = Number(divida.valor || 0) / totalParcelas;
            const faltam = pontual ? Math.min(totalParcelas, Math.ceil(Math.max(0, saldo - 0.001) / Math.max(valorUnitario, 0.01))) : null;
            if (saldo <= 0 && pagoNoMes <= 0) return;
            pagamentosPrevistos.push({
                id: divida.id,
                nome: divida.nome || "Dívida",
                dia: diaVencimento,
                valor: valorPrevisto,
                pago: pagoNoMes,
                valorAberto: Math.max(0, valorPrevisto - pagoNoMes),
                pontual,
                parcela,
                totalParcelas,
                faltam,
                quitada: saldo <= 0
            });
        });
        const previsto = pagamentosPrevistos.reduce((s, item) => s + item.valor, 0);
        const pago = pagamentosPrevistos.reduce((s, item) => s + item.pago, 0);
        const mesFormatado = new Date(ano, mesNumero - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        resumo.innerHTML = `<div class="resumo-card monthly-debt-total"><span class="resumo-label">Total previsto em ${escaparHtml(mesFormatado)}</span><strong class="resumo-valor">${formatarValor(previsto)}</strong><p>${pagamentosPrevistos.length} vencimento(s) no mês</p></div><div class="resumo-card"><span class="resumo-label">Pago no mês</span><strong class="resumo-valor">${formatarValor(pago)}</strong></div><div class="resumo-card"><span class="resumo-label">Em aberto</span><strong class="resumo-valor">${formatarValor(Math.max(0, previsto - pago))}</strong></div>`;
        const eventosPorDia = new Map();
        pagamentosPrevistos.forEach(item => {
            const lista = eventosPorDia.get(item.dia) || [];
            lista.push(item);
            eventosPorDia.set(item.dia, lista);
        });
        const cabecalhos = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
        let html = cabecalhos.map(dia => `<div class="calendar-weekday" role="columnheader">${dia}</div>`).join("");
        for (let i = 0; i < deslocamento; i++) html += '<div class="calendar-day is-empty" aria-hidden="true"></div>';
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const itens = eventosPorDia.get(dia) || [];
            const ehHoje = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mesNumero && hoje.getDate() === dia;
            html += `<div class="calendar-day${ehHoje ? " is-today" : ""}" role="gridcell"><span class="calendar-day-number">${dia}</span>${itens.map(item => { const status = item.pago >= item.valor ? "Paga" : item.pago > 0 ? "Pago parcial" : "A pagar"; const classeStatus = item.pago >= item.valor ? "is-paid" : item.pago > 0 ? "is-partial" : "is-due"; const botaoPagar = item.valorAberto > 0 ? `<button type="button" class="calendar-pay-button" data-id="${escaparHtml(item.id)}" data-parcela="${item.pontual ? item.parcela : ""}" data-valor="${item.valorAberto}" data-dia="${dia}">Pagar</button>` : ""; return `<div class="calendar-event-wrap"><a class="calendar-event ${classeStatus}" href="dividas.html" title="${escaparHtml(item.nome)}"><strong>${escaparHtml(item.nome)}</strong><span>${formatarValor(item.valor)}${item.pago > 0 && item.pago < item.valor ? ` - pago ${formatarValor(item.pago)}` : ""}</span><small><span class="payment-status ${classeStatus}">${status}</span>${item.pontual ? `Parcela ${item.parcela}/${item.totalParcelas} - faltam ${item.faltam}` : "Recorrente"}</small></a>${botaoPagar}</div>`; }).join("")}</div>`;
        }
        const celulasFaltando = (7 - ((deslocamento + diasNoMes) % 7)) % 7;
        for (let i = 0; i < celulasFaltando; i++) html += '<div class="calendar-day is-empty" aria-hidden="true"></div>';
        grade.innerHTML = html;
    }

    document.getElementById("mesAnteriorCalendario").addEventListener("click", () => {
        const [ano, mes] = inputMes.value.split("-").map(Number);
        const anterior = new Date(ano, mes - 2, 1);
        inputMes.value = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
        renderizar();
    });
    document.getElementById("mesProximoCalendario").addEventListener("click", () => {
        const [ano, mes] = inputMes.value.split("-").map(Number);
        const proximo = new Date(ano, mes, 1);
        inputMes.value = `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, "0")}`;
        renderizar();
    });
    inputMes.addEventListener("change", renderizar);
    renderizar();
}

if (document.getElementById("gradeCalendarioDividas")) iniciarCalendario();

function desenharGraficoBarras(canvas, rotulos, conjuntos) {
    if (!canvas) return;
    const moedaGrafico = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const model = canvas._chartModel || { rotulos: [], conjuntos: [], ocultas: new Set(), selecao: null };
    model.rotulos = rotulos;
    model.conjuntos = conjuntos;
    canvas._chartModel = model;
    const dica = canvas._chartTooltip || document.createElement("div");
    if (!canvas._chartTooltip) {
        dica.className = "chart-tooltip";
        dica.setAttribute("role", "status");
        canvas.parentElement.appendChild(dica);
        canvas._chartTooltip = dica;
    }
    const desenhar = () => {
        const largura = Math.max(320, canvas.clientWidth || 800), altura = 300;
        const margem = { topo: 42, direita: 20, baixo: 45, esquerda: 70 };
        const areaLargura = largura - margem.esquerda - margem.direita;
        const areaAltura = altura - margem.topo - margem.baixo;
        const maximo = Math.max(0, ...model.conjuntos.flatMap((serie, indice) => model.ocultas.has(indice) ? [] : serie.valores.map(Number)));
        const teto = maximo > 0 ? maximo * 1.15 : 1;
        const grupo = areaLargura / Math.max(model.rotulos.length, 1);
        const larguraBarra = Math.min(44, grupo * .66 / Math.max(model.conjuntos.length, 1));
        let svg = `<svg class="chart-svg" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de barras interativo">`;
        for (let i = 0; i <= 4; i++) {
            const y = margem.topo + areaAltura - areaAltura * i / 4;
            const valor = teto * i / 4;
            const rotulo = valor >= 1000 ? `${(valor / 1000).toFixed(1)} mil` : Math.round(valor).toString();
            svg += `<line class="chart-gridline" x1="${margem.esquerda}" y1="${y}" x2="${largura - margem.direita}" y2="${y}"/><text class="chart-axis-label" x="${margem.esquerda - 10}" y="${y + 4}" text-anchor="end">${rotulo}</text>`;
        }
        if (maximo <= 0) svg += `<text class="chart-empty-label" x="${margem.esquerda + areaLargura / 2}" y="${margem.topo + areaAltura / 2}" text-anchor="middle">Sem dados para o mês selecionado</text>`;
        model.rotulos.forEach((rotulo, indice) => {
            const centro = margem.esquerda + grupo * (indice + .5);
            model.conjuntos.forEach((serie, numeroSerie) => {
                if (model.ocultas.has(numeroSerie)) return;
                const valor = Number(serie.valores[indice] || 0);
                if (valor <= 0) return;
                const barraAltura = areaAltura * valor / teto;
                const x = centro + (numeroSerie - (model.conjuntos.length - 1) / 2) * larguraBarra - larguraBarra / 2;
                const y = margem.topo + areaAltura - barraAltura;
                const selecionada = model.selecao?.indice === indice && model.selecao?.serie === numeroSerie;
                svg += `<rect class="chart-bar${selecionada ? " is-selected" : ""}" x="${x}" y="${y}" width="${larguraBarra}" height="${Math.max(3, barraAltura)}" rx="7" fill="${serie.cor}" tabindex="0" role="button" aria-label="${escaparHtml(`${rotulo}: ${moedaGrafico(valor)}`)}" data-chart-bar="true" data-index="${indice}" data-series="${numeroSerie}" data-value="${valor}"><title>${escaparHtml(`${rotulo} · ${serie.nome}: ${moedaGrafico(valor)}`)}</title></rect>`;
            });
            svg += `<text class="chart-axis-label chart-x-label" x="${centro}" y="${altura - 17}" text-anchor="middle">${escaparHtml(rotulo)}</text>`;
        });
        let legendaX = margem.esquerda, legendaY = 16;
        model.conjuntos.forEach((serie, indice) => {
            const larguraLegenda = Math.min(220, serie.nome.length * 7.2 + 28);
            if (legendaX + larguraLegenda > largura - 12 && legendaX > margem.esquerda) {
                legendaX = margem.esquerda;
                legendaY += 20;
            }
            const opacidade = model.ocultas.has(indice) ? ".38" : "1";
            svg += `<g class="chart-legend-item" opacity="${opacidade}" tabindex="0" role="button" aria-label="Alternar ${escaparHtml(serie.nome)}" data-chart-legend="${indice}"><circle cx="${legendaX + 5}" cy="${legendaY}" r="5" fill="${serie.cor}"/><text x="${legendaX + 15}" y="${legendaY + 4}">${escaparHtml(serie.nome)}</text></g>`;
            legendaX += larguraLegenda;
        });
        canvas.innerHTML = `${svg}</svg>`;
    };
    canvas._drawChart = desenhar;
    desenhar();
    if (canvas.dataset.chartEventsBound) return;
    canvas.dataset.chartEventsBound = "true";
    canvas.addEventListener("pointermove", event => {
        const bar = event.target.closest?.("[data-chart-bar]");
        const legend = event.target.closest?.("[data-chart-legend]");
        if (bar) {
            const serie = canvas._chartModel.conjuntos[Number(bar.dataset.series)];
            dica.innerHTML = `<strong>${escaparHtml(canvas._chartModel.rotulos[Number(bar.dataset.index)])}</strong><span>${escaparHtml(serie.nome)}</span><b>${moedaGrafico(Number(bar.dataset.value))}</b><small>Clique para detalhar</small>`;
            dica.classList.add("visible");
        } else if (legend) {
            dica.textContent = `${canvas._chartModel.conjuntos[Number(legend.dataset.chartLegend)].nome}: clique para mostrar ou ocultar`;
            dica.classList.add("visible");
        } else {
            dica.classList.remove("visible");
        }
        canvas.style.cursor = bar || legend ? "pointer" : "default";
        if (bar || legend) {
            const plot = canvas.parentElement.getBoundingClientRect();
            dica.style.left = `${Math.max(8, Math.min(event.clientX - plot.left + 12, plot.width - dica.offsetWidth - 8))}px`;
            dica.style.top = `${Math.max(8, event.clientY - plot.top - dica.offsetHeight - 10)}px`;
        }
    });
    canvas.addEventListener("pointerleave", () => { dica.classList.remove("visible"); canvas.style.cursor = "default"; });
    const ativarAlvo = target => {
        const legend = target.closest?.("[data-chart-legend]");
        if (legend) {
            const indice = Number(legend.dataset.chartLegend);
            canvas._chartModel.ocultas.has(indice) ? canvas._chartModel.ocultas.delete(indice) : canvas._chartModel.ocultas.add(indice);
            canvas._drawChart();
            return;
        }
        const bar = target.closest?.("[data-chart-bar]");
        if (!bar) return;
        const indice = Number(bar.dataset.index), serie = Number(bar.dataset.series), valor = Number(bar.dataset.value);
        canvas._chartModel.selecao = { indice, serie };
        const rotulo = canvas._chartModel.rotulos[indice];
        canvas._drawChart();
        canvas.dispatchEvent(new CustomEvent("chartselect", { detail: { indice, serie, valor, rotulo, nomeSerie: canvas._chartModel.conjuntos[serie].nome } }));
    };
    canvas.addEventListener("click", event => ativarAlvo(event.target));
    canvas.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-chart-bar], [data-chart-legend]")) {
            event.preventDefault();
            ativarAlvo(event.target);
        }
    });
    if (typeof ResizeObserver !== "undefined" && !canvas._chartResizeObserver) {
        canvas._chartResizeObserver = new ResizeObserver(() => canvas._drawChart());
        canvas._chartResizeObserver.observe(canvas);
    } else if (!canvas.dataset.chartResizeBound) {
        window.addEventListener("resize", () => canvas._drawChart());
        canvas.dataset.chartResizeBound = "true";
    }
}

function diferencaMeses(mesA, mesB) {
    if (!mesA || !mesB) return -1;
    const [anoA, numeroA] = mesA.split("-").map(Number);
    const [anoB, numeroB] = mesB.split("-").map(Number);
    return (anoB - anoA) * 12 + numeroB - numeroA;
}

function obterResumoMes(mesChave) {
    const despesas = carregarDividas().reduce((resumo, divida) => {
        const dataInicio = divida.data || (divida.inicio ? `${divida.inicio}-01` : "");
        const distancia = diferencaMeses(dataInicio.slice(0, 7), mesChave);
        const pontual = (divida.tipo || "pontual") === "pontual";
        const parcelas = Math.max(1, Number(divida.parcelas || 1));
        const ativa = distancia >= 0 && (!pontual || distancia < parcelas);
        if (!ativa) return resumo;
        resumo.previsto += pontual ? Number(divida.valor || 0) / parcelas : Number(divida.valor || 0);
        resumo.pago += (divida.pagamentos || []).filter(pagamento => pagamento.data?.startsWith(mesChave)).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
        return resumo;
    }, { previsto: 0, pago: 0 });
    resumo.emAberto = Math.max(0, despesas.previsto - despesas.pago);
    resumo.receitas = JSON.parse(localStorage.getItem("financeiro_receitas") || "[]")
        .filter(item => item.data?.startsWith(mesChave))
        .reduce((soma, item) => soma + Number(item.valor || 0), 0);
    resumo.receitasSemDeposito = JSON.parse(localStorage.getItem("financeiro_receitas") || "[]")
        .filter(item => item.data?.startsWith(mesChave) && !item.contaId)
        .reduce((soma, item) => soma + Number(item.valor || 0), 0);
    resumo.saldoContas = carregarContas().reduce((soma, conta) => soma + Number(conta.valor || 0), 0);
    resumo.saldoProjetado = resumo.saldoContas + resumo.receitasSemDeposito - resumo.emAberto;
    return resumo;
}

function atualizarResumoFinanceiroMensal() {
    const mesInput = document.getElementById("mesResumoFinanceiro");
    if (!mesInput) return;
    if (!mesInput.value) {
        const agora = new Date();
        mesInput.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    }
    const resumo = obterResumoMes(mesInput.value);
    const campos = {
        receitasMes: resumo.receitas,
        despesasPrevistasMes: resumo.previsto,
        despesasPagasMes: resumo.pago,
        despesasEmAbertoMes: resumo.emAberto,
        saldoProjetadoMes: resumo.saldoProjetado
    };
    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = formatarMoeda(valor);
    });
}

function iniciarReceitas() {
    const modal = document.getElementById("modalReceita");
    const form = document.getElementById("formReceita");
    if (!modal || !form || !document.getElementById("btnNovaReceita")) return;
    const selectConta = document.getElementById("contaReceita");
    const fechar = () => { modal.classList.add("hidden"); form.reset(); };
    document.getElementById("btnNovaReceita").addEventListener("click", () => {
        const contas = carregarContas();
        selectConta.innerHTML = `<option value="">Registrar sem alterar saldo de conta</option>` + contas.map(conta => `<option value="${escaparHtml(conta.id)}">${escaparHtml(conta.nome)} - ${formatarMoeda(conta.valor)}</option>`).join("");
        const agora = new Date();
        document.getElementById("dataReceita").value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
        modal.classList.remove("hidden");
    });
    ["btnFecharReceita", "btnCancelarReceita"].forEach(id => document.getElementById(id).addEventListener("click", fechar));
    form.addEventListener("submit", event => {
        event.preventDefault();
        const contas = carregarContas();
        const conta = contas.find(item => String(item.id) === String(selectConta.value));
        const receita = {
            id: crypto.randomUUID(),
            descricao: document.getElementById("descricaoReceita").value.trim(),
            valor: Number(document.getElementById("valorReceita").value),
            data: document.getElementById("dataReceita").value,
            contaId: conta?.id || null,
            contaNome: conta?.nome || ""
        };
        if (!receita.descricao || !Number.isFinite(receita.valor) || receita.valor <= 0) return;
        if (conta) {
            conta.valor = Number(conta.valor || 0) + receita.valor;
            salvarContas(contas);
        }
        const receitas = JSON.parse(localStorage.getItem("financeiro_receitas") || "[]");
        receitas.push(receita);
        localStorage.setItem("financeiro_receitas", JSON.stringify(receitas));
        carregarVisaoGeral();
        atualizarResumoFinanceiroMensal();
        fechar();
    });
}

function iniciarGraficos() {
    const despesasCanvas = document.getElementById("graficoDespesas");
    if (despesasCanvas) {
        const mes = document.getElementById("mesGraficoDespesas");
        const agora = new Date();
        mes.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
        const detalhe = document.getElementById("detalheGraficoDespesas");
        const tipoCanonico = item => {
            const tipo = String(item.tipo || "pontual").trim().toLowerCase();
            if (["fixa", "fixed", "despesa_fixa", "divida_fixa", "dívida fixa"].includes(tipo)) return "fixa";
            if (["variavel", "variável", "variable", "despesa_variavel", "divida_variavel", "dívida variável"].includes(tipo)) return "variavel";
            if (["assinatura", "subscription", "recorrente", "recorrência", "recorrencia"].includes(tipo)) return "assinatura";
            return "pontual";
        };
        const mesDoItem = item => {
            const data = item.data || item.dataCompra || item.inicio || item.dataInicio || item.createdAt || "";
            const mesItem = String(data).slice(0, 7);
            return /^\d{4}-\d{2}$/.test(mesItem) ? mesItem : "";
        };
        despesasCanvas.addEventListener("chartselect", event => {
            const tipos = ["fixa", "variavel", "assinatura", "pontual"];
            const tipo = tipos[event.detail.indice];
            const registros = carregarDividas().filter(item => {
                const tipoItem = tipoCanonico(item);
                const inicio = mesDoItem(item);
                const distancia = diferencaMeses(inicio, mes.value);
                return tipoItem === tipo && distancia >= 0 && (tipo !== "pontual" || distancia < Math.max(1, Number(item.parcelas || 1)));
            });
            const itens = registros.map(item => ({
                nome: item.nome || "Despesa sem nome",
                valor: tipo === "pontual" ? Number(item.valor || 0) / Math.max(1, Number(item.parcelas || 1)) : Number(item.valor || 0)
            }));
            const nomes = { fixa: "Despesas fixas", variavel: "Despesas variáveis", assinatura: "Assinaturas", pontual: "Gastos pontuais" };
            detalhe.innerHTML = `<div class="chart-detail-heading"><div><strong>${nomes[tipo]}</strong><span>${itens.length} registro(s) em ${escaparHtml(mes.value)}</span></div><strong>${formatarMoeda(event.detail.valor)}</strong></div>${itens.length ? `<ul>${itens.map(item => `<li><span>${escaparHtml(item.nome)}</span><b>${formatarMoeda(item.valor)}</b></li>`).join("")}</ul>` : ""}`;
            detalhe.classList.add("has-selection");
        });
        function atualizar() {
            const dividas = carregarDividas();
            const tipos = ["fixa", "variavel", "assinatura", "pontual"];
            const totais = tipos.map(tipo => dividas.filter(item => {
                const tipoItem = tipoCanonico(item);
                const inicio = mesDoItem(item);
                const distancia = diferencaMeses(inicio, mes.value);
                if (tipoItem !== tipo || distancia < 0) return false;
                return tipo !== "pontual" || distancia < Math.max(1, Number(item.parcelas || 1));
            }).reduce((soma, item) => {
                const valor = Number(item.valor || 0);
                return soma + (tipo === "pontual" ? valor / Math.max(1, Number(item.parcelas || 1)) : valor);
            }, 0));
            detalhe.classList.remove("has-selection");
            detalhe.textContent = "Passe o cursor sobre uma barra para ver o valor; clique para detalhar as despesas.";
            desenharGraficoBarras(despesasCanvas, ["Fixas", "Variáveis", "Assinaturas", "Pontuais"], [{ nome: "Valor mensal", valores: totais, cor: "#5664e8" }]);
        }
        mes.addEventListener("change", atualizar);
        window.atualizarGraficoDespesas = atualizar;
        window.addEventListener("storage", event => {
            if (event.key === "financeiro_dividas") atualizar();
        });
        atualizar();
    }

    const cartoesCanvas = document.getElementById("graficoCartoes");
    if (cartoesCanvas) {
        const mesFiltro = document.getElementById("filtroMesCartoes");
        function atualizar() {
            const dividas = carregarDividas().filter(item => (item.formaPagamento || (item.cartao ? "cartao_proprio" : "")).startsWith("cartao_"));
            const fim = mesFiltro.value || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
            const meses = Array.from({ length: 6 }, (_, i) => {
                const [ano, numero] = fim.split("-").map(Number);
                const data = new Date(ano, numero - 1 - (5 - i), 1);
                return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
            });
            const valores = responsavel => meses.map(mes => dividas.filter(item => {
                const data = item.data ? item.data.slice(0, 7) : item.inicio;
                const pessoa = item.responsavelCompra || "eu";
                return data === mes && pessoa === responsavel;
            }).reduce((soma, item) => soma + Number(item.valor || 0), 0));
            desenharGraficoBarras(cartoesCanvas, meses.map(mes => mes.slice(5)), [
                { nome: "Minhas compras", valores: valores("eu"), cor: "#5664e8" },
                { nome: "De outras pessoas", valores: valores("outra_pessoa"), cor: "#ed765e" }
            ]);
        }
        mesFiltro.addEventListener("change", atualizar); atualizar();
    }

    const investimentosCanvas = document.getElementById("graficoInvestimentos");
    if (investimentosCanvas) {
        const mesFiltro = document.getElementById("filtroMesInvestimentos");
        function atualizar() {
            const movimentos = JSON.parse(localStorage.getItem("financeiro_investimentos") || "[]");
            const fim = mesFiltro.value || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
            const meses = Array.from({ length: 6 }, (_, i) => {
                const [ano, numero] = fim.split("-").map(Number);
                const data = new Date(ano, numero - 1 - (5 - i), 1);
                return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
            });
            const totais = tipo => meses.map(mes => movimentos.filter(item => item.data.startsWith(mes) && item.tipo === tipo).reduce((soma, item) => soma + Number(item.valor || 0), 0));
            desenharGraficoBarras(investimentosCanvas, meses.map(mes => mes.slice(5)), [
                { nome: "Aportes", valores: totais("aporte"), cor: "#16a085" },
                { nome: "Resgates", valores: totais("resgate"), cor: "#e9a23b" }
            ]);
        }
        mesFiltro.addEventListener("change", atualizar); atualizar();
    }
}

iniciarGraficos();

function escaparHtml(valor) {
    const entidade = nome => `${String.fromCharCode(38)}${nome};`;
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": entidade("amp"), "<": entidade("lt"), ">": entidade("gt"), '"': entidade("quot")
    })[caractere] || caractere);
}

function calcularAbatimentoParcelas(divida, quantidade, saldoRestante = null) {
    const totalParcelas = Math.max(1, Number(divida.parcelas || 1));
    const valorParcela = Number(divida.valor || 0) / totalParcelas;
    const limite = Math.min(totalParcelas, Math.max(1, Number(quantidade || 1)));
    const pagos = Array.from({ length: totalParcelas }, (_, indice) =>
        (divida.pagamentos || []).filter(p => Number(p.parcela) === indice + 1).reduce((soma, p) => soma + Number(p.valor || 0), 0));
    let restanteGeral = saldoRestante == null ? Infinity : Math.max(0, Number(saldoRestante));
    const abatimentos = [];
    for (let i = 0; i < totalParcelas && abatimentos.length < limite && restanteGeral > 0; i++) {
        const restanteParcela = Math.max(0, valorParcela - pagos[i]);
        if (!restanteParcela) continue;
        const valor = Math.min(restanteParcela, restanteGeral);
        abatimentos.push({ parcela: i + 1, valor });
        restanteGeral -= valor;
    }
    return abatimentos;
}

function salvarAbatimentoDivida(divida, valor, data, contaId = null, quantidadeParcelas = 0, parcelaForcada = null) {
    let nomeConta = "";
    if (contaId) {
        const contas = carregarContas();
        const conta = contas.find(item => String(item.id) === String(contaId));
        if (!conta || Number(conta.valor || 0) < valor) return false;
        nomeConta = conta.nome || "";
        conta.valor = Number(conta.valor || 0) - valor;
        salvarContas(contas);
    }
    divida.pagamentos = divida.pagamentos || [];
    const parcelas = quantidadeParcelas ? calcularAbatimentoParcelas(divida, quantidadeParcelas, valor) : [];
    const pagamentos = parcelas.length ? parcelas : [{ parcela: Number(parcelaForcada) || null, valor }];
    const novosPagamentos = pagamentos.map(item => ({ id: crypto.randomUUID(), valor: item.valor, data, parcela: item.parcela, contaId, contaNome: nomeConta }));
    divida.pagamentos.push(...novosPagamentos);
    const historico = JSON.parse(localStorage.getItem("financeiro_historico") || "[]");
    novosPagamentos.forEach(item => historico.push({
        id: item.id, tipo: "Pagamento de dívida", data, valor: item.valor,
        dividaId: divida.id, descricao: divida.nome || "Dívida", parcela: item.parcela,
        contaId, contaNome: nomeConta
    }));
    localStorage.setItem("financeiro_historico", JSON.stringify(historico));
    salvarDividas(carregarDividas().map(item => String(item.id) === String(divida.id) ? divida : item));
    return true;
}

function iniciarMovimentacoes() {
    const lista = document.getElementById("listaMovimentacoes");
    const filtro = document.getElementById("filtroMesMovimentacoes");
    if (!lista || !filtro) return;
    if (!filtro.value) {
        const hoje = new Date();
        filtro.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    }
    function renderizar() {
        const contas = carregarContas();
        const historico = [];
        const localizarConta = id => contas.find(conta => String(conta.id) === String(id))?.nome || "Conta removida";
        const pagamentosSalvos = JSON.parse(localStorage.getItem("financeiro_historico") || "[]").filter(item => item.tipo === "Pagamento de dívida");
        const idsPagamentosSalvos = new Set(pagamentosSalvos.map(item => String(item.id)));
        pagamentosSalvos.forEach(pagamento => historico.push({
            data: pagamento.data || "", tipo: pagamento.tipo,
            descricao: `${pagamento.descricao || "Dívida"}${pagamento.parcela ? ` - parcela ${pagamento.parcela}` : ""}`,
            conta: pagamento.contaNome || (pagamento.contaId ? localizarConta(pagamento.contaId) : "Sem conta associada"),
            valor: -Number(pagamento.valor || 0)
        }));
        carregarDividas().forEach(divida => (divida.pagamentos || []).filter(pagamento => !idsPagamentosSalvos.has(String(pagamento.id))).forEach(pagamento => historico.push({
            data: pagamento.data || "",
            tipo: "Pagamento de dívida",
            descricao: `${divida.nome || "Dívida"}${pagamento.parcela ? ` - parcela ${pagamento.parcela}` : ""}`,
            conta: pagamento.contaNome || (pagamento.contaId ? localizarConta(pagamento.contaId) : "Sem conta associada"),
            valor: -Number(pagamento.valor || 0)
        })));
        JSON.parse(localStorage.getItem("financeiro_transferencias") || "[]").forEach(item => historico.push({
            data: item.data || "", tipo: "Transferência",
            descricao: `${item.origemNome || "Conta"} → ${item.destinoNome || "Conta"}`,
            conta: `${item.origemNome || localizarConta(item.origemId)} → ${item.destinoNome || localizarConta(item.destinoId)}`,
            valor: Number(item.valor || 0)
        }));
        JSON.parse(localStorage.getItem("financeiro_receitas") || "[]").forEach(item => historico.push({
            data: item.data || "", tipo: "Receita", descricao: item.descricao || "Receita",
            conta: item.contaNome || (item.contaId ? localizarConta(item.contaId) : "Sem depósito associado"), valor: Number(item.valor || 0)
        }));
        const filtrado = historico.filter(item => !filtro.value || item.data.startsWith(filtro.value)).sort((a, b) => b.data.localeCompare(a.data));
        lista.innerHTML = `<div class="tabela-responsiva"><table class="tabela-dividas"><thead><tr><th>Data</th><th>Movimento</th><th>Descrição</th><th>Conta / origem</th><th>Valor</th></tr></thead><tbody>${filtrado.length ? filtrado.map(item => `<tr><td>${formatarData(item.data)}</td><td>${escaparHtml(item.tipo)}</td><td>${escaparHtml(item.descricao)}</td><td>${escaparHtml(item.conta)}</td><td class="${item.tipo === "Transferência" ? "amount-neutral" : item.valor < 0 ? "amount-out" : "amount-in"}">${formatarMoeda(item.valor)}</td></tr>`).join("") : '<tr><td colspan="5">Nenhuma movimentação neste mês.</td></tr>'}</tbody></table></div>`;
    }
    filtro.addEventListener("change", renderizar);
    renderizarMovimentacoes = renderizar;
    renderizar();
}

function adicionarAcoesExcluir(container, seletor, registros, descricao, excluir) {
    container.querySelectorAll(seletor).forEach(botao => {
        const id = botao.dataset.id;
        const registro = registros.find(item => String(item.id) === String(id));
        if (!registro) return;
        const acao = document.createElement("button");
        acao.type = "button";
        acao.className = "btn-excluir";
        acao.textContent = "Excluir";
        acao.setAttribute("aria-label", `Excluir ${descricao(registro)}`);
        const grupo = document.createElement("span");
        grupo.className = "acoes-registro";
        botao.before(grupo);
        grupo.append(botao, acao);
        acao.addEventListener("click", () => {
            const nome = descricao(registro);
            if (confirm(`Excluir ${nome}? Essa ação não pode ser desfeita.`)) excluir(id, registro);
        });
    });
}

function iniciarRelatorio() {
    const inicioInput = document.getElementById("relatorioInicio");
    const fimInput = document.getElementById("relatorioFim");
    const conteudo = document.getElementById("conteudoRelatorio");
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const ultimoDia = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0);
    const iso = data => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    inicioInput.value = iso(inicioMes);
    fimInput.value = iso(ultimoDia);

    function renderizar() {
        const inicio = inicioInput.value;
        const fim = fimInput.value;
        if (!inicio || !fim || inicio > fim) {
            conteudo.innerHTML = '<p class="report-error">Informe um intervalo de datas válido.</p>';
            return false;
        }
        const dentroDoPeriodo = data => Boolean(data && data >= inicio && data <= fim);
        const mesesPeriodo = [];
        for (let cursor = new Date(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1, 1), limite = new Date(Number(fim.slice(0, 4)), Number(fim.slice(5, 7)) - 1, 1); cursor <= limite; cursor.setMonth(cursor.getMonth() + 1)) {
            mesesPeriodo.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
        }
        const contas = carregarContas();
        const dividas = carregarDividas().map(item => {
            const dataRelatorio = item.data || (item.inicio ? `${item.inicio}-01` : "");
            const tipo = item.tipo || "pontual";
            const inicioMesRelatorio = dataRelatorio.slice(0, 7);
            const quantidadeParcelas = Math.max(1, Number(item.parcelas || 1));
            const mesesAtivos = mesesPeriodo.filter(mes => {
                const distancia = diferencaMeses(inicioMesRelatorio, mes);
                return distancia >= 0 && (tipo !== "pontual" || distancia < quantidadeParcelas);
            });
            const valorParcela = Number(item.valor || 0) / quantidadeParcelas;
            const valorPeriodo = (tipo === "pontual" ? valorParcela : Number(item.valor || 0)) * mesesAtivos.length;
            const pagamentos = (item.pagamentos || []).map(pagamento => ({ ...pagamento, valor: Number(pagamento.valor || 0) }));
            const pagamentosPeriodo = pagamentos.filter(pagamento => dentroDoPeriodo(pagamento.data));
            const valorPagoTotal = pagamentos.reduce((soma, pagamento) => soma + pagamento.valor, 0);
            const abatidoPeriodo = pagamentosPeriodo.reduce((soma, pagamento) => soma + pagamento.valor, 0);
            return { ...item, dataRelatorio, tipo, mesesAtivos, valorParcela, valorPeriodo, pagamentosPeriodo, valorPagoTotal, abatidoPeriodo, saldoAberto: Math.max(0, Number(item.valor || 0) - valorPagoTotal) };
        }).filter(item => item.valorPeriodo > 0 || item.abatidoPeriodo > 0);
        const cartoes = dividas.filter(item => (item.formaPagamento || (item.cartao ? "cartao_proprio" : "")).startsWith("cartao_"));
        const todosEmprestimos = JSON.parse(localStorage.getItem("financeiro_emprestimos") || "[]").map(item => ({
            ...item,
            dataRelatorio: item.data || (item.inicio ? `${item.inicio}-01` : "")
        }));
        const emprestimos = todosEmprestimos.filter(item => dentroDoPeriodo(item.dataRelatorio));
        const investimentos = JSON.parse(localStorage.getItem("financeiro_investimentos") || "[]").filter(item => dentroDoPeriodo(item.data));
        const totalDespesas = dividas.reduce((total, item) => total + item.valorPeriodo, 0);
        const totalAbatidoPeriodo = dividas.reduce((total, item) => total + item.abatidoPeriodo, 0);
        const totalAReceber = todosEmprestimos.filter(item => item.direcao === "emprestei").reduce((total, item) => total + Math.max(0, Number(item.valor || 0) - Number(item.pago || 0)), 0);
        const totalAPagar = todosEmprestimos.filter(item => item.direcao === "recebi").reduce((total, item) => total + Math.max(0, Number(item.valor || 0) - Number(item.pago || 0)), 0);
        const totalInvestido = investimentos.reduce((total, item) => total + (item.tipo === "resgate" ? -Number(item.valor || 0) : Number(item.valor || 0)), 0);
        const moeda = value => formatarMoeda(Number(value || 0));
        const tabela = (cabecalhos, linhas, vazio) => `<div class="table-responsive report-table-wrap"><table class="table table-hover align-middle mb-0 tabela-dividas report-table"><thead><tr>${cabecalhos.map(item => `<th scope="col">${item}</th>`).join("")}</tr></thead><tbody>${linhas.length ? linhas.join("") : `<tr><td colspan="${cabecalhos.length}" class="text-center text-secondary py-4">${vazio}</td></tr>`}</tbody></table></div>`;
        const tipoNome = { fixa: "Fixa", variavel: "Variável", assinatura: "Assinatura", pontual: "Gasto pontual" };
        const formaNome = { cartao_proprio: "Cartão próprio", cartao_terceiros: "Cartão de terceiros", pix: "Pix", dinheiro: "Dinheiro / físico" };
        document.title = `Relatório financeiro ${inicio} a ${fim}`;
        conteudo.innerHTML = `
            <header class="report-print-header"><h1>Relatório financeiro</h1><p>Período: ${formatarData(inicio)} a ${formatarData(fim)} · Gerado em ${formatarData(iso(new Date()))}</p></header>
            <section class="report-section"><h2>Resumo do período</h2><div class="resumo-grid report-summary">
                <div class="resumo-card"><span class="resumo-label">Despesas cadastradas</span><strong class="resumo-valor">${moeda(totalDespesas)}</strong><p>${dividas.filter(item => item.valorPeriodo > 0).length} registro(s)</p></div>
                <div class="resumo-card"><span class="resumo-label">Abatimentos no período</span><strong class="resumo-valor">${moeda(totalAbatidoPeriodo)}</strong><p>Pagamentos registrados</p></div>
                <div class="resumo-card"><span class="resumo-label">Compras no cartão</span><strong class="resumo-valor">${moeda(cartoes.reduce((soma, item) => soma + item.valorPeriodo, 0))}</strong><p>${cartoes.length} registro(s), também detalhados em Dívidas</p></div>
                <div class="resumo-card"><span class="resumo-label">Empréstimos a pagar</span><strong class="resumo-valor">${moeda(totalAPagar)}</strong><p>Saldo aberto com terceiros</p></div>
                <div class="resumo-card"><span class="resumo-label">Empréstimos a receber</span><strong class="resumo-valor">${moeda(totalAReceber)}</strong><p>Saldo aberto emprestado</p></div>
                <div class="resumo-card"><span class="resumo-label">Investimentos líquidos</span><strong class="resumo-valor">${moeda(totalInvestido)}</strong><p>Aportes menos resgates no período</p></div>
            </div></section>
            <section class="report-section"><h2>Contas e saldos atuais</h2>${tabela(["Conta", "Tipo", "Saldo"], contas.map(item => `<tr><td>${escaparHtml(item.nome)}</td><td>${escaparHtml(item.tipo)}</td><td>${moeda(item.valor)}</td></tr>`), "Nenhuma conta cadastrada.")}</section>
            <section class="report-section"><h2>Dívidas e despesas</h2><p class="report-note">Despesas recorrentes são contabilizadas em cada mês do período desde a data de início. Gastos pontuais são considerados pela data da compra.</p>${tabela(["Data / início", "Tipo", "Descrição", "Valor no período", "Frequência / parcelas", "Pagamento", "Cartão", "Comprador"], dividas.filter(item => item.valorPeriodo > 0).map(item => {
                const forma = item.formaPagamento || (item.cartao ? "cartao_proprio" : "pix");
                const comprador = forma.startsWith("cartao_") ? (item.responsavelCompra === "outra_pessoa" ? item.pessoaCompra || "Outra pessoa" : "Eu") : "-";
                const cartao = forma.startsWith("cartao_") ? `${item.cartao || "-"}${forma === "cartao_terceiros" ? ` (${item.titularCartao || "titular não informado"})` : ""}` : "-";
                const dataTexto = item.tipo === "pontual" ? formatarData(item.dataRelatorio) : `Mensal desde ${formatarData(item.dataRelatorio)}`;
                const frequencia = item.tipo === "pontual" ? `Pontual${Number(item.parcelas || 1) > 1 ? ` · ${item.parcelas} parcelas` : ""}` : `${item.mesesAtivos.length} mês(es)`;
                return `<tr><td>${dataTexto}</td><td>${tipoNome[item.tipo] || "Gasto pontual"}</td><td>${escaparHtml(item.nome)}${item.descricao ? ` · ${escaparHtml(item.descricao)}` : ""}</td><td>${moeda(item.valorPeriodo)}</td><td>${frequencia}</td><td>${formaNome[forma] || "-"}</td><td>${escaparHtml(cartao)}</td><td>${escaparHtml(comprador)}</td></tr>`;
            }), "Nenhuma despesa no período.")}</section>
            <section class="report-section"><h2>Abatimentos de dívidas</h2><p class="report-note">Pagamentos registrados no período selecionado. O saldo considera todos os pagamentos registrados.</p>${tabela(["Dívida", "Data do abatimento", "Valor abatido", "Total pago", "Saldo em aberto"], dividas.flatMap(item => item.pagamentosPeriodo.map(pagamento => `<tr><td>${escaparHtml(item.nome || "Dívida")}</td><td>${formatarData(pagamento.data)}</td><td>${moeda(pagamento.valor)}</td><td>${moeda(item.valorPagoTotal)}</td><td>${moeda(item.saldoAberto)}</td></tr>`)), "Nenhum abatimento no período.")}</section>
            <section class="report-section"><h2>Compras no cartão</h2><p class="report-note">Detalhamento das compras acima; não somar novamente ao total de despesas.</p>${tabela(["Data / início", "Compra", "Cartão", "Titular do cartão", "Comprador", "Valor no período", "Frequência / parcelas"], cartoes.map(item => `<tr><td>${item.tipo === "pontual" ? formatarData(item.dataRelatorio) : `Mensal desde ${formatarData(item.dataRelatorio)}`}</td><td>${escaparHtml(item.nome)}</td><td>${escaparHtml(item.cartao || "-")}</td><td>${escaparHtml(item.titularCartao || "Meu cartão")}</td><td>${escaparHtml(item.responsavelCompra === "outra_pessoa" ? item.pessoaCompra || "Outra pessoa" : "Eu")}</td><td>${moeda(item.valorPeriodo)}</td><td>${item.tipo === "pontual" ? `${Number(item.parcelas || 1)}x` : `${item.mesesAtivos.length} mês(es)`}</td></tr>`), "Nenhuma compra no cartão no período.")}</section>
            <section class="report-section"><h2>Empréstimos</h2>${tabela(["Data", "Movimento", "Pessoa / instituição", "Valor original", "Pago / recebido", "Saldo em aberto"], emprestimos.map(item => `<tr><td>${formatarData(item.dataRelatorio)}</td><td>${item.direcao === "emprestei" ? "Emprestei · a receber" : "Peguei · a pagar"}</td><td>${escaparHtml(item.pessoa)}</td><td>${moeda(item.valor)}</td><td>${moeda(item.pago)}</td><td>${moeda(Math.max(0, Number(item.valor || 0) - Number(item.pago || 0)))}</td></tr>`), "Nenhum empréstimo no período.")}</section>
            <section class="report-section"><h2>Investimentos</h2>${tabela(["Data", "Movimentação", "Investimento", "Valor", "Observações"], investimentos.map(item => `<tr><td>${formatarData(item.data)}</td><td>${item.tipo === "resgate" ? "Resgate" : "Aporte"}</td><td>${escaparHtml(item.nome)}</td><td>${moeda(item.valor)}</td><td>${escaparHtml(item.descricao || "-")}</td></tr>`), "Nenhuma movimentação de investimento no período.")}</section>`;
        const tiposDasSecoes = ["resumo", "contas", "dividas", "dividas", "cartoes", "emprestimos", "investimentos"];
        conteudo.querySelectorAll(".report-section").forEach((secao, indice) => {
            secao.dataset.reportSection = tiposDasSecoes[indice] || "";
        });
        return true;
    }
    const opcoesSecoes = [...document.querySelectorAll('input[name="secoesRelatorio"]')];
    document.getElementById("btnSelecionarTodasSecoes").addEventListener("click", () => {
        opcoesSecoes.forEach(opcao => { opcao.checked = true; });
    });
    document.getElementById("btnLimparSecoes").addEventListener("click", () => {
        opcoesSecoes.forEach(opcao => { opcao.checked = false; });
    });
    document.getElementById("btnGerarPdf").addEventListener("click", () => {
        const selecionadas = new Set(opcoesSecoes.filter(opcao => opcao.checked).map(opcao => opcao.value));
        if (!selecionadas.size) {
            alert("Selecione pelo menos uma seção para imprimir.");
            return;
        }
        if (!renderizar()) return;
        document.body.dataset.printSections = [...selecionadas].join(" ");
        window.addEventListener("afterprint", () => { delete document.body.dataset.printSections; }, { once: true });
        window.print();
    });
    renderizar();
}

if (document.getElementById("conteudoRelatorio")) iniciarRelatorio();

const mesResumoFinanceiroInput = document.getElementById("mesResumoFinanceiro");
if (mesResumoFinanceiroInput) mesResumoFinanceiroInput.addEventListener("change", atualizarResumoFinanceiroMensal);
iniciarReceitas();
if (document.getElementById("listaMovimentacoes")) iniciarMovimentacoes();
