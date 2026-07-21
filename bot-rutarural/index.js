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
let currentQrTerminal = '';

function getDayInSpanish() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const chile = new Date(utc - 10800000);
    return DIAS[chile.getDay()];
}

async function reportStatus() {
    try {
        await axios.post(`${BACKEND_URL}/api/whatsapp/status`, {
            numero: WHATSAPP_NUMBER,
            status: connectionStatus,
            qr: currentQrBase64
        }, { timeout: 5000 });
    } catch (e) { /* silent */ }
}

async function logConsulta(numero, sector, mensaje, tipo) {
    try {
        await axios.post(`${BACKEND_URL}/api/admin/dashboard/consultas`, {
            numeroWhatsapp: numero, sector, mensaje, tipo
        }, { timeout: 5000 });
    } catch (e) { /* silent */ }
}

// ─── Express (health + QR endpoint) ───────────────────
const app = express();
app.get('/status', (req, res) => {
    res.json({
        numero: WHATSAPP_NUMBER,
        status: connectionStatus,
        qr: currentQrBase64 || null
    });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Bot HTTP endpoint en puerto ${PORT}`);
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
            currentQrTerminal = qr;

            try {
                currentQrBase64 = await qrcode.toDataURL(qr);
            } catch (e) {
                currentQrBase64 = '';
            }

            console.log('\n═══════════════════════════════════════════');
            console.log(`📱 NÚMERO OFICIAL: ${WHATSAPP_NUMBER}`);
            console.log(`🔗 ESTADO: ${connectionStatus}`);
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
            console.log(`⚠️ Bot desconectado (razón: ${reason || 'desconocida'}). Reintentando...`);
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
        const textoNormalizado = textMessage.toLowerCase();

        console.log(`📩 Mensaje: "${textMessage}" de ${chatId}`);

        if (textoNormalizado === 'hola' || textoNormalizado === 'menu') {
            await sock.sendMessage(chatId, {
                text: `👋 ¡Hola! Soy el Bot de *Red Alerta*.\n\nEscribe el nombre de tu sector (ej: *Chaihuin*, *Corral*, *Huiro*) para consultar los horarios y el estado de la ruta para hoy ${getDayInSpanish().toLowerCase()}.`
            });
        } else if (textoNormalizado.includes('chaihuin') || textoNormalizado.includes('corral') || textoNormalizado.includes('huiro')) {
            await sock.sendMessage(chatId, { text: '⏳ *Consultando el sistema de la municipalidad...*' });

            try {
                let sector = 'Corral';
                if (textoNormalizado.includes('chaihuin')) sector = 'Chaihuin';
                if (textoNormalizado.includes('huiro')) sector = 'Huiro';

                const diaHoy = getDayInSpanish();
                const resp = await axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=${sector}&dia=${diaHoy}`, { timeout: 15000 });

                await sock.sendMessage(chatId, { text: resp.data });
                logConsulta(chatId, sector, textMessage, 'consulta');
            } catch (error) {
                console.error("Error backend:", error.message);
                if (!error.response) {
                    await sock.sendMessage(chatId, { text: '⏳ El servidor central está despertando. Intenta nuevamente en 30 segundos.' });
                } else if (error.response.status === 404) {
                    await sock.sendMessage(chatId, { text: '❌ No se encontraron horarios para ese sector. Verifica el nombre e intenta de nuevo.' });
                } else {
                    await sock.sendMessage(chatId, { text: '❌ Error al consultar el sistema. Intenta más tarde.' });
                }
            }
        } else if (textoNormalizado === 'emergencia') {
            await sock.sendMessage(chatId, {
                text: '🚨 *NÚMEROS DE EMERGENCIA - CORRAL Y COSTA*\n\n' +
                    '🏥 *Posta de Salud Rural Chaihuín*: +56 9 1234 5678\n' +
                    '🚑 *Hospital de Corral*: (63) 2 264000\n' +
                    '🚓 *Carabineros (Tenencia Corral)*: 133\n' +
                    '🚒 *Bomberos (Corral)*: 132\n\n' +
                    '_Mantén la calma y contacta a los servicios de tu sector._'
            });
        }
    });
}

// ─── Keep-Alive ────────────────────────────────────────
setInterval(async () => {
    try {
        await axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 10000 });
    } catch (e) { /* silent */ }
}, 8 * 60 * 1000);

// ─── Start ─────────────────────────────────────────────
console.log('🚀 Iniciando Bot de Red Alerta...');
console.log(`📱 Número: ${WHATSAPP_NUMBER}`);
console.log(`🔗 Backend: ${BACKEND_URL}`);
connectToWhatsApp();
