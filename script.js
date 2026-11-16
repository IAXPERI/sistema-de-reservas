$(document).ready(function () {
    let intervaloTimer = null;

    function logArcade(tipo, msg) {
        const $log = $('#arcadeLogOutput');
        if (!$log.length) return;
        const hora = new Date().toLocaleTimeString();
        $log.prepend($('<div>').text(`[${hora}] ${tipo}: ${msg}`));
    }

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
        const titulo = $(this).find('h3').first().text().trim() || 'Estación';
        mostrarToast(`❤️ Estación favorita: ${titulo}`, '#10b981');
        logArcade('DBLCLICK_FAV', titulo);
    });

    $(document).off('click', '.btn-alquilar').on('click', '.btn-alquilar', function () {
        const precio = $(this).attr('data-precio');
        $('#servicio').val(precio);
        actualizarCalculador();
        $('html, body').animate({
            scrollTop: $('#calculador').offset().top - 80
        }, 400);
        logArcade('ALQUILAR_SELECCION', `${precio} BOB/hr`);
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

    function validarDatosJugador() {
        const nombre = $('#nombre').val().trim();
        const celular = $('#celular').val().trim();
        const horas = parseInt($('#hrs').val(), 10);

        $('#mensaje-error').hide();

        if (nombre.length < 3) {
            $('#mensaje-error').text('⚠️ Ingresa el nombre del jugador (mínimo 3 letras).').slideDown('fast');
            return false;
        }
        if (!/^[67]\d{7}$/.test(celular)) {
            $('#mensaje-error').text('⚠️ Ingresa un celular válido de 8 dígitos (empezando con 6 o 7).').slideDown('fast');
            return false;
        }
        if (isNaN(horas) || horas < 1 || horas > 8) {
            $('#mensaje-error').text('⚠️ La cantidad de horas debe estar entre 1 y 8.').slideDown('fast');
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
        const horas = parseInt($('#hrs').val(), 10);
        const nombreEstacion = $('#servicio option:selected').attr('data-nombre');
        const nombreSnack = $('input[name="snack"]:checked').attr('data-snack');
        const montoTotal = $('#total').text();

        $('#conf-jugador').text(`${nombre} (${celular})`);
        $('#conf-servicio').text(nombreEstacion);
        $('#conf-snack').text(nombreSnack);
        $('#conf-monto').text(`${montoTotal} BOB (${horas} Horas)`);

        $('#reserva-confirmada-box').hide().slideDown('fast');
        mostrarToast(`🎉 ¡Reserva confirmada para ${nombre} por ${montoTotal} BOB!`, '#10b981');
        logArcade('RESERVA_CONFIRMADA', `${nombre} — ${nombreEstacion} (${montoTotal} BOB)`);
    });

    // ---------------------------------------------------------
    // 5. MÓDULO SEMANA 2 & 3: CASCADA 3 CAPAS + COLA ANTI-XSS
    // ---------------------------------------------------------
    const ARCADE_CASCADA = {
        ps5: [
            { id: 'fc', label: 'EA Sports FC / Tekken 8', rec: 'PS5 Pro 4K 120Hz (35 BOB/hr)' },
            { id: 'vr', label: 'PS VR2 Inmersivo', rec: 'Estación VR Dedicada (45 BOB/hr)' }
        ],
        pc: [
            { id: 'fps', label: 'Valorant / CS2 / Apex', rec: 'PC RTX 4070 + Monitor 240Hz (30 BOB/hr)' },
            { id: 'moba', label: 'LoL / Dota 2', rec: 'Zona Torneo LAN 5v5 (25 BOB/hr)' }
        ],
        retro: [
            { id: 'fight', label: 'King of Fighters / Street Fighter', rec: 'Cabina Arcade Clásica (20 BOB/hr)' }
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
        $('#arcadeInputCola').val('');
        logArcade('COLA_ANTI_XSS', txt);
    });

    $('#arcadeBtnTestXss').off('click').on('click', function () {
        $('#arcadeInputCola').val("<script>alert('XSS')</script>");
        $('#arcadeBtnAgregarCola').trigger('click');
    });

    $('#arcadeColaLista').off('click', '.btn-quitar-arcade').on('click', '.btn-quitar-arcade', function () {
        $(this).closest('.fila-tactil').fadeOut(150, function () { $(this).remove(); });
    });
});

