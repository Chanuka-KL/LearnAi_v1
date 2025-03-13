import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

global.chatHistory = global.chatHistory || []; // Persistent in-memory chat history

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
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Build chat history
        const chatMessages = [
            { role: "system", content: "You are an AI assistant." },
            ...global.chatHistory.slice(-10), // Keep last 10 messages
            { role: "user", content: message }
        ];

        const response = await client.chat.completions.create({
            messages: chatMessages,
            model: "gpt-4o",
            temperature: 0.7, // More controlled responses
            max_tokens: 1024, // Prevents excessive output
            top_p: 0.9 // Better randomness
        });

        const botReply = response.choices[0].message.content;

        // Store conversation in memory
        global.chatHistory.push({ role: "user", content: message });
        global.chatHistory.push({ role: "assistant", content: botReply });

        res.status(200).json({ reply: botReply, history: global.chatHistory.slice(-10) });
    } catch (err) {
        console.error("AI Request Failed:", err);
        res.status(500).json({ error: "AI request failed", details: err.message });
    }
}
