
import fs from "fs";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({apiKey: process.env.GROQ_API_KEY});
async function main() {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream("audio.m4a"),
    model: "whisper-large-v3",
    prompt: "", 
    response_format: "text", 
    temperature: 0, 
    
  });
  console.log(transcription.text);
}
main();    
    