import fs from "fs";
import path from "path";

const memoryFile = path.join(process.cwd(), "chat_memory.json");

// Load past messages
function loadMemory() {
    if (fs.existsSync(memoryFile)) {
        return JSON.parse(fs.readFileSync(memoryFile));
    }
    return [];
}

// Save messages (limit to last 10 messages)
function saveMessage(user, bot) {
    let memory = loadMemory();
    memory.push({ user, bot });
    if (memory.length > 10) memory.shift(); // Keep only the last 10 messages
    fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// Chat API
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const memory = loadMemory(); // Load past chats

    // AI logic (modify this to connect with your model)
    const botReply = `AI remembers: ${memory.length} messages. Your message: ${message}`;

    saveMessage(message, botReply);

    res.json({ reply: botReply, history: memory });
}
