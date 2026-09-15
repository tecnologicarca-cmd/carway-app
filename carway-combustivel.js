/* =====================================================================
   CARWAY v13.1.0
   1 — TABELA DE UNIDADES
   ===================================================================== */

var COMBUSTIVEIS = {

  'Gasolina': {
    unidade: 'L',  unidadeLonga: 'litros',
    tanque: 'Tanque (L)',
    consumo: 'km/L',
    icone: 'local_gas_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 6.20
  },

  'Etanol': {
    unidade: 'L',  unidadeLonga: 'litros',
    tanque: 'Tanque (L)',
    consumo: 'km/L',
    icone: 'local_gas_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 4.30
  },

  'Flex': {
    unidade: 'L',  unidadeLonga: 'litros',
    tanque: 'Tanque (L)',
    consumo: 'km/L',
    icone: 'local_gas_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 6.20
  },

  'Diesel S10': {
    unidade: 'L',  unidadeLonga: 'litros',
    tanque: 'Tanque (L)',
    consumo: 'km/L',
    icone: 'local_gas_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 6.10
  },

  'Diesel S500': {
    unidade: 'L',  unidadeLonga: 'litros',
    tanque: 'Tanque (L)',
    consumo: 'km/L',
    icone: 'local_gas_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 5.90
  },

  /* ---- GNV: vendido por metro cúbico ---- */
  'GNV': {
    unidade: 'm³', unidadeLonga: 'metros cúbicos',
    tanque: 'Cilindro (m³)',
    consumo: 'km/m³',
    icone: 'propane_tank',
    casasQtd: 3, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 4.50,
    nota: 'O GNV é vendido por metro cúbico (m³). O cilindro do seu ' +
          'veículo costuma ter entre 10 e 20 m³ de capacidade útil.'
  },

  /* ---- Elétrico: carregado por quilowatt-hora ---- */
  'Elétrico': {
    unidade: 'kWh', unidadeLonga: 'quilowatt-hora',
    tanque: 'Bateria (kWh)',
    consumo: 'km/kWh',
    icone: 'ev_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Carregar',
    acao: 'Recarga',
    precoTipico: 1.20,
    nota: 'Carro elétrico consome energia em kWh. Em casa a tarifa ' +
          'costuma ficar perto de R$ 1,00/kWh; em eletroposto rápido ' +
          'pode passar de R$ 2,50/kWh.'
  },

  'Híbrido': {
    unidade: 'L',  unidadeLonga: 'litros',
    tanque: 'Tanque (L)',
    consumo: 'km/L',
    icone: 'local_gas_station',
    casasQtd: 2, casasPreco: 3,
    abastecer: 'Abastecer',
    acao: 'Abastecimento',
    precoTipico: 6.20
  }
};

/* Lista para os seletores, na ordem que faz sentido para o usuário */
var LISTA_COMBUSTIVEIS = [
  'Gasolina', 'Etanol', 'Flex',
  'Diesel S10', 'Diesel S500',
  'GNV', 'Elétrico', 'Híbrido'
];


/* =====================================================================
   2 — FUNÇÕES DE APOIO
   ===================================================================== */

var Comb = {

  /**
   * Devolve a configuração do combustível. Se não reconhecer,
   * cai em litro (comportamento antigo).
   */
  info: function (nome) {
    return COMBUSTIVEIS[String(nome || '').trim()] || COMBUSTIVEIS['Gasolina'];
  },

  /** Unidade curta: L, m³ ou kWh */
  un: function (nome) {
    return Comb.info(nome).unidade;
  },

  /** Rótulo do consumo: km/L, km/m³ ou km/kWh */
  consumo: function (nome) {
    return Comb.info(nome).consumo;
  },

  /** Unidade do combustível de um veículo */
  unVeiculo: function (veiculoId) {
    var v = U.veic(veiculoId);
    return Comb.un(v ? v.combustivel : '');
  },

  /** Rótulo de consumo de um veículo */
  consumoVeiculo: function (veiculoId) {
    var v = U.veic(veiculoId);
    return Comb.consumo(v ? v.combustivel : '');
  },

  /** Formata quantidade com a unidade certa. Ex.: "26,00 L", "12,500 m³" */
  qtd: function (valor, nomeCombustivel) {
    var c = Comb.info(nomeCombustivel);
    return U.num(valor, c.casasQtd) + ' ' + c.unidade;
  },

  /** Formata preço por unidade. Ex.: "R$ 6,199/L" */
  preco: function (valor, nomeCombustivel) {
    return U.moeda(valor) + '/' + Comb.un(nomeCombustivel);
  },

  /** Monta o <select> de combustível */
  opcoes: function (selecionado) {
    return LISTA_COMBUSTIVEIS.map(function (nome) {
      return '<option value="' + nome + '"' +
        (nome === selecionado ? ' selected' : '') + '>' +
        nome + ' (' + COMBUSTIVEIS[nome].unidade + ')</option>';
    }).join('');
  },

  /**
   * Quando a frota tem combustíveis diferentes, "km/L" não serve como
   * rótulo geral. Nesse caso devolve apenas "consumo".
   */
  rotuloGeral: function (listaVeiculos) {
    var unicos = {};
    (listaVeiculos || []).forEach(function (v) {
      unicos[Comb.consumo(v.combustivel)] = 1;
    });
    var chaves = Object.keys(unicos);
    return chaves.length === 1 ? chaves[0] : 'consumo';
  },

  /**
   * Só faz sentido somar quantidades do mesmo combustível.
   * Litro + m³ não existe.
   */
  mesmaUnidade: function (listaVeiculos) {
    var unicos = {};
    (listaVeiculos || []).forEach(function (v) {
      unicos[Comb.un(v.combustivel)] = 1;
    });
    return Object.keys(unicos).length <= 1;
  }
};


