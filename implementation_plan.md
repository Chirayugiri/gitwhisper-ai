If your goal is to build a **production-grade GitHub Repository Assistant** that can answer questions about **almost any repository**, then don't think of it as "building a RAG." Think of it as building a **Code Intelligence Platform + RAG layer**.

I'll give you a **practical implementation roadmap** that you can actually build step-by-step.

# Final Tech Stack

| Component            | Choice                   |
| -------------------- | ------------------------ |
| Repository Ingestion | GitHub API               |
| Parsing              | Tree-sitter              |
| Embeddings           | Voyage Code / OpenAI     |
| Vector DB            | Qdrant                   |
| Graph DB             | Neo4j                    |
| BM25                 | keyword search (Qdrant)  |
| Reranker             | CrossEncoder Reranker    |
| Orchestration        | LangGraph                |
| LLM                  | Groq API (use current API key) |
| Evaluation           | RAGAS + DeepEval         |

---

# PHASE 1 — Repository Ingestion

## Input

```text
github_url
branch
github_token
```

Example:

```text
https://github.com/user/project
```

---

## GitHub API calls

### Repository metadata

```http
GET /repos/{owner}/{repo}
```

---

### Repository tree

```http
GET /repos/{owner}/{repo}/git/trees/main?recursive=1
```

Store:

```python
Repository(
    repo_id,
    owner,
    name,
    branch,
    language
)
```

---

### Filter files

Skip:

```text
node_modules
dist
build
coverage
.git
vendor
target
.next
```

Skip:

```text
jpg
png
zip
pdf
lock
min.js
map
```

---

# Output

```python
[
    {
        "path":"src/auth/login.py",
        "content":"..."
    }
]
```

---

# PHASE 2 — Language Detection

Use:

```python
github linguist
```

or:

```python
pygments
```

Output:

```python
{
    "path":"login.py",
    "language":"python"
}
```

---

# PHASE 3 — Parsing Layer

Create:

```text
ParserManager
        |
        +--PythonParser
        +--JSParser
        +--JavaParser
        +--FallbackParser
```

---

## Use Tree-sitter

Extract:

```python
{
    "imports":[],
    "classes":[],
    "functions":[],
    "methods":[],
    "comments":[],
    "decorators":[]
}
```

---

Example:

```python
class AuthService:

    def login():
        pass
```

Becomes:

```python
{
    "type":"class",
    "name":"AuthService",
    "children":[
        "login"
    ]
}
```

---

# PHASE 4 — Repository Knowledge Graph

Create graph nodes:

```text
Repository
Folder
File
Class
Function
API
Database
Library
```

---

## Graph edges

```text
CONTAINS
IMPORTS
CALLS
INHERITS
USES
EXPOSES
DEPENDS_ON
```

---

Example:

```text
api.py
     |
EXPOSES
     ↓
login()

login()
     |
CALLS
     ↓
authenticate()

authenticate()
     |
USES
     ↓
jwt
```

---

# PHASE 5 — Hierarchical Chunking

This is the most important step.

---

## LEVEL 0

Repository summary

```python
{
    "chunk_type":"repo"
}
```

---

## LEVEL 1

Folder chunk

```python
{
    "chunk_type":"module"
}
```

---

## LEVEL 2

File chunk

```python
{
    "chunk_type":"file"
}
```

---

## LEVEL 3

Class chunk

```python
{
    "chunk_type":"class"
}
```

---

## LEVEL 4

Function chunk

```python
{
    "chunk_type":"function"
}
```

---

## LEVEL 5

Statement chunk

Large function:

```python
def payment():
```

split into:

```text
validation block
payment block
db block
notification block
```

---

# Chunk schema

```python
{
    "chunk_id":"uuid",

    "repo":"shop",

    "path":"src/auth/login.py",

    "chunk_type":"function",

    "language":"python",

    "class":"AuthService",

    "function":"authenticate",

    "imports":[...],

    "calls":[...],

    "called_by":[...],

    "parent_chunk":"AuthService",

    "graph_neighbors":[...],

    "content":"...",

    "summary":"..."
}
```

---

# PHASE 6 — LLM Summarization

For every:

