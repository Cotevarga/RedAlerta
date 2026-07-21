const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '+56995140700';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const PORT = process.env.PORT || 3000;
const AUTH_DIR = 'auth_info_baileys';
const MAX_OFFSET = 70;

let connectionStatus = 'DISCONNECTED';
let currentQrBase64 = '';
const sesiones = {};

const PARADAS = [
  { id: 'P01', nombre: 'terminal corral',      sector: 'Corral',        offset: 0  },
  { id: 'P02', nombre: 'la aguada',            sector: 'La Aguada',     offset: 5  },
  { id: 'P03', nombre: 'cruce amargos',        sector: 'Cruce Amargos', offset: 10 },
  { id: 'P04', nombre: 'san carlos',           sector: 'San Carlos',    offset: 15 },
  { id: 'P05', nombre: 'los liles',            sector: 'Los Liles',     offset: 22 },
  { id: 'P06', nombre: 'palo muerto',          sector: 'Palo Muerto',   offset: 28 },
  { id: 'P07', nombre: 'huape',                sector: 'Huape',         offset: 35 },
  { id: 'P08', nombre: 'chaihuin pueblo',      sector: 'Chaihuín',      offset: 45 },
  { id: 'P09', nombre: 'reserva costera',      sector: 'Reserva Costera', offset: 52 },
  { id: 'P10', nombre: 'kamana mapu',          sector: 'Kamañ Mapu',    offset: 60 },
  { id: 'P11', nombre: 'huiro',                sector: 'Huiro',         offset: 70 }
];

const PRECIOS = { 'Chaihuín': 800, 'La Aguada': 500, 'Huiro': 1200, 'Corral': 0, 'Cruce Amargos': 500, 'San Carlos': 500, 'Los Liles': 500, 'Palo Muerto': 500, 'Huape': 1200, 'Reserva Costera': 1200, 'Kamañ Mapu': 1200 };
const TIPO_SERV = { 'Chaihuín': 'Subsidiado MTT', 'La Aguada': 'Subsidiado MTT', 'Huiro': 'Subsidiado MTT' };

const HORARIOS_IDA = [
  { salida: '07:00', destino: 'Chaihuín' }, { salida: '07:00', destino: 'La Aguada' },
  { salida: '08:30', destino: 'Huiro' },    { salida: '11:00', destino: 'La Aguada' },
  { salida: '12:00', destino: 'Chaihuín' }, { salida: '14:00', destino: 'Huiro' },
  { salida: '16:00', destino: 'La Aguada' }, { salida: '17:00', destino: 'Chaihuín' },
  { salida: '19:00', destino: 'La Aguada' }
];

const HORARIOS_VUELTA = [
  { salida: '06:00' }, { salida: '09:00' }, { salida: '11:30' },
  { salida: '15:00' }, { salida: '18:00' }
];

const MOCK_CLIMA = {
  'Corral':       { temp: '18°C', estado: 'Despejado', humedad: '72%', viento: '10 km/h' },
  'La Aguada':    { temp: '16°C', estado: 'Nublado', humedad: '78%', viento: '12 km/h' },
  'San Carlos':   { temp: '15°C', estado: 'Lluvia ligera', humedad: '85%', viento: '15 km/h' },
  'Chaihuín':     { temp: '16°C', estado: 'Brisa costera', humedad: '80%', viento: '18 km/h' },
  'Huape':        { temp: '14°C', estado: 'Neblina matinal', humedad: '88%', viento: '8 km/h' },
  'Huiro':        { temp: '15°C', estado: 'Viento moderado', humedad: '76%', viento: '22 km/h' },
  'default':      { temp: '—', estado: 'Sin datos', humedad: '—', viento: '—' }
};

// ─── Utilidades ────────────────────────────────────────
function norm(str) { return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function getDaySpanish() {
  const d = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  return d[new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60000 - 10800000).getDay()];
}

function pad(n) { return n.toString().padStart(2, '0'); }