/* =====================================================================
   3 — CADASTRO DO VEÍCULO
   ===================================================================== */

App._formVeiculoOriginal = App.formVeiculo;

App.formVeiculo = function (primeiro, id) {
  App._formVeiculoOriginal(primeiro, id);

  /* O modal já está montado. Trocamos o seletor de combustível pela
     versão com unidades e ligamos o ajuste dinâmico do campo tanque. */
  setTimeout(function () {
    var sel = $('fComb');
    if (!sel) return;

    var atual = sel.value;
    sel.innerHTML = Comb.opcoes(atual);
    sel.setAttribute('onchange', 'App.aoTrocarCombustivel()');

    App.aoTrocarCombustivel();
  }, 80);
};

/**
 * Ajusta o rótulo do tanque e mostra a nota do combustível.
 */
App.aoTrocarCombustivel = function () {
  var nome = UI.v('fComb');
  var c = Comb.info(nome);

  /* Rótulo do campo de capacidade */
  var campoTanque = $('fTanque');
  if (campoTanque) {
    var label = campoTanque.parentNode
      ? campoTanque.parentNode.querySelector('label')
      : null;
    if (label) label.textContent = c.tanque;

    campoTanque.setAttribute(
      'placeholder',
      nome === 'GNV' ? '15' : (nome === 'Elétrico' ? '50' : '50')
    );
  }

  /* Nota explicativa, logo abaixo */
  var dica = $('dicaCombustivel');
  if (!dica && campoTanque) {
    var linha = campoTanque.closest('.linha2');
    if (linha) {
      linha.insertAdjacentHTML('afterend',
        '<p class="dica" id="dicaCombustivel"></p>');
      dica = $('dicaCombustivel');
    }
  }

  if (dica) {
    dica.innerHTML = c.nota
      ? '<span class="ms" style="font-size:14px;vertical-align:middle;' +
        'color:var(--azul2)">info</span> ' + c.nota
      : 'O consumo será calculado em <b>' + c.consumo + '</b>.';
  }
};


/* =====================================================================
   4 — LANÇAMENTO DE ABASTECIMENTO / RECARGA
   ===================================================================== */

