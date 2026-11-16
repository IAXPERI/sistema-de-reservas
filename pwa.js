const ARCADE_STATE = {
  catalogo: [],
  categoria: 'todos',
  busqueda: '',
  pagina: 1,
  porPagina: 4,
  timer: null,
  segundos: 30
};

const PROMOS_ROTATIVAS = [
  {
    titulo: '🎮⚡ Promo 1: Dúo Next-Gen PS5 + Monster & Papas',
    desc: 'Incluye 2 Horas en Estación PS5 (EA Sports FC 26 / Tekken 8) + Porción de Papas Cheddar + 1 Monster Energy.',
    precio: '🔥 Oferta: 118 BOB'
  },
  {
    titulo: '💻🍟 Promo 2: Maratón eSports PC Gamer 240Hz',
    desc: 'Incluye 3 Horas en PC Gamer Pro (RTX 4070 Super) + Salchipapa Especial LevelUp + Bebida Energética Speed.',
    precio: '🔥 Oferta: 105 BOB'
  },
  {
    titulo: '👾🍔 Promo 3: Noche Retro Arcade & Burger LevelUp',
    desc: 'Incluye 2 Horas de Cabina Arcade Free-Play (KOF / Street Fighter) + Burger Doble Carne con Papas + Red Bull.',
    precio: '🔥 Oferta: 82 BOB'
  }
];

const ARCADE_CASCADA = {
  ps5: [
    { id: 'fc', label: 'EA Sports FC 26 / Tekken 8 / MK1', rec: 'PlayStation 5 Slim 4K 120Hz (40 BOB/hr)' }
  ],
  pc: [
    { id: 'fps', label: 'Valorant / CS2 / Dota 2 / LoL', rec: 'Ryzen 7 + RTX 4070 Super 240Hz (25 BOB/hr)' }
  ],
  arcade: [
    { id: 'kof', label: 'KOF 98 / Street Fighter III / Metal Slug', rec: 'Pandora Box DX Pro + Sanwa (15 BOB/hr)' }
  ]
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

function actualizarRedArcade() {
  const $net = $('#estadoRed');
  if (navigator.onLine) {
    $net.text('🟢 En Línea').removeClass('offline');
  } else {
    $net.text('🟠 Offline').addClass('offline');
  }
}

function logArcadeHud(tipo, msg) {
  const hora = new Date().toLocaleTimeString();
  $('#pwaLogOutput').prepend($('<div>').text(`[${hora}] ${tipo}: ${msg}`));
}

function toastArcadeHud(msg, color) {
  $('#pwaToast')
    .css('border-left-color', color || '#7c3aed')
    .text(msg)
    .stop(true, true)
    .slideDown(200)
    .delay(2500)
    .fadeOut(300);
}

function cambiarPaneArcade(target) {
  $('.hud-pane').removeClass('active');
  $(`#${target}`).addClass('active');
  $('.hud-tab').removeClass('active');
  $(`.hud-tab[data-target="${target}"]`).addClass('active');
}

function cargarArcadeJson() {
  fetch('data/arcade.json')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      ARCADE_STATE.catalogo = data;
      renderCatalogoArcade();
      logArcadeHud('FETCH_JSON', `${data.length} ítems sincronizados`);
    })
    .catch(() => {
      ARCADE_STATE.catalogo = [
        { id: 'EST-01', titulo: 'Estación PlayStation 5 (FC 26 / Tekken 8)', categoria: 'ps5', detalle: '4K 120Hz', precio: 40, portada: 'icons/icon-192.png' },
        { id: 'EST-02', titulo: 'Estación PC Gamer Pro (Valorant / CS2)', categoria: 'pc', detalle: '240Hz', precio: 25, portada: 'icons/icon-192.png' },
        { id: 'EST-03', titulo: 'Cabina Arcade Fighting (KOF / SF)', categoria: 'arcade', detalle: 'Free Play', precio: 15, portada: 'icons/icon-192.png' }
      ];
      renderCatalogoArcade();
    });
}

