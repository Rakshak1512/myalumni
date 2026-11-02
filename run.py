import sys
import os

# Ensure backend directory is in sys.path so 'app' package resolves cleanly
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.config import Config

# Primary Flask WSGI application instance for Vercel and local development
app = create_app()

if __name__ == '__main__':
    print("==================================================")
    print("  MyAlumni 2.0 Backend Starting (Root Entrypoint)")
    print(f"  Host: {Config.BACKEND_HOST}:{Config.BACKEND_PORT}")
    print(f"  Frontend URL: {Config.FRONTEND_URL}")
    print(f"  API Base URL: {Config.BACKEND_URL}/api/v1")
    print("==================================================")
    app.run(
        host=Config.BACKEND_HOST,
        port=Config.BACKEND_PORT,
        debug=Config.DEBUG
    )