App.formAbastecimento = function (veicId, id, viagemId) {
  if (!U.temVeiculo()) return;

  var a = id
    ? (DB.abastecimentos.filter(function (x) { return x.id === id; })[0] || {})
    : {};

  var vSel = a.veiculoId || veicId ||
    (VEICULO_SEL !== 'todos' ? VEICULO_SEL : DB.veiculos[0].id);

  var v = U.veic(vSel) || {};
  var combAtual = a.combustivel || v.combustivel || 'Gasolina';
  var c = Comb.info(combAtual);

  var cheio = a.id ? String(a.tanqueCheio).toUpperCase() === 'SIM' : true;
  var vgSel = a.id ? a.viagemId : (viagemId || '');

  var eletrico = (combAtual === 'Elétrico');

  var html = '<div class="form">' +

    UI.seletorVeiculo('fVeic', vSel,
      eletrico ? 'Qual veículo está carregando?' : 'Qual veículo está abastecendo?') +

    /* Combustível primeiro: ele define as unidades dos campos abaixo */
    campo('Combustível / energia',
      '<select id="fComb" onchange="App.aoTrocarCombAbast()">' +
      Comb.opcoes(combAtual) + '</select>') +

    '<p class="dica" id="dicaAbast"></p>' +

    '<div class="linha2">' +
      campo('Data',
        '<input id="fData" type="date" value="' + (a.data || U.hoje()) + '">') +
      campo('KM do painel',
        '<input id="fKm" type="number" inputmode="numeric" value="' +
        (a.km || v.kmAtual || '') + '">') +
    '</div>' +

    '<div class="linha2">' +
      '<div><label id="lblQtd">Quantidade (' + c.unidade + ')</label>' +
      '<input id="fLitros" type="number" inputmode="decimal" step="0.001" value="' +
      (a.litros || '') + '" oninput="App.calcAbast()"></div>' +

      '<div><label id="lblPreco">Preço por ' + c.unidade + '</label>' +
      '<input id="fPreco" type="number" inputmode="decimal" step="0.001" value="' +
      (a.precoLitro || '') + '" oninput="App.calcAbast()"></div>' +
    '</div>' +

    campo('Valor total (R$)',
      '<input id="fTotal" type="number" inputmode="decimal" step="0.01" value="' +
      (a.valorTotal || '') + '" oninput="App.calcAbastInverso()">') +

    '<div class="pr-previa" id="previaAbast"></div>' +

    campo(eletrico ? 'Local da recarga' : 'Posto',
      '<input id="fPosto" value="' + U.esc(a.posto) + '" placeholder="' +
      (eletrico ? 'Casa, shopping, eletroposto…' : 'Nome / local') + '">') +

    '<div class="switch"><span id="lblCheio">' +
      (eletrico ? 'Carregou até 100%?' : 'Completou o tanque?') +
    '</span><input type="checkbox" id="fCheio"' + (cheio ? ' checked' : '') + '></div>' +

    '<div id="boxViagem">' +
      campo('Vincular à viagem',
        '<select id="fViagem">' + UI.optViagens(vgSel, vSel) + '</select>') +
    '</div>' +

    campo('Observações',
      '<textarea id="fObs">' + U.esc(a.obs) + '</textarea>') +

    '</div>';

  UI.modal(
    id ? 'Editar ' + c.acao.toLowerCase() : 'Nov' + (eletrico ? 'a ' : 'o ') + c.acao.toLowerCase(),
    html,
    function () {
      var comb = UI.v('fComb');
      var ci = Comb.info(comb);

      if (UI.n('fKm') <= 0) {
        return UI.toast('Informe o KM do painel', 'erro');
      }
      if (UI.n('fLitros') <= 0) {
        return UI.toast('Informe a quantidade em ' + ci.unidade, 'erro');
      }

      var reg = {
        id: id || '',
        veiculoId: UI.v('fVeic'),
        viagemId: UI.v('fViagem'),
        data: UI.v('fData'),
        km: UI.n('fKm'),
        litros: UI.n('fLitros'),
        precoLitro: UI.n('fPreco'),
        valorTotal: UI.n('fTotal') ||
          Math.round(UI.n('fLitros') * UI.n('fPreco') * 100) / 100,
        posto: UI.v('fPosto'),
        combustivel: comb,
        tanqueCheio: UI.chk('fCheio') ? 'SIM' : 'NAO',
        obs: UI.v('fObs')
      };

      UI.fecharModal();
      UI.load(true, 'Salvando…');

      Offline.salvarComFallback(
        'Abastecimentos',
        reg,
        ci.acao + ' — ' + Comb.qtd(reg.litros, comb)
      )
      .then(function () { return App.aposSalvar(ci.acao + ' salv' + (eletrico ? 'a' : 'o')); })
      .catch(function (e) { UI.load(false); UI.toast(e.message, 'erro'); });
    }
  );

  UI._aoTrocarVeic = function (novoId) {
    var nv = U.veic(novoId);
    if (!nv) return;

    var km = $('fKm');
    if (km && (!km.value || km.value == v.kmAtual)) km.value = nv.kmAtual || '';

    var cb = $('fComb');
    if (cb && nv.combustivel) {
      cb.value = nv.combustivel;
      App.aoTrocarCombAbast();
    }

    setHTML('boxViagem', campo('Vincular à viagem',
      '<select id="fViagem">' + UI.optViagens('', novoId) + '</select>'));

    v = nv;
  };

  setTimeout(App.aoTrocarCombAbast, 70);
};

/**
 * Troca os rótulos de quantidade e preço conforme o combustível.
 */
App.aoTrocarCombAbast = function () {
  var nome = UI.v('fComb');
  var c = Comb.info(nome);
  var eletrico = (nome === 'Elétrico');

  setTexto('lblQtd', 'Quantidade (' + c.unidade + ')');
  setTexto('lblPreco', 'Preço por ' + c.unidade);
  setTexto('lblCheio', eletrico ? 'Carregou até 100%?' : 'Completou o tanque?');

  var campoQtd = $('fLitros');
  if (campoQtd) {
    campoQtd.setAttribute('step', c.casasQtd === 3 ? '0.001' : '0.01');
    campoQtd.setAttribute('placeholder',
      nome === 'GNV' ? '12,500' : (eletrico ? '35,00' : '40,00'));
  }

  var campoPreco = $('fPreco');
  if (campoPreco) {
    campoPreco.setAttribute('placeholder',
      String(c.precoTipico).replace('.', ','));
  }

  var posto = $('fPosto');
  if (posto) {
    posto.setAttribute('placeholder',
      eletrico ? 'Casa, shopping, eletroposto…' : 'Nome / local');
    var lbl = posto.parentNode ? posto.parentNode.querySelector('label') : null;
    if (lbl) lbl.textContent = eletrico ? 'Local da recarga' : 'Posto';
  }

  var dica = $('dicaAbast');
  if (dica) {
    dica.innerHTML = c.nota
      ? '<span class="ms" style="font-size:14px;vertical-align:middle;' +
        'color:var(--azul2)">info</span> ' + c.nota
      : 'Consumo calculado em <b>' + c.consumo + '</b>.';
  }

  App.previaAbast();
};

/**
 * Mostra o resumo do que será lançado, com a unidade certa.
 */
App.previaAbast = function () {
  var el = $('previaAbast');
  if (!el) return;

  var qtd = UI.n('fLitros');
  var preco = UI.n('fPreco');
  var total = UI.n('fTotal');
  var comb = UI.v('fComb');

  if (qtd <= 0 && total <= 0) { el.innerHTML = ''; return; }

  var linhas =
    '<div class="pr-lin"><span>Você vai lançar</span>' +
    '<b>' + Comb.qtd(qtd, comb) +
    (total > 0 ? ' · ' + U.moeda(total) : '') + '</b></div>';

  if (preco > 0) {
    linhas += '<div class="pr-lin"><span>Preço</span>' +
      '<b>' + Comb.preco(preco, comb) + '</b></div>';
  }

  el.innerHTML = linhas;
};

