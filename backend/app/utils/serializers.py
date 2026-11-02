from datetime import datetime, date
from typing import Any, Dict


def serialize_doc(doc_snapshot) -> Dict[str, Any]:
    """Serializes a Firestore document snapshot to a JSON-compatible dictionary."""
    if not doc_snapshot.exists:
        return {}
    data = doc_snapshot.to_dict() or {}
    data['id'] = doc_snapshot.id
    return serialize_dict(data)


def serialize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively serializes timestamps and datetimes inside a dictionary."""
    result = {}
    for k, v in data.items():
        if isinstance(v, (datetime, date)):
            result[k] = v.isoformat()
        elif hasattr(v, 'isoformat'): # e.g. Firestore DatetimeWithNanoseconds
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = serialize_dict(v)
        elif isinstance(v, list):
            result[k] = [
                serialize_dict(item) if isinstance(item, dict)
                else (item.isoformat() if hasattr(item, 'isoformat') else item)
                for item in v
            ]
        else:
            result[k] = v
    return result

