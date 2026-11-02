import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env if present
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Config:
    APP_ENV = os.getenv('APP_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', '0') in ('1', 'true', 'True')
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'myalumni_default_secret_key_change_in_production')

    BACKEND_HOST = os.getenv('BACKEND_HOST', '127.0.0.1')
    BACKEND_PORT = int(os.getenv('BACKEND_PORT', '5000'))

    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:5000')

    # Allowed CORS Origins
    _raw_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,https://*.trycloudflare.com')
    ALLOWED_ORIGINS = []
    import re
    for _orig in _raw_origins.split(','):
        _orig = _orig.strip()
        if not _orig:
            continue
        if '*' in _orig:
            _pat = re.escape(_orig).replace(r'\*', '.*')
            ALLOWED_ORIGINS.append(re.compile(f"^{_pat}$"))
        else:
            ALLOWED_ORIGINS.append(_orig)
    # Always allow Cloudflare tunnel and Vercel domains by default
    ALLOWED_ORIGINS.append(re.compile(r"^https://.*\.trycloudflare\.com$"))
    ALLOWED_ORIGINS.append(re.compile(r"^https://.*\.vercel\.app$"))
    if FRONTEND_URL and FRONTEND_URL not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(FRONTEND_URL)

    # Database Selection ('sqlite' for local development, 'supabase' / 'postgres' for cloud production)
    DB_ENGINE = os.getenv('DB_ENGINE', 'sqlite').lower()
    SQLITE_DB_PATH = os.getenv('SQLITE_DB_PATH', '')
    DATABASE_URL = os.getenv('DATABASE_URL', '')

    # SMTP Settings & 6-Digit OTP Verification
    SMTP_HOST = os.getenv('SMTP_HOST', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', '')
    SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'MyAlumni')
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() in ('true', '1', 'yes')

    OTP_LENGTH = int(os.getenv('OTP_LENGTH', '6'))
    OTP_EXPIRY_MINUTES = int(os.getenv('OTP_EXPIRY_MINUTES', '5'))
    OTP_MAX_ATTEMPTS = int(os.getenv('OTP_MAX_ATTEMPTS', '5'))

    # Upload & Seeding
    UPLOAD_MAX_SIZE_MB = int(os.getenv('UPLOAD_MAX_SIZE_MB', '10'))
    DEMO_SEEDING_ENABLED = os.getenv('DEMO_SEEDING_ENABLED', 'false').lower() in ('true', '1', 'yes')
    DEMO_PASSWORD = os.getenv('DEMO_PASSWORD', 'Demo@MyAlumni2026!')

    # Universal Storage Driver Configuration
    # Supported providers: 'local' (offline filesystem), 'supabase' (cloud object storage)
    STORAGE_PROVIDER = os.getenv('STORAGE_PROVIDER', 'local').lower()
    STORAGE_ROOT = os.getenv('STORAGE_ROOT', '')

    # Supabase Cloud Object Storage (Used when STORAGE_PROVIDER=supabase)
    SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')
    SUPABASE_PUBLIC_BUCKET = os.getenv('SUPABASE_PUBLIC_BUCKET', 'myalumni-public')
    SUPABASE_PRIVATE_BUCKET = os.getenv('SUPABASE_PRIVATE_BUCKET', 'myalumni-private')

    @classmethod
    def is_production(cls):
        return cls.APP_ENV.lower() == 'production'

