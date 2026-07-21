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

function getDayInSpanish() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const chile = new Date(utc - 10800000);
    return DIAS[chile.getDay()];
}

// ─── Infinite retry: nunca se rinde, solo retorna éxito ─
async function waitForBackend(url, timeout = 15000) {
    while (true) {
        try {
            const resp = await axios.get(url, { timeout });
            return resp;
        } catch (error) {
            if (error.response && error.response.status !== 503 && error.response.status !== 502) {
                // Error real del backend (404, 500, etc) — no intentar más
                throw error;
            }
            // Network error o 502/503 (cold-start de Render) — reintentar
            console.log(`🔄 Backend aún dormido, reintentando en 3s: ${url.substring(0, 60)}...`);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

async function reportStatus() {
    try {
        await axios.post(`${BACKEND_URL}/api/whatsapp/status`, {
            numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64
        }, { timeout: 5000 });
    } catch (e) { /* silent */ }
}

async function logConsulta(numero, sector, mensaje, tipo) {
    try {
        await axios.post(`${BACKEND_URL}/api/whatsapp/consultas`, {
            numeroWhatsapp: numero, sector, mensaje, tipo
        }, { timeout: 5000 });
    } catch (e) { /* silent */ }
}

// ─── Keep-Alive (cada 4 min, agresivo) ─────────────────
async function keepAlive() {
    try {
        await axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 8000 });
    } catch (e) { /* silent */ }
}
setInterval(keepAlive, 4 * 60 * 1000);
keepAlive();

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
            try {
                currentQrBase64 = await qrcode.toDataURL(qr);
            } catch (e) { currentQrBase64 = ''; }
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
                text: `👋 ¡Hola! Soy el Bot de *Red Alerta*.\n\n🌍 *Comandos:*\n📍 *Sector* (Chaihuin, Corral, Huiro) → Horarios\n📡 *Estado* / *Alerta* → Puerto, clima, ruta\n🚨 *Emergencia* → Números de asistencia`
            });
        } else if (textoNormalizado.includes('chaihuin') || textoNormalizado.includes('corral') || textoNormalizado.includes('huiro')) {
            await sock.sendMessage(chatId, { text: '⏳ *Consultando el sistema...*' });

            let sector = 'Corral';
            if (textoNormalizado.includes('chaihuin')) sector = 'Chaihuin';
            if (textoNormalizado.includes('huiro')) sector = 'Huiro';

            waitForBackend(
                `${BACKEND_URL}/api/transporte/reporte?sector=${sector}&dia=${getDayInSpanish()}`
            ).then(resp => {
                sock.sendMessage(chatId, { text: resp.data });
                logConsulta(chatId, sector, textMessage, 'consulta');
            }).catch(e => {
                console.error("Error backend (irrecuperable):", e.message);
            });
        } else if (textoNormalizado.includes('estado') || textoNormalizado.includes('alerta') || textoNormalizado.includes('clima') || textoNormalizado.includes('puerto')) {
            waitForBackend(`${BACKEND_URL}/api/emergencia`, 10000).then(resp => {
                const d = resp.data;
                sock.sendMessage(chatId, {
                    text: `📡 *ESTADO ACTUAL - CORRAL*\n\n⛵ *Puerto RVC:* ${d.puertoEstado}\n   ${d.puertoDetalle}\n\n🌤️ *Clima:* ${d.climaAlerta}\n   ${d.climaDetalle}\n\n🛣️ *Ruta T-450:* ${d.rutaAlerta}\n   ${d.rutaDetalle}\n\n_Responde EMERGENCIA para asistencia._`
                });
            }).catch(e => {
                console.error("Error estado (irrecuperable):", e.message);
            });
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

// ─── Start ─────────────────────────────────────────────
console.log('🚀 Iniciando Bot de Red Alerta...');
console.log(`📱 Número: ${WHATSAPP_NUMBER}`);
console.log(`🔗 Backend: ${BACKEND_URL}`);
connectToWhatsApp();
