# pyrefly: ignore [missing-import]
from typing import List, Dict, Any
from app.services.github import language_of

HAS_TS = False
try:
    # pyrefly: ignore [missing-import]
    from tree_sitter import Language, Parser
    # pyrefly: ignore [missing-import]
    import tree_sitter_typescript as tstypescript
    TS_LANGUAGE = Language(tstypescript.language_typescript())
    parser = Parser(TS_LANGUAGE)
    HAS_TS = True
except Exception as e:
    print("Could not load tree_sitter:", e)
    HAS_TS = False

def fallback_chunk(file_obj: Dict[str, Any]) -> List[Dict[str, Any]]:
    CHUNK_LINES = 60
    CHUNK_OVERLAP = 10
    lines = file_obj["content"].split("\n")
    chunks = []
    if not lines: return chunks
    lang = language_of(file_obj["path"])
    start = 0
    while start < len(lines):
        end = min(start + CHUNK_LINES, len(lines))
        code = "\n".join(lines[start:end])
        if code.strip():
            chunks.append({
                "id": f"{file_obj['path']}-{start}",
                "path": file_obj["path"],
                "startLine": start + 1,
                "endLine": end,
                "code": code,
                "language": lang
            })
        if end >= len(lines): break
        start += CHUNK_LINES - CHUNK_OVERLAP
    return chunks

def chunk_file_ast(file_obj: Dict[str, Any]) -> List[Dict[str, Any]]:
    lang = language_of(file_obj["path"])
    if lang not in ["typescript", "tsx", "javascript", "jsx"] or not HAS_TS:
        return fallback_chunk(file_obj)
    
    try:
        tree = parser.parse(bytes(file_obj["content"], "utf8"))
        chunks = []
        
        def traverse(node):
            if node.type in ['function_declaration', 'class_declaration', 'method_definition', 'interface_declaration', 'type_alias_declaration']:
                text = node.text.decode("utf8")
                if len(text) > 30:
                    chunks.append({
                        "id": f"{file_obj['path']}-{node.start_point[0]}",
                        "path": file_obj["path"],
                        "startLine": node.start_point[0] + 1,
                        "endLine": node.end_point[0] + 1,
                        "code": text,
                        "language": lang
                    })
            else:
                for child in node.children:
                    traverse(child)
        traverse(tree.root_node)
        if not chunks:
            return fallback_chunk(file_obj)
        return chunks
    except Exception as e:
        print("AST chunking failed:", e)
        return fallback_chunk(file_obj)
