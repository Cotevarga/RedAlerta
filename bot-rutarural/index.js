const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const qrcode = require('qrcode');
const express = require('express');

// ─── Config ────────────────────────────────────────────
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '+56 9 XXXX XXXX';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const PORT = process.env.PORT || 3000;
let connectionStatus = 'DISCONNECTED';
let currentQrBase64 = '';

const sesiones = {}; // chatId → { paso, tipoIncidente }

// ─── Utilidades ────────────────────────────────────────
function getDayInSpanish() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const chile = new Date(utc - 10800000);
    return DIAS[chile.getDay()];
}

// ─── Infinite retry ────────────────────────────────────
async function waitForBackend(url, timeout = 15000) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return await axios.get(url, { timeout });
        } catch (error) {
            if (error.response && error.response.status !== 503 && error.response.status !== 502) {
                throw error;
            }
            console.log(`🔄 Intento ${i + 1}/${maxAttempts}: ${url.substring(0, 60)}...`);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    throw new Error('Timeout after max retries');
}

async function postToBackend(url, data, timeout = 5000) {
    try {
        return await axios.post(url, data, { timeout });
    } catch (e) { /* silent */ }
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

// ─── Keep-Alive ────────────────────────────────────────
setInterval(async () => {
    try { await axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 8000 }); } catch (e) {}
}, 4 * 60 * 1000);

