import { createSocket } from 'dgram';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { isIPv4 } from 'net';
import express from "express";
import cors from "cors";
import  child_process  from "child_process";
import path from 'node:path';
import { fileURLToPath } from 'node:url';


export class FrameSender {
  constructor(id, configPath) {
    this.id = id;
    this.running = false;
    this.timer = null;
    this.socket = null;
    this.loadConfig(configPath);
  }

  loadConfig(configPath) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    this.configPath = configPath;
    this.fileName = path.basename(configPath);
    this.port = config.port;
    this.mode = config.mode || 'unicast';
    this.destination = config.destination || '127.0.0.1';
    this.periodMs = config.period_ms || 100;
    this.fields = config.fields || [];
    this.frameLength = 0;
    this.currentValues = {};

    for (const f of this.fields) {
      this.frameLength = Math.max(this.frameLength, f.offset + f.length);
      this.currentValues[f.name] = f.value;
    }

    if (this.running && this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => this.sendFrame(), this.periodMs);
    }
  }

  buildFrame() {
    const buf = Buffer.alloc(this.frameLength, 0);

    for (const f of this.fields) {
      let val = this.currentValues[f.name];

      if (f.name === 'frame_length') {
        val = this.frameLength;
        this.currentValues[f.name] = val;
      }

      if (f.type === 'string' || typeof val === 'string') {
        const strBuffer = Buffer.from(val, 'utf8');
        strBuffer.copy(buf, f.offset);
        continue;
      }

      if (f.type === 'time_ms' || f.type === 'date_ms') {
        var UTCdateNow = new Date();
        var UTCmidnightDate = new Date();
        UTCmidnightDate.setUTCHours(0, 0, 0, 0);
        val = UTCdateNow.getTime() - UTCmidnightDate.getTime();
        this.currentValues[f.name] = val;
      }

      if (f.auto_increment) {
        val = (val + 1);
        this.currentValues[f.name] = val;
      }

      if (f.endianness === 'little') {
        this._writeLittleEndian(buf, f.offset, f.length, val);
      } else {
        this._writeBigEndian(buf, f.offset, f.length, val);
      }
    }

    for (const f of this.fields) {
      if (f.checksum) {
        const checksumValue = this._computeChecksum(buf, 0, f.offset);
        this._writeBigEndian(buf, f.offset, f.length, checksumValue);
        this.currentValues[f.name] = checksumValue;
      }
    }
    return buf;
  }

  _writeBigEndian(buf, offset, length, value) {
    switch (length) {
      case 1: buf.writeInt8(value, offset); break;
      case 2: buf.writeInt16BE(value, offset); break;
      case 4: buf.writeInt32BE(value, offset); break;
      default: {
        for (let i = length - 1; i >= 0; i--) {
          buf[offset + i] = (value >> (8 * i)) & 0xFF;
        }
      }
    }
  }

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

  _computeChecksum(buf, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum = (sum + buf[i]) & 0xFF;
    }
    return sum;
  }

  sendFrame() {
    const frame = this.buildFrame();

    if (this.mode === 'multicast') {
      this.socket.send(frame, this.port, this.destination, (err) => {
        if (err) console.error(`[ERREUR envoi ${this.id}] ${err.message}`);
      });
    } else {
      this.socket.send(frame, this.port, this.destination, (err) => {
        if (err) console.error(`[ERREUR envoi ${this.id}] ${err.message}`);
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.socket = createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error(`[ERREUR Socket ${this.id}] ${err.message}`);
    });

    if (this.mode === 'multicast' && isIPv4(this.destination)) {
      try {
        this.socket.addMembership(this.destination);
      } catch (err) {
        console.error(`[ERREUR Membership ${this.id}] ${err.message}`);
      }
    }

    console.log(`[INFO] Émetteur [${this.id}] démarré : ${this.mode} -> ${this.destination}:${this.port}, période ${this.periodMs} ms`);
    this.sendFrame();
    this.timer = setInterval(() => this.sendFrame(), this.periodMs);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.mode === 'multicast' && isIPv4(this.destination)) {
      this.socket.dropMembership(this.destination);
    }
    this.socket.close();
    console.log(`[INFO] Émetteur [${this.id}] arrêté.`);
  }

  setFieldValue(fieldName, value) {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) {
      console.error(`[ERREUR ${this.id}] Champ "${fieldName}" introuvable.`);
      return false;
    }

    if (field.type === 'string' || typeof value === 'string') {
      if (typeof value !== 'string') {
        console.error(`[ERREUR ${this.id}] Le champ "${fieldName}" attend une chaîne de caractères.`);
        return false;
      }
      if (Buffer.byteLength(value, 'utf8') !== field.length) {
        console.error(`[ERREUR ${this.id}] La longueur de la chaîne "${value}" (${Buffer.byteLength(value, 'utf8')} octets) ne correspond pas à la taille du champ (${field.length} octets).`);
        return false;
      }
      this.currentValues[fieldName] = value;
      console.log(`[INFO ${this.id}] Champ "${fieldName}" (string) modifié -> "${value}"`);
      return true;
    }

    if (field.type === 'boolean' || field.type === "int32") {
      value = this.octets4EnNumber(value);
    }

    const minVal = -2147483648;
    const maxVal = 2147483647;
    if (value < minVal || value > maxVal) {
      console.error(`[ERREUR ${this.id}] Valeur ${value} hors plage pour "${fieldName}".`);
      return false;
    }

    this.currentValues[fieldName] = value;
    const hex = (value >>> 0).toString(16).toUpperCase().padStart(field.length * 2, '0');
    console.log(`[INFO ${this.id}] Champ "${fieldName}" modifié -> ${value} (0x${hex})`);
    return true;
  }

  octets4EnNumber(octets) {
    const buffer = new ArrayBuffer(4);
    new Int8Array(buffer).set(octets);
    return new DataView(buffer).getInt32(0);
  }

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

  getSummary() {
    return {
      id: this.id,
      fileName: this.fileName,
      running: this.running,
      port: this.port,
      destination: this.destination,
      mode: this.mode,
      periodMs: this.periodMs
    };
  }
}

