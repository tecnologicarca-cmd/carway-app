var VERSAO_FRONT = 14;

/* =====================================================================
   1 e 2 — FILA OFFLINE
   ===================================================================== */

/**
 * Identificador curto para cada item da fila.
 */
Offline._novoId = function () {
  return 'p' + Date.now().toString(36) +
         Math.random().toString(36).substring(2, 7);
};

/**
 * Decide se o erro foi de REDE (vale enfileirar) ou de REGRA
 * (não adianta repetir — precisa avisar o usuário).
 *
 * Erros de regra vêm do próprio servidor: limite de plano, perfil
 * sem permissão, campo inválido. Repetir não resolve.
 */
Offline._ehFalhaDeRede = function (erro) {
  if (!navigator.onLine) return true;
  var m = String((erro && erro.message) || erro || '').toLowerCase();
  return m.indexOf('failed to fetch') > -1 ||
         m.indexOf('sem internet') > -1 ||
         m.indexOf('networkerror') > -1 ||
         m.indexOf('não consegui falar com o servidor') > -1 ||
         m.indexOf('nao consegui falar com o servidor') > -1 ||
         m.indexOf('o servidor não respondeu') > -1 ||
         m.indexOf('o servidor nao respondeu') > -1 ||
         m.indexOf('demorou') > -1;
};

/**
 * Salva no servidor. Se a internet falhar, guarda na fila local e
 * devolve sucesso "otimista", para o app seguir funcionando.
 *
 * Chamada por App.formAbastecimento, App.formManutencao e
 * App.formDespesa.
 *
 * @param {string} tabela   Abastecimentos | Manutencoes | Despesas
 * @param {Object} registro Dados a gravar
 * @param {string} resumo   Texto curto para a tela de pendentes
 */
Offline.salvarComFallback = function (tabela, registro, resumo) {
  /* Já está offline: nem tenta a rede */
  if (!navigator.onLine) {
    return Promise.resolve(
      Offline._enfileirar(tabela, registro, resumo, '')
    );
  }
  return api('salvar', tabela, registro)
    .then(function (r) {
      /* Deu certo online. Se havia pendentes, aproveita a janela
         de conexão para tentar enviá-los também. */
      if (Offline._pendentes.length) {
        setTimeout(Offline.sincronizarPendentes, 800);
      }
      return r;
    })
    .catch(function (e) {
      /* Erro de regra do servidor: não enfileira, devolve o erro
         para o formulário mostrar a mensagem certa. */
      if (!Offline._ehFalhaDeRede(e)) {
        throw e;
      }
      return Offline._enfileirar(
        tabela, registro, resumo,
        (e && e.message) ? e.message : ''
      );
    });
};

/**
 * Coloca o registro na fila local e devolve uma resposta no mesmo
 * formato de api('salvar'), para não quebrar quem chamou.
 */
Offline._enfileirar = function (tabela, registro, resumo, erro) {
  var item = {
    id: Offline._novoId(),
    tabela: tabela,
    registro: registro,
    resumo: resumo || tabela,
    estado: 'pendente',
    erro: '',
    tentativas: 0,
    criadoEm: new Date().toISOString()
  };
  Offline._pendentes.push(item);
  Offline._gravarPendentes();
  Offline.atualizarBanner();

  /* Espelha o registro no DB local, para o usuário ver o lançamento
     na hora, mesmo sem ter ido ao servidor. */
  try { Offline._espelharNoDB(tabela, registro, item.id); } catch (e) {}

  if (typeof UI !== 'undefined' && UI.toast) {
    UI.toast(
      navigator.onLine
        ? 'Sem conexão com o servidor — guardado no aparelho'
        : 'Você está offline — guardado no aparelho',
      'ok'
    );
  }

  /* Mesma forma da resposta online */
  return {
    registro: registro,
    planoAtualizado: null,
    pendente: true,
    pendenteId: item.id
  };
};

/**
 * Acrescenta o lançamento à memória do app, marcado como pendente,
 * para aparecer nas listas antes de chegar ao servidor.
 */
Offline._espelharNoDB = function (tabela, registro, pendenteId) {
  var destino = {
    Abastecimentos: 'abastecimentos',
    Manutencoes: 'manutencoes',
    Despesas: 'despesas'
  }[tabela];
  if (!destino || !DB || !DB[destino]) return;
  var copia = {};
  for (var k in registro) copia[k] = registro[k];
  if (!copia.id) copia.id = 'LOCAL_' + pendenteId;
  copia._pendente = 1;
  DB[destino].push(copia);
};