/* Os cálculos originais continuam válidos — só acrescentamos a prévia */
App.calcAbast = function () {
  var q = UI.n('fLitros'), p = UI.n('fPreco');
  var t = $('fTotal');
  if (t && q > 0 && p > 0) t.value = (q * p).toFixed(2);
  App.previaAbast();
};

App.calcAbastInverso = function () {
  var t = UI.n('fTotal'), q = UI.n('fLitros'), p = UI.n('fPreco');
  if (t > 0 && q > 0) {
    var e = $('fPreco');
    if (e) e.value = (t / q).toFixed(3);
  } else if (t > 0 && p > 0) {
    var e2 = $('fLitros');
    if (e2) e2.value = (t / p).toFixed(3);
  }
  App.previaAbast();
};


/* =====================================================================
   5 — LISTAGENS COM A UNIDADE CERTA
   ===================================================================== */

App.renderAbastecimentos = function () {
  if (!temEl('listaAbastecimentos')) return;

  var todos = U.ordData(U.filtraVeic(DB.abastecimentos));
  var deViagem = todos.filter(function (a) { return a.viagemId; });
  var rotina = todos.filter(function (a) { return !a.viagemId; });

  var gasto = 0, gastoViagem = 0, gastoRotina = 0;
  var porUnidade = {};

  todos.forEach(function (a) {
    var val = Number(a.valorTotal) || 0;
    if (val <= 0) val = (Number(a.litros) || 0) * (Number(a.precoLitro) || 0);

    gasto += val;
    if (a.viagemId) gastoViagem += val; else gastoRotina += val;

    /* Soma separada por unidade — litro e m³ não se misturam */
    var un = Comb.un(a.combustivel);
    porUnidade[un] = (porUnidade[un] || 0) + (Number(a.litros) || 0);
  });

  var listaVeic = VEICULO_SEL === 'todos'
    ? DB.veiculos
    : DB.veiculos.filter(function (v) { return v.id === VEICULO_SEL; });

  var med = 0, n = 0;
  listaVeic.forEach(function (v) {
    if (v.consumo && v.consumo.mediaKmL > 0) { med += v.consumo.mediaKmL; n++; }
  });

  /* Texto do total, quebrado por unidade quando houver mistura */
  var textoQtd = Object.keys(porUnidade).map(function (un) {
    var casas = (un === 'm³') ? 3 : (un === 'kWh' ? 1 : 1);
    return U.num(porUnidade[un], casas) + ' ' + un;
  }).join(' · ');

  var rotuloConsumo = Comb.rotuloGeral(listaVeic);

  setHTML('resumoConsumo',
    '<div class="kpi"><span class="ms">payments</span><b>' + U.moeda(gasto) +
    '</b><span class="lbl">Total · ' + (textoQtd || '—') + '</span></div>' +

    '<div class="kpi x"><span class="ms">luggage</span><b>' + U.moeda(gastoViagem) +
    '</b><span class="lbl">Em viagens</span></div>' +

    '<div class="kpi v"><span class="ms">home</span><b>' + U.moeda(gastoRotina) +
    '</b><span class="lbl">Dia a dia</span></div>' +

    '<div class="kpi a"><span class="ms">speed</span><b>' +
    (n ? (med / n).toFixed(2) : '—') +
    ' <small>' + rotuloConsumo + '</small></b><span class="lbl">Média</span></div>');

  /* Explicação do consumo do veículo selecionado */
  var v = U.veicAtual();
  var ex = $('explicaConsumo');

  if (ex && v && v.consumo && VEICULO_SEL !== 'todos') {
    var c = v.consumo;
    var ci = Comb.info(v.combustivel);
    ex.classList.remove('oculto');

    if (c.metodo === 'aguardando' || c.metodo === 'sem-dados') {
      ex.className = 'aviso';
      ex.innerHTML = '<span class="ms">info</span><div>' +
        '<b>Ainda não dá para calcular</b>' +
        (c.abastecimentos
          ? 'Registre o próximo ' + ci.acao.toLowerCase() + ' com o KM do painel.'
          : 'Registre o primeiro ' + ci.acao.toLowerCase() + '.') +
        '</div>';
    } else {
      ex.className = 'aviso info';
      ex.innerHTML = '<span class="ms">calculate</span><div>' +
        '<b>Consumo de ' + U.esc(v.nome) + '</b>' +
        (c.metodo === 'tanque-cheio'
          ? c.completos + ' abastecimento(s) completo(s) — <b>' +
            c.mediaTanqueCheio + ' ' + ci.consumo + '</b>.'
          : U.num(c.kmPercorrido) + ' km ÷ ' +
            U.num(c.litrosUsados, ci.casasQtd) + ' ' + ci.unidade +
            ' = <b>' + c.mediaAcumulada + ' ' + ci.consumo + '</b>.') +
        (c.trechosDescartados
          ? '<br><b>' + c.trechosDescartados + ' trecho(s) ignorado(s)</b> — ' +
            'consumo fora de ' + c.limiteMin + '–' + c.limiteMax + ' ' + ci.consumo + '.'
          : '') +
        '</div>';
    }
  } else if (ex) {
    ex.classList.add('oculto');
  }

  function render(lista, alvo, vazioTxt) {
    setHTML(alvo, lista.length ? lista.map(function (a) {
      var cheio = String(a.tanqueCheio).toUpperCase() === 'SIM';
      var vg = a.viagemId ? U.viagem(a.viagemId) : null;
      var cor = U.hexVeic(a.veiculoId);
      var ci = Comb.info(a.combustivel);
      var eletrico = (a.combustivel === 'Elétrico');

      return '<div class="item"><div class="av" style="background:' + cor +
        '22;color:' + cor + '">' +
        '<span class="ms">' + ci.icone + '</span></div>' +

        '<div class="txt"><b>' + Comb.qtd(a.litros, a.combustivel) +
        ' · ' + U.moeda(a.valorTotal) + '</b>' +

        (U.multi() && VEICULO_SEL === 'todos' ? U.selo(a.veiculoId) : '') +

        '<small>' + U.data(a.data) + ' · ' + U.num(a.km) + ' km · ' +
        U.esc(a.combustivel || '—') + '<br>' +
        U.esc(a.posto || (eletrico ? 'Local não informado' : 'Posto não informado')) +
        ' · ' + Comb.preco(a.precoLitro, a.combustivel) + '</small>' +

        '<span class="tag ' + (cheio ? 'ok' : '') + '">' +
        (cheio
          ? (eletrico ? 'Carga completa' : 'Tanque cheio')
          : 'Parcial') + '</span>' +

        (vg ? '<span class="tag roxo">' + U.esc(vg.titulo || vg.destino) +
          '</span>' : '') +

        '<div class="acoes-item">' +
        '<button onclick="App.formAbastecimento(null,\'' + a.id + '\')">' +
        '<span class="ms">edit</span> Editar</button>' +
        '<button onclick="App.remover(\'Abastecimentos\',\'' + a.id + '\')">' +
        '<span class="ms">delete</span></button>' +
        '</div></div></div>';
    }).join('') : UI.vazio('local_gas_station', vazioTxt));
  }

  render(todos, 'listaAbastecimentos', 'Nenhum abastecimento lançado');
  render(deViagem, 'listaAbastViagem', 'Nenhum abastecimento de viagem');
  render(rotina, 'listaAbastRotina', 'Nenhum abastecimento do dia a dia');
};


