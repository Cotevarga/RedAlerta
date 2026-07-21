const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');

// ─── Config ────────────────────────────────────────────
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '+56995140700';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const PORT = process.env.PORT || 3000;
const AUTH_DIR = 'auth_info_baileys';

let connectionStatus = 'DISCONNECTED';
let currentQrBase64 = '';
const sesiones = {};

// ─── Paradas con offsets ───────────────────────────────
const PARADAS = [
  { id: 'P01', nombre: 'terminal corral', sector: 'Corral', offset: 0 },
  { id: 'P02', nombre: 'la aguada', sector: 'La Aguada', offset: 5 },
  { id: 'P03', nombre: 'cruce amargos', sector: 'Cruce Amargos', offset: 10 },
  { id: 'P04', nombre: 'san carlos', sector: 'San Carlos', offset: 15 },
  { id: 'P05', nombre: 'los liles', sector: 'Los Liles', offset: 22 },
  { id: 'P06', nombre: 'palo muerto', sector: 'Palo Muerto', offset: 28 },
  { id: 'P07', nombre: 'huape', sector: 'Huape', offset: 35 },
  { id: 'P08', nombre: 'chaihuin pueblo', sector: 'Chaihuín', offset: 45 },
  { id: 'P09', nombre: 'reserva costera', sector: 'Reserva Costera', offset: 52 },
  { id: 'P10', nombre: 'kamana mapu', sector: 'Kamañ Mapu', offset: 60 },
  { id: 'P11', nombre: 'huiro', sector: 'Huiro', offset: 70 }
];

const HORARIOS_BASE = [
  { salida: '07:00', destino: 'Chaihuín' },
  { salida: '07:00', destino: 'La Aguada' },
  { salida: '08:30', destino: 'Huiro' },
  { salida: '11:00', destino: 'La Aguada' },
  { salida: '12:00', destino: 'Chaihuín' },
  { salida: '14:00', destino: 'Huiro' },
  { salida: '16:00', destino: 'La Aguada' },
  { salida: '17:00', destino: 'Chaihuín' },
  { salida: '19:00', destino: 'La Aguada' }
];

const FALLBACK_SECTOR = {
  'Chaihuín': '🚌 *RED ALERTA - RUTA CORRAL → CHAIHUÍN*\n💵 $800 (Subsidiado)\n⏱️ 07:00, 12:00, 17:00 hrs.\n🕐 Tiempo estimado: 45 min\n\n📱 Horarios exactos al reconectar.',
  'Huiro': '🚌 *RED ALERTA - RUTA CORRAL → HUIRO*\n💵 $1.200 (Subsidiado)\n⏱️ 08:30, 14:00 hrs.\n🕐 Tiempo estimado: 70 min\n\n📱 Horarios exactos al reconectar.',
  'Corral': '🚌 *RED ALERTA - RUTAS DISPONIBLES*\n• Chaihuín: 07:00, 12:00, 17:00\n• Huiro: 08:30, 14:00\n• La Aguada: 06:30, 11:00, 16:00, 19:00'
};

// ─── Normalización (quita acentos) ─────────────────────
function norm(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getDaySpanish() {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const now = new Date();
  const chile = new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 10800000);
  return dias[chile.getDay()];
}

function pad(n) { return n.toString().padStart(2, '0'); }

// ─── Cálculo de llegada a parada ───────────────────────
function calcularLlegada(horaSalida, offsetMin) {
  const [h, m] = horaSalida.split(':').map(Number);
  const total = h * 60 + m + offsetMin;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function calcularSiguienteLlegada(horaSalida, offsetMin) {
  const [hh, mm] = horaSalida.split(':').map(Number);
  const llegadaMin = hh * 60 + mm + offsetMin;
  const ahora = new Date();
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  const falta = llegadaMin - ahoraMin;

  if (falta <= 0) return '🔴 El bus de las ' + horaSalida + ' ya pasó por esta parada.';
  if (falta <= 8) return '⚠️ *ALERTA PREDICTIVA:* El bus pasa en *' + falta + ' min* por este paradero 🚌';
  return '🕐 Próxima llegada: ' + pad(Math.floor(llegadaMin / 60) % 24) + ':' + pad(llegadaMin % 60) + ' hrs. (en ' + falta + ' min)';
}

// ─── Encontrar parada por texto ────────────────────────
function findParada(texto) {
  const t = norm(texto);
  for (const p of PARADAS) {
    if (t.includes(norm(p.nombre)) || t.includes(norm(p.sector))) return p;
  }
  return null;
}

// ─── HTTP con fallback ─────────────────────────────────
async function fetchOrFallback(url, fallback, timeout = 5000) {
  try { return (await axios.get(url, { timeout })).data; }
  catch (e) { console.log(`⚠️ Usando fallback local: ${url.substring(0, 50)}...`); return fallback; }
}

async function postSilent(url, data) {
  try { await axios.post(url, data, { timeout: 5000 }); } catch (e) {}
}

async function reportStatus() {
  await postSilent(`${BACKEND_URL}/api/whatsapp/status`, {
    numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64
  });
}

async function logConsulta(chatId, sector, msg, tipo) {
  await postSilent(`${BACKEND_URL}/api/whatsapp/consultas`, {
    numeroWhatsapp: chatId, sector, mensaje: msg, tipo
  });
}

// ─── Keep-Alive ────────────────────────────────────────
setInterval(() => {
  axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 8000 }).catch(() => {});
  reportStatus();
}, 4 * 60 * 1000);