/**
 * Remove o espelho local (id LOCAL_xxx) criado enquanto o app
 * estava offline, depois que o registro REAL do servidor já foi
 * aplicado ao DB — evita a duplicata visual que apareceria por
 * alguns instantes até o próximo carregamento completo.
 */
Offline._removerEspelhoLocal = function (tabela, pendenteId) {
  var mapa = {
    Abastecimentos: 'abastecimentos',
    Manutencoes: 'manutencoes',
    Despesas: 'despesas'
  };
  var destino = mapa[tabela];
  if (!destino || !DB[destino]) return;
  var idLocal = 'LOCAL_' + pendenteId;
  DB[destino] = DB[destino].filter(function (r) { return r.id !== idLocal; });
};

/**
 * Envia os pendentes, um de cada vez, na ordem em que foram criados.
 *
 * Um de cada vez de propósito: o Apps Script trava a planilha
 * durante a escrita, e disparar tudo junto só gera erro de lock.
 */
Offline._sincronizando = false;

Offline.sincronizarPendentes = function () {
  if (Offline._sincronizando) return Promise.resolve(false);
  if (!Offline._pendentes.length) return Promise.resolve(true);
  if (!navigator.onLine) {
    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast('Sem internet — vou tentar quando a conexão voltar', 'erro');
    }
    return Promise.resolve(false);
  }

  Offline._sincronizando = true;
  Offline._marcarBannerSincronizando();

  var fila = Offline._pendentes.filter(function (p) {
    return p.estado !== 'falha';
  });
  var enviados = 0;
  var falhas = 0;

  function proximo(indice) {
    if (indice >= fila.length) {
      Offline._sincronizando = false;
      Offline._gravarPendentes();
      Offline.atualizarBanner();
      Offline.renderSincronizador();
      /* v14.5.1 - silencioso=true: nao empilha um segundo overlay
         de carregamento por cima da barra "Enviando…" que ja
         apareceu durante a sincronizacao. */
      if (enviados && typeof App !== 'undefined' && App.carregar) {
        App.carregar(false, true).catch(function () {});
      }
      if (falhas > 0 && typeof UI !== 'undefined' && UI.toast) {
        UI.toast(
          falhas + ' lançamento(s) não puderam ser sincronizados',
          'erro'
        );
      } else if (enviados > 0 && typeof UI !== 'undefined' && UI.toast) {
        UI.toast(enviados + ' lançamento(s) enviado(s)', 'ok');
      }
      return Promise.resolve(true);
    }
    var item = fila[indice];
    return api('salvar', item.tabela, item.registro)
      .then(function () {
        enviados++;
        /* v14.5.1 - remove o espelho LOCAL_xxx agora que o
           registro real ja foi aplicado ao DB por
           App._aplicarSalvoNoDB (chamado automaticamente dentro
           do api() acima). So removemos DEPOIS da confirmacao,
           para nunca ficar um instante sem nenhum dos dois na
           tela. */
        Offline._removerEspelhoLocal(item.tabela, item.id);
        Offline._pendentes = Offline._pendentes.filter(function (p) {
          return p.id !== item.id;
        });
        Offline._gravarPendentes();
        Offline._atualizarProgresso(enviados, fila.length);
        return proximo(indice + 1);
      })
      .catch(function (e) {
        /* Rede caiu de novo: para tudo e tenta mais tarde,
           mantendo o item como pendente (não como falha). */
        if (Offline._ehFalhaDeRede(e)) {
          Offline._sincronizando = false;
          Offline.atualizarBanner();
          return Promise.resolve(false);
        }
        /* Erro de regra: marca como falha para o usuário decidir */
        item.estado = 'falha';
        item.erro = (e && e.message) ? e.message : 'Erro ao enviar';
        item.tentativas = (item.tentativas || 0) + 1;
        falhas++;
        Offline._gravarPendentes();
        return proximo(indice + 1);
      });
  }

  return proximo(0).catch(function (erro) {
    Offline._sincronizando = false;
    Offline._gravarPendentes();
    Offline.atualizarBanner();
    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast(
        erro && erro.message ? erro.message : 'Falha na sincronização',
        'erro'
      );
    }
    return false;
  });
};

