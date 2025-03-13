import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// In-memory conversation history (short-term memory)
let conversationHistory = [];

export default async function handler(req, res) {
    // Allow all HTTP methods and set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

    // Handle preflight requests (CORS)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Security: Check API Key
    const userApiKey = req.headers["x-api-key"];
    if (!userApiKey || userApiKey !== process.env.SECRET_API_KEY) {
        return res.status(403).json({ error: "Unauthorized access" });
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
        // Handle GET request (API status check)
        if (req.method === "GET") {
            return res.status(200).json({ message: "AI API is running", status: "Active" });
        }

        // Extract user input for other methods (POST, PUT, DELETE)
        const { message, temperature = 1, max_tokens = 4096 } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Missing 'message' in request" });
        }

        // Store user input in memory
        conversationHistory.push({ role: "user", content: message });

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a smart AI assistant." },
                ...conversationHistory.slice(-5) // Keep last 5 messages
            ],
            model: "gpt-4o",
            temperature,
            max_tokens,
            top_p: 1
        });

        const aiReply = response.choices[0].message.content;

        // Store AI response in memory
        conversationHistory.push({ role: "assistant", content: aiReply });

        console.log(`[LOG] User: ${message}`);
        console.log(`[LOG] AI: ${aiReply}`);

        return res.status(200).json({ reply: aiReply });

    } catch (err) {
        console.error("[ERROR]", err);
        return res.status(500).json({ error: "AI request failed", details: err.message });
    }
}
