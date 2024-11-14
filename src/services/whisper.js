import fs from "fs";
import path from "path";
import os from "os";
import Groq from "groq-sdk";
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { pipeline } from 'stream';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const streamPipeline = promisify(pipeline);

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB in bytes

/**
 * Convert audio buffer to MP3 format
 * @param {Buffer} audioBuffer - The audio buffer to convert
 * @param {string} tempPath - Temporary file path
 * @returns {Promise<string>} - Path to the converted MP3 file
 */
async function convertToMp3(audioBuffer, tempPath) {
  const inputPath = `${tempPath}-input`;
  const outputPath = `${tempPath}-output.mp3`;
  
  fs.writeFileSync(inputPath, audioBuffer);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioChannels(1) // Convert to mono
      .audioFrequency(16000) // Set sample rate to 16kHz
      .audioBitrate('64k') // Lower bitrate for smaller file size
      .on('error', (error) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        reject(error);
      })
      .on('end', () => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Transcribe an audio buffer using the Whisper model.
 * @param {Buffer} audioBuffer - The audio buffer to transcribe.
 * @returns {Promise<string>} - The transcription of the audio buffer.
 */
export async function whisperTranscription(audioBuffer) {
  if (!(audioBuffer instanceof Buffer)) {
    throw new Error("audioBuffer must be a Buffer");
  }

  console.log(`Transcription Process Initialized`);
  const tempBase = path.join(os.tmpdir(), `audio-${Date.now()}`);
  let mp3Path = null;

  try {
    // Convert entire audio to optimized MP3
    mp3Path = await convertToMp3(audioBuffer, tempBase);
    console.log(`Audio converted successfully, proceeding with transcription`);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(mp3Path),
      model: "whisper-large-v3",
      prompt: "", 
      response_format: "json", 
      temperature: 0,
    });

    return transcription.text;
  } catch (error) {
    console.error("Error in transcription:", error);
    throw new Error("Failed to transcribe audio. Please try again later.");
  } finally {
    // Clean up temporary files
    if (mp3Path && fs.existsSync(mp3Path)) {
      fs.unlinkSync(mp3Path);
    }
  }
}