export class FrameGenerator {
  /**
   * @param {string} configPath - chemin vers le fichier JSON de description initial
   */
  constructor(configPath) {
    this.senders = new Map();
    this.nextId = 1;

    // Créer un émetteur par défaut
    const defaultSender = new FrameSender(`sender-${this.nextId++}`, configPath);
    this.senders.set(defaultSender.id, defaultSender);

    // Démarrer le serveur HTTP API
    this.startHttpApi();
  }

  getDefaultSender() {
    return this.senders.values().next().value;
  }

  stop() {
    for (const sender of this.senders.values()) {
      sender.stop();
    }
  }

  startHttpApi() {
    const PORT = process.env.PORT;
    const app = express();
    const url = `http://localhost:${PORT}`;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    app.use(cors());

    // Auxiliaire pour lire le body JSON de la requête
    const readBody = (req) => new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });

    // --- API Templates ---
    app.get('/api/v1/templates', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      try {
        const templateDir = path.join(__dirname, 'template');
        if (!existsSync(templateDir)) {
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: "ok", templates: [] }));
        }
        const files = readdirSync(templateDir).filter(file => file.endsWith('.json'));
        res.statusCode = 200;
        res.end(JSON.stringify({ success: "ok", templates: files }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    // --- API Multi-Émetteurs ---
    app.get('/api/v1/senders', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const list = Array.from(this.senders.values()).map(s => s.getSummary());
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", senders: list }));
    });

    app.post('/api/v1/senders', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      try {
        const body = await readBody(req);
        const requestedFile = body.fileName || body.filename || body.template || 'frame_config.json';
        const sanitizedFile = path.basename(requestedFile);
        const templateDir = path.join(__dirname, 'template');
        const targetPath = path.join(templateDir, sanitizedFile);

        if (!existsSync(targetPath)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ success: false, error: 'Fichier template introuvable' }));
        }

        const newSender = new FrameSender(`sender-${this.nextId++}`, targetPath);
        this.senders.set(newSender.id, newSender);

        res.statusCode = 201;
        res.end(JSON.stringify({
          success: "ok",
          sender: newSender.getSummary(),
          fields: newSender.getFields()
        }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    app.delete('/api/v1/senders/:id', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ success: false, error: 'Émetteur introuvable' }));
      }

      sender.stop();
      this.senders.delete(req.params.id);

      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", id: req.params.id }));
    });

    app.get('/api/v1/start-all', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      for (const sender of this.senders.values()) {
        sender.start();
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Tous les émetteurs démarrés' }));
    });

    app.get('/api/v1/stop-all', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      for (const sender of this.senders.values()) {
        sender.stop();
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Tous les émetteurs arrêtés' }));
    });

    // --- Endpoints paramétrés par émetteur ID (/api/v1/senders/:id/...) ---
    app.get('/api/v1/senders/:id/filename', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", fileName: sender.fileName }));
    });

    app.get('/api/v1/senders/:id/generatorstate', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", running: sender.running }));
    });

    app.get('/api/v1/senders/:id/fields', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });
      res.end(JSON.stringify(sender.getFields(), null, 2));
    });

    app.get('/api/v1/senders/:id/start', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });
      sender.start();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Générateur démarré' }));
    });

    app.get('/api/v1/senders/:id/stop', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });
      sender.stop();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Générateur arrêté' }));
    });

    app.put('/api/v1/senders/:id/field/:fieldName', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });

      try {
        const { value } = await readBody(req);
        const ok = sender.setFieldValue(req.params.fieldName, value);
        res.statusCode = ok ? 200 : 400;
        res.end(JSON.stringify({ success: ok, field: req.params.fieldName, value }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    app.put('/api/v1/senders/:id/period', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });

      try {
        const { value } = await readBody(req);
        sender.periodMs = value;
        if (sender.running && sender.timer) {
          clearInterval(sender.timer);
          sender.timer = setInterval(() => sender.sendFrame(), sender.periodMs);
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, period: value }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    app.post('/api/v1/senders/:id/load-config', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.senders.get(req.params.id);
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });

      try {
        const body = await readBody(req);
        const requestedFile = body.fileName || body.filename || body.template || body.configPath;
        if (!requestedFile) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: 'Nom de fichier manquant' }));
        }

        const sanitizedFile = path.basename(requestedFile);
        const templateDir = path.join(__dirname, 'template');
        const targetPath = path.join(templateDir, sanitizedFile);

        if (!existsSync(targetPath)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ success: false, error: 'Fichier introuvable' }));
        }

        const wasRunning = sender.running;
        if (wasRunning) sender.stop();

        sender.loadConfig(targetPath);

        if (wasRunning) sender.start();

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: "ok",
          fileName: sender.fileName,
          sender: sender.getSummary(),
          fields: sender.getFields()
        }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    // --- Endpoints de rétrocompatibilité (Émetteur par défaut) ---
    app.get('/api/v1/filename', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.getDefaultSender();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", fileName: sender ? sender.fileName : '' }));
    });

    app.get('/api/v1/generatorstate', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.getDefaultSender();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", running: sender ? sender.running : false }));
    });

    app.get('/api/v1/fields', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.getDefaultSender();
      res.end(JSON.stringify(sender ? sender.getFields() : [], null, 2));
    });

    app.get('/api/v1/start', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.getDefaultSender();
      if (sender) sender.start();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Générateur démarré' }));
    });

    app.get('/api/v1/stop', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const sender = this.getDefaultSender();
      if (sender) sender.stop();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: "ok", state: 'Générateur arrêté' }));
    });

    app.put('/api/v1/field/:fieldName', async (req, res) => {
      const { fieldName } = req.params;
      const sender = this.getDefaultSender();
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });

      try {
        const { value } = await readBody(req);
        const ok = sender.setFieldValue(fieldName, value);
        res.statusCode = ok ? 200 : 400;
        res.end(JSON.stringify({ success: ok, field: fieldName, value }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    app.put('/api/v1/period', async (req, res) => {
      const sender = this.getDefaultSender();
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });

      try {
        const { value } = await readBody(req);
        sender.periodMs = value;
        if (sender.running && sender.timer) {
          clearInterval(sender.timer);
          sender.timer = setInterval(() => sender.sendFrame(), sender.periodMs);
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, period: value }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    app.post('/api/v1/load-config', async (req, res) => {
      const sender = this.getDefaultSender();
      if (!sender) return res.status(404).json({ success: false, error: 'Émetteur introuvable' });

      try {
        const body = await readBody(req);
        const requestedFile = body.fileName || body.filename || body.template || body.configPath;
        if (!requestedFile) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: 'Nom de fichier manquant' }));
        }

        const sanitizedFile = path.basename(requestedFile);
        const templateDir = path.join(__dirname, 'template');
        const targetPath = path.join(templateDir, sanitizedFile);

        if (!existsSync(targetPath)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ success: false, error: 'Fichier introuvable' }));
        }

        const wasRunning = sender.running;
        if (wasRunning) sender.stop();

        sender.loadConfig(targetPath);

        if (wasRunning) sender.start();

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: "ok",
          fileName: sender.fileName,
          fields: sender.getFields()
        }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    app.use(express.static(__dirname + "/www"));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '/www/index.html'));
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
