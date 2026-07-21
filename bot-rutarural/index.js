const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');

// ─── Config ────────────────────────────────────────────
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '+56 9 XXXX XXXX';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const PORT = process.env.PORT || 3000;
const AUTH_DIR = 'auth_info_baileys';

let connectionStatus = 'DISCONNECTED';
let currentQrBase64 = '';
const sesiones = {};

// ─── Fallback local ─────────────────────────────────────
const FALLBACK_HORARIOS = {
    'Chaihuin': '🚌 *RED ALERTA - REPORTE DE MOVILIDAD*\n📍 Sector: Chaihuin\n📆 Hoy\n\n🇨🇱 *SERVICIO SUBSIDIADO MTT*\n🔹 Corral ➡️ Chaihuín\n💵 $800\n⏱️ Salidas: 07:00, 12:00, 17:00 hrs.\n\n📱 Los horarios en vivo se actualizan al reconectar con el sistema.',
    'Corral': '🚌 *RED ALERTA - REPORTE DE MOVILIDAD*\n📍 Sector: Corral\n📆 Hoy\n\nDesde Corral hay servicios a:\n• Chaihuín: 07:00, 12:00, 17:00 hrs.\n• Huiro: 08:30, 14:00 hrs.\n• La Aguada: 06:30, 11:00, 16:00, 19:00 hrs.\n\n📱 Los horarios en vivo se actualizan al reconectar con el sistema.',
    'Huiro': '🚌 *RED ALERTA - REPORTE DE MOVILIDAD*\n📍 Sector: Huiro\n📆 Hoy\n\n🇨🇱 *SERVICIO SUBSIDIADO MTT*\n🔹 Corral ➡️ Huiro\n💵 $1.200\n⏱️ Salidas: 08:30, 14:00 hrs.\n\n📱 Los horarios en vivo se actualizan al reconectar con el sistema.'
};

// ─── Utilidades ────────────────────────────────────────
function getDayInSpanish() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return DIAS[new Date(utc - 10800000).getDay()];
}

function getSector(texto) {
    if (texto.includes('chaihuin')) return 'Chaihuin';
    if (texto.includes('huiro')) return 'Huiro';
    return 'Corral';
}

// ─── HTTP con fallback inmediato ────────────────────────
async function fetchWithFallback(url, fallback, timeout = 5000) {
    try {
        return await axios.get(url, { timeout });
    } catch (error) {
        if (error.response && error.response.status !== 503 && error.response.status !== 502) {
            throw error;
        }
        console.log(`⚠️ Backend lento, usando fallback: ${url.substring(0, 60)}...`);
        return { data: fallback };
    }
}

async function postToBackend(url, data, timeout = 5000) {
    try { await axios.post(url, data, { timeout }); } catch (e) { /* silent */ }
}

async function reportStatus() {
    await postToBackend(`${BACKEND_URL}/api/whatsapp/status`, {
        numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64
    });
}

async function logConsulta(numero, sector, mensaje, tipo) {
    await postToBackend(`${BACKEND_URL}/api/whatsapp/consultas`, {
        numeroWhatsapp: numero, sector, mensaje, tipo
    });
}

// ─── Keep-Alive + Status periódico ────────────────────
setInterval(async () => {
    try { await axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 8000 }); } catch (e) {}
    reportStatus(); // Re-envía estado actual por si el backend se perdió
}, 4 * 60 * 1000);