Offline._marcarBannerSincronizando = function () {
  var banner = $('bannerOffline');
  if (!banner) return;
  banner.classList.remove('oculto');
  banner.classList.add('visivel');
  document.body.classList.add('com-banner-offline');
  banner.classList.remove(
    'estado-offline', 'estado-pendente', 'estado-erro', 'estado-ok'
  );
  banner.classList.add('estado-sincronizando');
  setTexto('boIcone', 'cloud_sync');
  setTexto('boTitulo', 'Enviando…');
  setTexto('boSub', 'Sincronizando seus lançamentos');
};

Offline._atualizarProgresso = function (feitos, total) {
  setTexto('boSub', feitos + ' de ' + total + ' enviado(s)');
};

/**
 * Botão manual de sincronizar, dentro da tela de pendentes.
 */
Offline.sincronizarAgora = function () {
  Offline.sincronizarPendentes().then(function () {
    Offline.renderSincronizador();
  });
};

/**
 * Acrescenta o botão "Enviar agora" no topo da tela de pendentes.
 * (a versão original da tela não tinha como disparar manualmente)
 */
Offline._renderOriginal = Offline.renderSincronizador;
Offline.renderSincronizador = function () {
  Offline._renderOriginal();
  var lista = $('sincLista');
  if (!lista || !Offline._pendentes.length) return;
  if ($('btnSincronizarAgora')) return;
  var podeEnviar = navigator.onLine && !Offline._sincronizando;
  var botao =
    '<button id="btnSincronizarAgora" class="btn primario bloco-full" ' +
      'style="margin-bottom:14px"' + (podeEnviar ? '' : ' disabled') + ' ' +
      'onclick="Offline.sincronizarAgora()">' +
      '<span class="ms">cloud_upload</span> ' +
      (podeEnviar ? 'Enviar agora' : 'Sem conexão') +
    '</button>';
  lista.insertAdjacentHTML('beforebegin', botao);
};

/* =====================================================================
   3 — INSTALADOR
   ===================================================================== */
