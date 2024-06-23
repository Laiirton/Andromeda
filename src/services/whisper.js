import fs from "fs";
import path from "path";
import os from "os";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function whisperTranscription(audioBuffer) {
  // Ensure audioBuffer is a Buffer
  if (!(audioBuffer instanceof Buffer)) {
    throw new Error("audioBuffer must be a Buffer");
  }

  // Create a temporary file
  const tempFile = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
  
  try {
    // Write the buffer to the temporary file
    fs.writeFileSync(tempFile, audioBuffer);

    // Check if the file was created and has content
    const stats = fs.statSync(tempFile);
    console.log(`Transcription Process Initialized`)
    console.log(`Temporary file created: ${tempFile}, size: ${stats.size} bytes`);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: "whisper-large-v3",
      prompt: "", 
      response_format: "json", 
      temperature: 0,
    });

    const response = transcription.text;
  
    console.log(`Transcription Process Initialized`)
    return transcription, response;
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  } finally {
    // Remove the temporary file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log("Temporary file removed");
    }
  }
}