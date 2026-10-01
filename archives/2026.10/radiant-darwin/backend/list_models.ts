import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { GoogleGenAI } from '@google/genai';

async function list() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.list();
        for (const model of response.models || response.items || []) {
            console.log(model.name);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
list();
