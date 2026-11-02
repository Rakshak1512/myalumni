from app import create_app
from app.config import Config

app = create_app()

if __name__ == '__main__':
    print(f"==================================================")
    print(f"  MyAlumni 2.0 Backend API Starting")
    print(f"  Host: {Config.BACKEND_HOST}:{Config.BACKEND_PORT}")
    print(f"  Frontend URL: {Config.FRONTEND_URL}")
    print(f"  API Base URL: {Config.BACKEND_URL}/api/v1")
    print(f"==================================================")
    app.run(
        host=Config.BACKEND_HOST,
        port=Config.BACKEND_PORT,
        debug=Config.DEBUG
    )

