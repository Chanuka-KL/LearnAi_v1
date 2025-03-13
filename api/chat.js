import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";

dotenv.config();

const historyFile = "./chatHistory.json"; // Store chat history
const models = {
    chat: "gpt-4o",
    coding: "code-davinci-002",
    summarization: "text-davinci-003"
};

// Load past chats
function loadHistory() {
    try {
        return JSON.parse(fs.readFileSync(historyFile, "utf8"));
    } catch (error) {
        return [];
    }
}

// Save chat history
function saveHistory(history) {
    fs.writeFileSync(historyFile, JSON.stringify(history.slice(-20), null, 2)); // Keep last 20 messages
}

// Fetch live data (web search)
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
        const { message } = req.body;
        global.chatHistory = loadHistory(); // Load past messages

        // Select model based on query type
        const selectedModel = message.includes("code") ? models.coding : models.chat;

        // Fetch live data if needed
        let extraInfo = await fetchLiveData(message);
        if (extraInfo) {
            message += `\n\nAdditional info found: ${extraInfo}`;
        }

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are SpecterAI, an expert hacker and tech assistant, giving detailed responses with examples." },
                ...global.chatHistory, // Include chat history
                { role: "user", content: message }
            ],
            model: selectedModel,
            temperature: 0.8,
            max_tokens: 4096,
            top_p: 1
        });

        const botReply = response.choices[0].message.content;
        
        // Save new conversation
        global.chatHistory.push({ role: "user", content: message });
        global.chatHistory.push({ role: "assistant", content: botReply });
        saveHistory(global.chatHistory);

        res.status(200).json({ reply: botReply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "AI request failed" });
    }
        }