// ─── Express ───────────────────────────────────────────
const app = express();
app.get('/status', (req, res) => {
    res.json({ numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 || null });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Bot HTTP en puerto ${PORT}`);
});

// ─── WhatsApp ──────────────────────────────────────────
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

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

        const chatId = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const textoNormalizado = textMessage.toLowerCase().trim();
        const sesion = sesiones[chatId];

        console.log(`📩 "${textMessage}" de ${chatId}`);

        // ─── FLUJO: emergencia interactiva ───────────
        if (textoNormalizado === 'menu' || textoNormalizado === 'hola') {
            delete sesiones[chatId];
            await sock.sendMessage(chatId, {
                text: `👋 ¡Hola! Soy el Bot de *Red Alerta*.\n\n🌍 *Comandos:*\n📍 *Sector* (Chaihuin, Corral, Huiro) → Horarios\n📡 *Estado* / *Alerta* → Puerto, clima, ruta\n🚨 *Emergencia* → Reportar incidente`
            });

        } else if (textoNormalizado === 'emergencia' || textoNormalizado === 'alerta') {
            sesiones[chatId] = { paso: 'menu' };
            await sock.sendMessage(chatId, {
                text: `🚨 *Reporte de Emergencia - Ruta T-450 / Corral*\n\nPresiona o escribe el número correspondiente:\n\n1️⃣ *Derrumbe* en la vía\n2️⃣ *Bloqueo* en la ruta / Árbol caído\n3️⃣ *Otro* (especifique)\n\n0️⃣ *Cancelar*`
            });

        } else if (sesion && sesion.paso === 'menu') {
            const tipos = { '1': 'Derrumbe', '2': 'Bloqueo en ruta', '3': 'Otro' };
            const tipo = tipos[textoNormalizado];
            if (textoNormalizado === '0' || textoNormalizado === 'cancelar') {
                delete sesiones[chatId];
                await sock.sendMessage(chatId, { text: '✅ Reporte cancelado. Escribe *EMERGENCIA* cuando necesites.' });
            } else if (tipo) {
                sesiones[chatId] = { paso: 'descripcion', tipoIncidente: tipo };
                await sock.sendMessage(chatId, { text: `📝 Has seleccionado: *${tipo}*\n\nDescribe brevemente lo que está ocurriendo (ej: "Roca grande a la altura de San Carlos"):` });
            } else {
                await sock.sendMessage(chatId, { text: `❌ Opción no válida. Responde:\n1️⃣ Derrumbe\n2️⃣ Bloqueo\n3️⃣ Otro\n0️⃣ Cancelar` });
            }

        } else if (sesion && sesion.paso === 'descripcion') {
            const { tipoIncidente } = sesion;
            delete sesiones[chatId];
            await sock.sendMessage(chatId, { text: '⏳ *Registrando tu reporte...*' });

            try {
                await axios.post(`${BACKEND_URL}/api/admin/incidentes`, {
                    rutaId: 1,
                    tipoIncidente: tipoIncidente,
                    descripcion: textMessage
                }, { timeout: 15000 });
                await sock.sendMessage(chatId, {
                    text: `✅ *Reporte registrado exitosamente* 📋\n\n🔹 *Tipo:* ${tipoIncidente}\n🔹 *Detalle:* ${textMessage}\n\nEl equipo municipal ha sido notificado. ¡Gracias por ayudar a tu comunidad! 🙌\n\n_Escribe MENU para volver al inicio._`
                });
                logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${textMessage}`, 'emergencia');
            } catch (e) {
                await sock.sendMessage(chatId, { text: '❌ No se pudo registrar el reporte. Intenta nuevamente con *EMERGENCIA*.' });
            }

        // ─── FLUJO: sectores (horarios) ──────────────
        } else if (textoNormalizado.includes('chaihuin') || textoNormalizado.includes('corral') || textoNormalizado.includes('huiro')) {
            delete sesiones[chatId];
            await sock.sendMessage(chatId, { text: '⏳ *Consultando el sistema...*' });

            let sector = 'Corral';
            if (textoNormalizado.includes('chaihuin')) sector = 'Chaihuin';
            if (textoNormalizado.includes('huiro')) sector = 'Huiro';

            waitForBackend(`${BACKEND_URL}/api/transporte/reporte?sector=${sector}&dia=${getDayInSpanish()}`)
                .then(resp => {
                    sock.sendMessage(chatId, { text: resp.data });
                    logConsulta(chatId, sector, textMessage, 'consulta');
                }).catch(e => console.error("Error irrecuperable:", e.message));

        // ─── FLUJO: estado / clima / puerto ──────────
        } else if (['estado', 'alerta', 'clima', 'puerto'].some(p => textoNormalizado.includes(p))) {
            delete sesiones[chatId];
            waitForBackend(`${BACKEND_URL}/api/emergencia`, 10000).then(resp => {
                const d = resp.data;
                sock.sendMessage(chatId, {
                    text: `📡 *ESTADO ACTUAL - CORRAL*\n\n⛵ *Puerto RVC:* ${d.puertoEstado}\n   ${d.puertoDetalle}\n\n🌤️ *Clima:* ${d.climaAlerta}\n   ${d.climaDetalle}\n\n🛣️ *Ruta T-450:* ${d.rutaAlerta}\n   ${d.rutaDetalle}\n\n_Responde EMERGENCIA para reportar._`
                });
            }).catch(e => console.error("Error irrecuperable:", e.message));

        // ─── FLUJO: menú de números de emergencia ────
        } else if (textoNormalizado.includes('numero') || textoNormalizado.includes('telefono') || textoNormalizado.includes('fono')) {
            delete sesiones[chatId];
            await sock.sendMessage(chatId, {
                text: '📞 *NÚMEROS DE EMERGENCIA - CORRAL Y COSTA*\n\n' +
                    '🏥 *Posta de Salud Rural Chaihuín*: +56 9 1234 5678\n' +
                    '🚑 *Hospital de Corral*: (63) 2 264000\n' +
                    '🚓 *Carabineros (Tenencia Corral)*: 133\n' +
                    '🚒 *Bomberos (Corral)*: 132\n\n' +
                    '_Para REPORTAR un incidente escribe EMERGENCIA._'
            });
        }
    });
}

// ─── Start ─────────────────────────────────────────────
console.log('🚀 Iniciando Bot de Red Alerta...');
console.log(`📱 Número: ${WHATSAPP_NUMBER}`);
console.log(`🔗 Backend: ${BACKEND_URL}`);
connectToWhatsApp();
