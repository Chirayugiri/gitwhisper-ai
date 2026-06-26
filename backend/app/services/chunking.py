"""
Hierarchical AST-based chunking layer.

Architecture:
  ParserManager
      └── get_parser(language) → BaseParser
              ├── PythonParser        (tree-sitter-python)
              ├── TypeScriptParser    (tree-sitter-typescript)
              ├── JavaScriptParser    (tree-sitter-javascript)
              └── FallbackParser      (line-window fallback)

Each parser produces a list of Chunk dicts following this schema:

  {
    "id"          : str   – "<path>-<start_line>"
    "path"        : str   – relative file path
    "language"    : str   – detected language
    "chunk_type"  : str   – "function" | "class" | "method" | "file" | "block"
    "name"        : str   – symbol name if available, else ""
    "parent_name" : str   – enclosing class/module name, else ""
    "start_line"  : int   – 1-indexed
    "end_line"    : int   – 1-indexed
    "code"        : str   – raw source text of this chunk
  }

Usage:
    from app.services.chunking import chunk_file

    chunks = chunk_file({"path": "src/app.py", "content": "...", "language": "python"})
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Optional

# ---------------------------------------------------------------------------
# Tree-sitter bootstrap helpers
# ---------------------------------------------------------------------------

def _load_ts_parser(module_name: str, fn_name: str):
    """
    Attempt to load a tree-sitter Parser for a given language module.
    Returns a Parser instance or None if the package is not installed.
    """
    try:
        from tree_sitter import Language, Parser  # type: ignore[import]
        mod = __import__(module_name)
        lang = Language(getattr(mod, fn_name)())
        return Parser(lang)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Chunk type + constants
# ---------------------------------------------------------------------------

Chunk = dict  # typed alias for documentation purposes

_MIN_CODE_LENGTH = 30   # skip trivial stubs shorter than this
_FALLBACK_LINES = 60    # line-window size for the fallback chunker
_FALLBACK_OVERLAP = 12  # overlap between windows


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------

class BaseParser(ABC):
    """Defines the contract every language parser must satisfy."""

    @abstractmethod
    def parse(self, file_obj: dict) -> list[Chunk]:
        """
        Parse a file object and return a list of Chunk dicts.

        Args:
            file_obj: {"path": str, "content": str, "language": str}
        """


# ---------------------------------------------------------------------------
# Fallback parser (line-window, language-agnostic)
# ---------------------------------------------------------------------------

class FallbackParser(BaseParser):
    """
    Splits a file into fixed-size overlapping line windows.
    Used when no AST parser is available for the language.
    """

    def parse(self, file_obj: dict) -> list[Chunk]:
        lines = file_obj["content"].splitlines()
        path = file_obj["path"]
        language = file_obj.get("language", "text")
        chunks: list[Chunk] = []

        start = 0
        while start < len(lines):
            end = min(start + _FALLBACK_LINES, len(lines))
            code = "\n".join(lines[start:end])

            if code.strip():
                chunks.append(_make_chunk(
                    path=path,
                    language=language,
                    chunk_type="block",
                    name="",
                    parent_name="",
                    start_line=start + 1,
                    end_line=end,
                    code=code,
                ))

            if end >= len(lines):
                break
            start += _FALLBACK_LINES - _FALLBACK_OVERLAP

        return chunks


# ---------------------------------------------------------------------------
# Tree-sitter base parser  (shared traversal logic)
# ---------------------------------------------------------------------------

class TreeSitterParser(BaseParser):
    """
    Abstract base for tree-sitter-powered parsers.
    Subclasses declare which node types map to which chunk types.
    """

    # Override in subclasses: maps tree-sitter node_type → chunk_type string
    _NODE_TYPE_MAP: dict[str, str] = {}

    # Override in subclasses: node field names that hold the symbol identifier
    _NAME_FIELD = "name"

    def __init__(self, parser, fallback: FallbackParser):
        self._parser = parser
        self._fallback = fallback

    def parse(self, file_obj: dict) -> list[Chunk]:
        path = file_obj["path"]
        language = file_obj.get("language", "text")
        content = file_obj["content"]

        try:
            tree = self._parser.parse(content.encode("utf-8"))
        except Exception:
            return self._fallback.parse(file_obj)

        chunks: list[Chunk] = []
        self._traverse(tree.root_node, path, language, chunks, parent_name="")

        # If the AST produced nothing meaningful, fall back to line windows
        if not chunks:
            return self._fallback.parse(file_obj)

        return chunks

    def _traverse(self, node, path: str, language: str, chunks: list[Chunk], parent_name: str) -> None:
        chunk_type = self._NODE_TYPE_MAP.get(node.type)

        if chunk_type is not None:
            code = node.text.decode("utf-8", errors="replace")

            if len(code) >= _MIN_CODE_LENGTH:
                symbol_name = self._extract_name(node)
                chunks.append(_make_chunk(
                    path=path,
                    language=language,
                    chunk_type=chunk_type,
                    name=symbol_name,
                    parent_name=parent_name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    code=code,
                ))
                # Recurse with this node's name as the parent context
                new_parent = symbol_name or parent_name
                for child in node.children:
                    self._traverse(child, path, language, chunks, parent_name=new_parent)
                return  # Don't double-traverse children

        # Not a target node — keep walking
        for child in node.children:
            self._traverse(child, path, language, chunks, parent_name=parent_name)

    def _extract_name(self, node) -> str:
        """Try to get the symbol name via the configured name field."""
        name_node = node.child_by_field_name(self._NAME_FIELD)
        if name_node is not None:
            return name_node.text.decode("utf-8", errors="replace").strip()
        return ""


# ---------------------------------------------------------------------------
# Python parser
# ---------------------------------------------------------------------------

class PythonParser(TreeSitterParser):
    _NODE_TYPE_MAP = {
        "class_definition":    "class",
        "function_definition": "function",
        "decorated_definition": "function",  # catches @decorator + def
    }

    def _extract_name(self, node) -> str:
        # For decorated_definition, the actual def/class is a child
        if node.type == "decorated_definition":
            for child in node.children:
                if child.type in ("function_definition", "class_definition"):
                    name_node = child.child_by_field_name("name")
                    if name_node:
                        return name_node.text.decode("utf-8", errors="replace").strip()
            return ""
        return super()._extract_name(node)


# ---------------------------------------------------------------------------
# TypeScript / TSX parser
# ---------------------------------------------------------------------------

class TypeScriptParser(TreeSitterParser):
    _NODE_TYPE_MAP = {
        "function_declaration":   "function",
        "method_definition":      "method",
        "class_declaration":      "class",
        "interface_declaration":  "class",    # treat interfaces like a class chunk
        "type_alias_declaration": "class",    # treat type aliases similarly
        "arrow_function":         "function", # named arrow functions via variable declarator
        "export_statement":       "function", # exported functions/consts
    }

    def _extract_name(self, node) -> str:
        # For export_statement wrapping a named declaration
        if node.type == "export_statement":
            decl = node.child_by_field_name("declaration")
            if decl is not None:
                name_node = decl.child_by_field_name("name")
                if name_node:
                    return name_node.text.decode("utf-8", errors="replace").strip()
        return super()._extract_name(node)


# ---------------------------------------------------------------------------
# JavaScript / JSX parser  (same nodes as TS minus interfaces/types)
# ---------------------------------------------------------------------------

class JavaScriptParser(TreeSitterParser):
    _NODE_TYPE_MAP = {
        "function_declaration":   "function",
        "method_definition":      "method",
        "class_declaration":      "class",
        "arrow_function":         "function",
        "export_statement":       "function",
    }


# ---------------------------------------------------------------------------
# Parser manager (singleton registry)
# ---------------------------------------------------------------------------

class ParserManager:
    """
    Singleton that lazily initialises tree-sitter parsers and routes
    files to the correct parser based on their detected language.
    """

    _instance: Optional["ParserManager"] = None

    def __new__(cls) -> "ParserManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialised = False
        return cls._instance

    def _init(self) -> None:
        if self._initialised:
            return

        self._fallback = FallbackParser()
        self._parsers: dict[str, BaseParser] = {}

        # Python  (tree_sitter_python exposes .language)
        _py_parser = _load_ts_parser("tree_sitter_python", "language")
        if _py_parser:
            self._parsers["python"] = PythonParser(_py_parser, self._fallback)

        # TypeScript  (tree_sitter_typescript exposes .language_typescript)
        _ts_parser = _load_ts_parser("tree_sitter_typescript", "language_typescript")
        if _ts_parser:
            ts_instance = TypeScriptParser(_ts_parser, self._fallback)
            self._parsers["typescript"] = ts_instance

        # TSX  (tree_sitter_typescript also exposes .language_tsx)
        _tsx_parser = _load_ts_parser("tree_sitter_typescript", "language_tsx")
        if _tsx_parser:
            self._parsers["tsx"] = TypeScriptParser(_tsx_parser, self._fallback)

        # JavaScript  (tree_sitter_javascript exposes .language)
        _js_parser = _load_ts_parser("tree_sitter_javascript", "language")
        if _js_parser:
            js_instance = JavaScriptParser(_js_parser, self._fallback)
            self._parsers["javascript"] = js_instance
            self._parsers["jsx"] = js_instance

        self._initialised = True

    def get_parser(self, language: str) -> BaseParser:
        self._init()
        return self._parsers.get(language, self._fallback)


# Global singleton
_manager = ParserManager()


# ---------------------------------------------------------------------------
# Chunk factory helper
# ---------------------------------------------------------------------------

def _make_chunk(
    *,
    path: str,
    language: str,
    chunk_type: str,
    name: str,
    parent_name: str,
    start_line: int,
    end_line: int,
    code: str,
) -> Chunk:
    return {
        "id":          f"{path}-{start_line}",
        "path":        path,
        "language":    language,
        "chunk_type":  chunk_type,
        "name":        name,
        "parent_name": parent_name,
        "start_line":  start_line,
        "end_line":    end_line,
        "code":        code,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_file(file_obj: dict) -> list[Chunk]:
    """
    Entry point: chunk a single file object into a list of Chunk dicts.

    Args:
        file_obj: {"path": str, "content": str, "language": str}

    Returns:
        List of Chunk dicts.  Empty list if the file has no usable content.
    """
    language: str = file_obj.get("language", "text")
    parser = _manager.get_parser(language)
    return parser.parse(file_obj)


# Keep the old name as an alias so routes.py doesn't need touching yet
def chunk_file_ast(file_obj: dict) -> list[Chunk]:
    return chunk_file(file_obj)
