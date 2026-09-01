import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { GoogleGenAI } from '@google/genai';

async function testModel() {
    console.log('Testing models...');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    for (const m of models) {
        try {
            console.log(`Testing ${m}...`);
            await ai.models.generateContent({
                model: m,
                contents: 'Hello'
            });
            console.log(`[SUCCESS] ${m} works!`);
        } catch (e: any) {
            console.log(`[FAIL] ${m}: ${e.message}`);
        }
    }
}

testModel();