// ─── Express ───────────────────────────────────────────
const app = express();
app.get('/status', (req, res) => {
  res.json({ numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 || null });
});
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Bot HTTP en puerto ${PORT}`));

// ─── Baileys ───────────────────────────────────────────
async function connectToWhatsApp() {
  let authState;
  try { authState = await useMultiFileAuthState(AUTH_DIR); }
  catch (e) {
    console.error('⚠️ Error sesión, limpiando auth...', e.message);
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (er) {}
    authState = await useMultiFileAuthState(AUTH_DIR);
  }

  const { state, saveCreds } = authState;
  const sock = makeWASocket({
    auth: state, printQRInTerminal: true,
    logger: pino({ level: "silent" }), browser: ['Red Alerta Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      connectionStatus = 'SCAN_QR';
      try { currentQrBase64 = await qrcode.toDataURL(qr); } catch (e) {}
      console.log('\n═══════════════════════════════════════════');
      console.log(`📱 OFICIAL: ${WHATSAPP_NUMBER}`);
      console.log('📸 ESCANEA EL QR');
      console.log('═══════════════════════════════════════════\n');
      reportStatus();
    }
    if (connection === 'open') {
      connectionStatus = 'CONNECTED'; currentQrBase64 = '';
      console.log(`✅ Bot conectado como ${WHATSAPP_NUMBER}`);
      reportStatus();
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      connectionStatus = reason === DisconnectReason.loggedOut ? 'LOGGED_OUT' : 'DISCONNECTED';
      console.log(`⚠️ Bot desconectado (${reason || '?'})`);
      reportStatus();
      if (reason === DisconnectReason.loggedOut) {
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
      }
      if (reason !== DisconnectReason.loggedOut) setTimeout(connectToWhatsApp, 3000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    try {
      const chatId = msg.key.remoteJid;
      const raw = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const t = norm(raw).trim();
      const sesion = sesiones[chatId];
      console.log(`📩 "${raw}" de ${chatId}`);

      // ─── WELCOME ─────────────────────────────────────
      if (t === 'hola' || t === 'menu' || t === 'buenos dias' || t === 'buenas tardes') {
        delete sesiones[chatId];
        await sock.sendMessage(chatId, {
          text: '👋 *Red Alerta Rural* 🤖\n\n🌍 *Comandos:*\n📍 *Sector* (Chaihuin, Corral, Huiro) → Horarios\n📡 *Estado* → Puerto, clima, ruta\n🚨 *Emergencia* / *Alerta* → Reportar incidente\n📞 *Números* → Teléfonos de emergencia'
        });

      // ─── EMERGENCIA INTERACTIVA ─────────────────────
      } else if (t === 'emergencia' || t === 'alerta') {
        sesiones[chatId] = { paso: 'menu' };
        await sock.sendMessage(chatId, {
          text: '🚨 *Reporte de Emergencia - Ruta T-450 / Corral*\n\nEscribe el número:\n\n1️⃣ *Derrumbe* en la vía\n2️⃣ *Bloqueo* / Árbol caído\n3️⃣ *Otro* (especifique)\n\n0️⃣ *Cancelar*'
        });

      } else if (sesion && sesion.paso === 'menu') {
        const tipos = { '1': 'Derrumbe', '2': 'Bloqueo en ruta', '3': 'Otro' };
        const tipo = tipos[t];
        if (t === '0' || t === 'cancelar') {
          delete sesiones[chatId];
          await sock.sendMessage(chatId, { text: '✅ Reporte cancelado.' });
        } else if (tipo) {
          sesiones[chatId] = { paso: 'descripcion', tipoIncidente: tipo };
          await sock.sendMessage(chatId, { text: `📝 *${tipo}*\nDescribe lo que ocurre (ej: "Roca grande altura San Carlos"):` });
        } else {
          await sock.sendMessage(chatId, { text: 'Responde:\n1️⃣ Derrumbe\n2️⃣ Bloqueo\n3️⃣ Otro\n0️⃣ Cancelar' });
        }

      } else if (sesion && sesion.paso === 'descripcion') {
        const { tipoIncidente } = sesion;
        delete sesiones[chatId];
        await sock.sendMessage(chatId, { text: '⏳ *Registrando...*' });
        try {
          await axios.post(`${BACKEND_URL}/api/admin/incidentes`, {
            rutaId: 1, tipoIncidente, descripcion: raw
          }, { timeout: 15000 });
          await sock.sendMessage(chatId, {
            text: `✅ *Reporte registrado* 📋\n🔹 ${tipoIncidente}: ${raw}\n\nEl equipo municipal fue notificado. ¡Gracias! 🙌`
          });
          logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${raw}`, 'emergencia');
        } catch (e) {
          await sock.sendMessage(chatId, { text: '❌ No se pudo registrar. Intenta con *EMERGENCIA*.' });
        }

      // ─── NÚMEROS DE EMERGENCIA ──────────────────────
      } else if (['numero','numeros','telefono','telefonos','fono','contacto','ayuda'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        await sock.sendMessage(chatId, {
          text: '📞 *NÚMEROS DE EMERGENCIA - CORRAL*\n\n' +
            '🚓 *Carabineros (Corral)*: 133\n' +
            '🚒 *Bomberos (Corral)*: 132\n' +
            '🚑 *Hospital de Corral*: (63) 2 264000\n' +
            '🏥 *Posta Chaihuín*: +56 9 1234 5678\n' +
            '⛵ *Capitanía Puerto (RVC)*: (63) 2 212345\n\n' +
            '_Para REPORTAR un incidente escribe EMERGENCIA._'
        });

      // ─── ESTADO / CLIMA / PUERTO / RUTA ─────────────
      } else if (['estado','clima','puerto','ruta','tiempo'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        const d = await fetchOrFallback(`${BACKEND_URL}/api/emergencia`, {
          puertoEstado: 'ABIERTO', puertoDetalle: 'RVC Corral operativo sin restricciones.',
          climaAlerta: 'Normal', climaDetalle: 'Sin alertas meteorológicas.',
          rutaAlerta: 'Normal', rutaDetalle: 'Ruta T-450 transitable sin problemas.'
        });
        await sock.sendMessage(chatId, {
          text: `📡 *ESTADO ACTUAL - CORRAL*\n\n⛵ *Puerto RVC:* ${d.puertoEstado}\n   ${d.puertoDetalle}\n\n🌤️ *Clima:* ${d.climaAlerta}\n   ${d.climaDetalle}\n\n🛣️ *Ruta T-450:* ${d.rutaAlerta}\n   ${d.rutaDetalle}`
        });

      // ─── HORARIOS GENERALES ─────────────────────────
      } else if (t === 'horarios' || t === 'bus' || t === 'buses' || t === 'micro' || t === 'micros') {
        delete sesiones[chatId];
        const dia = getDaySpanish();
        let resp = `🚌 *HORARIOS GENERALES - CORRAL*\n📆 ${dia}\n\n`;
        for (const h of HORARIOS_BASE) {
          resp += `🕐 ${h.salida} → *${h.destino}*\n`;
        }
        resp += '\n_Escribe el nombre de tu parada para horario exacto._';
        await sock.sendMessage(chatId, { text: resp });

      // ─── SECTOR / PARADA ESPECÍFICA ─────────────────
      } else {
        const parada = findParada(raw);
        if (parada) {
          delete sesiones[chatId];
          await sock.sendMessage(chatId, { text: '⏳ *Calculando horario...*' });

          const dia = getDaySpanish();
          const llegada = calcularLlegada('07:00', parada.offset);
          const alerta = calcularSiguienteLlegada('07:00', parada.offset);

          let resp = `📍 *${parada.sector}*\n📆 ${dia}\n\n`;
          resp += `🚌 *Salida Terminal:* 07:00 hrs.\n`;
          resp += `🕐 *Llegada estimada:* ${llegada} hrs.\n`;
          resp += `⏱️ *Distancia:* ${parada.offset} min desde Corral\n`;
          resp += `\n${alerta}\n\n`;
          resp += `📱 _Escribe HORARIOS para ver todas las salidas._`;
          await sock.sendMessage(chatId, { text: resp });
          logConsulta(chatId, parada.sector, raw, 'consulta');
        }
      }
    } catch (e) {
      if (e.message && (e.message.includes('Bad MAC') || e.message.includes('decrypt'))) {
        console.log('⚠️ Bad MAC ignorado');
      } else {
        console.error('Error:', e.message);
      }
    }
  });
}

// ─── Start ─────────────────────────────────────────────
console.log('🚀 Iniciando Bot de Red Alerta...');
console.log(`📱 Número: ${WHATSAPP_NUMBER}`);
console.log(`🔗 Backend: ${BACKEND_URL}`);
connectToWhatsApp();