var Instalador = {
  _chaveEstado: 'carway_instalador_v1',
  _promptNativo: null,

  _lerEstado: function () {
    try {
      var txt = localStorage.getItem(Instalador._chaveEstado);
      if (!txt) return { visto: 0, adiadoAte: 0, instalado: 0 };
      var e = JSON.parse(txt);
      return {
        visto: Number(e.visto) || 0,
        adiadoAte: Number(e.adiadoAte) || 0,
        instalado: Number(e.instalado) || 0
      };
    } catch (e) {
      return { visto: 0, adiadoAte: 0, instalado: 0 };
    }
  },

  _gravarEstado: function (estado) {
    try {
      localStorage.setItem(Instalador._chaveEstado, JSON.stringify(estado));
    } catch (e) {}
  },

  detectar: function () {
    var ua = '';
    try { ua = (navigator.userAgent || '').toLowerCase(); } catch (e) {}
    var ehIOS = /iphone|ipad|ipod/.test(ua) ||
      (ua.indexOf('macintosh') > -1 && 'ontouchend' in document);
    var ehAndroid = ua.indexOf('android') > -1;
    var ehEmbutido =
      ua.indexOf('fban') > -1 || ua.indexOf('fbav') > -1 ||
      ua.indexOf('instagram') > -1 || ua.indexOf('line/') > -1 ||
      (ua.indexOf('wv)') > -1 && ehAndroid);
    var navegador = 'outro';
    if (ua.indexOf('edg') > -1) navegador = 'edge';
    else if (ua.indexOf('samsungbrowser') > -1) navegador = 'samsung';
    else if (ua.indexOf('firefox') > -1 || ua.indexOf('fxios') > -1) navegador = 'firefox';
    else if (ua.indexOf('chrome') > -1 || ua.indexOf('crios') > -1) navegador = 'chrome';
    else if (ua.indexOf('safari') > -1) navegador = 'safari';
    var jaInstalado = false;
    try {
      jaInstalado =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
    } catch (e) {}
    return {
      ios: ehIOS, android: ehAndroid, desktop: !ehIOS && !ehAndroid,
      embutido: ehEmbutido, navegador: navegador, jaInstalado: jaInstalado
    };
  },

  iniciar: function () {
    var amb = Instalador.detectar();
    try {
      window.addEventListener('beforeinstallprompt', function (evento) {
        evento.preventDefault();
        Instalador._promptNativo = evento;
      });
      window.addEventListener('appinstalled', function () {
        var e = Instalador._lerEstado();
        e.instalado = 1;
        Instalador._gravarEstado(e);
        Instalador.fecharFaixa();
      });
    } catch (e) {}
    if (amb.jaInstalado) {
      var estado = Instalador._lerEstado();
      if (!estado.instalado) {
        estado.instalado = 1;
        Instalador._gravarEstado(estado);
      }
      return;
    }
    setTimeout(function () { Instalador.talvezConvidar(); }, 9000);
  },

  /**
   * v14.8 - Mesma lógica de filtro que já existia dentro de
   * talvezConvidar (não repete pergunta se já instalado, se
   * adiado, se já roda como PWA, se dentro de app embutido já
   * visto 1x). Extraída para uma função separada porque agora é
   * chamada em DOIS momentos: pelo timer de 9s (fluxo antigo) e
   * logo após aceitar um convite (fluxo novo, mais natural).
   */
  podeConvidar: function () {
    var estado = Instalador._lerEstado();
    if (estado.instalado) return false;
    if (estado.adiadoAte && new Date().getTime() < estado.adiadoAte) return false;
    var amb = Instalador.detectar();
    if (amb.jaInstalado) return false;
    if (amb.embutido && estado.visto >= 1) return false;
    return true;
  },

  talvezConvidar: function () {
    if (typeof APP_PRONTO !== 'undefined' && !APP_PRONTO) return;
    if (!Instalador.podeConvidar()) return;
    Instalador.mostrarFaixa();
  },

  /**
   * @param {string} [contexto] 'boas-vindas' quando chamada logo
   *   após aceitar um convite, para adaptar o texto ao momento.
   *   Sem parâmetro, mantém o texto genérico do fluxo antigo.
   */
  mostrarFaixa: function (contexto) {
    if ($('faixaInstalar')) return;
    var amb = Instalador.detectar();

    /* v14.8 - A mensagem muda conforme o momento: logo após
       aceitar um convite (contexto = 'boas-vindas'), o tom é mais
       direto e, se a pessoa está dentro do WhatsApp/Instagram, já
       avisa que precisa sair de lá primeiro — em vez de deixar
       isso só para quando ela clicar em "Instalar" e só então
       descobrir. */
    var titulo, sub;
    if (contexto === 'boas-vindas' && amb.embutido) {
      titulo = 'Antes de continuar, saia do WhatsApp';
      sub = 'Toque aqui para ver como abrir o CarWay no navegador e instalar';
    } else if (contexto === 'boas-vindas') {
      titulo = 'Bem-vindo! Instale o CarWay agora';
      sub = 'Fica com ícone próprio e abre bem mais rápido';
    } else {
      titulo = 'Deixe o CarWay na tela inicial';
      sub = 'Abre mais rápido, sem precisar procurar o link';
    }

    var html =
      '<div id="faixaInstalar" class="faixa-instalar' +
      (contexto === 'boas-vindas' ? ' destaque-convite' : '') + '">' +
        '<div class="fi-ico"><span class="ms">install_mobile</span></div>' +
        '<div class="fi-txt">' +
          '<b>' + titulo + '</b>' +
          '<small>' + sub + '</small>' +
        '</div>' +
        '<div class="fi-acoes">' +
          '<button class="fi-btn" onclick="Instalador.abrirGuia()">Instalar</button>' +
          '<button class="fi-fechar" onclick="Instalador.adiar()" title="Agora não">' +
            '<span class="ms">close</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(function () {
      var f = $('faixaInstalar');
      if (f) f.classList.add('visivel');
    }, 40);

    var estado = Instalador._lerEstado();
    estado.visto = estado.visto + 1;
    Instalador._gravarEstado(estado);
  },

  fecharFaixa: function () {
    var f = $('faixaInstalar');
    if (!f) return;
    f.classList.remove('visivel');
    setTimeout(function () { if (f.parentNode) f.remove(); }, 300);
  },

  adiar: function () {
    var estado = Instalador._lerEstado();
    estado.adiadoAte = new Date().getTime() +
      ((estado.visto >= 3 ? 15 : 3) * 86400000);
    Instalador._gravarEstado(estado);
    Instalador.fecharFaixa();
  },

  abrirGuia: function () {
    Instalador.fecharFaixa();
    /* Fora do Apps Script o prompt nativo funciona de verdade */
    if (Instalador._promptNativo) {
      Instalador._promptNativo.prompt();
      Instalador._promptNativo.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') {
          var estado = Instalador._lerEstado();
          estado.instalado = 1;
          Instalador._gravarEstado(estado);
          UI.toast('CarWay instalado', 'ok');
        }
        Instalador._promptNativo = null;
      });
      return;
    }
    Instalador.renderGuia(Instalador.detectar());
  },

  renderGuia: function (amb) {
    var html = '';
    if (amb.jaInstalado) {
      UI.modal('Instalar o CarWay',
        '<div class="aviso verde"><span class="ms">check_circle</span><div>' +
        '<b>Já está instalado</b>' +
        'Você está usando o CarWay pelo atalho da tela inicial.</div></div>', null);
      return;
    }
    if (amb.embutido) {
      html =
        '<div class="aviso"><span class="ms">open_in_browser</span><div>' +
        '<b>Você abriu por dentro de outro app</b>' +
        'Para instalar, primeiro precisamos abrir o CarWay no navegador de verdade ' +
        '(Chrome ou Safari). É rápido, só 2 toques.</div></div>' +
        '<div class="lista" style="margin-top:12px">' +
          Instalador._passo(1, 'more_vert', 'Toque nos <b>três pontinhos ⋮</b>, geralmente no canto superior direito') +
          Instalador._passo(2, 'open_in_browser', 'Escolha <b>Abrir no navegador</b> (ou "Abrir no Chrome" / "Abrir no Safari")') +
          Instalador._passo(3, 'install_mobile', 'Toque em <b>Instalar</b> de novo — agora vai funcionar certinho') +
        '</div>' + Instalador._blocoLink();
      UI.modal('Abra no navegador', html, null);
      return;
    }
    if (amb.ios) {
      html =
        '<div class="aviso info"><span class="ms">ios_share</span><div>' +
        '<b>iPhone e iPad</b>' +
        'O atalho precisa ser criado pelo <b>Safari</b>.</div></div>' +
        '<div class="lista" style="margin-top:12px">' +
          Instalador._passo(1, 'ios_share', 'Toque em <b>Compartilhar</b>, na barra de baixo') +
          Instalador._passo(2, 'add_box', 'Escolha <b>Adicionar à Tela de Início</b>') +
          Instalador._passo(3, 'check', 'Confirme o nome <b>CarWay</b> e toque em <b>Adicionar</b>') +
        '</div>';
    } else if (amb.android) {
      var caminho = (amb.navegador === 'samsung')
        ? 'Toque no menu e escolha <b>Adicionar página a</b> › <b>Tela inicial</b>'
        : 'Toque nos <b>três pontinhos</b> no canto superior direito';
      html =
        '<div class="aviso info"><span class="ms">android</span><div>' +
        '<b>Android</b>Em poucos toques o CarWay ganha ícone próprio.</div></div>' +
        '<div class="lista" style="margin-top:12px">' +
          Instalador._passo(1, 'more_vert', caminho) +
          Instalador._passo(2, 'add_to_home_screen', 'Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>') +
          Instalador._passo(3, 'check_circle', 'Confirme. O ícone aparece na tela inicial') +
        '</div>';
    } else {
      html =
        '<div class="aviso info"><span class="ms">computer</span><div>' +
        '<b>Computador</b>Deixe o CarWay como janela própria.</div></div>' +
        '<div class="lista" style="margin-top:12px">' +
          Instalador._passo(1, 'install_desktop', 'Procure o ícone de instalar na barra de endereços') +
          Instalador._passo(2, 'more_vert', 'Ou abra o menu › <b>Salvar e compartilhar</b>') +
          Instalador._passo(3, 'push_pin', 'Escolha <b>Instalar CarWay</b>') +
        '</div>';
    }
    html += Instalador._blocoLink() +
      '<div class="aviso verde" style="margin-top:12px">' +
      '<span class="ms">lock</span><div><b>Você continua conectado</b>' +
      'O atalho abre o CarWay já na sua conta.</div></div>';
    UI.modal('Instalar o CarWay', html, function () {
      var estado = Instalador._lerEstado();
      estado.instalado = 1;
      Instalador._gravarEstado(estado);
      UI.fecharModal();
      UI.toast('Pronto! Procure o ícone do CarWay', 'ok');
    }, 'Já adicionei');
  },

  _passo: function (numero, icone, texto) {
    return '<div class="item">' +
      '<div class="av azul"><b style="font-size:15px">' + numero + '</b></div>' +
      '<div class="txt" style="display:flex;align-items:center;gap:9px">' +
        '<span class="ms" style="font-size:20px;color:var(--txt2);flex:none">' +
        icone + '</span>' +
        '<small style="font-size:13px;line-height:1.5">' + texto + '</small>' +
      '</div></div>';
  },

  _blocoLink: function () {
    return '<div class="form" style="margin-top:14px">' +
      '<div><label>Endereço do CarWay</label>' +
      '<input id="urlInstalador" value="' + U.esc(location.origin + location.pathname) +
      '" readonly onclick="this.select()"></div>' +
      '<button type="button" class="btn ghost bloco-full" onclick="Instalador.copiarUrl()">' +
      '<span class="ms">content_copy</span> Copiar endereço</button></div>';
  },

  copiarUrl: function () {
    var campo = $('urlInstalador');
    if (!campo) return;
    campo.select();
    campo.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      UI.toast('Endereço copiado', 'ok');
    } catch (e) {
      UI.toast('Selecione e copie manualmente', 'erro');
    }
  }
};

