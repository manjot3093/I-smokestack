import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export async function synthesizeSpeech(text, {
  createClient = () => new MsEdgeTTS(),
  timeoutMs = 10000,
} = {}) {
  // Retry once with a fresh connection; never serve a partial synthesis.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const tts = createClient();
    let timer;
    let expired = false;
    try {
      return await Promise.race([
        (async () => {
          await tts.setMetadata('en-IN-NeerjaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          if (expired) throw new Error('TTS timeout');
          const { audioStream } = tts.toStream(text);
          const chunks = [];
          for await (const chunk of audioStream) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          if (!buffer.length) throw new Error('TTS returned empty audio');
          return buffer;
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            reject(new Error('TTS timeout'));
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      if (attempt === 1) throw error;
    } finally {
      clearTimeout(timer);
      tts.close();
    }
  }
}