/* =====================================================================
   6 — CARTÃO DO VEÍCULO
   ===================================================================== */

App._renderVeiculosOriginal = App.renderVeiculos;

App.renderVeiculos = function () {
  App._renderVeiculosOriginal();

  /* Corrige os rótulos "KM/L" e "KM/TANQUE" nos cartões,
     de acordo com o combustível de cada veículo. */
  var cartoes = document.querySelectorAll('#listaVeiculos .card-veic');

  [].forEach.call(cartoes, function (cartao, i) {
    var v = DB.veiculos[i];
    if (!v) return;

    var ci = Comb.info(v.combustivel);
    var rotulos = cartao.querySelectorAll('.cv-nums div small');

    if (rotulos[1]) rotulos[1].textContent = ci.consumo.toUpperCase();
    if (rotulos[2]) {
      rotulos[2].textContent = (v.combustivel === 'Elétrico')
        ? 'KM/CARGA'
        : 'KM/' + (v.combustivel === 'GNV' ? 'CILINDRO' : 'TANQUE');
    }
  });
};


/* =====================================================================
   7 — HUB DE CONSUMO
   ===================================================================== */

App.hubConsumo = function () {
  var lista = VEICULO_SEL === 'todos'
    ? (DB.veiculos || [])
    : (DB.veiculos || []).filter(function (v) { return v.id === VEICULO_SEL; });

  if (!lista.length) {
    return UI.modal('Consumo dos veículos',
      UI.vazio('directions_car', 'Cadastre um veículo.'), null);
  }

  var html = '<div class="hub-periodo"><span class="ms">speed</span>' +
    'Resumo · ' + U.rotuloPeriodo() + '</div>';

  /* Aviso quando a frota mistura combustíveis */
  if (lista.length > 1 && !Comb.mesmaUnidade(lista)) {
    html += '<div class="aviso info"><span class="ms">info</span><div>' +
      '<b>Combustíveis diferentes na frota</b>' +
      'Cada veículo aparece com a própria unidade. Litro, metro cúbico e ' +
      'kWh não podem ser somados entre si — só o custo em reais é comparável.' +
      '</div></div>';
  }

  html += lista.map(function (v) {
    var c = v.consumo || {};
    var p = App.calcPeriodo(v.id);
    var ci = Comb.info(v.combustivel);
    var eletrico = (v.combustivel === 'Elétrico');

    var alertasV = (DB.alertas || []).filter(function (a) {
      return a.veiculoId === v.id && a.status !== 'ok';
    });

    var semDados = (c.metodo === 'sem-dados' || c.metodo === 'aguardando');

    return '<div class="card-consumo" style="--c:' + U.hex(v.cor) + '">' +

      '<div class="cc-topo"><div class="cc-ico">' +
      '<span class="ms">' + U.ico(v.tipo) + '</span></div>' +
      '<div class="cc-id"><b>' + U.esc(v.nome) + '</b>' +
      '<small>' + U.esc(v.placa) + ' · ' + U.num(v.kmAtual) + ' km · ' +
      U.esc(v.combustivel || '—') + '</small></div>' +
      '<div class="cc-kml"><b>' + (semDados ? '—' : c.mediaKmL) + '</b>' +
      '<small>' + ci.consumo + '</small></div></div>' +

      (semDados
        ? '<div class="cc-aguarda"><span class="ms">info</span>' +
          (c.abastecimentos
            ? 'Registre o 2º ' + ci.acao.toLowerCase() + ' para calcular'
            : 'Nenhum ' + ci.acao.toLowerCase() + ' registrado') + '</div>'

        : '<div class="cc-linha"><span>Melhor / pior</span><b>' +
          c.melhorKmL + ' / ' + c.piorKmL + ' ' + ci.consumo + '</b></div>' +
          '<div class="cc-linha"><span>Custo por km</span><b>' +
          U.moeda(c.custoPorKm) + '</b></div>' +
          '<div class="cc-linha"><span>Autonomia</span><b>' +
          U.num(v.autonomia) + ' km</b></div>' +
          '<div class="cc-linha"><span>' +
          (eletrico ? 'Bateria' : (v.combustivel === 'GNV' ? 'Cilindro' : 'Tanque')) +
          '</span><b>' + U.num(v.tanque, ci.casasQtd === 3 ? 1 : 0) +
          ' ' + ci.unidade + '</b></div>') +

      (c.trechosDescartados
        ? '<div class="cc-aguarda" style="margin-top:9px">' +
          '<span class="ms">rule</span>' + c.trechosDescartados +
          ' trecho(s) ignorado(s) por consumo fora do normal (' +
          c.limiteMin + '–' + c.limiteMax + ' ' + ci.consumo + ').</div>'
        : '') +

      '<div class="cc-gastos"><h5>Gastos · ' + U.rotuloPeriodo() + '</h5>' +
      '<div class="cc-grid">' +
        '<div><span class="ms">' + ci.icone + '</span><b>' +
        U.moedaCurta(p.combustivel) + '</b><small>' +
        (eletrico ? 'energia' : 'combustível') + '</small></div>' +
        '<div><span class="ms">build</span><b>' +
        U.moedaCurta(p.manutencao) + '</b><small>manutenção</small></div>' +
        '<div><span class="ms">luggage</span><b>' +
        U.moedaCurta(p.despesaViagem) + '</b><small>viagens</small></div>' +
        '<div><span class="ms">payments</span><b>' +
        U.moedaCurta(p.total) + '</b><small>total</small></div>' +
      '</div></div>' +

      '<div class="cc-hist"><span>' + v.qtdAbastecimentos + ' ' +
      (eletrico ? 'recargas' : 'abastec.') + '</span>' +
      '<span>' + v.qtdManutencoes + ' manut.</span>' +
      '<span>' + v.qtdViagens + ' viagens</span></div>' +

      (alertasV.length
        ? '<div class="cc-alertas"><h5><span class="ms">warning</span>' +
          'Manutenções próximas</h5>' +
          alertasV.slice(0, 3).map(function (a) {
            return '<div class="cc-al ' + a.status + '"><span class="ms">' +
              (a.status === 'vencido' ? 'error' : 'schedule') + '</span>' +
              '<div><b>' + U.esc(a.item) + '</b><small>' +
              U.esc(a.motivo) + '</small></div></div>';
          }).join('') + '</div>'
        : '<div class="cc-alertas ok"><span class="ms">verified</span>' +
          'Revisões em dia</div>') +

      '<div class="cc-acoes">' +
      '<button onclick="UI.fecharModal();App.formAbastecimento(\'' + v.id + '\')">' +
      '<span class="ms">' + ci.icone + '</span>' + ci.abastecer + '</button>' +
      '<button onclick="UI.fecharModal();App.verManutencaoVeiculo(\'' + v.id + '\')">' +
      '<span class="ms">build</span>Revisões</button>' +
      '<button onclick="UI.fecharModal();App.pdfManutencao(\'' + v.id + '\')">' +
      '<span class="ms">picture_as_pdf</span>PDF</button>' +
      '</div></div>';
  }).join('');

  UI.modal('Consumo dos veículos', html, null);
};


