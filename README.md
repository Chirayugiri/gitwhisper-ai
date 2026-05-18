## ✨ Overview

GitWhisper AI is an intelligent developer assistant that enables users to chat with GitHub repositories using natural language.

Instead of manually exploring files, functions, and documentation, GitWhisper AI analyzes the repository, indexes the codebase using embeddings, and provides AI-generated answers grounded in the actual source code.

Built using modern AI engineering practices including:

- 🧠 Retrieval-Augmented Generation (RAG)
- 🔎 Semantic Code Search
- 📚 Vector Embeddings
- ⚡ Fast LLM Responses
- 🧩 Context-Aware Repository Understanding

---

# 🌟 Features

### 🤖 AI-Powered Repository Chat
Ask questions like:
- “How does authentication work?”
- “Explain the folder structure”
- “Where is JWT implemented?”
- “How is the API connected to MongoDB?”

---

### 📂 GitHub Repository Analysis
- Parse and understand public repositories
- Extract project structure and code context
- Intelligent chunking for better retrieval

---

### 🔍 Semantic Code Search
Find relevant code snippets using embeddings instead of keyword matching.

---

### 🧠 RAG-Based Architecture
Combines:
- Vector similarity search
- Context retrieval
- LLM reasoning

for highly relevant answers grounded in actual repository code.

---

### ⚡ Real-Time AI Responses
Optimized for fast query processing and contextual responses.

---

### 🎨 Modern UI/UX
- Clean developer-focused interface
- Responsive design
- Smooth conversational experience

---

# 🏗️ Architecture

```bash
GitHub Repository
        ↓
Code Parsing & Chunking
        ↓
Embedding Generation
        ↓
Vector Database Storage
        ↓
Relevant Context Retrieval
        ↓
LLM Processing
        ↓
AI Response Generation

```


🛠️ Tech Stack
Frontend
Next.js
React.js
Tailwind CSS
TypeScript

Backend / AI
Node.js
LangChain
Gemini / OpenAI APIs
RAG Pipeline
Vector Database

Deployment
Vercel

🚀 Getting Started
1️⃣ Clone the Repository
git clone https://github.com/Chirayugiri/gitwhisper-ai.git
cd gitwhisper-ai
2️⃣ Install Dependencies
npm install
3️⃣ Setup Environment Variables

Create a .env.local file in the root directory.

GOOGLE_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key
4️⃣ Run the Development Server
npm run dev

Open:

http://localhost:3000
💡 How It Works
User provides a GitHub repository
Repository code is parsed and chunked
Embeddings are generated
Code chunks are stored in a vector database
Relevant context is retrieved for user queries
LLM generates grounded answers using retrieved code context
🎯 Use Cases
📘 Understand unfamiliar codebases
⚡ Speed up onboarding for developers
🔍 Quickly locate implementations
🧠 Learn project architecture
🛠️ Improve developer productivity
👨‍💻 AI assistant for open-source projects
📂 Project Structure
gitwhisper-ai/
│
├── app/
├── components/
├── lib/
├── services/
├── utils/
├── public/
├── styles/
├── package.json
└── README.md
🔮 Future Improvements
Multi-repository support
GitHub authentication
Persistent chat memory
Code summarization
Repository visualization
Multi-agent workflows
Advanced code analytics
🤝 Contributing

Contributions are welcome!

If you'd like to improve GitWhisper AI:

Fork the repository
Create a new branch
Commit your changes
Open a Pull Request
⭐ Support

If you found this project useful:

Star the repository
Share it with developers
Contribute to the project