// ─── Express ───────────────────────────────────────────
const app = express();
app.get('/status', (req, res) => {
    res.json({ numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 || null });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Bot HTTP en puerto ${PORT}`);
});

// ─── Baileys con manejo de Bad MAC ─────────────────────
async function connectToWhatsApp() {
    let authState;
    try {
        authState = await useMultiFileAuthState(AUTH_DIR);
    } catch (e) {
        console.error('⚠️ Error de sesión Baileys, limpiando auth...', e.message);
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (er) {}
        authState = await useMultiFileAuthState(AUTH_DIR);
    }

    const { state, saveCreds } = authState;

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ['Red Alerta Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            connectionStatus = 'SCAN_QR';
            try { currentQrBase64 = await qrcode.toDataURL(qr); } catch (e) {}
            console.log('\n═══════════════════════════════════════════');
            console.log(`📱 NÚMERO OFICIAL: ${WHATSAPP_NUMBER}`);
            console.log('📸 ESCANEA EL QR DE ARRIBA CON WHATSAPP');
            console.log('═══════════════════════════════════════════\n');
            reportStatus();
        }

        if (connection === 'open') {
            connectionStatus = 'CONNECTED';
            currentQrBase64 = '';
            console.log(`✅ Bot conectado como ${WHATSAPP_NUMBER}`);
            reportStatus();
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            connectionStatus = reason === DisconnectReason.loggedOut ? 'LOGGED_OUT' : 'DISCONNECTED';
            console.log(`⚠️ Bot desconectado (razón: ${reason || 'desconocida'}).`);
            reportStatus();

            if (reason === DisconnectReason.loggedOut) {
                try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
                console.log('🧹 Sesión eliminada por logout.');
            }
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(connectToWhatsApp, 3000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        try {
            const chatId = msg.key.remoteJid;
            const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const textoNormalizado = textMessage.toLowerCase().trim();
            const sesion = sesiones[chatId];

            console.log(`📩 "${textMessage}" de ${chatId}`);

            // ─── MENU ──────────────────────────────────
            if (textoNormalizado === 'menu' || textoNormalizado === 'hola') {
                delete sesiones[chatId];
                await sock.sendMessage(chatId, {
                    text: `👋 *Red Alerta Rural* 🤖\n\n🌍 *Comandos:*\n📍 *Sector* (Chaihuin, Corral, Huiro) → Horarios\n📡 *Estado* / *Alerta* → Puerto, clima, ruta\n🚨 *Emergencia* → Reportar incidente\n📞 *Números* → Teléfonos de emergencia`
                });

            // ─── EMERGENCIA INTERACTIVA ────────────────
            } else if (textoNormalizado === 'emergencia' || textoNormalizado === 'alerta') {
                sesiones[chatId] = { paso: 'menu' };
                await sock.sendMessage(chatId, {
                    text: `🚨 *Reporte de Emergencia - Ruta T-450 / Corral*\n\nEscribe el número:\n\n1️⃣ *Derrumbe* en la vía\n2️⃣ *Bloqueo* / Árbol caído\n3️⃣ *Otro* (especifique)\n\n0️⃣ *Cancelar*`
                });

            } else if (sesion && sesion.paso === 'menu') {
                const tipos = { '1': 'Derrumbe', '2': 'Bloqueo en ruta', '3': 'Otro' };
                const tipo = tipos[textoNormalizado];
                if (textoNormalizado === '0' || textoNormalizado === 'cancelar') {
                    delete sesiones[chatId];
                    await sock.sendMessage(chatId, { text: '✅ Reporte cancelado.' });
                } else if (tipo) {
                    sesiones[chatId] = { paso: 'descripcion', tipoIncidente: tipo };
                    await sock.sendMessage(chatId, { text: `📝 *${tipo}*\nDescribe lo que ocurre (ej: "Roca grande altura San Carlos"):` });
                } else {
                    await sock.sendMessage(chatId, { text: `Responde:\n1️⃣ Derrumbe\n2️⃣ Bloqueo\n3️⃣ Otro\n0️⃣ Cancelar` });
                }

            } else if (sesion && sesion.paso === 'descripcion') {
                const { tipoIncidente } = sesion;
                delete sesiones[chatId];
                await sock.sendMessage(chatId, { text: '⏳ *Registrando...*' });
                try {
                    await axios.post(`${BACKEND_URL}/api/admin/incidentes`, {
                        rutaId: 1, tipoIncidente, descripcion: textMessage
                    }, { timeout: 15000 });
                    await sock.sendMessage(chatId, {
                        text: `✅ *Reporte registrado* 📋\n🔹 ${tipoIncidente}: ${textMessage}\n\nEl equipo municipal fue notificado. ¡Gracias! 🙌`
                    });
                    logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${textMessage}`, 'emergencia');
                } catch (e) {
                    await sock.sendMessage(chatId, { text: '❌ No se pudo registrar. Intenta con *EMERGENCIA*.' });
                }

            // ─── SECTORES ─────────────────────────────
            } else if (textoNormalizado.includes('chaihuin') || textoNormalizado.includes('corral') || textoNormalizado.includes('huiro')) {
                delete sesiones[chatId];
                const sector = getSector(textoNormalizado);
                await sock.sendMessage(chatId, { text: '⏳ *Consultando...*' });

                const resp = await fetchWithFallback(
                    `${BACKEND_URL}/api/transporte/reporte?sector=${sector}&dia=${getDayInSpanish()}`,
                    FALLBACK_HORARIOS[sector] || FALLBACK_HORARIOS['Corral']
                );
                await sock.sendMessage(chatId, { text: resp.data });
                logConsulta(chatId, sector, textMessage, 'consulta');

            // ─── ESTADO / CLIMA / PUERTO ──────────────
            } else if (['estado', 'alerta', 'clima', 'puerto'].some(p => textoNormalizado.includes(p))) {
                delete sesiones[chatId];
                const resp = await fetchWithFallback(
                    `${BACKEND_URL}/api/emergencia`, 10000,
                    JSON.stringify({
                        puertoEstado: 'ABIERTO',
                        puertoDetalle: 'RVC Corral operativo. Información en línea no disponible.',
                        climaAlerta: 'Normal',
                        climaDetalle: 'Sin datos actualizados del servidor.',
                        rutaAlerta: 'Normal',
                        rutaDetalle: 'Ruta T-450 transitable.'
                    })
                );
                const d = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
                await sock.sendMessage(chatId, {
                    text: `📡 *ESTADO ACTUAL - CORRAL*\n\n⛵ *Puerto RVC:* ${d.puertoEstado}\n   ${d.puertoDetalle}\n\n🌤️ *Clima:* ${d.climaAlerta}\n   ${d.climaDetalle}\n\n🛣️ *Ruta T-450:* ${d.rutaAlerta}\n   ${d.rutaDetalle}`
                });

            // ─── NÚMEROS DE EMERGENCIA ─────────────────
            } else if (['numero', 'telefono', 'fono', 'contacto'].some(p => textoNormalizado.includes(p))) {
                delete sesiones[chatId];
                await sock.sendMessage(chatId, {
                    text: '📞 *NÚMEROS DE EMERGENCIA*\n\n' +
                        '🚓 *Carabineros (Corral)*: 133\n' +
                        '🚒 *Bomberos (Corral)*: 132\n' +
                        '🚑 *Hospital de Corral*: (63) 2 264000\n' +
                        '🏥 *Posta Chaihuín*: +56 9 1234 5678\n\n' +
                        '_Para REPORTAR un incidente escribe EMERGENCIA._'
                });
            }
        } catch (e) {
            // Captura errores de descifrado (Bad MAC) sin romper el flujo
            if (e.message && (e.message.includes('Bad MAC') || e.message.includes('decrypt'))) {
                console.log('⚠️ Error de cifrado en mensaje ignorado (Bad MAC)');
            } else {
                console.error('Error procesando mensaje:', e.message);
            }
        }
    });
}

// ─── Start ─────────────────────────────────────────────
console.log('🚀 Iniciando Bot de Red Alerta...');
console.log(`📱 Número: ${WHATSAPP_NUMBER}`);
console.log(`🔗 Backend: ${BACKEND_URL}`);
connectToWhatsApp();
