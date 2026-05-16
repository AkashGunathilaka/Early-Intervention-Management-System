"""Upload file helpers used by the admin routes."""

from pathlib import Path

from fastapi import HTTPException

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def resolve_under_uploads(raw_path: str) -> Path:
    # convert a given upload path into a sage absolute path the final path should be in the uploads folder
    base = UPLOAD_DIR.resolve()
    p = Path(raw_path).expanduser()
    if not p.is_absolute():
        if p.parts and p.parts[0] == UPLOAD_DIR.name:
            p = Path(*p.parts[1:])
        p = UPLOAD_DIR / p
    resolved = p.resolve()
    if base != resolved and base not in resolved.parents:
        raise HTTPException(status_code=400, detail="Path must be inside the uploads directory")
    return resolved
