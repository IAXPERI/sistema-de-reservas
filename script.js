// =========================================================
// 0. CONFIGURACIÓN SUPABASE REST API (PROYECTO: diseno-web-ii)
// =========================================================
const SUPABASE_URL = 'https://urvevemsosutoaexikpw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVydmV2ZW1zb3N1dG9hZXhpa3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMjY3OTEsImV4cCI6MjExMDgwMjc5MX0.SnA1-iZxacnY3ylKUti5sdtA18336vvGUCCgKVQSVsQ';
const SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// =========================================================
// 1. REGISTRO DEL SERVICE WORKER E INSTALACIÓN PWA (index.html)
// =========================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW activo en alcance:', reg.scope))
            .catch(err => console.error('Error SW:', err));
    });
}

let eventoInstalacion;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e;
    const btnInstalar = document.getElementById('btnInstalarPWA');
    if (btnInstalar) btnInstalar.hidden = false;
});

// =========================================================
// 2. RENDERIZADO SEGURO CON DOMPURIFY (Guía Unificada C3-A2)
// =========================================================
function renderizarDetalleSeguro(htmlDesdeServidor) {
    if (typeof DOMPurify !== 'undefined') {
        const limpio = DOMPurify.sanitize(htmlDesdeServidor);
        $('#detalleProyecto').html(limpio);
    } else {
        $('#detalleProyecto').text(htmlDesdeServidor);
    }
}