/* =====================================================================
   4 — AJUSTES DE VERSÃO
   ===================================================================== */

/**
 * A checagem antiga falava em "4 arquivos" e "Index.html", que não
 * existem mais nesta arquitetura.
 */
App.checarVersao = function () {
  if (App._versaoBackend && App._versaoBackend !== VERSAO_FRONT) {
    if (window.console) {
      console.log('Backend v' + App._versaoBackend + ' × front v' + VERSAO_FRONT);
    }
  }
  var faltando = ['filtroPainel', 'hubs', 'barraVeiculos',
                  'btnCancelarLoad', 'mapaViagem', 'orcadoReal']
    .filter(function (id) { return !temEl(id); });
  if (faltando.length) {
    UI.modal('Arquivos desatualizados',
      '<div class="aviso"><span class="ms">warning</span><div>' +
      '<b>O index.html está defasado</b>' +
      'Não encontrei: <b>' + faltando.join(', ') + '</b>.</div></div>', null);
  }
};

/* =====================================================================
   CARWAY v14.5 / v14.8 / v14.8.1 - CARREGAMENTO RAPIDO, SALVAMENTO SEM
   TRAVAR A TELA, RESUMO LEVE NO BOOT E PROTECAO CONTRA CONDICAO DE
   CORRIDA ENTRE resumoRapido() E carregarApp().

   Historico das camadas, na ordem em que foram construidas:

   v14.5 - App.aposSalvar deixou de esperar o carregarApp() inteiro
   terminar antes de liberar a tela. App.carregar ganhou o parametro
   "silencioso", para atualizar em segundo plano sem reabrir o
   overlay de carregamento cheio.

   v14.8 - App.iniciar passou a chamar primeiro resumoRapido() (leve,
   so a tabela Veiculos) para popular o Menu quase instantaneamente,
   disparando o carregarApp() completo (pesado) em paralelo, sem
   bloquear a primeira tela.

   v14.8.1 - Corrige uma condicao de corrida introduzida pelo v14.8:
   se o usuario salvar algo bem no inicio (nos poucos instantes entre
   o resumoRapido() responder e o carregarApp() completo terminar), o
   "DB = d" do carregarApp() poderia sobrescrever silenciosamente
   esse registro, porque o snapshot que o servidor devolve foi
   capturado ANTES do salvamento chegar la. Agora qualquer registro
   aplicado enquanto ha um carregarApp() em transito fica guardado e
   e reaplicado assim que a resposta chega.
   ===================================================================== */

