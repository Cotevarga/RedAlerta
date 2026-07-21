const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios'); // ¡Nuestra librería para hacer peticiones HTTP a Java!

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" })
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ ¡Bot de WhatsApp conectado y escuchando mensajes!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ==========================================
    // LÓGICA DE RECEPCIÓN DE MENSAJES
    // ==========================================
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        // Solo nos interesan los mensajes nuevos ('notify')
        if (type !== 'notify') return;

        const msg = messages[0];
        
        // Evitamos que el bot se responda a sí mismo
        if (!msg.message || msg.key.fromMe) return; 

        // Extraemos el número del remitente y el texto del mensaje
        const chatId = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const textoNormalizado = textMessage.toLowerCase();

        console.log(`📩 Mensaje recibido: "${textMessage}"`);

        // 1. Mensaje de Bienvenida
        if (textoNormalizado === 'hola' || textoNormalizado === 'menu') {
            await sock.sendMessage(chatId, { 
                text: '👋 ¡Hola! Soy el Bot de *Red Alerta*.\n\nEscribe el nombre de tu sector (ej: *Chaihuin*, *Corral*, *Huiro*) para consultar los horarios y el estado de la ruta para hoy sábado.' 
            });
        }
        
        // 2. Consulta de Sectores (¡Aquí conectamos con Spring Boot!)
        else if (textoNormalizado.includes('chaihuin') || textoNormalizado.includes('corral') || textoNormalizado.includes('huiro')) {
            await sock.sendMessage(chatId, { text: '⏳ *Consultando el sistema de la municipalidad...*' });

            try {
                // Limpiamos el nombre del sector para enviarlo a Java
                let sector = 'Corral'; // Por defecto
                if (textoNormalizado.includes('chaihuin')) sector = 'Chaihuin';
                if (textoNormalizado.includes('huiro')) sector = 'Huiro';

                // Consultamos al backend
                const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
                const respuestaJava = await axios.get(`${BACKEND_URL}/api/transporte/reporte?sector=${sector}&dia=Sábado`);

                // Enviamos el texto que armó nuestro TransporteService en Java directo al WhatsApp
                await sock.sendMessage(chatId, { text: respuestaJava.data });
                
            } catch (error) {
                console.error("Error al contactar con Java:", error.message);
                await sock.sendMessage(chatId, { text: '❌ Ups, el servidor central está fuera de línea. Intenta en unos minutos.' });
            }
        }
        
        // 3. Respuesta a Emergencias
        else if (textoNormalizado === 'emergencia') {
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

connectToWhatsApp();