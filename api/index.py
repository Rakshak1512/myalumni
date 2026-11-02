import sys
import os

# Resolve backend directory across local and Vercel serverless execution contexts
current_dir = os.path.dirname(os.path.abspath(__file__))
candidate_paths = [
    os.path.abspath(os.path.join(current_dir, '..', 'backend')),
    os.path.abspath(os.path.join(current_dir, 'backend')),
    os.path.abspath(current_dir)
]

for p in candidate_paths:
    if os.path.isdir(p) and p not in sys.path:
        sys.path.insert(0, p)

from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run()

