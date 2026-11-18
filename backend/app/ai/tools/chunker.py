"""Content chunker splitting lesson sections into ~500-token chunks while preserving 17-block boundaries.

Source of truth:
- docs/plan.md §2.8, §3.2
- Task 8 §8.3
"""

import json
from typing import Any, Dict, List, Union


def estimate_tokens(text: str) -> int:
    """Estimate token count for a text string (~4 characters per token)."""
    if not text:
        return 0
    return max(1, len(text) // 4)


def block_to_text(block: Dict[str, Any]) -> str:
    """Extract readable text from a block."""
    b_type = block.get("type", "text")
    if b_type == "text":
        return block.get("text", "")
    elif b_type == "math":
        return f"${block.get('latex', '')}$"
    elif b_type == "callout":
        inner = " ".join(block_to_text(b) for b in block.get("content", []) if isinstance(b, dict))
        return f"[{block.get('kind', 'note').upper()}]: {inner}"
    elif b_type == "list":
        items = block.get("items", [])
        return "\n".join(f"- {item}" for item in items)
    return str(block)


def chunk_sections(
    sections: List[Union[Dict[str, Any], Any]],
    target_token_size: int = 500,
) -> List[Dict[str, Any]]:
    """Split lesson content sections into chunks of approximately target_token_size tokens.
    
    Preserves 17-block boundaries (never splits a block in the middle).
    """
    chunks = []
    current_blocks = []
    current_tokens = 0
    chunk_index = 0

    for sec in sections:
        sec_title = sec.get("title", "") if isinstance(sec, dict) else ""
        blocks = sec.get("blocks", []) if isinstance(sec, dict) else [sec]

        for block in blocks:
            b_dict = block if isinstance(block, dict) else {"type": "text", "text": str(block)}
            b_text = block_to_text(b_dict)
            b_tokens = estimate_tokens(b_text)

            if current_tokens + b_tokens > target_token_size and current_blocks:
                # Flush current chunk
                combined_text = "\n\n".join(block_to_text(b) for b in current_blocks)
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": combined_text,
                    "content_type": "body",
                    "blocks": list(current_blocks),
                    "token_count": current_tokens,
                })
                chunk_index += 1
                current_blocks = []
                current_tokens = 0

            current_blocks.append(b_dict)
            current_tokens += b_tokens

    if current_blocks:
        combined_text = "\n\n".join(block_to_text(b) for b in current_blocks)
        chunks.append({
            "chunk_index": chunk_index,
            "content": combined_text,
            "content_type": "body",
            "blocks": list(current_blocks),
            "token_count": current_tokens,
        })

    return chunks