function nowMin() {
  const h = new Date(); return h.getHours() * 60 + h.getMinutes();
}

function calcLlegadaMin(hora, offset, dir) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m + (dir === 'ida' ? offset : MAX_OFFSET - offset);
}

function calcLlegada(hora, offset, dir) {
  const t = calcLlegadaMin(hora, offset, dir);
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
}

function findParada(texto) {
  const t = norm(texto);
  for (const p of PARADAS) {
    if (t.includes(norm(p.nombre)) || t.includes(norm(p.sector))) return p;
  }
  return null;
}

// ─── Próximo bus (solo el más cercano) ─────────────────
function proximoBus(salidas, offset, dir, label) {
  const ahora = nowMin();
  let mejor = null, mejorMin = Infinity;
  for (const s of salidas) {
    const llegada = calcLlegadaMin(s.salida, offset, dir);
    if (llegada > ahora && llegada < mejorMin) {
      mejor = s; mejorMin = llegada;
    }
  }
  if (!mejor) return `🔴 No hay más servicios hoy.`;
  const destino = mejor.destino || 'Corral';
  const precio = PRECIOS[destino] || 0;
  const tipo = TIPO_SERV[destino] || 'Servicio Público';
  const llega = pad(Math.floor(mejorMin / 60) % 24) + ':' + pad(mejorMin % 60);
  const falta = mejorMin - ahora;
  let alerta = '';
  if (falta <= 8) alerta = ` ⚠️ *ALERTA:* Pasa en ${falta} min 🚌`;
  return `${label} ${pad(Math.floor(mejorMin / 60) % 24)}:${pad(mejorMin % 60)} hrs. (${tipo}, $${precio})${alerta}`;
}

