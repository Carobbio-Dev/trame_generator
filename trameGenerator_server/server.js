import { FrameGenerator } from "./trameGenerator.js";

// --- Point d'entrée ---
const configPath = process.argv[2] || 'template/frame_config.json';
const generator = new FrameGenerator(configPath);

process.on('SIGINT', () => {
  console.log('\n[INFO] SIGINT reçu.');
  generator.stop();
  process.exit(0);
});