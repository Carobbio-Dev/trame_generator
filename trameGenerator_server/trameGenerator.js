import { createSocket } from 'dgram';
import { readFileSync } from 'fs';
import { isIPv4 } from 'net';
import express from "express";
import cors from "cors";
import  child_process  from "child_process";
import path from 'node:path';
import { fileURLToPath } from 'node:url';


export class FrameGenerator {
  /**
   * @param {string} configPath - chemin vers le fichier JSON de description
   */
  constructor(configPath) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    this.fileName = configPath.split('/')[configPath.split('/').length -1];
    this.port = config.port;
    this.mode = config.mode || 'unicast';
    this.destination = config.destination || '127.0.0.1';
    this.periodMs = config.period_ms || 100;
    this.fields = config.fields;
    this.frameLength = 0;
    this.running = false;
    this.timer = null;

    // Valeurs courantes (initialisées depuis la config)
    this.currentValues = {};

    // Socket UDP
    this.socket = null;

    this._init();
  }

  /**
   * Initialise les valeurs courantes et calcule la longueur totale de la trame.
   */
  _init() {
    // Longueur totale de la trame = offset du dernier champ + sa longueur
    for (const f of this.fields) {
      this.frameLength = Math.max(this.frameLength, f.offset + f.length);
      this.currentValues[f.name] = f.value;
    }

    //Exécuter l'API
    this.startHttpApi()
  }

  /**
   * Construit la trame Buffer à partir des valeurs courantes.
   * @returns {Buffer}
   */
    buildFrame() {
    const buf = Buffer.alloc(this.frameLength, 0);

    // 1. Écriture de tous les champs
    for (const f of this.fields) {
      let val = this.currentValues[f.name];

      if (f.name === 'frame_length') {
        val = this.frameLength;
        this.currentValues[f.name] = val;
      }

      // --- Gestion des champs de type CHAÎNE DE CARACTÈRES ---
      if (f.type === 'string' || typeof val === 'string') {
        // On encode la chaîne en UTF-8 (ou ASCII) et on l'écrit au bon offset
        // Buffer.from(val, 'utf8') convertit les lettres en leurs codes ASCII (ex: 'W' = 0x57)
        const strBuffer = Buffer.from(val, 'utf8');
        strBuffer.copy(buf, f.offset);
        continue; // On passe au champ suivant, pas besoin de writeInt
      }
      // ---------------------------------------------------------------

      // --- Gestion du temps ms depuis minuit ---
      if (f.type === 'time_ms') {
        var UTCdateNow = new Date();
        var UTCmidnightDate = new Date();
        UTCmidnightDate.setUTCHours(0, 0, 0, 0);
        val =  UTCdateNow.getTime()- UTCmidnightDate.getTime();
        this.currentValues[f.name] = val;
      }
      // ---------------------------------------------------------------

      // --- Gestion de la date ms ---
      if (f.type === 'date_ms') {
        var UTCdateNow = new Date();
        var UTCmidnightDate = new Date();
        UTCmidnightDate.setUTCHours(0, 0, 0, 0);
        val =  UTCdateNow.getTime()- UTCmidnightDate.getTime();
        this.currentValues[f.name] = val;
      }
      // ---------------------------------------------------------------

      // Auto-increment (uniquement pour les nombres)
      if (f.auto_increment) {
        val = (val + 1); //& ((1 << (f.length * 8)) - 1);
        this.currentValues[f.name] = val;
      }

      if (f.endianness === 'little') {
        this._writeLittleEndian(buf, f.offset, f.length, val);
      } else {
        this._writeBigEndian(buf, f.offset, f.length, val);
      }
    }

    // 2. Recalcul des checksums (après tous les autres champs)
    for (const f of this.fields) {
      if (f.checksum) {
        const checksumValue = this._computeChecksum(buf, 0, f.offset);
        this._writeBigEndian(buf, f.offset, f.length, checksumValue);
        this.currentValues[f.name] = checksumValue;
      }
    }
    return buf;
  }

  /**
   * Écrit une valeur dans un Buffer en big-endian.
   */
  _writeBigEndian(buf, offset, length, value) {
    switch (length) {
      case 1: buf.writeInt8(value, offset); break;
      case 2: buf.writeInt16BE(value, offset); break;
      case 4: buf.writeInt32BE(value, offset); break;
      default: {
        // Pour les champs > 4 octets, écriture octet par octet
        for (let i = length - 1; i >= 0; i--) {
          buf[offset + i] = (value >> (8 * i)) & 0xFF;
        }
      }
    }
  }

  /**
   * Écrit une valeur dans un Buffer en little-endian.
   */
  _writeLittleEndian(buf, offset, length, value) {
    switch (length) {
      case 1: buf.writeInt8(value, offset); break;
      case 2: buf.writeInt16LE(value, offset); break;
      case 4: buf.writeInt32LE(value, offset); break;
      default: {
        for (let i = 0; i < length; i++) {
          buf[offset + i] = (value >> (8 * i)) & 0xFF;
        }
      }
    }
  }

  /**
   * Checksum simple : somme des octets modulo 256.
   * Remplaçable par un CRC ou autre algorithme selon votre besoin.
   */
  _computeChecksum(buf, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum = (sum + buf[i]) & 0xFF;
    }
    return sum;
  }

  /**
   * Envoie la trame.
   */
  sendFrame() {
    const frame = this.buildFrame();

    if (this.mode === 'multicast') {
      // En multicast : il faut joindre le groupe multicast sur la boucle locale
      this.socket.send(frame, this.port, this.destination, (err) => {
        if (err) console.error(`[ERREUR envoi] ${err.message}`);
      });
    } else {
      // En unicast
      this.socket.send(frame, this.port, this.destination, (err) => {
        if (err) console.error(`[ERREUR envoi] ${err.message}`);
      });
    }
  }

  /**
   * Démarre la génération périodique.
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.socket = createSocket('udp4');

    // Pour le multicast, joindre le groupe sur l'interface
    if (this.mode === 'multicast' && isIPv4(this.destination)) {
      this.socket.addMembership(this.destination);
    }

    console.log(`[INFO] Générateur démarré : ${this.mode} -> ${this.destination}:${this.port}, période ${this.periodMs} ms`);
    this.sendFrame();
    this.timer = setInterval(() => this.sendFrame(), this.periodMs);
  }

  /**
   * Arrête la génération.
   */
  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.mode === 'multicast' && isIPv4(this.destination)) {
      this.socket.dropMembership(this.destination);
    }
    this.socket.close();
    console.log('[INFO] Générateur arrêté.');
  }

  /**
   * Modifie la valeur d'un champ à la volée.
   * @param {string} fieldName - nom du champ (ex: "type", "payload")
   * @param {number} value - nouvelle valeur (entier)
   */
  setFieldValue(fieldName, value) {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) {
      console.error(`[ERREUR] Champ "${fieldName}" introuvable.`);
      return false;
    }

    // --- NOUVEAU : Validation spécifique pour les champs String ---
    if (field.type === 'string' || typeof value === 'string') {
      if (typeof value !== 'string') {
        console.error(`[ERREUR] Le champ "${fieldName}" attend une chaîne de caractères.`);
        return false;
      }
      if (Buffer.byteLength(value, 'utf8') !== field.length) {
        console.error(`[ERREUR] La longueur de la chaîne "${value}" (${Buffer.byteLength(value, 'utf8')} octets) ne correspond pas à la taille du champ (${field.length} octets).`);
        return false;
      }
      this.currentValues[fieldName] = value;
      console.log(`[INFO] Champ "${fieldName}" (string) modifié -> "${value}"`);
      return true;
    }
    // ---------------------------------------------------------------

    if(field.type === 'boolean' ||field.type === "int32"){
      value = this.octets4EnNumber(value);
    }
    // Validation des champs numériques (inchangée)
    const minVal = -2147483648;
    const maxVal = 2147483647;
    if (value < minVal || value > maxVal) {
      console.error(`[ERREUR] Valeur ${value} hors plage pour "${fieldName}".`);
      return false;
    }

    this.currentValues[fieldName] = value;
    const hex = (value >>> 0).toString(16).toUpperCase().padStart(field.length * 2, '0');
    console.log(`[INFO] Champ "${fieldName}" modifié -> ${value} (0x${hex})`);
    return true;
  }

  octets4EnNumber(octets){
    const buffer = new ArrayBuffer(4);
    new Int8Array(buffer).set(octets);
    return new DataView(buffer).getInt32(0);
  }

  /**
   * Retourne la liste des champs avec leurs valeurs courantes.
   */
  getFields() {
    return this.fields.map(f => ({
      name: f.name,
      offset: f.offset,
      length: f.length,
      type: f.type,
      value: this.currentValues[f.name],
      editable: f.editable,
      description: f.description || ''
    }));
  }

  startHttpApi() {
    const PORT = process.env.PORT;
    const app = express();
    const url = `http://localhost:${PORT}`;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    
    app.use(cors());
    //app.use(express.json());
    app.get('/api/v1/filename', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", fileName: this.fileName }));
    });
    app.get('/api/v1/generatorstate', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", running: this.running }));
    });
    app.get('/api/v1/fields', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(this.getFields(), null, 2));
    });
    app.get('/api/v1/start', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      this.start();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Générateur démarré' }));
    });
    app.get('/api/v1/stop', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      this.stop();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Générateur arrêté'}));
    });
    app.put('/api/v1/field/:fieldName', (req, res) => {
      const { fieldName } = req.params;
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { value } = JSON.parse(body);
        const ok = this.setFieldValue(fieldName, value);
        res.statusCode = ok ? 200 : 400;
        res.end(JSON.stringify({ success: ok, field: fieldName, value }));
      });
    });
    app.put('/api/v1/period', (req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { value } = JSON.parse(body);
        const ok = this.periodMs = value;
        res.statusCode = ok ? 200 : 400;
        console.log(`[INFO] period (number) modifié -> "${value}"`);
        res.end(JSON.stringify({ success: ok, period: value }));
      });
    });
    app.use(express.static(__dirname + "/www")); // nom du dossier contenant le répertoire des pages web du configurateur
    app.get('*', (req, res) => {      // route server web qui envoi les pages web
      res.sendFile(path.join(__dirname,'/www/index.html'));// renvoi des pages web à la saisie de l'URL
    });
    app.use((req, res) => {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Endpoint introuvable' }));
    });
    app.listen(PORT, () => {
      console.log(`[INFO] API HTTP sur le port ${PORT}`);
      var start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
      child_process.exec(start + ' ' + url);
    });
    return app;
  }
}