// ─── HTTP con retry (hasta 3 intentos para persistir) ──
async function postWithRetry(url, data, label = '') {
  for (let i = 0; i < 3; i++) {
    try {
      await axios.post(url, data, { timeout: 8000 });
      if (label) console.log(`✅ ${label} enviado`);
      return;
    } catch (e) {
      console.log(`⚠️ ${label || url} falló (intento ${i+1}/3): ${e.message?.substring(0, 60)}`);
      if (i < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function reportStatus() {
  await postWithRetry(`${BACKEND_URL}/api/whatsapp/status`,
    { numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 }, 'Status');
}

async function logConsulta(chatId, sector, msg, tipo) {
  await postWithRetry(`${BACKEND_URL}/api/whatsapp/consultas`,
    { numeroWhatsapp: chatId, sector, mensaje: msg, tipo }, 'Consulta');
}

// Envía estado al backend (con reintento inicial por cold-start)
(async function startupStatus() {
  for (let i = 0; i < 5; i++) {
    try {
      await axios.post(`${BACKEND_URL}/api/whatsapp/status`, { numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 }, { timeout: 8000 });
      console.log(`✅ Estado inicial enviado a ${BACKEND_URL}`);
      break;
    } catch (e) {
      console.log(`⏳ Esperando backend (intento ${i+1}/5)...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
})();

setInterval(() => { reportStatus(); }, 4 * 60 * 1000);
setInterval(() => { axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 8000 }).catch(() => {}); }, 4 * 60 * 1000);

const app = express();
app.get('/status', (req, res) => res.json({ numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 || null }));
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Bot HTTP en puerto ${PORT}`));

// ─── Baileys ───────────────────────────────────────────
async function connectToWhatsApp() {
  let authState;
  try { authState = await useMultiFileAuthState(AUTH_DIR); }
  catch (e) {
    console.error('⚠️ Error sesión, limpiando...');
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (er) {}
    authState = await useMultiFileAuthState(AUTH_DIR);
  }

  const { state, saveCreds } = authState;
  const sock = makeWASocket({
    auth: state, printQRInTerminal: true,
    logger: pino({ level: "silent" }), browser: ['Red Alerta Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', async (upd) => {
    const { connection, lastDisconnect, qr } = upd;
    if (qr) {
      connectionStatus = 'SCAN_QR';
      try { currentQrBase64 = await qrcode.toDataURL(qr); } catch (e) {}
      console.log(`\n📱 ${WHATSAPP_NUMBER} — ESCANEA QR\n`);
      reportStatus();
    }
    if (connection === 'open') {
      connectionStatus = 'CONNECTED'; currentQrBase64 = '';
      console.log(`✅ Bot conectado`);
      reportStatus();
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      connectionStatus = reason === DisconnectReason.loggedOut ? 'LOGGED_OUT' : 'DISCONNECTED';
      reportStatus();
      if (reason === DisconnectReason.loggedOut) try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
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
      console.log(`📩 "${raw}"`);

      // ─── WELCOME ─────────────────────────────────────
      if (['hola','menu','buenos dias','buenas tardes'].includes(t)) {
        delete sesiones[chatId];
        await sock.sendMessage(chatId, {
          text: '👋 *Red Alerta Rural* 🤖\n\n🌍 *Comandos:*\n📍 *Sector* (Chaihuin, Corral, Huiro) → Horarios\n📡 *Estado* → Puerto, clima, ruta\n🚨 *Emergencia* → Reportar incidente\n📞 *Números* → Teléfonos de emergencia'
        });

      // ─── EMERGENCIA ─────────────────────────────────
      } else if (t === 'emergencia' || t === 'alerta') {
        sesiones[chatId] = { paso: 'menu' };
        await sock.sendMessage(chatId, {
          text: '🚨 *Reporte de Emergencia - Ruta T-450*\n\n1️⃣ *Derrumbe*\n2️⃣ *Bloqueo* / Árbol caído\n3️⃣ *Otro*\n0️⃣ *Cancelar*'
        });

      } else if (sesion?.paso === 'menu') {
        if (t === '0' || t === 'cancelar') { delete sesiones[chatId]; await sock.sendMessage(chatId, { text: '✅ Cancelado.' }); return; }
        const tipos = { '1': 'Derrumbe', '2': 'Bloqueo en ruta', '3': 'Otro' };
        const tipo = tipos[t];
        if (tipo) { sesiones[chatId] = { paso: 'descripcion', tipoIncidente: tipo }; await sock.sendMessage(chatId, { text: `📝 *${tipo}*\nDescribe lo que ocurre:` }); }
        else { await sock.sendMessage(chatId, { text: '1️⃣ Derrumbe\n2️⃣ Bloqueo\n3️⃣ Otro\n0️⃣ Cancelar' }); }

      } else if (sesion?.paso === 'descripcion') {
        const { tipoIncidente } = sesion; delete sesiones[chatId];
        await sock.sendMessage(chatId, { text: '⏳ *Registrando...*' });
        try {
          await axios.post(`${BACKEND_URL}/api/admin/incidentes`, { rutaId: 1, tipoIncidente, descripcion: raw }, { timeout: 15000 });
          await sock.sendMessage(chatId, { text: `✅ *Reporte registrado* 📋\n🔹 ${tipoIncidente}: ${raw}\n\nEquipo municipal notificado. 🙌` });
          await logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${raw}`, 'emergencia');
        } catch (e) { await sock.sendMessage(chatId, { text: '❌ No se pudo registrar. Usa *EMERGENCIA*.' }); }

      // ─── NÚMEROS ────────────────────────────────────
      } else if (['numero','numeros','telefono','telefonos','fono','contacto','ayuda'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        await sock.sendMessage(chatId, {
          text: '📞 *EMERGENCIAS - CORRAL*\n\n🚓 *Carabineros:* 133\n🚒 *Bomberos:* 132\n🚑 *Hospital:* (63) 2 264000\n🏥 *Posta Chaihuín:* +56 9 1234 5678\n⛵ *Capitanía Puerto:* (63) 2 212345\n\n_Para REPORTAR escribe EMERGENCIA._'
        });

      // ─── CLIMA / ESTADO (interactivo por sector) ────
      } else if (['clima','estado','puerto','ruta','tiempo'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        sesiones[chatId] = { paso: 'sector_clima' };
        await sock.sendMessage(chatId, {
          text: '🌤️ *¿Para qué sector quieres el reporte?*\n\nEj: Corral, Chaihuín, Huiro, La Aguada, San Carlos...\n\n_O escribe CANCELAR._'
        });

      } else if (sesion?.paso === 'sector_clima') {
        if (t === 'cancelar' || t === '0') { delete sesiones[chatId]; await sock.sendMessage(chatId, { text: '✅ Cancelado.' }); return; }
        const parada = findParada(raw);
        if (!parada) { await sock.sendMessage(chatId, { text: '❌ Sector no encontrado. Escribe un sector válido (Corral, Chaihuín, Huiro...) o CANCELAR.' }); return; }
        delete sesiones[chatId];
        const c = MOCK_CLIMA[parada.sector] || MOCK_CLIMA['default'];
        await sock.sendMessage(chatId, {
          text: `📡 *REPORTE ${parada.sector.toUpperCase()}*\n\n🌤️ *Clima:* ${c.estado}, ${c.temp}\n💧 Humedad: ${c.humedad}\n💨 Viento: ${c.viento}\n\n⛵ *Puerto RVC:* ABIERTO\n   Operativo sin restricciones.\n\n🛣️ *Ruta T-450:* NORMAL\n   Transitable sin problemas.\n\n---\n🌐 _Datos mock — Al conectar API real se mostrarán datos en vivo._`
        });
        await logConsulta(chatId, parada.sector, `Consulta clima: ${raw}`, 'clima');

      // ─── HORARIOS GENERALES ─────────────────────────
      } else if (['horarios','horario','bus','buses','micro','micros'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        let resp = `🚌 *HORARIOS RUTA T-450* 📆 ${getDaySpanish()}\n\n`;
        resp += `⬇️ *CORRAL → HUIRO*\n`;
        for (const h of HORARIOS_IDA) resp += `🕐 ${h.salida} → *${h.destino}* ($${PRECIOS[h.destino] || 0})\n`;
        resp += `\n⬆️ *HUIRO → CORRAL*\n`;
        for (const h of HORARIOS_VUELTA) resp += `🕐 ${h.salida} → *Corral*\n`;
        resp += `\n💡 *Escribe el nombre de tu sector* para el horario más próximo.`;
        await sock.sendMessage(chatId, { text: resp });

      // ─── SECTOR / PARADA (solo próximo bus) ─────────
      } else {
        const parada = findParada(raw);
        if (parada) {
          delete sesiones[chatId];
          const off = parada.offset;
          const nom = parada.sector;
          const precio = PRECIOS[nom] || 0;
          await sock.sendMessage(chatId, { text: `⏳ *Buscando próximo servicio a ${nom}...*` });

          let resp = `📍 *${nom}* 📆 ${getDaySpanish()}\n\n`;
          resp += `⬇️ *CORRAL → ${nom}*\n`;
          resp += `🚌 ${proximoBus(HORARIOS_IDA, off, 'ida', 'Sale')}\n`;
          resp += `⬆️ *${nom} → CORRAL*\n`;
          resp += `🚌 ${proximoBus(HORARIOS_VUELTA, off, 'vuelta', 'Sale')}\n`;
          resp += `\n⏱️ ${nom} está a ${off} min de Corral (${MAX_OFFSET - off} min de Huiro)`;
          resp += `\n💡 _Escribe HORARIOS para ver todas las salidas._`;
          await sock.sendMessage(chatId, { text: resp });
          await logConsulta(chatId, nom, raw, 'consulta');
        }
      }
    } catch (e) {
      if (e.message?.includes('Bad MAC') || e.message?.includes('decrypt')) { console.log('⚠️ Bad MAC'); }
      else { console.error('Error:', e.message); }
    }
  });
}

console.log(`🚀 Bot Red Alerta\n📱 ${WHATSAPP_NUMBER}\n🔗 ${BACKEND_URL}`);
connectToWhatsApp();
