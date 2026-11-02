from flask import jsonify
from typing import Any, Optional, Dict


def success_response(data: Any = None, message: str = "Operation successful", status_code: int = 200, meta: Optional[Dict] = None):
    payload = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        payload["meta"] = meta
    return jsonify(payload), status_code


def error_response(message: str, code: str = "BAD_REQUEST", status_code: int = 400, details: Optional[Any] = None):
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status_code