/* =====================================================================
   8 — PLANEJADOR DE VIAGEM
   ===================================================================== */

Viagem._abrirPlanejadorOriginal = Viagem.abrirPlanejador;

Viagem.abrirPlanejador = function () {
  Viagem._abrirPlanejadorOriginal();

  setTimeout(function () {
    var v = U.veicAtual();
    if (!v) return;
    Viagem.ajustarRotulosCombustivel(v.combustivel);
  }, 90);
};

/**
 * Troca km/L, tanque e preço do litro pelos rótulos do combustível.
 */
Viagem.ajustarRotulosCombustivel = function (nomeCombustivel) {
  var c = Comb.info(nomeCombustivel);

  function trocarLabel(idCampo, texto) {
    var campo = $(idCampo);
    if (!campo || !campo.parentNode) return;
    var lbl = campo.parentNode.querySelector('label');
    if (lbl) lbl.textContent = texto;
  }

  trocarLabel('pKmL', 'Consumo (' + c.consumo + ')');
  trocarLabel('pTanque', c.tanque);
  trocarLabel('pPreco', 'Preço por ' + c.unidade);

  trocarLabel('rtKmL', 'Consumo (' + c.consumo + ')');
  trocarLabel('rtTanque', c.tanque);

  var nivel = $('pNivel');
  if (nivel && nomeCombustivel === 'Elétrico') {
    var lbl = nivel.parentNode
      ? nivel.parentNode.querySelector('label') : null;
    if (lbl) lbl.textContent = 'Bateria agora';

    nivel.innerHTML =
      '<option value="100">Cheia (100%)</option>' +
      '<option value="75">75%</option>' +
      '<option value="50">50%</option>' +
      '<option value="25">25%</option>' +
      '<option value="10">10% — crítico</option>';
  }
};

