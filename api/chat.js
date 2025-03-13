import OpenAI from "openai";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

// Define a schema for storing messages
const messageSchema = new mongoose.Schema({
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});

// Create a model
const Message = mongoose.model("Message", messageSchema);

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Security: Check API Key
    const userApiKey = req.headers["x-api-key"];
    if (!userApiKey || userApiKey !== process.env.SECRET_API_KEY) {
        return res.status(403).json({ error: "Unauthorized access" });
    }

    // Handle GET request (Check API Status)
    if (req.method === "GET") {
        return res.status(200).json({ message: "AI API is running", status: "Active" });
    }

    // Get the OpenAI API key
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return res.status(500).json({ error: "Missing API token" });
    }

    const client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: token
    });

    try {
        const { message, temperature = 1, max_tokens = 4096 } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Missing 'message' in request" });
        }

        // Store user message in MongoDB
        await Message.create({ role: "user", content: message });

        // Retrieve last 5 messages from MongoDB
        const lastMessages = await Message.find().sort({ timestamp: -1 }).limit(5).lean();

        const response = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a smart AI assistant." },
                ...lastMessages.reverse() // Ensure chronological order
            ],
            model: "gpt-4o",
            temperature,
            max_tokens,
            top_p: 1
        });

        const aiReply = response.choices[0].message.content;

        // Store AI response in MongoDB
        await Message.create({ role: "assistant", content: aiReply });

        console.log(`[LOG] User: ${message}`);
        console.log(`[LOG] AI: ${aiReply}`);

        return res.status(200).json({ reply: aiReply });

    } catch (err) {
        console.error("[ERROR]", err);
        return res.status(500).json({ error: "AI request failed", details: err.message });
    }
                }
