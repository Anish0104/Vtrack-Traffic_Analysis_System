import sys
import os

# Add the root dir so `from backend.app import app` resolves to backend/app.py,
# and add backend dir so backend/app.py can do `from src.xxx import ...`
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
backend_dir = os.path.join(root_dir, 'backend')
for d in [root_dir, backend_dir]:
    if d not in sys.path:
        sys.path.insert(0, d)

from backend.app import app