function renderCatalogoArcade() {
  const $grid = $('#pwaCatalogGrid').empty();
  const q = ARCADE_STATE.busqueda.toLowerCase();
  const cat = ARCADE_STATE.categoria;

  const filtrados = ARCADE_STATE.catalogo.filter(i => {
    const okCat = cat === 'todos' || i.categoria === cat;
    const okTxt = !q || `${i.titulo} ${i.categoria} ${i.detalle}`.toLowerCase().includes(q);
    return okCat && okTxt;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ARCADE_STATE.porPagina));
  if (ARCADE_STATE.pagina > totalPaginas) ARCADE_STATE.pagina = totalPaginas;
  const inicio = (ARCADE_STATE.pagina - 1) * ARCADE_STATE.porPagina;
  const items = filtrados.slice(inicio, inicio + ARCADE_STATE.porPagina);

  $('#infoPag').text(`${ARCADE_STATE.pagina} / ${totalPaginas}`);
  $('#btnPrevPag').prop('disabled', ARCADE_STATE.pagina <= 1);
  $('#btnNextPag').prop('disabled', ARCADE_STATE.pagina >= totalPaginas);

  items.forEach(item => {
    const $card = $('<div>').addClass('hud-item-card').data({ nombre: item.titulo, precio: item.precio, cat: item.categoria });
    const $top = $('<div>').addClass('hud-item-top').append(
      $('<img>').attr({ src: item.portada, alt: item.titulo, width: 40, height: 40, loading: 'lazy' }),
      $('<div>').addClass('hud-item-info').append(
        $('<h5>').text(item.titulo),
        $('<small>').text(item.detalle)
      )
    );
    const $btn = $('<button>').attr('type', 'button').addClass('btn-hud-primary btn-cotizar-hud')
      .text(`⚡ ${item.precio} BOB`);
    $card.append($top, $btn);
    $grid.append($card);
  });
}

function actualizarCalculadorHud() {
  const precioHora = parseInt($('#pwaEstacionSelect').val(), 10) || 40;
  let horas = parseInt($('#pwaHorasInput').val(), 10);
  if (isNaN(horas) || horas < 1) horas = 1;
  if (horas > 8) horas = 8;
  const snackPrecio = parseInt($('#pwaSnackSelect').val(), 10) || 0;
  $('#pwaTotalBob').text((precioHora * horas) + snackPrecio);
}