/**
 * A prévia de autonomia também muda de unidade.
 */
Viagem.previewAutonomia = function () {
  var el = $('autoPreview');
  if (!el) return;

  var veic = U.veic(UI.v('pVeic')) || U.veicAtual() || {};
  var c = Comb.info(veic.combustivel);
  var eletrico = (veic.combustivel === 'Elétrico');

  var kmPorUn = UI.n('pKmL');
  var capacidade = UI.n('pTanque');
  var nivel = UI.n('pNivel') || 100;
  var reserva = UI.n('pReserva') || 15;

  if (kmPorUn <= 0 || capacidade <= 0) {
    el.innerHTML = '<div class="am-vazio"><span class="ms">info</span>' +
      'Informe o consumo e a capacidade para eu calcular a autonomia e as paradas.' +
      '</div>';
    return;
  }

  var reservaQtd = capacidade * (reserva / 100);
  var uteis = capacidade - reservaQtd;
  var agora = capacidade * (nivel / 100);

  var autCheia = Math.round(kmPorUn * capacidade);
  var autUtil = Math.round(kmPorUn * uteis);
  var autIni = Math.round(kmPorUn * Math.max(0, agora - reservaQtd));

  el.innerHTML = '<div class="am-grid">' +
    '<div><b>' + U.num(autCheia) + '</b><small>km com ' +
    (eletrico ? 'carga cheia' : (veic.combustivel === 'GNV'
      ? 'cilindro cheio' : 'tanque cheio')) + '</small></div>' +

    '<div><b>' + U.num(autIni) + '</b><small>km agora (' + nivel + '%)</small></div>' +

    '<div><b>' + U.num(autUtil) + '</b><small>km entre ' +
    (eletrico ? 'recargas' : 'paradas') + '</small></div></div>' +

    '<div class="am-nota"><span class="ms">calculate</span>' +
    U.num(capacidade, c.casasQtd === 3 ? 1 : 0) + ' ' + c.unidade +
    ' × ' + kmPorUn + ' ' + c.consumo +
    ', guardando ' + reserva + '% (' +
    U.num(reservaQtd, 1) + ' ' + c.unidade + ') de reserva.</div>' +

    (eletrico
      ? '<div class="am-nota" style="border-top:0;padding-top:4px">' +
        '<span class="ms">bolt</span>' +
        'Em elétricos a autonomia cai bastante em rodovia e no frio. ' +
        'Considere uma margem maior que a de um carro a combustão.</div>'
      : '');
};


/* =====================================================================
   9 — RESUMO DO PAINEL
   ===================================================================== */

App._renderHubsOriginal = App.renderHubs;

App.renderHubs = function () {
  App._renderHubsOriginal();

  /* Ajusta o rótulo do hub de consumo quando a frota é mista */
  var listaVeic = VEICULO_SEL === 'todos'
    ? DB.veiculos
    : DB.veiculos.filter(function (v) { return v.id === VEICULO_SEL; });

  var rotulo = Comb.rotuloGeral(listaVeic);
  if (rotulo === 'km/L') return;

  var hubs = document.querySelectorAll('#hubs .hub');
  [].forEach.call(hubs, function (h) {
    var sub = h.querySelector('.hub-txt small');
    if (sub && sub.textContent.indexOf('km/L') > -1) {
      sub.textContent = sub.textContent.replace('km/L', rotulo);
    }
  });
};

/* =====================================================================
   CARWAY v13.1.0 - RESUMO PROFISSIONAL POR ENERGETICO
   Este bloco fica por ultimo porque carway-combustivel.js e o ultimo
   modulo carregado pelo index.html.
   ===================================================================== */
