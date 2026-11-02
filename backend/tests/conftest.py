import pytest
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.config import Config
from app.auth.jwt_utils import generate_auth_token
from app.db import get_db


class TestConfig(Config):
    APP_ENV = 'testing'
    DEBUG = False
    TESTING = True
    SQLITE_DB_PATH = ':memory:'
    ALLOWED_ORIGINS = ['http://localhost:5173']
    DEMO_SEEDING_ENABLED = True


@pytest.fixture
def app():
    # Use in-memory SQLite database for tests
    get_db(':memory:')
    app = create_app(TestConfig)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers():
    def _headers(role="student", uid="test_user_uid"):
        token = generate_auth_token(uid, f"{role}@test.com", role)
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    return _headers
