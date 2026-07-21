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
const MAX_OFFSET = 70;

let connectionStatus = 'DISCONNECTED';
let currentQrBase64 = '';
const sesiones = {};

// ─── Paradas (offset en min desde Corral → Huiro) ──────
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

// ─── Horarios fijos ────────────────────────────────────
const HORARIOS_IDA = [    // Corral → Huiro
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

const HORARIOS_VUELTA = [ // Huiro → Corral (salida desde Huiro)
  { salida: '06:00', origen: 'Huiro' },
  { salida: '09:00', origen: 'Huiro' },
  { salida: '11:30', origen: 'Huiro' },
  { salida: '15:00', origen: 'Huiro' },
  { salida: '18:00', origen: 'Huiro' }
];

// ─── Normalización ─────────────────────────────────────
function norm(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getDaySpanish() {
  const d = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const now = new Date();
  return d[new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 10800000).getDay()];
}

function pad(n) { return n.toString().padStart(2, '0'); }

// ─── Cálculo bidireccional ─────────────────────────────
function calcLlegada(hora, offset, direccion) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + (direccion === 'ida' ? offset : MAX_OFFSET - offset);
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function calcAlerta(hora, offset, direccion) {
  const [hh, mm] = hora.split(':').map(Number);
  const llegada = hh * 60 + mm + (direccion === 'ida' ? offset : MAX_OFFSET - offset);
  const ahora = new Date();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const falta = llegada - minAhora;

  if (falta <= 0) return '';
  if (falta <= 8) return `⚠️ *ALERTA:* Pasa en *${falta} min* 🚌`;
  return `🕐 Próximo en ${falta} min (${pad(Math.floor(llegada / 60) % 24)}:${pad(llegada % 60)})`;
}

function findParada(texto) {
  const t = norm(texto);
  for (const p of PARADAS) {
    if (t.includes(norm(p.nombre)) || t.includes(norm(p.sector))) return p;
  }
  return null;
}

// ─── HTTP ──────────────────────────────────────────────
async function fetchOrFallback(url, fb, t = 5000) {
  try { return (await axios.get(url, { timeout: t })).data; }
  catch (e) { console.log(`⚠️ Fallback: ${url.substring(0, 50)}...`); return fb; }
}

async function postSilent(url, data) {
  try { await axios.post(url, data, { timeout: 5000 }); } catch (e) {}
}

async function reportStatus() {
  await postSilent(`${BACKEND_URL}/api/whatsapp/status`, { numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 });
}

async function logConsulta(chatId, sector, msg, tipo) {
  await postSilent(`${BACKEND_URL}/api/whatsapp/consultas`, { numeroWhatsapp: chatId, sector, mensaje: msg, tipo });
}

setInterval(() => {
  axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 8000 }).catch(() => {});
  reportStatus();
}, 4 * 60 * 1000);

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
      console.log(`\n📱 OFICIAL: ${WHATSAPP_NUMBER}\n📸 ESCANEA EL QR\n`);
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
          text: '👋 *Red Alerta Rural* 🤖\n\n🌍 *Comandos:*\n📍 *Sector* (Chaihuin, Corral, Huiro) → Horarios\n📡 *Estado* → Puerto, clima, ruta\n🚨 *Emergencia* / *Alerta* → Reportar incidente\n📞 *Números* → Teléfonos de emergencia'
        });

      // ─── EMERGENCIA ─────────────────────────────────
      } else if (t === 'emergencia' || t === 'alerta') {
        sesiones[chatId] = { paso: 'menu' };
        await sock.sendMessage(chatId, {
          text: '🚨 *Reporte de Emergencia - Ruta T-450 / Corral*\n\nEscribe el número:\n\n1️⃣ *Derrumbe* en la vía\n2️⃣ *Bloqueo* / Árbol caído\n3️⃣ *Otro* (especifique)\n\n0️⃣ *Cancelar*'
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
          await sock.sendMessage(chatId, { text: `✅ *Reporte registrado* 📋\n🔹 ${tipoIncidente}: ${raw}\n\nEl equipo municipal fue notificado. 🙌` });
          logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${raw}`, 'emergencia');
        } catch (e) { await sock.sendMessage(chatId, { text: '❌ No se pudo registrar. Usa *EMERGENCIA*.' }); }

      // ─── NÚMEROS ────────────────────────────────────
      } else if (['numero','numeros','telefono','telefonos','fono','contacto','ayuda'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        await sock.sendMessage(chatId, {
          text: '📞 *NÚMEROS DE EMERGENCIA - CORRAL*\n\n🚓 *Carabineros:* 133\n🚒 *Bomberos:* 132\n🚑 *Hospital Corral:* (63) 2 264000\n🏥 *Posta Chaihuín:* +56 9 1234 5678\n⛵ *Capitanía Puerto (RVC):* (63) 2 212345\n\n_Para REPORTAR escribe EMERGENCIA._'
        });

      // ─── ESTADO ─────────────────────────────────────
      } else if (['estado','clima','puerto','ruta','tiempo'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        const d = await fetchOrFallback(`${BACKEND_URL}/api/emergencia`, {
          puertoEstado: 'ABIERTO', puertoDetalle: 'RVC Corral operativo.',
          climaAlerta: 'Normal', climaDetalle: 'Sin alertas.',
          rutaAlerta: 'Normal', rutaDetalle: 'Ruta T-450 transitable.'
        });
        await sock.sendMessage(chatId, {
          text: `📡 *ESTADO ACTUAL - CORRAL*\n\n⛵ *Puerto RVC:* ${d.puertoEstado}\n   ${d.puertoDetalle}\n\n🌤️ *Clima:* ${d.climaAlerta}\n   ${d.climaDetalle}\n\n🛣️ *Ruta T-450:* ${d.rutaAlerta}\n   ${d.rutaDetalle}`
        });

      // ─── HORARIOS GENERALES (bidireccional) ─────────
      } else if (['horarios','horario','bus','buses','micro','micros'].some(p => t.includes(p))) {
        delete sesiones[chatId];
        const dia = getDaySpanish();
        let resp = `🚌 *HORARIOS RUTA T-450* 📆 ${dia}\n\n`;
        resp += `⬇️ *CORRAL → HUIRO (Ida)*\n`;
        for (const h of HORARIOS_IDA) resp += `🕐 ${h.salida} → *${h.destino}*\n`;
        resp += `\n⬆️ *HUIRO → CORRAL (Vuelta)*\n`;
        for (const h of HORARIOS_VUELTA) resp += `🕐 ${h.salida} → *Corral*\n`;
        resp += `\n💡 *Escribe el nombre de tu sector* (ej: Chaihuín, La Aguada, San Carlos, Huiro)\n_para obtener el horario de paso exacto y la alerta predictiva._`;
        await sock.sendMessage(chatId, { text: resp });

      // ─── SECTOR / PARADA (bidireccional) ────────────
      } else {
        const parada = findParada(raw);
        if (parada) {
          delete sesiones[chatId];
          await sock.sendMessage(chatId, { text: '⏳ *Calculando horarios...*' });

          const dia = getDaySpanish();
          const nom = parada.sector;
          const off = parada.offset;
          const max = MAX_OFFSET;
          let resp = `📍 *${nom}* 📆 ${dia}\n\n`;

          // Ida (Corral → Huiro) — todos los buses que pasan por acá
          resp += `⬇️ *CORRAL → HUIRO (paso por ${nom})*\n`;
          for (const h of HORARIOS_IDA) {
            const llegaH = calcLlegada(h.salida, off, 'ida');
            const alerta = calcAlerta(h.salida, off, 'ida');
            resp += `🕐 Sale ${h.salida} → *llega ${llegaH}*`;
            if (alerta) resp += ` ${alerta}`;
            resp += '\n';
          }

          // Vuelta (Huiro → Corral) — todos los buses que pasan por acá
          resp += `\n⬆️ *HUIRO → CORRAL (paso por ${nom})*\n`;
          for (const h of HORARIOS_VUELTA) {
            const llegaH = calcLlegada(h.salida, off, 'vuelta');
            const alerta = calcAlerta(h.salida, off, 'vuelta');
            resp += `🕐 Sale ${h.salida} → *llega ${llegaH}*`;
            if (alerta) resp += ` ${alerta}`;
            resp += '\n';
          }

          resp += `\n⏱️ ${nom} está a ${off} min de Corral (${max - off} min de Huiro)`;
          await sock.sendMessage(chatId, { text: resp });
          logConsulta(chatId, nom, raw, 'consulta');
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
