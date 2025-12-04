"""
FastAPI backend for Neura Phase Lab Electron app.
Provides REST API and WebSocket for real-time updates.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import COMPONENTS_ROOT

app = FastAPI(title="Neura Phase Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: List[WebSocket] = []


class RunRequest(BaseModel):
    components: List[str]


class SettingsUpdate(BaseModel):
    openai_key: Optional[str] = None
    gemini_key: Optional[str] = None
    tavily_key: Optional[str] = None


async def broadcast(message: Dict[str, Any]):
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            pass


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/config")
async def get_config():
    try:
        from backend.config import (
            DEEP_RESEARCH_ENABLED, DEEP_RESEARCH_QUERIES_PER_ROUND,
            PARALLEL_ENABLED, CHECKPOINT_ENABLED, MODEL_ROUTING,
        )
        return {
            "deep_research_enabled": DEEP_RESEARCH_ENABLED,
            "deep_research_queries": DEEP_RESEARCH_QUERIES_PER_ROUND,
            "parallel_enabled": PARALLEL_ENABLED,
            "checkpoint_enabled": CHECKPOINT_ENABLED,
            "model_routing": MODEL_ROUTING,
            "api_keys_set": {
                "openai": bool(os.environ.get("OPENAI_API_KEY")),
                "gemini": bool(os.environ.get("GEMINI_API_KEY")),
                "tavily": bool(os.environ.get("TAVILY_API_KEY")),
            },
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Config import error: {e}")


@app.post("/settings")
async def update_settings(settings: SettingsUpdate):
    if settings.openai_key:
        os.environ["OPENAI_API_KEY"] = settings.openai_key
    if settings.gemini_key:
        os.environ["GEMINI_API_KEY"] = settings.gemini_key
    if settings.tavily_key:
        os.environ["TAVILY_API_KEY"] = settings.tavily_key
    return {"status": "updated"}


@app.get("/runs")
async def list_runs():
    try:
        runs = []
        if COMPONENTS_ROOT.exists():
            for component_dir in COMPONENTS_ROOT.iterdir():
                if component_dir.is_dir():
                    for run_dir in component_dir.iterdir():
                        if run_dir.is_dir():
                            decomp_file = run_dir / "decomposition.json"
                            if decomp_file.exists():
                                runs.append({
                                    "component": component_dir.name,
                                    "timestamp": run_dir.name,
                                    "path": str(run_dir),
                                })
        runs.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"runs": runs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/runs/{component}/{timestamp}")
async def get_run_details(component: str, timestamp: str):
    try:
        run_dir = COMPONENTS_ROOT / component / timestamp
        if not run_dir.exists():
            raise HTTPException(status_code=404, detail="Run not found")
        
        decomp_file = run_dir / "decomposition.json"
        decomposition = json.loads(decomp_file.read_text()) if decomp_file.exists() else None
        
        nodes = [json.loads(item.read_text()) for item in run_dir.rglob("node_result.json")]
        
        return {"component": component, "timestamp": timestamp, "decomposition": decomposition, "nodes": nodes}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/run")
async def start_run(request: RunRequest):
    if not request.components:
        raise HTTPException(status_code=400, detail="No components provided")
    asyncio.create_task(run_orchestrator(request.components))
    return {"status": "started", "components": request.components}


async def run_orchestrator(components: List[str]):
    try:
        await broadcast({"type": "run_started", "components": components})
        
        from backend.llm_clients import reset_usage_stats, get_usage_stats
        from backend.orchestrator import run_root_component, run_system_integration
        
        reset_usage_stats()
        all_node_results = []
        
        for comp in components:
            await broadcast({"type": "log", "message": f"[System] Starting component: {comp}"})
            loop = asyncio.get_event_loop()
            node_results = await loop.run_in_executor(None, run_root_component, comp)
            all_node_results.extend(node_results)
            await broadcast({"type": "component_complete", "component": comp, "nodes": len(node_results)})
        
        await broadcast({"type": "log", "message": "[System] Running system integration..."})
        await asyncio.get_event_loop().run_in_executor(None, run_system_integration, all_node_results)
        
        stats = get_usage_stats()
        await broadcast({
            "type": "run_complete",
            "components": components,
            "usage": {
                "openai_tokens": stats.openai_input_tokens + stats.openai_output_tokens,
                "gemini_tokens": stats.gemini_input_tokens + stats.gemini_output_tokens,
                "tavily_searches": stats.tavily_searches,
                "estimated_cost": stats.estimated_cost_usd,
            },
        })
    except Exception as e:
        await broadcast({"type": "run_error", "error": str(e)})


@app.get("/usage")
async def get_usage():
    try:
        from backend.llm_clients import get_usage_stats
        stats = get_usage_stats()
        return {
            "openai_input_tokens": stats.openai_input_tokens,
            "openai_output_tokens": stats.openai_output_tokens,
            "gemini_input_tokens": stats.gemini_input_tokens,
            "gemini_output_tokens": stats.gemini_output_tokens,
            "tavily_searches": stats.tavily_searches,
            "estimated_cost_usd": stats.estimated_cost_usd,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8742, log_level="info")