(function () {
  function detalhesConsumo(v) {
    var c = (v && v.consumo) || {};
    return Array.isArray(c.porEnergetico) ? c.porEnergetico : [];
  }

  function eficiencia(e) {
    return Number(e.eficiencia || e.media || e.mediaEficiencia || 0) || 0;
  }

  function unidadeEficiencia(e) {
    return e.unidadeEficiencia || Comb.consumo(e.energetico || 'Gasolina');
  }

  function quantidade(e) {
    return Number(e.quantidade || e.litrosComprados || 0) || 0;
  }

  function mensagemEstado(e) {
    if (e.status === 'trecho-misto' || Number(e.ciclosMistos) > 0) {
      return 'Trecho com alternancia de energetico. Custos registrados; eficiencia aguardando ciclo exclusivo.';
    }
    if (Number(e.parciais) > 0 && !eficiencia(e)) {
      return 'Abastecimento parcial acumulado. Aguardando o proximo ciclo completo.';
    }
    return 'Aguardando outro lancamento completo para fechar o ciclo.';
  }

  function blocoEnergetico(e) {
    var ef = eficiencia(e);
    var nome = e.energetico || 'Combustivel';
    var ci = Comb.info(nome);
    var qtd = quantidade(e);
    var html = '<div class="cc-gastos energia-bloco">' +
      '<h5>' + U.esc(nome) + '</h5>' +
      '<div class="cc-grid">' +
        '<div><b>' + (ef ? U.num(ef,2) : '—') + '</b><small>' + unidadeEficiencia(e) + '</small></div>' +
        '<div><b>' + U.num(qtd,ci.casasQtd) + ' ' + (e.unidade || ci.unidade) + '</b><small>quantidade</small></div>' +
        '<div><b>' + U.moeda(e.gastoTotal || 0) + '</b><small>gasto</small></div>' +
        '<div><b>' + (Number(e.custoPorKm)>0 ? U.moeda(e.custoPorKm) : '—') + '</b><small>por km</small></div>' +
      '</div>';
    if (ef) {
      html += '<div class="cc-linha"><span>Melhor / pior</span><b>' +
        U.num(e.melhor || ef,2) + ' / ' + U.num(e.pior || ef,2) + ' ' + unidadeEficiencia(e) + '</b></div>';
      html += '<div class="cc-linha"><span>Ciclos automaticos / manuais</span><b>' +
        (Number(e.ciclosAutomaticos)||0) + ' / ' + (Number(e.medicoesManuais)||0) + '</b></div>';
    } else {
      html += '<div class="cc-aguarda"><span class="ms">hourglass_top</span>' + mensagemEstado(e) + '</div>';
    }
    return html + '</div>';
  }

  App.hubConsumo = function () {
    var lista = VEICULO_SEL === 'todos' ? (DB.veiculos || []) :
      (DB.veiculos || []).filter(function (v) { return v.id === VEICULO_SEL; });
    if (!lista.length) return UI.modal('Consumo dos veiculos', UI.vazio('directions_car','Cadastre um veiculo.'), null);

    var html = '<div class="hub-periodo"><span class="ms">speed</span>Eficiencia e custo por energetico</div>';
    lista.forEach(function (v) {
      var c = v.consumo || {};
      var det = detalhesConsumo(v);
      html += '<div class="card-consumo" style="--c:' + U.hex(v.cor) + '">' +
        '<div class="cc-topo"><div class="cc-ico"><span class="ms">' + U.ico(v.tipo) + '</span></div>' +
        '<div class="cc-id"><b>' + U.esc(v.nome) + '</b><small>' + U.esc(v.placa) + ' · ' + U.num(v.kmAtual) + ' km</small></div></div>';
      if (!det.length) {
        html += '<div class="cc-aguarda"><span class="ms">info</span>Nenhum dado energetico disponivel.</div>';
      } else {
        det.forEach(function (e) { html += blocoEnergetico(e); });
      }
      if (c.melhorCusto && Number(c.melhorCusto.custoPorKm)>0) {
        html += '<div class="cc-alertas ok"><span class="ms">savings</span>Mais economico: <b>' +
          U.esc(c.melhorCusto.energetico) + '</b> · ' + U.moeda(c.melhorCusto.custoPorKm) + '/km</div>';
      }
      html += '<div class="cc-acoes"><button onclick="UI.fecharModal();App.formAbastecimento(\'' + v.id + '\')">' +
        '<span class="ms">add</span>Novo lancamento</button></div></div>';
    });
    UI.modal('Consumo dos veiculos', html, null);
  };

  var renderAbastecimentosBase = App.renderAbastecimentos;
  App.renderAbastecimentos = function () {
    renderAbastecimentosBase();
    var v = U.veicAtual();
    var ex = $('explicaConsumo');
    if (!ex || !v || VEICULO_SEL === 'todos') return;
    var det = detalhesConsumo(v);
    if (!det.length) {
      ex.className = 'aviso';
      ex.innerHTML = '<span class="ms">info</span><div><b>Consumo por energetico</b>Aguardando lancamentos suficientes.</div>';
      return;
    }
    ex.className = 'aviso info';
    ex.classList.remove('oculto');
    ex.innerHTML = '<span class="ms">calculate</span><div><b>Consumo de ' + U.esc(v.nome) + '</b>' +
      det.map(function (e) {
        var ef=eficiencia(e);
        return '<div style="margin-top:7px"><b>' + U.esc(e.energetico) + ':</b> ' +
          (ef ? U.num(ef,2) + ' ' + unidadeEficiencia(e) : mensagemEstado(e)) + '</div>';
      }).join('') + '</div>';
  };

  var renderHubsBase = App.renderHubs;
  App.renderHubs = function () {
    renderHubsBase();
    var hubs = document.querySelectorAll('#hubs .hub');
    [].forEach.call(hubs, function (h) {
      var titulo=h.querySelector('.hub-txt b');
      var sub=h.querySelector('.hub-txt small');
      if (titulo && sub && titulo.textContent === 'Consumo dos veiculos') sub.textContent='Detalhado por energetico';
      if (titulo && sub && titulo.textContent === 'Consumo dos veículos') sub.textContent='Detalhado por energético';
    });
  };
})();
