const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '+56995140700';
const RAW_URL = process.env.BACKEND_URL || 'https://redalerta-backend.onrender.com';
const BACKEND_URL = RAW_URL.replace(/^\[+/, '').replace(/\]+$/, '').replace(/[<>"']/g, '').replace(/\/+$/, '');
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

const PRECIOS = { 'Chaihuín': 900, 'La Aguada': 900, 'Huiro': 1600, 'Corral': 0, 'Cruce Amargos': 900, 'San Carlos': 900, 'Los Liles': 900, 'Palo Muerto': 900, 'Huape': 1600, 'Reserva Costera': 1600, 'Kamañ Mapu': 1600 };

function tipoServ(dest) {
  const m = { 'Chaihuín': 'Bus Público MTT', 'Huiro': 'Bus Privado', 'Corral': 'Bus Público MTT' };
  return m[dest] || 'Bus Privado';
}

function precioServ(dest) {
  return PRECIOS[dest] || 0;
}

const HORARIOS_IDA = [
  { salida: '07:00', destino: 'Chaihuín', tipo: 'publico' },
  { salida: '08:30', destino: 'Huiro',    tipo: 'privado' },
  { salida: '12:00', destino: 'Chaihuín', tipo: 'publico' },
  { salida: '14:00', destino: 'Huiro',    tipo: 'privado' },
  { salida: '17:00', destino: 'Chaihuín', tipo: 'publico' }
];

const HORARIOS_VUELTA = [
  { salida: '06:00', destino: 'Corral', tipo: 'publico' },
  { salida: '09:00', destino: 'Corral', tipo: 'privado' },
  { salida: '11:30', destino: 'Corral', tipo: 'publico' },
  { salida: '15:00', destino: 'Corral', tipo: 'privado' },
  { salida: '18:00', destino: 'Corral', tipo: 'publico' }
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
  return d[chileDate().getDay()];
}

function pad(n) { return n.toString().padStart(2, '0'); }

function chileDate() {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 10800000);
}

function nowMin() {
  const c = chileDate();
  return c.getHours() * 60 + c.getMinutes();
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
function proximoBus(salidas, offset, dir) {
  const ahora = nowMin();
  let mejor = null, mejorMin = Infinity;
  for (const s of salidas) {
    const llegada = calcLlegadaMin(s.salida, offset, dir);
    if (llegada > ahora && llegada < mejorMin) {
      mejor = s; mejorMin = llegada;
    }
  }
  if (!mejor) return `🔴 No hay más servicios hoy para esta ruta.`;
  const destino = mejor.destino || 'Corral';
  const precio = precioServ(destino);
  const tipo = tipoServ(destino);
  const falta = mejorMin - ahora;
  const horaStr = pad(Math.floor(mejorMin / 60) % 24) + ':' + pad(mejorMin % 60);
  let alerta = '';
  let tiempoStr;
  if (falta <= 0) {
    tiempoStr = '🔴 Ya pasó';
  } else if (falta <= 8) {
    alerta = `\n⚠️ *ALERTA:* Pasa en ${falta} min 🚌`;
    tiempoStr = `*${falta} min*`;
  } else if (falta < 60) {
    tiempoStr = `*${falta} min*`;
  } else {
    const hrs = Math.floor(falta / 60);
    const mins = falta % 60;
    tiempoStr = `*${hrs}h ${mins}min*`;
  }
  return `⏱️ Próximo en ${tiempoStr} (${horaStr} hrs.)\n💵 $${precio} (${tipo})${alerta}`;
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

function logConsulta(chatId, sector, msg, tipo) {
  const url = `${BACKEND_URL}/api/whatsapp/consultas`;
  const data = { numeroWhatsapp: chatId, sector, mensaje: msg, tipo };
  // Fire-and-forget con retry interno (no bloquea la respuesta al usuario)
  (async () => {
    for (let i = 0; i < 5; i++) {
      try { await axios.post(url, data, { timeout: 10000 }); console.log(`✅ Consulta guardada: ${tipo} - ${sector}`); return; }
      catch (e) { console.log(`⚠️ Consulta (intento ${i+1}/5): ${e.message?.substring(0,60)}`); if (i < 4) await new Promise(r => setTimeout(r, 3000)); }
    }
  })();
}

// Envía estado al backend (con reintento inicial por cold-start)
(async function startupStatus() {
  console.log(`🔗 Conectando a backend: ${BACKEND_URL}`);
  for (let i = 0; i < 10; i++) {
    try {
      await axios.post(`${BACKEND_URL}/api/whatsapp/status`, { numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 }, { timeout: 10000 });
      console.log(`✅ Status enviado a ${BACKEND_URL}`);
      return;
    } catch (e) {
      if (i === 0 || i === 4 || i === 9) console.log(`⏳ Backend no responde (intento ${i+1}/10): ${e.message?.substring(0,60)}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.log(`❌ CRÍTICO: No se pudo contactar al backend en ${BACKEND_URL}. Revisa la variable BACKEND_URL.`);
})();

setInterval(() => { reportStatus(); }, 4 * 60 * 1000);
setInterval(() => { axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=Corral&dia=Lunes`, { timeout: 10000 }).catch(() => {}); }, 4 * 60 * 1000);

const app = express();
app.get('/status', (req, res) => res.json({ numero: WHATSAPP_NUMBER, status: connectionStatus, qr: currentQrBase64 || null }));
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Bot HTTP en puerto ${PORT}`));

let badMacCount = 0;

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
        await sock.sendMessage(chatId, { text: '⏳ *Registrando reporte...*' });

        let exito = false;
        for (let i = 0; i < 10; i++) {
          try {
            await axios.post(`${BACKEND_URL}/api/emergencias`, { rutaId: '1', tipoIncidente, descripcion: raw }, { timeout: 15000 });
            exito = true;
            console.log(`✅ Emergencia registrada: ${tipoIncidente}`);
            logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${raw}`, 'emergencia');
            break;
          } catch (e) {
            console.log(`⚠️ Emergencia (intento ${i+1}/10): ${e.message?.substring(0,60)}`);
            if (i < 9) await new Promise(r => setTimeout(r, 3000));
          }
        }

        if (exito) {
          await sock.sendMessage(chatId, {
            text: `✅ *Reporte de emergencia registrado con éxito* 📋\n🔹 *${tipoIncidente}*\n🔹 ${raw}\n\nLa municipalidad ha sido notificada. ¡Gracias! 🙌`
          });
        } else {
          await sock.sendMessage(chatId, {
            text: `⚠️ El servidor municipal está temporalmente fuera de línea. Tu reporte quedó pendiente y se reintentará automáticamente.\n\n🔹 *${tipoIncidente}*\n🔹 ${raw}`
          });
          // Background retry persistente (no molesta al usuario)
          (async function retryPersistente() {
            for (let i = 0; i < 30; i++) {
              try { await axios.post(`${BACKEND_URL}/api/emergencias`, { rutaId: '1', tipoIncidente, descripcion: raw }, { timeout: 15000 }); console.log(`✅ Emergencia recuperada: ${tipoIncidente}`); logConsulta(chatId, 'Emergencia', `${tipoIncidente}: ${raw}`, 'emergencia'); return; }
              catch (e) { await new Promise(r => setTimeout(r, 10000)); }
            }
          })();
        }

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
        let resp = `🚌 *RUTA T-450 COSTERA* 📆 ${getDaySpanish()}\n\n`;
        resp += `🇨🇱 *Bus Público (MTT)* — $900\n⬇️ *Corral → Chaihuín*\n`;
        for (const h of HORARIOS_IDA.filter(s => s.tipo === 'publico'))
          resp += `🕐 ${h.salida} hrs.\n`;
        resp += `⬆️ *Chaihuín → Corral*\n`;
        for (const h of HORARIOS_VUELTA.filter(s => s.tipo === 'publico'))
          resp += `🕐 ${h.salida} hrs.\n`;
        resp += `\n🚍 *Bus Privado* — $1.600\n⬇️ *Corral → Huiro*\n`;
        for (const h of HORARIOS_IDA.filter(s => s.tipo === 'privado'))
          resp += `🕐 ${h.salida} hrs.\n`;
        resp += `⬆️ *Huiro → Corral*\n`;
        for (const h of HORARIOS_VUELTA.filter(s => s.tipo === 'privado'))
          resp += `🕐 ${h.salida} hrs.\n`;
        resp += `\n💡 *Escribe tu sector o paradero* (ej: Chaihuín, Huiro)\n_para conocer el horario exacto del próximo bus en tiempo real._`;
        await sock.sendMessage(chatId, { text: resp });

      // ─── SECTOR / PARADA (solo próximo bus) ─────────
      } else {
        const parada = findParada(raw);
        if (parada) {
          delete sesiones[chatId];
          const off = parada.offset;
          const nom = parada.sector;
          await sock.sendMessage(chatId, { text: `⏳ *Buscando próximo servicio en ${nom}...*` });

          let resp = `📍 *${nom}* 📆 ${getDaySpanish()}\n\n`;

          if (nom === 'Corral') {
            resp += `⬇️ *CORRAL → HUIRO*\n`;
            resp += `${proximoBus(HORARIOS_IDA, 0, 'ida')}\n`;
          } else if (nom === 'Huiro') {
            resp += `⬆️ *HUIRO → CORRAL*\n`;
            resp += `${proximoBus(HORARIOS_VUELTA, 0, 'vuelta')}\n`;
          } else {
            resp += `⬇️ *HACIA ${nom.toUpperCase()}* (Corral → ${nom})\n`;
            resp += `${proximoBus(HORARIOS_IDA, off, 'ida')}\n\n`;
            resp += `⬆️ *DESDE ${nom.toUpperCase()}* (${nom} → Corral)\n`;
            resp += `${proximoBus(HORARIOS_VUELTA, off, 'vuelta')}\n`;
          }

          resp += `\n💡 _Escribe HORARIOS para ver todas las salidas._`;
          await sock.sendMessage(chatId, { text: resp });
          await logConsulta(chatId, nom, raw, 'consulta');
        }
      }
    } catch (e) {
      if (e.message?.includes('Bad MAC') || e.message?.includes('decrypt')) {
        badMacCount++;
        console.log(`⚠️ Bad MAC (${badMacCount}/5)`);
        if (badMacCount >= 5) {
          console.log('🧹 Demasiados errores Bad MAC. Limpiando sesión...');
          badMacCount = 0;
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (er) {}
          setTimeout(connectToWhatsApp, 5000);
        }
      } else { console.error('Error:', e.message); }
    }
  });
}

console.log(`🚀 Bot Red Alerta\n📱 ${WHATSAPP_NUMBER}\n🔗 ${BACKEND_URL}`);
connectToWhatsApp();