/**
 * Aplica localmente o registro que acabou de ser salvo, sem esperar
 * o carregarApp() completo. É chamada automaticamente pela camada
 * de rede (carway-config.js) logo após qualquer api('salvar', ...)
 * bem-sucedido.
 *
 * Só atualiza os campos que vieram na resposta do servidor — campos
 * calculados que só existem no payload completo (consumo do
 * veículo, qtdViagens, orçado, etc.) ficam intactos até a próxima
 * atualização completa chegar.
 */
App._aplicarSalvoNoDB = function (tabela, registro) {
  var mapa = {
    Veiculos: 'veiculos',
    Viagens: 'viagens',
    Despesas: 'despesas',
    Abastecimentos: 'abastecimentos',
    Manutencoes: 'manutencoes',
    Planos: 'planos'
  };
  var chave = mapa[tabela];
  if (!chave || !registro || !registro.id) return;

  DB[chave] = DB[chave] || [];

  var indice = -1;
  for (var i = 0; i < DB[chave].length; i++) {
    if (String(DB[chave][i].id) === String(registro.id)) { indice = i; break; }
  }

  if (indice >= 0) {
    for (var campo in registro) {
      if (registro.hasOwnProperty(campo)) DB[chave][indice][campo] = registro[campo];
    }
  } else {
    DB[chave].push(registro);
  }

  /* v14.8.1 - Se há um carregarApp() em voo, guarda este registro
     para reaplicar assim que a resposta chegar — o snapshot que
     está a caminho pode não contê-lo ainda. */
  if (App._emVooCarregarApp) {
    App._pendentesDuranteVoo.push({ tabela: tabela, registro: registro });
  }

  App.render();
};