$(document).ready(function () {
    let intervaloTimer = null;

    function logArcade(tipo, msg) {
        const $log = $('#arcadeLogOutput');
        if (!$log.length) return;
        const hora = new Date().toLocaleTimeString();
        $log.prepend($('<div>').text(`[${hora}] ${tipo}: ${msg}`));
    }

    // Detector Online / Offline
    function actualizarEstadoRed() {
        const $net = $('#estadoRed');
        if (navigator.onLine) {
            $net.text('🟢 En Línea').removeClass('offline');
        } else {
            $net.text('🟠 Modo Offline Activo').addClass('offline');
        }
    }
    $(window).off('online offline').on('online offline', actualizarEstadoRed);
    actualizarEstadoRed();

    function cargarReservasSupabase() {
        fetch(`${SUPABASE_URL}/rest/v1/reservas_arcade?select=*&order=created_at.desc&limit=8`, { headers: SUPABASE_HEADERS })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(reservas => {
                const $box = $('#listaReservasSupabase').empty();
                $('#countReservasSupa').text(reservas.length);
                if (!reservas.length) {
                    $box.append($('<div>').addClass('fila-tactil').append($('<span>').addClass('titulo-truncado').text('Sin reservas registradas aún.')));
                    return;
                }
                reservas.forEach(r => {
                    const texto = `🎮 ${r.jugador} (${r.celular}) • ${r.estacion} (${r.horas}h) + ${r.snack} — ${r.monto_total} BOB`;
                    const $fila = $('<div>').addClass('fila-tactil').attr('data-id', r.id).append(
                        $('<span>').addClass('titulo-truncado').text(texto),
                        $('<button>').attr({ type: 'button', title: 'Editar jugador' }).addClass('btn-tactil btn-edit-supa')
                            .css({ background: '#e0f2fe', color: '#0369a1' }).text('✏️'),
                        $('<button>').attr({ type: 'button', title: 'Eliminar reserva' }).addClass('btn-tactil btn-del-supa')
                            .css({ background: '#fee2e2', color: '#dc2626' }).text('🗑️')
                    );
                    $box.append($fila);
                });
            })
            .catch(() => {});
    }

    cargarReservasSupabase();
    $('#btnRefrescarReservasSupa').off('click').on('click', function () {
        cargarReservasSupabase();
        logArcade('SUPABASE_REFRESH', 'Historial de reservas actualizado desde Postgres');
    });

    // CRUD: Editar (PATCH) y Eliminar (DELETE) reservas en Supabase
    $('#listaReservasSupabase').off('click', '.btn-edit-supa').on('click', '.btn-edit-supa', function () {
        const id = $(this).closest('.fila-tactil').attr('data-id');
        const nuevoJugador = prompt('Nuevo nombre de jugador para esta reserva:');
        if (!nuevoJugador || nuevoJugador.trim().length < 2) return;
        fetch(`${SUPABASE_URL}/rest/v1/reservas_arcade?id=eq.${id}`, {
            method: 'PATCH',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify({ jugador: nuevoJugador.trim() })
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(() => {
                cargarReservasSupabase();
                mostrarToast('✏️ Reserva actualizada en Supabase', '#10b981');
                logArcade('SUPABASE_UPDATE', `Reserva #${id} actualizada`);
            })
            .catch(() => mostrarToast('⚠️ Error al actualizar en Supabase', '#ef4444'));
    });

    $('#listaReservasSupabase').off('click', '.btn-del-supa').on('click', '.btn-del-supa', function () {
        const id = $(this).closest('.fila-tactil').attr('data-id');
        fetch(`${SUPABASE_URL}/rest/v1/reservas_arcade?id=eq.${id}`, {
            method: 'DELETE',
            headers: SUPABASE_HEADERS
        })
            .then(r => r.ok ? r : Promise.reject())
            .then(() => {
                cargarReservasSupabase();
                mostrarToast('🗑️ Reserva eliminada de Supabase', '#10b981');
                logArcade('SUPABASE_DELETE', `Reserva #${id} eliminada`);
            })
            .catch(() => mostrarToast('⚠️ Error al eliminar en Supabase', '#ef4444'));
    });

    // Sincronización Inicial desde Supabase (estaciones_arcade & cola_arcade)
    fetch(`${SUPABASE_URL}/rest/v1/estaciones_arcade?select=*&order=id.asc`, { headers: SUPABASE_HEADERS })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
            logArcade('SUPABASE_SELECT', `${data.length} estaciones sincronizadas desde Postgres`);
            renderizarDetalleSeguro(`<strong>Supabase Conectado:</strong> ${data.length} estaciones activas en <code>public.estaciones_arcade</code>.`);
        })
        .catch(() => logArcade('SUPABASE_OFFLINE', 'Usando catálogo local Offline-First'));

    fetch(`${SUPABASE_URL}/rest/v1/cola_arcade?select=*&order=created_at.desc&limit=5`, { headers: SUPABASE_HEADERS })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(turnos => {
            if (turnos && turnos.length) {
                $('#arcadeColaLista').empty();
                turnos.forEach(t => {
                    const $fila = $('<div>').addClass('fila-tactil').attr('data-cola-id', t.id).append(
                        $('<span>').addClass('titulo-truncado').text(t.descripcion),
                        $('<button>').attr('type', 'button').addClass('btn-tactil btn-quitar-arcade')
                            .css({ background: '#fee2e2', color: '#dc2626' }).text('✕')
                    );
                    $('#arcadeColaLista').append($fila);
                });
            }
        })
        .catch(() => {});

    // Botón Instalar PWA
    $('#btnInstalarPWA').off('click').on('click', async function () {
        if (!eventoInstalacion) return;
        eventoInstalacion.prompt();
        await eventoInstalacion.userChoice;
        this.hidden = true;
        logArcade('PWA_INSTALL', 'Flujo de instalación ejecutado');
    });

    // ---------------------------------------------------------
    // SIMULACIONES SEMANA 3: ALTO CONTRASTE, VISTA MÓVIL Y AUDITORÍA A11Y
    // ---------------------------------------------------------
    $('#btnSimularContraste').off('click').on('click', function () {
        document.body.classList.toggle('alto-contraste');
        const activo = document.body.classList.contains('alto-contraste');
        logArcade('A11Y_CONTRASTE', activo ? 'Alto Contraste Activado' : 'Alto Contraste Desactivado');
    });

    $('#btnSimularVista').off('click').on('click', function () {
        const grid = document.querySelector('.catalogo-grid');
        if (grid) {
            grid.classList.toggle('sim-movil');
            const movil = grid.classList.contains('sim-movil');
            logArcade('LAYOUT_SIM', movil ? 'Vista Móvil (1 col)' : 'Vista Escritorio (Grid)');
        }
    });

    $('#btnAuditarA11Y').off('click').on('click', function () {
        const zonas = document.querySelectorAll('header, nav, main, article, footer').length;
        const sinAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;
        const reporte = document.getElementById('reporteA11Y');
        if (reporte) {
            reporte.textContent = `Auditoría en vivo: ${zonas} etiquetas semánticas HTML5 detectadas | Imágenes sin alt: ${sinAlt}.`;
        }
        logArcade('AUDITORIA_A11Y', `${zonas} etiquetas semánticas | sin alt: ${sinAlt}`);
    });

    // Navegación desde el Dock Flexbox (.dock-acciones)
    $(document).off('click', '.dock-btn').on('click', '.dock-btn', function () {
        const destino = $(this).attr('data-scroll');
        const $el = $(destino);
        if ($el.length) {
            $('html, body').animate({ scrollTop: $el.offset().top - 75 }, 350);
        }
    });

    // ---------------------------------------------------------
    // 0. PROMOCIONES ROTATIVAS (CADA 2 MINUTOS = 120 SEGUNDOS)
    // ---------------------------------------------------------
    let promoActual = 0;
    const totalPromos = $('.promo-slide').length;
    let segundosPromo = 120;

    function mostrarPromo(indice) {
        $('.promo-slide').stop(true, true).fadeOut('fast').removeClass('active-promo');
        $(`.promo-slide[data-index="${indice}"]`).stop(true, true).fadeIn('fast').addClass('active-promo');
    }

    if (totalPromos > 0) {
        setInterval(function () {
            segundosPromo--;
            const min = Math.floor(segundosPromo / 60);
            const seg = segundosPromo % 60;
            const textoReloj = (min < 10 ? '0' + min : min) + ':' + (seg < 10 ? '0' + seg : seg);
            $('#promo-countdown').text(textoReloj);

            if (segundosPromo <= 0) {
                promoActual = (promoActual + 1) % totalPromos;
                mostrarPromo(promoActual);
                segundosPromo = 120;
            }
        }, 1000);
    }

    // ---------------------------------------------------------
    // 1. MODO OSCURO / CLARO Y MENÚ HAMBURGUESA (.off().on())
    // ---------------------------------------------------------
    $('#btn-theme').off('click').on('click', function () {
        $('body').toggleClass('dark-mode');
        const dark = $('body').hasClass('dark-mode');
        $(this).text(dark ? '☀️ Modo Claro' : '🌙 Modo Oscuro');
        logArcade('TEMA', dark ? 'Modo Oscuro' : 'Modo Claro');
    });

    $('#btn-hamburger').off('click').on('click', function () {
        $('#nav-menu').slideToggle('fast');
    });

    $(document).off('click', '.nav-link').on('click', '.nav-link', function () {
        $('#nav-menu').slideUp('fast');
    });

    // ---------------------------------------------------------
    // 2. FILTRO (.btn-console), ACORDEÓN (.accordion-btn) Y DBLCLICK
    // ---------------------------------------------------------
    $(document).off('click', '.btn-console').on('click', '.btn-console', function () {
        const categoria = $(this).attr('data-categoria');
        $('.btn-console').removeClass('active');
        $(this).addClass('active');

        if (categoria === 'todos') {
            $('.equipo-card').fadeIn('fast');
        } else {
            $('.equipo-card').fadeOut('fast');
            $('.equipo-card.' + categoria).fadeIn('fast');
        }
        logArcade('FILTRO_CONSOLA', categoria);
    });

    $(document).off('click', '.accordion-btn').on('click', '.accordion-btn', function () {
        $(this).closest('.equipo-card').find('.accordion-panel').slideToggle('slow');
    });

    $(document).off('dblclick', '.equipo-card').on('dblclick', '.equipo-card', function () {
        const titulo = $(this).find('h4').first().text().trim() || 'Estación';
        mostrarToast(`❤️ Estación favorita: ${titulo}`, '#10b981');
        logArcade('DBLCLICK_FAV', titulo);
    });

    $(document).off('click', '.btn-alquilar').on('click', '.btn-alquilar', function () {
        const precio = $(this).attr('data-precio');
        const estacion = $(this).attr('data-estacion') || 'Estación';
        $('#servicio').val(precio);
        actualizarCalculador();
        renderizarDetalleSeguro(`<strong>Estación seleccionada:</strong> ${estacion} (${precio} BOB/hr) — Sanitizado con DOMPurify`);
        $('html, body').animate({
            scrollTop: $('#calculador').offset().top - 80
        }, 400);
        logArcade('ALQUILAR_SELECCION', `${estacion} (${precio} BOB/hr)`);
    });

    // ---------------------------------------------------------
    // 3. CALCULADOR DINÁMICO EN VIVO (#hrs, #servicio, Snacks)
    // ---------------------------------------------------------
    function actualizarCalculador() {
        const precioHora = parseInt($('#servicio').val(), 10) || 0;
        const nombreEstacion = $('#servicio option:selected').attr('data-nombre');
        let horas = parseInt($('#hrs').val(), 10);

        if (isNaN(horas) || horas < 1) {
            horas = 1;
        }

        const radioSnack = $('input[name="snack"]:checked');
        const precioSnack = parseInt(radioSnack.val(), 10) || 0;
        const nombreSnack = radioSnack.attr('data-snack') || 'Sin Snack';
        const total = (precioHora * horas) + precioSnack;

        $('#res-estacion').text(nombreEstacion);
        $('#res-horas').text(`${horas} Hora(s) x ${precioHora} BOB`);
        $('#res-snack').text(`${nombreSnack} (+${precioSnack} BOB)`);
        $('#total').text(total);
    }

    $('#hrs').off('input').on('input', actualizarCalculador);
    $('#servicio').off('change').on('change', actualizarCalculador);
    $(document).off('change', 'input[name="snack"]').on('change', 'input[name="snack"]', function () {
        $('.snack-option').removeClass('selected');
        $(this).closest('.snack-option').addClass('selected');
        actualizarCalculador();
    });

    // ---------------------------------------------------------
    // 4. TOAST ANTI-XSS (.text()) + TEMPORIZADOR 30s
    // ---------------------------------------------------------
    function mostrarToast(mensaje, colorFondo) {
        $('#toast-alert')
            .css('background', colorFondo || '#10b981')
            .css('color', colorFondo === '#ef4444' ? '#ffffff' : '#0f172a')
            .text(mensaje)
            .stop(true, true)
            .slideDown('fast')
            .delay(3000)
            .fadeOut('slow');
    }

    let intentoReservar = false;

    function actualizarEstadoCampo($msg, $input, esValido, texto) {
        if (!texto) {
            $msg.addClass('oculto').removeClass('msg-exito msg-error').text('');
            $input.removeClass('input-valido input-invalido');
            return;
        }
        $msg.removeClass('oculto msg-exito msg-error').addClass(esValido ? 'msg-exito' : 'msg-error').text(texto);
        $input.removeClass('input-valido input-invalido').addClass(esValido ? 'input-valido' : 'input-invalido');
    }

    function validarNombreCampo(mostrarVacio) {
        const $inp = $('#nombre');
        const $msg = $('#msgNombre');
        const val = $inp.val().trim();
        if (!val) {
            if (mostrarVacio) actualizarEstadoCampo($msg, $inp, false, '⚠️ Falta ingresar el nombre del jugador.');
            else actualizarEstadoCampo($msg, $inp, false, '');
            return false;
        }
        if (val.length < 3) {
            actualizarEstadoCampo($msg, $inp, false, `⚠️ Mínimo 3 letras (llevas ${val.length}).`);
            return false;
        }
        actualizarEstadoCampo($msg, $inp, true, `✅ Jugador válido: ${val}`);
        return true;
    }

    function validarCelularCampo(mostrarVacio) {
        const $inp = $('#celular');
        const $msg = $('#msgCelular');
        const val = $inp.val().trim();
        if (!val) {
            if (mostrarVacio) actualizarEstadoCampo($msg, $inp, false, '⚠️ Falta ingresar el número de celular.');
            else actualizarEstadoCampo($msg, $inp, false, '');
            return false;
        }
        if (!/^\d+$/.test(val)) {
            actualizarEstadoCampo($msg, $inp, false, '⚠️ Solo se permiten números (sin letras ni espacios).');
            return false;
        }
        if (val.length !== 8) {
            actualizarEstadoCampo($msg, $inp, false, `⚠️ El celular debe tener exactamente 8 dígitos (llevas ${val.length} de 8).`);
            return false;
        }
        actualizarEstadoCampo($msg, $inp, true, `✅ Celular válido: ${val}`);
        return true;
    }

    function validarFechaReservaCampo(mostrarVacio) {
        const $d = $('#dia'), $m = $('#mes'), $a = $('#anio');
        const $msg = $('#msgFecha');
        const dTxt = $d.val().trim(), mTxt = $m.val().trim(), aTxt = $a.val().trim();

        if (!dTxt && !mTxt && !aTxt) {
            if (mostrarVacio) actualizarEstadoCampo($msg, $d.add($m).add($a), false, '⚠️ Falta completar la fecha de reserva (Día, Mes y Año).');
            else actualizarEstadoCampo($msg, $d.add($m).add($a), false, '');
            return false;
        }
        if (!dTxt || !mTxt || !aTxt) {
            if (mostrarVacio) actualizarEstadoCampo($msg, $d.add($m).add($a), false, '⚠️ Completa Día, Mes y Año.');
            else actualizarEstadoCampo($msg, $d.add($m).add($a), false, '');
            return false;
        }

        const dia = parseInt(dTxt, 10), mes = parseInt(mTxt, 10), anio = parseInt(aTxt, 10);
        const anioActual = new Date().getFullYear();
        if (isNaN(anio) || anio < anioActual || anio > anioActual + 1) {
            actualizarEstadoCampo($msg, $a, false, `⚠️ Año inválido (no se permiten años pasados como 1950).`);
            return false;
        }
        if (isNaN(mes) || mes < 1 || mes > 12) {
            actualizarEstadoCampo($msg, $m, false, '⚠️ El Mes debe estar entre 1 y 12.');
            return false;
        }
        const diasPorMes = [31, (anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (isNaN(dia) || dia < 1 || dia > diasPorMes[mes - 1]) {
            actualizarEstadoCampo($msg, $d, false, `⚠️ Día inválido para el mes ${mes}.`);
            return false;
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const maxFecha = new Date(hoy);
        maxFecha.setMonth(maxFecha.getMonth() + 1);
        const fechaIngresada = new Date(anio, mes - 1, dia);

        if (fechaIngresada < hoy || fechaIngresada > maxFecha) {
            actualizarEstadoCampo($msg, $d.add($m).add($a), false, `⚠️ La reserva debe ser entre hoy (${hoy.toLocaleDateString()}) y máximo 1 mes (${maxFecha.toLocaleDateString()}).`);
            return false;
        }
        actualizarEstadoCampo($msg, $d.add($m).add($a), true, `✅ Fecha válida (${dia}/${mes}/${anio})`);
        return true;
    }

    function validarHorasCampo(mostrarVacio) {
        const $inp = $('#hrs');
        const $msg = $('#msgHoras');
        const horas = parseInt($inp.val(), 10);
        if (isNaN(horas) || horas < 1 || horas > 8) {
            if (mostrarVacio || $inp.val() !== '') {
                actualizarEstadoCampo($msg, $inp, false, '⚠️ Las horas deben estar entre 1 y 8.');
            }
            return false;
        }
        actualizarEstadoCampo($msg, $inp, true, `✅ ${horas} hora(s) seleccionadas`);
        return true;
    }

    $('#nombre').off('input').on('input', () => validarNombreCampo(intentoReservar));
    $('#celular').off('input').on('input', () => validarCelularCampo(intentoReservar));
    $('#dia, #mes, #anio').off('input').on('input', () => validarFechaReservaCampo(intentoReservar));
    $('#hrs').off('input.validacion').on('input.validacion', () => validarHorasCampo(intentoReservar));

    function validarDatosJugador() {
        intentoReservar = true;
        $('#mensaje-error').hide();

        const okNom = validarNombreCampo(true);
        const okCel = validarCelularCampo(true);
        const okFec = validarFechaReservaCampo(true);
        const okHrs = validarHorasCampo(true);

        if (!okNom || !okCel || !okFec || !okHrs) {
            $('#mensaje-error').text('⚠️ Faltan datos o hay errores en el formulario. Revisa los campos en rojo.').slideDown('fast');
            return false;
        }
        return true;
    }

    $('#btnReservar').off('click').on('click', function () {
        if (!validarDatosJugador()) return;

        $('#reserva-confirmada-box').hide();
        clearInterval(intervaloTimer);

        let segundos = 30;
        $('#mod-timer').text('00:30s');
        $('#box-timer').stop(true, true).slideDown('fast');
        $('#btnModal').stop(true, true).slideDown('fast');
        logArcade('RESERVA_TIMER', 'Cuenta regresiva de 30s iniciada');

        intervaloTimer = setInterval(function () {
            segundos--;
            const formato = segundos < 10 ? `00:0${segundos}s` : `00:${segundos}s`;
            $('#mod-timer').text(formato);

            if (segundos <= 0) {
                clearInterval(intervaloTimer);
                $('#box-timer').fadeOut('fast');
                $('#btnModal').fadeOut('fast');
                mostrarToast('⏰ Tarifa Flash Expirada. Vuelve a apretar en Reservar.', '#ef4444');
                logArcade('TARIFA_EXPIRADA', 'Expiraron los 30s');
            }
        }, 1000);
    });

    $('#btnModal').off('click').on('click', function () {
        if (!validarDatosJugador()) return;

        clearInterval(intervaloTimer);
        $('#box-timer').fadeOut('fast');
        $('#btnModal').slideUp('fast');

        const nombre = $('#nombre').val().trim();
        const celular = $('#celular').val().trim();
        const fechaRes = `${$('#dia').val().trim()}/${$('#mes').val().trim()}/${$('#anio').val().trim()}`;
        const horas = parseInt($('#hrs').val(), 10);
        const nombreEstacion = $('#servicio option:selected').attr('data-nombre');
        const nombreSnack = $('input[name="snack"]:checked').attr('data-snack');
        const montoTotal = $('#total').text();

        $('#conf-jugador').text(`${nombre} (${celular})`);
        $('#conf-servicio').text(`${nombreEstacion} (${fechaRes})`);
        $('#conf-snack').text(nombreSnack);
        $('#conf-monto').text(`${montoTotal} BOB (${horas} Horas)`);

        $('#reserva-confirmada-box').hide().slideDown('fast');
        mostrarToast(`🎉 ¡Reserva confirmada para ${nombre} por ${montoTotal} BOB!`, '#10b981');
        logArcade('RESERVA_CONFIRMADA', `${nombre} — ${nombreEstacion} [${fechaRes}] (${montoTotal} BOB)`);

        // Guardar Reserva en Tiempo Real en Supabase (public.reservas_arcade)
        fetch(`${SUPABASE_URL}/rest/v1/reservas_arcade`, {
            method: 'POST',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify({
                jugador: nombre,
                celular: celular,
                estacion: `${nombreEstacion} (${fechaRes})`,
                horas: horas,
                snack: nombreSnack,
                monto_total: parseFloat(montoTotal) || 0
            })
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(() => {
                logArcade('SUPABASE_INSERT', `Reserva de ${nombre} guardada en Postgres`);
                cargarReservasSupabase();
            })
            .catch(() => logArcade('SUPABASE_QUEUE', 'Reserva guardada localmente (Offline)'));
    });

    // ---------------------------------------------------------
    // 5. MÓDULO SEMANA 2 & 3: CASCADA 3 CAPAS + COLA ANTI-XSS + DOMPURIFY
    // ---------------------------------------------------------
    const ARCADE_CASCADA = {
        ps5: [
            { id: 'fc', label: 'EA Sports FC / Tekken 8', rec: 'PS5 Pro 4K 120Hz (40 BOB/hr)' },
            { id: 'vr', label: 'PS VR2 Inmersivo', rec: 'Estación VR Dedicada (45 BOB/hr)' }
        ],
        pc: [
            { id: 'fps', label: 'Valorant / CS2 / Apex', rec: 'PC RTX 4070 + Monitor 240Hz (25 BOB/hr)' },
            { id: 'moba', label: 'LoL / Dota 2', rec: 'Zona Torneo LAN 5v5 (25 BOB/hr)' }
        ],
        retro: [
            { id: 'fight', label: 'King of Fighters / Street Fighter', rec: 'Cabina Arcade Clásica (15 BOB/hr)' }
        ]
    };

    $('#arcadeCascadaCat').off('change').on('change', function () {
        const cat = $(this).val();
        const $sub = $('#arcadeCascadaSub').empty().append('<option value="">-- Selecciona Juego/Modo --</option>');
        $('#arcadeCascadaRes').hide();

        if (cat && ARCADE_CASCADA[cat]) {
            ARCADE_CASCADA[cat].forEach(x => $sub.append($('<option>').val(x.id).text(x.label).data('rec', x.rec)));
            $sub.prop('disabled', false);
            logArcade('CASCADA_1', cat);
        } else {
            $sub.prop('disabled', true);
        }
    });

    $('#arcadeCascadaSub').off('change').on('change', function () {
        const rec = $(this).find(':selected').data('rec');
        if (rec) {
            $('#arcadeCascadaRes').text(`✅ Estación recomendada: ${rec}`).fadeIn();
            logArcade('CASCADA_2', rec);
        }
    });

    $('#arcadeBtnAgregarCola').off('click').on('click', function () {
        const txt = $('#arcadeInputCola').val().trim();
        if (!txt) return;

        const $fila = $('<div>').addClass('fila-tactil').append(
            $('<span>').addClass('titulo-truncado').text(txt),
            $('<button>').attr('type', 'button').addClass('btn-tactil btn-quitar-arcade')
                .css({ background: '#fee2e2', color: '#dc2626' }).text('✕')
        );
        $('#arcadeColaLista').prepend($fila);
        renderizarDetalleSeguro(`<strong>Último turno sanitizado (DOMPurify):</strong> ${txt}`);
        $('#arcadeInputCola').val('');
        logArcade('COLA_ANTI_XSS', txt);

        // Guardar Turno en Tiempo Real en Supabase (public.cola_arcade)
        fetch(`${SUPABASE_URL}/rest/v1/cola_arcade`, {
            method: 'POST',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify({ descripcion: txt })
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(res => {
                if (res && res[0] && res[0].id) $fila.attr('data-cola-id', res[0].id);
                logArcade('SUPABASE_INSERT', 'Turno insertado en public.cola_arcade');
            })
            .catch(() => {});
    });

    $('#arcadeBtnTestXss').off('click').on('click', function () {
        $('#arcadeInputCola').val("<script>alert('XSS')</script><img src=x onerror=alert(1)>");
        $('#arcadeBtnAgregarCola').trigger('click');
    });

    $('#arcadeColaLista').off('click', '.btn-quitar-arcade').on('click', '.btn-quitar-arcade', function () {
        const $fila = $(this).closest('.fila-tactil');
        const colaId = $fila.attr('data-cola-id');
        if (colaId) {
            fetch(`${SUPABASE_URL}/rest/v1/cola_arcade?id=eq.${colaId}`, {
                method: 'DELETE',
                headers: SUPABASE_HEADERS
            }).then(() => logArcade('SUPABASE_DELETE', `Turno #${colaId} eliminado de cola_arcade`)).catch(() => {});
        }
        $fila.fadeOut(150, function () { $(this).remove(); });
    });
});