$(document).ready(function () {
  actualizarRedArcade();
  $(window).off('online offline').on('online offline', actualizarRedArcade);
  cargarArcadeJson();

  // Rotación automática de promociones cada 2 minutos
  let promoIdx = 0;
  let promoSeg = 120;
  setInterval(() => {
    promoSeg--;
    const m = Math.floor(promoSeg / 60);
    const s = promoSeg % 60;
    $('#pwaPromoCountdown').text(`${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`);
    if (promoSeg <= 0) {
      promoIdx = (promoIdx + 1) % PROMOS_ROTATIVAS.length;
      const p = PROMOS_ROTATIVAS[promoIdx];
      $('#pwaPromoTitulo').text(p.titulo);
      $('#pwaPromoDesc').text(p.desc);
      $('#pwaPromoPrecio').text(p.precio);
      promoSeg = 120;
    }
  }, 1000);

  $('.hud-tab, .side-shortcut').off('click').on('click', function () {
    const target = $(this).data('target') || $(this).data('go');
    if (target) cambiarPaneArcade(target);
  });

  $('#btnIrCatalogo').off('click').on('click', () => cambiarPaneArcade('pane-catalogo'));

  $('#pwaThemeBtn').off('click').on('click', function () {
    $('body').toggleClass('light-mode');
    $(this).text($('body').hasClass('light-mode') ? '☀️' : '🌙');
  });

  $('#btnPWA').off('click').on('click', function () {
    $('#contenedorMenu').attr('data-hidratado', 'true');
    $(this).text('✓ Hidratado');
    toastArcadeHud('⚡ Service Worker hidratado');
    logArcadeHud('HYDRATION', 'PWA LevelUp hidratada');
  });

  $('#pwaBuscar').off('keyup').on('keyup', function () {
    ARCADE_STATE.busqueda = $(this).val().trim();
    ARCADE_STATE.pagina = 1;
    renderCatalogoArcade();
    logArcadeHud('KEYUP', `Búsqueda: "${ARCADE_STATE.busqueda}"`);
  });

  $('#pwaFilterBar').off('click', '.hud-filter-btn').on('click', '.hud-filter-btn', function () {
    $('.hud-filter-btn').removeClass('active');
    $(this).addClass('active');
    ARCADE_STATE.categoria = $(this).data('cat');
    ARCADE_STATE.pagina = 1;
    renderCatalogoArcade();
    logArcadeHud('FILTRO', ARCADE_STATE.categoria);
  });

  $('#btnPrevPag').off('click').on('click', () => {
    if (ARCADE_STATE.pagina > 1) { ARCADE_STATE.pagina--; renderCatalogoArcade(); }
  });

  $('#btnNextPag').off('click').on('click', () => {
    ARCADE_STATE.pagina++;
    renderCatalogoArcade();
  });

  $('#pwaCascadaCat').off('change').on('change', function () {
    const cat = $(this).val();
    const $sub = $('#pwaCascadaSub').empty().append('<option value="">2. Juegos / Specs</option>');
    $('#pwaCascadaRes').hide();
    if (cat && ARCADE_CASCADA[cat]) {
      ARCADE_CASCADA[cat].forEach(x => $sub.append($('<option>').val(x.id).text(x.label).data('rec', x.rec)));
      $sub.prop('disabled', false);
    } else {
      $sub.prop('disabled', true);
    }
  });

  $('#pwaCascadaSub').off('change').on('change', function () {
    const rec = $(this).find(':selected').data('rec');
    if (rec) {
      $('#pwaCascadaRes').text(`✅ ${rec}`).fadeIn();
      logArcadeHud('CASCADA', rec);
    }
  });

  $('#pwaCatalogGrid').off('click', '.btn-cotizar-hud').on('click', '.btn-cotizar-hud', function () {
    const $c = $(this).closest('.hud-item-card');
    const cat = $c.data('cat');
    const precio = $c.data('precio');
    if (cat === 'ps5' || cat === 'pc' || cat === 'arcade') {
      if (precio === 40 || precio === 25 || precio === 15) {
        $('#pwaEstacionSelect').val(String(precio));
      }
    }
    actualizarCalculadorHud();
    cambiarPaneArcade('pane-cotizar');
    toastArcadeHud(`Seleccionado: ${$c.data('nombre')}`);
  });

  $('#pwaCatalogGrid').off('dblclick', '.hud-item-card').on('dblclick', '.hud-item-card', function () {
    const nom = $(this).data('nombre');
    toastArcadeHud(`❤️ Favorita: ${nom}`);
    logArcadeHud('DBLCLICK', nom);
  });

  $('#pwaEstacionSelect, #pwaSnackSelect').off('change').on('change', actualizarCalculadorHud);
  $('#pwaHorasInput').off('input').on('input', actualizarCalculadorHud);

  $('#pwaAbrirModal30s').off('click').on('click', () => {
    const nom = $('#pwaJugador').val().trim();
    const cel = $('#pwaCelular').val().trim();
    if (nom.length < 3) return toastArcadeHud('⚠️ Ingresa nombre del jugador (mín. 3 letras)', '#ef4444');
    if (!/^[67]\d{7}$/.test(cel)) return toastArcadeHud('⚠️ Celular inválido (8 dígitos, inicia 6 o 7)', '#ef4444');

    clearInterval(ARCADE_STATE.timer);
    ARCADE_STATE.segundos = 30;
    $('#pwaTimerTop').text('00:30s');
    $('#pwaBoxTimer').show();
    $('#pwaBtnConfirmDirecto').show();

    ARCADE_STATE.timer = setInterval(() => {
      ARCADE_STATE.segundos--;
      $('#pwaTimerTop').text(`00:${ARCADE_STATE.segundos < 10 ? '0' + ARCADE_STATE.segundos : ARCADE_STATE.segundos}s`);
      if (ARCADE_STATE.segundos <= 0) {
        clearInterval(ARCADE_STATE.timer);
        $('#pwaBoxTimer').fadeOut(150);
        $('#pwaBtnConfirmDirecto').fadeOut(150);
        toastArcadeHud('⏰ Tarifa Flash Expirada', '#ef4444');
      }
    }, 1000);
  });

  $('#pwaBtnConfirmDirecto').off('click').on('click', () => {
    clearInterval(ARCADE_STATE.timer);
    $('#pwaBoxTimer').fadeOut(150);
    $('#pwaBtnConfirmDirecto').fadeOut(150);
    const nom = $('#pwaJugador').val().trim();
    const total = $('#pwaTotalBob').text();
    toastArcadeHud(`🎉 ¡Reserva confirmada para ${nom} (${total} BOB)!`, '#10b981');
    logArcadeHud('RESERVA', `${nom} — ${total} BOB`);
  });

  $('#pwaFormSeguro').off('submit').on('submit', function (e) {
    e.preventDefault();
    const txt = $('#pwaInputSeguro').val().trim();
    if (!txt) return;
    const $fila = $('<div>').addClass('fila-hud').append(
      $('<span>').addClass('titulo-truncado').text(txt),
      $('<button>').attr('type', 'button').addClass('btn-tactil-hud btn-quitar-hud').text('✕')
    );
    $('#pwaListaSegura').prepend($fila);
    this.reset();
    logArcadeHud('ANTI_XSS', txt);
  });

  $('#pwaBtnTestXss').off('click').on('click', () => {
    $('#pwaInputSeguro').val("<script>alert('XSS')</script>");
    $('#pwaFormSeguro').submit();
  });

  $('#pwaListaSegura').off('click', '.btn-quitar-hud').on('click', '.btn-quitar-hud', function () {
    $(this).closest('.fila-hud').fadeOut(150, function () { $(this).remove(); });
  });

  $('#pwaLimpiarLog').off('click').on('click', () => {
    $('#pwaLogOutput').empty().append($('<div>').text('[Sistema] Bitácora limpia.'));
  });
});
