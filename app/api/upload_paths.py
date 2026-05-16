"""Upload and seed file helpers used by the admin routes."""

from pathlib import Path

from fastapi import HTTPException

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = PROJECT_ROOT / "uploads"
SEED_DIR = PROJECT_ROOT / "seed"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SEED_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_ROOTS = (UPLOAD_DIR.resolve(), SEED_DIR.resolve())


def _resolve_under(base: Path, raw_path: str) -> Path:
    p = Path(raw_path).expanduser()
    if not p.is_absolute():
        if p.parts and p.parts[0] == base.name:
            p = Path(*p.parts[1:])
        p = base / p
    resolved = p.resolve()
    base_resolved = base.resolve()
    if base_resolved != resolved and base_resolved not in resolved.parents:
        raise HTTPException(
            status_code=400,
            detail=f"Path must be inside the {base.name}/ directory",
        )
    return resolved


def resolve_under_uploads(raw_path: str) -> Path:
    return _resolve_under(UPLOAD_DIR, raw_path)


def resolve_import_csv(raw_path: str) -> Path:
    """Resolve a CSV under uploads/ or the committed seed/ folder."""
    p = Path(raw_path).expanduser()
    if not p.is_absolute() and p.parts:
        first = p.parts[0]
        if first == "seed":
            return _resolve_under(SEED_DIR, raw_path)
        if first == "uploads":
            return _resolve_under(UPLOAD_DIR, raw_path)

    resolved = p.resolve() if p.is_absolute() else (UPLOAD_DIR / p).resolve()
    if not any(root == resolved or root in resolved.parents for root in _ALLOWED_ROOTS):
        raise HTTPException(
            status_code=400,
            detail="Path must be inside uploads/ or seed/",
        )
    return resolved
