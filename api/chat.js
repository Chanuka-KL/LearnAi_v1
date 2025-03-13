import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const models = {
    chat: "gpt-4o",
    coding: "code-davinci-002",
    summarization: "text-davinci-003"
};

let chatHistory = []; // In-memory chat history (temporary)

async function fetchLiveData(query) {
    try {
        const response = await axios.get(`https://api.duckduckgo.com/?q=${query}&format=json`);
        return response.data.AbstractText || null;
    } catch (error) {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST requests allowed" });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return res.status(500).json({ error: "Missing API token" });
    }

    const client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: token
    });

    try {
        let { message } = req.body;

        const selectedModel = message.includes("code") ? models.coding : models.chat;

        let extraInfo = await fetchLiveData(message);
        if (extraInfo) {
            message += `\n\nAdditional info found: ${extraInfo}`;
        }

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are SpecterAI, a hacking and tech expert." },
                ...chatHistory.slice(-10), // Keep last 10 messages in memory
                { role: "user", content: message }
            ],
            model: selectedModel,
            temperature: 0.8,
            max_tokens: 4096,
            top_p: 1
        });

        const botReply = response.choices[0].message.content;

        chatHistory.push({ role: "user", content: message });
        chatHistory.push({ role: "assistant", content: botReply });

        res.status(200).json({ reply: botReply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "AI request failed" });
    }
                }