/**
 * A gravação já terminou com sucesso quando chegamos aqui (o
 * registro já está na planilha e já foi aplicado ao DB local por
 * App._aplicarSalvoNoDB). Por isso liberamos a tela IMEDIATAMENTE,
 * sem esperar o recálculo pesado de consumo, alertas e orçamento —
 * que agora roda em segundo plano, sem travar a interface com o
 * spinner cheio de novo.
 */
App.aposSalvar = function (msg, extra) {
  UI.load(false);
  if (msg) UI.toast(msg, 'ok');

  if (!navigator.onLine) {
    App.render();
    if (typeof extra === 'function') extra();
    return Promise.resolve(true);
  }

  return App.carregar(false, true).then(function () {
    if (VIAGEM_ABERTA && U.viagem(VIAGEM_ABERTA)) {
      App.abrirViagem(VIAGEM_ABERTA, true);
    }
    if (typeof extra === 'function') extra();
    return true;
  }).catch(function (e) {
    /* O registro já foi salvo — uma falha aqui é só na atualização
       dos totais em segundo plano, não merece assustar o usuário
       com um erro grande. */
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('CarWay: falha ao atualizar em segundo plano - ' + e.message);
    }
    if (typeof extra === 'function') extra();
    return true;
  });
};

/* v14.8.1 - Controle da janela de corrida. Ver comentário grande
   acima para o raciocínio completo. */
App._emVooCarregarApp = false;
App._pendentesDuranteVoo = [];

/**
 * Recarrega os dados do servidor.
 *
 * @param {boolean} primeira    true na carga inicial do app.
 * @param {boolean} silencioso  true para atualizar sem mostrar o
 *                              overlay "Atualizando…" (usado pelo
 *                              pós-salvar e pela carga inicial, que
 *                              já tem seu próprio feedback visual).
 */
App.carregar = function (primeira, silencioso) {
  if (!primeira && !silencioso) UI.load(true, 'Atualizando…');

  /* v14.8.1 - Marca a janela de risco: qualquer _aplicarSalvoNoDB
     que aconteça entre agora e a resposta fica guardado em
     _pendentesDuranteVoo, para não ser perdido pelo "DB = d"
     abaixo. */
  App._emVooCarregarApp = true;
  App._pendentesDuranteVoo = [];

  return api('carregarApp').then(function (d) {
    if (!d || typeof d !== 'object') {
      throw new Error('O servidor devolveu dados vazios.');
    }
    var base = dbVazio();
    for (var k in base) if (d[k] === undefined || d[k] === null) d[k] = base[k];
    DB = d;

    App._emVooCarregarApp = false;
    /* v14.8.1 - Reaplica por cima do snapshot novo qualquer
       registro que foi salvo enquanto o carregarApp() estava em
       voo. Isso evita perder um lançamento que o usuário fez
       nesses instantes, só porque o snapshot do servidor foi
       tirado um pouco antes do salvamento chegar lá. */
    App._pendentesDuranteVoo.forEach(function (item) {
      App._aplicarSalvoNoDB(item.tabela, item.registro);
    });
    App._pendentesDuranteVoo = [];

    APP_PRONTO = true;
    if (primeira && DB.hoje) {
      var p = DB.hoje.split('-');
      if (p.length === 3) {
        FILTRO.ano = parseInt(p[0], 10);
        FILTRO.mes = parseInt(p[1], 10);
      }
    }
    App.montarSeletor();
    App.render();
    UI.load(false);
    App.fecharSplash();
    App.checarVersao();
    App.atualizarSininho();
    if (primeira && !DB.veiculos.length) {
      setTimeout(function () { App.formVeiculo(true); }, 600);
    }
    return d;
  }).catch(function (e) {
    /* v14.8.1 - Garante que a flag não fique travada em caso de
       erro de rede/servidor. */
    App._emVooCarregarApp = false;

    UI.load(false);
    App.fecharSplash();
    var msg = e.message || '';
    if (msg.indexOf('SEM_SESSAO') === 0 || msg.indexOf('SESSAO_INVALIDA') === 0) {
      limparSessaoLocal();
      App.telaSemAcesso('SEM_SESSAO', '');
    } else if (msg.indexOf('SEM_CONTA:') === 0) {
      App.telaSemAcesso('SEM_CONTA', msg.substring(10));
    } else if (msg.indexOf('SEM_ORGANIZACAO:') === 0) {
      App.telaSemAcesso('SEM_ORGANIZACAO', msg.substring(16));
    } else if (msg.indexOf('ORGANIZACAO_INATIVA:') === 0) {
      App.telaSemAcesso('ORGANIZACAO_INATIVA', msg.substring(20));
    } else if (msg.indexOf('PLANILHA_NAO_CONFIGURADA') === 0 ||
               msg.indexOf('PLANILHA_SEM_ACESSO') === 0) {
      App.erroFatal(
        'O aplicativo ainda não foi configurado pelo proprietário. ' +
        'Peça para ele republicar a implantação com "Executar como: Eu (proprietário)" ' +
        'e "Quem tem acesso: Qualquer pessoa".'
      );
    } else {
      App.erroFatal(msg || 'Falha ao carregar os dados');
    }
    throw e;
  });
};

