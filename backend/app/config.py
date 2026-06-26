import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
import logging
logging.getLogger("huggingface_hub.utils._http").setLevel(logging.ERROR)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", None)

MAX_FILES = 60
MAX_FILE_BYTES = 30_000
TOP_K_CHUNKS = 12
MAX_CONTEXT_CHARS = 80_000
THRESHOLD = 0.65
MIN_RESULTS_FALLBACK = 3

TEXT_EXTENSIONS = {
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs",
  "php", "sh", "bash", "zsh",
  "json", "yaml", "yml", "toml", "md", "mdx", "txt",
  "html", "css", "scss", "sass", "vue", "svelte", "astro",
  "sql", "graphql", "gql",
}

SKIP_DIRS = {
  "node_modules", ".git", "dist", "build", ".next", ".nuxt", "out",
  ".turbo", ".cache", "coverage", ".vercel", ".vite", "vendor", "target",
  "__pycache__", ".pytest_cache", ".venv", "venv",
}
