import fs from "fs";
import path from "path";
import os from "os";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB in bytes

async function processAudioChunk(chunk, index) {
  const tempFile = path.join(os.tmpdir(), `audio-chunk-${index}-${Date.now()}.mp3`);
  try {
    fs.writeFileSync(tempFile, chunk);
    console.log(`Processing chunk ${index}, size: ${chunk.length} bytes`);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: "whisper-large-v3",
      prompt: "", 
      response_format: "json", 
      temperature: 0,
    });

    return transcription.text;
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

export async function whisperTranscription(audioBuffer) {
  if (!(audioBuffer instanceof Buffer)) {
    throw new Error("audioBuffer must be a Buffer");
  }

  console.log(`Transcription Process Initialized`);

  try {
    if (audioBuffer.length <= MAX_FILE_SIZE) {
      // Process as a single chunk if file size is within limit
      return await processAudioChunk(audioBuffer, 0);
    } else {
      // Split the file into chunks and process each
      const chunks = [];
      for (let i = 0; i < audioBuffer.length; i += MAX_FILE_SIZE) {
        chunks.push(audioBuffer.slice(i, i + MAX_FILE_SIZE));
      }

      const results = await Promise.all(chunks.map((chunk, index) => 
        processAudioChunk(chunk, index)
      ));

      // Combine results from all chunks
      return results.join(' ');
    }
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  }
}