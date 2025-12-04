#!/usr/bin/env python
"""
Pre-flight check script for Deep Research Lab.
Run this to verify your environment is ready.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"⚠️  Python {version.major}.{version.minor} (recommend 3.11+)")
        return True  # Still works, just warn

def check_api_keys():
    keys = {
        "OPENAI_API_KEY": "Required for GPT-5.1",
        "GEMINI_API_KEY": "Required for Gemini",
        "TAVILY_API_KEY": "Optional for deep research",
    }
    all_required_set = True
    for key, desc in keys.items():
        if os.environ.get(key):
            masked = os.environ[key][:8] + "..." if len(os.environ[key]) > 8 else "***"
            print(f"✅ {key}: {masked} ({desc})")
        else:
            status = "❌" if "Required" in desc else "⚠️ "
            print(f"{status} {key}: NOT SET ({desc})")
            if "Required" in desc:
                all_required_set = False
    return all_required_set

def check_python_deps():
    required = ["openai", "google.genai", "fastapi", "uvicorn", "pydantic"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg.replace(".", "_") if "." in pkg else pkg)
            print(f"✅ {pkg}")
        except ImportError:
            print(f"❌ {pkg} - not installed")
            missing.append(pkg)
    return len(missing) == 0

def check_node_deps():
    frontend_path = Path(__file__).parent.parent / "frontend"
    node_modules = frontend_path / "node_modules"
    if node_modules.exists():
        print(f"✅ Frontend node_modules exists")
        return True
    else:
        print(f"❌ Frontend node_modules missing - run: cd frontend && npm install")
        return False

def main():
    print("\n🔬 Deep Research Lab - Pre-flight Check\n")
    print("=" * 50)
    
    print("\n📦 Python Environment:")
    py_ok = check_python_version()
    
    print("\n🔑 API Keys:")
    keys_ok = check_api_keys()
    
    print("\n📚 Python Dependencies:")
    deps_ok = check_python_deps()
    
    print("\n🌐 Frontend Dependencies:")
    node_ok = check_node_deps()
    
    print("\n" + "=" * 50)
    
    if keys_ok and deps_ok and node_ok:
        print("\n✅ All checks passed! Ready to run.")
        print("\nTo start:")
        print("  1. python -m api.server")
        print("  2. cd frontend && npm run dev")
        print("  3. Open http://localhost:5173")
    else:
        print("\n⚠️  Some checks failed. Fix the issues above.")
        if not keys_ok:
            print("\nSet API keys:")
            print("  Windows: set OPENAI_API_KEY=sk-...")
            print("  Linux/Mac: export OPENAI_API_KEY=sk-...")
        if not deps_ok:
            print("\nInstall Python deps: pip install -r requirements.txt")
        if not node_ok:
            print("\nInstall Node deps: cd frontend && npm install")
    
    print()

if __name__ == "__main__":
    main()