```text
repo
folder
file
class
function
```

Generate summary.

Example:

```python
def authenticate():
```

Summary:

```text
Authenticates JWT tokens,
validates Redis cache,
and loads user profile.
```

---

Store:

```python
chunk["summary"]
```

---

# PHASE 7 — Embeddings

Create TWO embeddings.

---

## Code embedding

Embed:

```python
def authenticate():
```

---

## Semantic summary embedding

Embed:

```text
Authenticates JWT tokens
```

---

Store:

```python
{
    "code_embedding":[],
    "summary_embedding":[]
}
```

---

# PHASE 8 — Storage

## Qdrant

Store:

```text
embeddings
metadata
hierarchy
```

---

## Neo4j

Store:

```text
nodes
edges
dependencies
```

---

## Elasticsearch

Store:

```text
symbol names
paths
identifiers
comments
```

---

# PHASE 9 — Query Understanding

User asks:

```text
How does authentication work?
```

Classify:

```python
{
    "query_type":"architecture"
}
```

---

Possible types:

```text
architecture
function
class
api
database
dependency
workflow
implementation
bug
```

---

# PHASE 10 — Retrieval

Run retrieval in parallel.

---

## Semantic

```text
vector search
```

Retrieve:

```text
top 20
```

---

## BM25

Retrieve:

```text
top 20
```

---

## Graph Retrieval

Retrieve:

```text
neighbors
callers
callees
imports
```

---

## Symbol Retrieval

Retrieve:

```text
functions
classes
paths
```

---

Merge:

```text
80 chunks
```

---

# PHASE 11 — Reranking

Use:

```text
bge-reranker-large
```

Convert:

```text
80
 ↓
15
```

---

# PHASE 12 — Context Expansion

Suppose retrieved:

```python
authenticate()
```

Expand:

```text
authenticate()
        +
AuthService
        +
login()
        +
jwt.py
        +
called_by
```

---

Context:

```text
AuthService

authenticate()

validate()

jwt.py

routes.py
```

---

# PHASE 13 — Context Sufficiency Guardrail

Small model:

```text
Can this question be answered?

YES
NO
PARTIAL
```

---

If:

```text
NO
```

Return:

```text
I couldn't find enough information
in the repository context.
```

---

# PHASE 14 — Main LLM

Prompt:

```text
Answer ONLY using retrieved context.

Never hallucinate.

Cite file paths.

If unavailable:
"I couldn't find enough information
in the repository context."
```

---

# PHASE 15 — Answer Verification

Second LLM checks:

```text
Did answer cite real files?
Did answer hallucinate?
Was question answered?
```

---

# PHASE 16 — Evaluation

Metrics:

```text
Recall@K
MRR
Precision@K
Faithfulness
Context Recall
Answer Relevancy
Citation Accuracy
```

---

# Final Production Pipeline

```text
                GitHub API
                     |
                     v
             Repository Downloader
                     |
                     v
             Language Detection
                     |
                     v
                Tree-sitter
                     |
                     v
               AST Extraction
                     |
                     v
          Repository Knowledge Graph
                     |
                     v
       Hierarchical Semantic Chunking
                     |
                     v
              LLM Summarization
                     |
                     v
                 Embeddings
                     |
         --------------------------
         |            |
         v            v          
       Qdrant      Neo4j     
         |            |          
         --------------
               |
               v
        Query Classification
               |
               v
          Hybrid Retrieval
               |
               v
             Reranker
               |
               v
        Graph Expansion
               |
               v
       Context Sufficiency
               |
               v
            GPT-5
               |
               v
      Answer Verification
               |
               v
          Final Answer
```

# Build Order (very important)

Don't build everything at once.

### Sprint 1

```text
GitHub API
Tree-sitter
AST chunking
Qdrant
Basic retrieval
```

---

### Sprint 2

```text
Metadata enrichment
BM25
Reranker
Parent-child retrieval
```

---

### Sprint 3

```text
Neo4j graph
Graph retrieval
Context expansion
```

---

### Sprint 4

```text
Guardrails
Answer verification
Evaluation
Caching
Monitoring
```

This is a realistic architecture for a **portfolio-worthy, production-style GitHub code assistant**.
