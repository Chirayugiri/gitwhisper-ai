# GitWhisper

GitWhisper is an AI-powered code analysis tool that allows you to chat with any public GitHub repository. Simply provide a repository link, and GitWhisper will ingest its codebase, chunk the files intelligently, and answer your technical questions using advanced Retrieval-Augmented Generation (RAG).

## Features

- **Advanced RAG Pipeline:** Intelligent AST-based code chunking ensures that meaningful structures (like functions and classes) are preserved.
- **Qdrant Vector Database Integration:** Code chunks are embedded into dense vectors and securely ingested into Qdrant for extremely fast and scalable semantic retrieval.
- **Local Embeddings & Reranking:** 
  - Uses `@xenova/transformers` with the `Xenova/all-MiniLM-L6-v2` model locally for creating semantic embeddings.
  - Employs the `Xenova/ms-marco-MiniLM-L-6-v2` Cross-Encoder to rerank retrieved documents to ensure highest context relevance.
- **LLM Generation:** Queries the Groq API (or any configured LLM) with the highest-scoring codebase snippets to generate precise, markdown-formatted answers.
- **Smart Caching:** Avoids redundant data fetching and embedding by directly querying the Qdrant database if a repository has already been ingested.

## How it Works

1. **Ingestion**: When a GitHub repository URL is provided, GitWhisper fetches the files, filters for text and code, and parses the files into abstract syntax trees (AST) to generate context-aware chunks.
2. **Embedding & Storage**: Embeddings are generated for each chunk locally and upserted into Qdrant in batches. A collection named after the repository is automatically created.
3. **Retrieval**: When you ask a question, the question is embedded, and a vector search is performed in Qdrant to find the top 20 most relevant chunks.
4. **Reranking & Generation**: The top results are reranked for precision. Chunks passing the confidence threshold are then provided to the LLM to generate a detailed, cited response.

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   # Qdrant Vector Database
   QDRANT_URL=http://localhost:6333
   QDRANT_API_KEY=your_qdrant_api_key

   # LLM & GitHub
   LLM_API_KEY=your_groq_api_key
   GITHUB_TOKEN=your_github_token
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

## Technologies Used

- [TanStack Start](https://tanstack.com/start) & React
- [Qdrant](https://qdrant.tech/) for Vector Search
- [Transformers.js](https://huggingface.co/docs/transformers.js/) for in-browser/local embeddings
- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) for AST Parsing
- [Tailwind CSS](https://tailwindcss.com/) & Radix UI