/**
 * Aplica o resultado leve de resumoRapido() ao DB, antes do
 * carregarApp() completo chegar. Só popula DB.veiculos se ainda
 * estiver vazio — se o usuário já tinha dados (ex.: reabrindo o
 * app numa aba que já carregou antes), não sobrescreve nada.
 */
App.aplicarResumoRapido = function (d) {
  if (!d) return;
  DB.ehMaster = !!d.ehMaster;
  if (!DB.veiculos || !DB.veiculos.length) {
    DB.veiculos = (d.veiculos || []).map(function (v) {
      return {
        id: v.id, nome: v.nome, placa: v.placa, cor: v.cor, tipo: v.tipo,
        consumo: {}, kmAtual: 0, qtdAbastecimentos: 0,
        qtdManutencoes: 0, qtdViagens: 0
      };
    });
  }
  if (d.hoje) DB.hoje = d.hoje;
};

/**
 * v14.8 - Busca o resumo leve PRIMEIRO (só 1 tabela no backend,
 * sem consumo/alertas/série), preenche o essencial do Menu na
 * hora, e SÓ DEPOIS dispara o carregarApp() completo (pesado) em
 * segundo plano — sem bloquear a tela que o usuário já está vendo.
 */
App.iniciar = function () {
  var d = new Date();
  FILTRO.ano = d.getFullYear();
  FILTRO.mes = d.getMonth() + 1;

  return api('resumoRapido').then(function (d) {
    App.aplicarResumoRapido(d);
    App.fecharSplash();
    App.irParaMenu();
    App.renderMenu();
    /* Dados completos em segundo plano — não trava a tela */
    App.carregar(true, true).catch(function () {});
    return true;
  }).catch(function () {
    /* Se o resumo leve falhar por qualquer motivo, cai no fluxo
       completo normal, sem quebrar o app. */
    return App.carregar(true, true).then(function () {
      App.irParaMenu();
      App.renderMenu();
      return true;
    }).catch(function () { return false; });
  });
};

/* =====================================================================
   BOOT
   ===================================================================== */
function bootApp() {
  Offline.iniciar();
  CarWaySW.registrar();
  Instalador.iniciar();

  var modal = $('modal');
  if (modal) {
    modal.addEventListener('click', function (ev) {
      if (ev.target.id === 'modal') UI.fecharModal();
    });
  }

  document.addEventListener('click', function (ev) {
    if (ev.target.closest && !ev.target.closest('.campo-geo')) {
      [].forEach.call(document.querySelectorAll('.sugestoes.aberto'), function (b) {
        b.classList.remove('aberto');
        b.innerHTML = '';
      });
    }
  });

  App.aplicarTemaSalvo();

  CARWAY_SESSAO.token = lerSessaoLocal();
  var sessaoUrl = lerParametroUrl('sessao');
  var conviteUrl = lerParametroUrl('convite');
  var atalho = lerParametroUrl('atalho');

  if (sessaoUrl) gravarSessaoLocal(sessaoUrl);
  limparUrlSensivel();

  if (conviteUrl) {
    App.processarConvite(conviteUrl);
    return;
  }

  App.iniciar().then(function (ok) {
    if (ok && atalho) {
      /* Atalhos do manifest: ?atalho=abastecimento, despesa, manutencao */
      setTimeout(function () {
        if (atalho === 'abastecimento') App.formAbastecimento();
        else if (atalho === 'despesa') App.formDespesa();
        else if (atalho === 'manutencao') App.formManutencao();
      }, 700);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
