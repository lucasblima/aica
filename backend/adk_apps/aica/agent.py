"""
AICA ADK Web UI Entry Point

This module configures the root_agent for use with `adk web` command.
In development mode (ADK_DEV_MODE=true), a fallback user_id is available
in the supabase_tools module for when session state is not populated.

Usage:
  cd backend && adk web adk_apps.aica

Dev Mode Setup:
  1. Create .env.local with ADK_DEV_MODE=true and DEV_USER_ID=<uuid>
  2. Get a valid user UUID from Supabase: auth.users table

Alternative (Manual):
  In ADK Web UI, click the three dots menu -> "Update state"
  Then paste: {"user_id": "<your-uuid>"}
"""

import sys
import os
from pathlib import Path

# Add parent backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))


def _load_env_file(env_path: Path) -> None:
    """Load environment variables from a file."""
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    # Use setdefault so .env.local can override .env
                    if key.strip() not in os.environ:
                        os.environ[key.strip()] = value.strip()


# Load .env first (base config)
_load_env_file(backend_dir / ".env")

# Load .env.local second (overrides for dev, not committed to git)
# Re-load with override capability
env_local = backend_dir / ".env.local"
if env_local.exists():
    with open(env_local) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()  # Override

# Check if we're in ADK dev mode
ADK_DEV_MODE = os.getenv("ADK_DEV_MODE", "false").lower() == "true"
DEV_USER_ID = os.getenv("DEV_USER_ID", "")

# Print dev mode status
if ADK_DEV_MODE:
    print("\n" + "=" * 60)
    print("[ADK Dev Mode] Development authentication enabled")
    if DEV_USER_ID:
        print(f"[ADK Dev Mode] Fallback user_id: {DEV_USER_ID[:8]}...")
    else:
        print("WARNING: DEV_USER_ID is not set!")
        print("Tools will fail unless you set state manually in the UI.")
        print("\nTo fix, add to backend/.env.local:")
        print("  DEV_USER_ID=<your-uuid-from-supabase-auth-users>")
        print("\nOr use ADK Web UI: Click '...' -> 'Update state'")
        print('  Then paste: {"user_id": "<your-uuid>"}')
    print("=" * 60 + "\n")

# Import and export the root_agent
from agents.agent import root_agent
