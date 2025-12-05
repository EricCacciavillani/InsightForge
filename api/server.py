"""
FastAPI backend for Neura Phase Lab Electron app.
Provides REST API and WebSocket for real-time updates.
"""

import asyncio
import io
import json
import os
import re
import sys
import queue
import threading
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, field_validator
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import COMPONENTS_ROOT

app = FastAPI(title="Neura Phase Lab API")

# Progress queue for thread-safe communication from orchestrator
_progress_queue: Optional[queue.Queue] = None
_progress_start_time: Optional[datetime] = None

# Restrict CORS to localhost only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8742",
        "http://127.0.0.1:8742",
        "app://.",  # Electron
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


def mask_api_key(key: str | None) -> str:
    """Mask API key for safe display (e.g., sk-...xxxx)."""
    if not key or len(key) < 8:
        return ""
    return f"{key[:4]}...{key[-4:]}"

active_connections: List[WebSocket] = []


class RunRequest(BaseModel):
    components: List[str]


class SettingsUpdate(BaseModel):
    openai_key: Optional[str] = None
    gemini_key: Optional[str] = None
    tavily_key: Optional[str] = None
    # Email settings
    email_enabled: Optional[bool] = None
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_email: Optional[str] = None
    smtp_password: Optional[str] = None
    email_recipient: Optional[str] = None

    @field_validator("openai_key")
    @classmethod
    def validate_openai_key(cls, v: str | None) -> str | None:
        if v and not re.match(r"^sk-[a-zA-Z0-9_-]{20,}$", v):
            raise ValueError("Invalid OpenAI API key format")
        return v

    @field_validator("gemini_key")
    @classmethod
    def validate_gemini_key(cls, v: str | None) -> str | None:
        if v and len(v) < 10:
            raise ValueError("Invalid Gemini API key format")
        return v

    @field_validator("tavily_key")
    @classmethod
    def validate_tavily_key(cls, v: str | None) -> str | None:
        if v and not re.match(r"^tvly-[a-zA-Z0-9_-]{10,}$", v):
            raise ValueError("Invalid Tavily API key format")
        return v

    @field_validator("smtp_port")
    @classmethod
    def validate_smtp_port(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 65535):
            raise ValueError("SMTP port must be between 1 and 65535")
        return v

    @field_validator("smtp_email", "email_recipient")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v and not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address format")
        return v


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
        from backend.notifications import get_email_config, is_email_configured
        
        openai_key = os.environ.get("OPENAI_API_KEY")
        gemini_key = os.environ.get("GEMINI_API_KEY")
        tavily_key = os.environ.get("TAVILY_API_KEY")
        
        # Get email configuration
        email_config = get_email_config()
        
        return {
            "deep_research_enabled": DEEP_RESEARCH_ENABLED,
            "deep_research_queries": DEEP_RESEARCH_QUERIES_PER_ROUND,
            "parallel_enabled": PARALLEL_ENABLED,
            "checkpoint_enabled": CHECKPOINT_ENABLED,
            "model_routing": MODEL_ROUTING,
            "api_keys_set": {
                "openai": bool(openai_key),
                "gemini": bool(gemini_key),
                "tavily": bool(tavily_key),
            },
            "api_keys_masked": {
                "openai": mask_api_key(openai_key),
                "gemini": mask_api_key(gemini_key),
                "tavily": mask_api_key(tavily_key),
            },
            "email_settings": {
                "enabled": email_config["enabled"],
                "smtp_server": email_config["smtp_server"],
                "smtp_port": email_config["smtp_port"],
                "email": email_config["email"],
                "password_set": bool(email_config["password"]),
                "recipient": email_config["recipient"],
                "configured": is_email_configured(),
            },
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Config import error: {e}")


@app.post("/settings")
async def update_settings(settings: SettingsUpdate):
    """Update API keys and email settings. Values are validated and stored in environment."""
    updated_keys = []
    
    if settings.openai_key:
        os.environ["OPENAI_API_KEY"] = settings.openai_key
        updated_keys.append("openai")
    if settings.gemini_key:
        os.environ["GEMINI_API_KEY"] = settings.gemini_key
        updated_keys.append("gemini")
    if settings.tavily_key:
        os.environ["TAVILY_API_KEY"] = settings.tavily_key
        updated_keys.append("tavily")
    
    # Email settings
    if settings.email_enabled is not None:
        os.environ["NEURA_EMAIL_ENABLED"] = "true" if settings.email_enabled else "false"
        updated_keys.append("email_enabled")
    if settings.smtp_server:
        os.environ["NEURA_SMTP_SERVER"] = settings.smtp_server
        updated_keys.append("smtp_server")
    if settings.smtp_port is not None:
        os.environ["NEURA_SMTP_PORT"] = str(settings.smtp_port)
        updated_keys.append("smtp_port")
    if settings.smtp_email:
        os.environ["NEURA_SMTP_EMAIL"] = settings.smtp_email
        updated_keys.append("smtp_email")
    if settings.smtp_password:
        os.environ["NEURA_SMTP_PASSWORD"] = settings.smtp_password
        updated_keys.append("smtp_password")
    if settings.email_recipient:
        os.environ["NEURA_EMAIL_RECIPIENT"] = settings.email_recipient
        updated_keys.append("email_recipient")
    
    # Persist to .env file for next restart
    env_path = Path(__file__).parent.parent / ".env"
    env_lines = []
    if env_path.exists():
        env_lines = env_path.read_text().splitlines()
    
    def update_env_line(lines: list, key: str, value: str) -> list:
        found = False
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={value}"
                found = True
                break
        if not found:
            lines.append(f"{key}={value}")
        return lines
    
    if settings.openai_key:
        env_lines = update_env_line(env_lines, "OPENAI_API_KEY", settings.openai_key)
    if settings.gemini_key:
        env_lines = update_env_line(env_lines, "GEMINI_API_KEY", settings.gemini_key)
    if settings.tavily_key:
        env_lines = update_env_line(env_lines, "TAVILY_API_KEY", settings.tavily_key)
    
    # Email settings persistence
    if settings.email_enabled is not None:
        env_lines = update_env_line(env_lines, "NEURA_EMAIL_ENABLED", "true" if settings.email_enabled else "false")
    if settings.smtp_server:
        env_lines = update_env_line(env_lines, "NEURA_SMTP_SERVER", settings.smtp_server)
    if settings.smtp_port is not None:
        env_lines = update_env_line(env_lines, "NEURA_SMTP_PORT", str(settings.smtp_port))
    if settings.smtp_email:
        env_lines = update_env_line(env_lines, "NEURA_SMTP_EMAIL", settings.smtp_email)
    if settings.smtp_password:
        env_lines = update_env_line(env_lines, "NEURA_SMTP_PASSWORD", settings.smtp_password)
    if settings.email_recipient:
        env_lines = update_env_line(env_lines, "NEURA_EMAIL_RECIPIENT", settings.email_recipient)
    
    env_path.write_text("\n".join(env_lines) + "\n")
    
    return {"status": "updated", "keys_updated": updated_keys}


@app.post("/test-email")
async def test_email():
    """Send a test email to verify email configuration."""
    from backend.notifications import send_test_email, is_email_configured
    
    if not is_email_configured():
        raise HTTPException(
            status_code=400,
            detail="Email notifications not configured. Please configure SMTP settings first."
        )
    
    success = send_test_email()
    if success:
        return {"status": "sent", "message": "Test email sent successfully"}
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to send test email. Check your SMTP settings and credentials."
        )


@app.get("/runs")
async def list_runs():
    try:
        from backend.checkpoint import RunState
        
        runs = []
        if COMPONENTS_ROOT.exists():
            for component_dir in COMPONENTS_ROOT.iterdir():
                if component_dir.is_dir():
                    for run_dir in component_dir.iterdir():
                        if run_dir.is_dir():
                            decomp_file = run_dir / "decomposition.json"
                            if decomp_file.exists():
                                run_info = {
                                    "component": component_dir.name,
                                    "timestamp": run_dir.name,
                                    "path": str(run_dir),
                                }
                                
                                # Check run state for resume capability
                                run_state = RunState(run_dir)
                                state = run_state.load()
                                if state:
                                    run_info["status"] = state.get("status", "unknown")
                                    run_info["resumable"] = run_state.is_resumable()
                                    if state.get("error_message"):
                                        run_info["error_message"] = state.get("error_message")
                                    if state.get("current_node"):
                                        run_info["failed_at_node"] = state.get("current_node")
                                    run_info["resume_count"] = state.get("resume_count", 0)
                                else:
                                    run_info["status"] = "completed"
                                    run_info["resumable"] = False
                                
                                runs.append(run_info)
        runs.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"runs": runs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/runs/resumable")
async def list_resumable_runs():
    """List all runs that can be resumed."""
    try:
        from backend.checkpoint import find_resumable_runs
        
        resumable = find_resumable_runs(COMPONENTS_ROOT)
        return {"runs": resumable}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/runs/{component}/{timestamp}")
async def get_run_details(component: str, timestamp: str):
    try:
        from backend.checkpoint import RunState
        
        run_dir = COMPONENTS_ROOT / component / timestamp
        if not run_dir.exists():
            raise HTTPException(status_code=404, detail="Run not found")
        
        decomp_file = run_dir / "decomposition.json"
        decomposition = json.loads(decomp_file.read_text()) if decomp_file.exists() else None
        
        nodes = [json.loads(item.read_text()) for item in run_dir.rglob("node_result.json")]
        
        # Include run state info
        run_state = RunState(run_dir)
        state = run_state.load()
        
        return {
            "component": component,
            "timestamp": timestamp,
            "decomposition": decomposition,
            "nodes": nodes,
            "run_state": state,
            "resumable": run_state.is_resumable(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/runs/{component}/{timestamp}/export/zip")
async def export_run_zip(component: str, timestamp: str):
    """Export run results as a ZIP file containing all JSON and markdown files."""
    run_dir = COMPONENTS_ROOT / component / timestamp
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in run_dir.rglob("*"):
            if file_path.is_file() and file_path.suffix in (".json", ".md", ".txt"):
                arcname = file_path.relative_to(run_dir)
                zf.write(file_path, arcname)
    
    zip_buffer.seek(0)
    filename = f"{component}_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/runs/{component}/{timestamp}/export/markdown")
async def export_run_markdown(component: str, timestamp: str):
    """Export run results as a merged Markdown report."""
    run_dir = COMPONENTS_ROOT / component / timestamp
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Build markdown report
    lines = [
        f"# Research Run Report: {component}",
        f"",
        f"**Timestamp:** {timestamp}",
        f"",
        "---",
        "",
    ]
    
    # Add decomposition
    decomp_file = run_dir / "decomposition.json"
    if decomp_file.exists():
        decomp = json.loads(decomp_file.read_text())
        lines.append("## Decomposition")
        lines.append("")
        if isinstance(decomp, dict):
            if "nodes" in decomp:
                lines.append(f"**Total Nodes:** {len(decomp['nodes'])}")
                lines.append("")
                for i, node in enumerate(decomp["nodes"], 1):
                    node_name = node.get("name", f"Node {i}")
                    node_desc = node.get("description", "No description")
                    lines.append(f"### {i}. {node_name}")
                    lines.append(f"{node_desc}")
                    lines.append("")
            else:
                lines.append("```json")
                lines.append(json.dumps(decomp, indent=2))
                lines.append("```")
        lines.append("")
    
    # Add node results
    node_files = list(run_dir.rglob("node_result.json"))
    if node_files:
        lines.append("## Node Results")
        lines.append("")
        for node_file in sorted(node_files):
            node_data = json.loads(node_file.read_text())
            node_name = node_data.get("node_name", node_file.parent.name)
            lines.append(f"### {node_name}")
            lines.append("")
            
            # Extract key information from cycles
            cycles = node_data.get("cycles", [])
            if cycles:
                last_cycle = cycles[-1]
                
                # Final arbiter decision
                arbiter = last_cycle.get("final_arbiter", {})
                if arbiter:
                    judgement = arbiter.get("final_judgement", "")
                    if judgement:
                        lines.append("**Final Judgement:**")
                        lines.append(f"> {judgement[:500]}..." if len(judgement) > 500 else f"> {judgement}")
                        lines.append("")
                
                # Paper content if available
                paper = last_cycle.get("paper_v2") or last_cycle.get("paper_v1", {})
                if paper:
                    paper_content = paper.get("paper", "")
                    if paper_content:
                        lines.append("**Research Paper:**")
                        lines.append("")
                        # Truncate very long papers
                        if len(paper_content) > 3000:
                            lines.append(paper_content[:3000])
                            lines.append("...")
                            lines.append("*(truncated for brevity)*")
                        else:
                            lines.append(paper_content)
                        lines.append("")
            
            lines.append("---")
            lines.append("")
    
    # Add any markdown files found
    md_files = [f for f in run_dir.rglob("*.md") if f.is_file()]
    if md_files:
        lines.append("## Additional Documents")
        lines.append("")
        for md_file in md_files:
            lines.append(f"### {md_file.name}")
            lines.append("")
            content = md_file.read_text()
            if len(content) > 2000:
                lines.append(content[:2000])
                lines.append("...")
                lines.append("*(truncated)*")
            else:
                lines.append(content)
            lines.append("")
    
    markdown_content = "\n".join(lines)
    filename = f"{component}_{timestamp}_report.md"
    
    return StreamingResponse(
        io.BytesIO(markdown_content.encode("utf-8")),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/runs/{component}/{timestamp}/summary")
async def get_run_summary(component: str, timestamp: str):
    """Get a shareable summary of the run results."""
    run_dir = COMPONENTS_ROOT / component / timestamp
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Build summary
    summary_lines = [
        f"🔬 Research Run: {component}",
        f"📅 {timestamp}",
        "",
    ]
    
    # Get decomposition info
    decomp_file = run_dir / "decomposition.json"
    if decomp_file.exists():
        decomp = json.loads(decomp_file.read_text())
        if isinstance(decomp, dict) and "nodes" in decomp:
            summary_lines.append(f"📊 {len(decomp['nodes'])} research nodes analyzed")
    
    # Get key findings from node results
    node_files = list(run_dir.rglob("node_result.json"))
    if node_files:
        summary_lines.append(f"✅ {len(node_files)} nodes completed")
        summary_lines.append("")
        summary_lines.append("Key Findings:")
        
        for node_file in sorted(node_files)[:3]:  # Limit to first 3 nodes
            node_data = json.loads(node_file.read_text())
            node_name = node_data.get("node_name", "Unknown")
            cycles = node_data.get("cycles", [])
            if cycles:
                arbiter = cycles[-1].get("final_arbiter", {})
                judgement = arbiter.get("final_judgement", "")
                if judgement:
                    # Get first sentence or first 150 chars
                    first_sentence = judgement.split(".")[0][:150]
                    summary_lines.append(f"• {node_name}: {first_sentence}...")
        
        if len(node_files) > 3:
            summary_lines.append(f"  ...and {len(node_files) - 3} more nodes")
    
    summary_lines.append("")
    summary_lines.append("Generated by InsightForge Research Lab")
    
    return {"summary": "\n".join(summary_lines)}


class ResumeRequest(BaseModel):
    component: str
    timestamp: str


@app.post("/run")
async def start_run(request: RunRequest):
    if not request.components:
        raise HTTPException(status_code=400, detail="No components provided")
    asyncio.create_task(run_orchestrator(request.components))
    return {"status": "started", "components": request.components}


@app.post("/resume")
async def resume_run(request: ResumeRequest):
    """Resume a failed run from its checkpoint."""
    from backend.checkpoint import RunState
    
    run_dir = COMPONENTS_ROOT / request.component / request.timestamp
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
    run_state = RunState(run_dir)
    if not run_state.is_resumable():
        state = run_state.load()
        status = state.get("status") if state else "unknown"
        raise HTTPException(
            status_code=400,
            detail=f"Run cannot be resumed (status: {status})"
        )
    
    asyncio.create_task(run_orchestrator_resume(request.component, request.timestamp))
    return {
        "status": "resuming",
        "component": request.component,
        "timestamp": request.timestamp,
    }


async def send_email_async(email_func, *args, **kwargs) -> bool:
    """Send email asynchronously without blocking the run. Log but don't fail on errors."""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: email_func(*args, **kwargs))
        return result
    except Exception as e:
        print(f"[Email] Failed to send email (non-blocking): {e}")
        return False


async def run_orchestrator_resume(component: str, timestamp: str):
    """Resume a failed orchestrator run."""
    start_time = datetime.utcnow()
    
    try:
        await broadcast({
            "type": "run_resumed",
            "component": component,
            "timestamp": timestamp,
        })
        
        from backend.llm_clients import reset_usage_stats, get_usage_stats
        from backend.orchestrator import resume_component, run_system_integration
        from backend.notifications import send_run_complete_email, is_email_configured
        
        reset_usage_stats()
        email_enabled = is_email_configured()
        
        await broadcast({"type": "log", "message": f"[System] Resuming run: {component} ({timestamp})"})
        
        loop = asyncio.get_event_loop()
        node_results = await loop.run_in_executor(None, resume_component, component, timestamp)
        
        await broadcast({"type": "log", "message": "[System] Running system integration..."})
        await loop.run_in_executor(None, run_system_integration, node_results)
        
        stats = get_usage_stats()
        total_duration = (datetime.utcnow() - start_time).total_seconds()
        
        usage_stats = {
            "openai_tokens": stats.openai_input_tokens + stats.openai_output_tokens,
            "gemini_tokens": stats.gemini_input_tokens + stats.gemini_output_tokens,
            "tavily_searches": stats.tavily_searches,
            "estimated_cost": stats.estimated_cost_usd,
        }
        
        await broadcast({
            "type": "run_complete",
            "components": [component],
            "resumed": True,
            "usage": usage_stats,
        })
        
        if email_enabled:
            asyncio.create_task(send_email_async(
                send_run_complete_email,
                components=[component],
                status="success (resumed)",
                total_duration_seconds=total_duration,
                usage_stats=usage_stats,
            ))
            
    except Exception as e:
        total_duration = (datetime.utcnow() - start_time).total_seconds()
        error_message = str(e)
        
        await broadcast({
            "type": "run_error",
            "error": error_message,
            "resumable": True,  # Failed runs can be resumed again
        })
        
        try:
            from backend.notifications import send_run_complete_email, is_email_configured
            if is_email_configured():
                asyncio.create_task(send_email_async(
                    send_run_complete_email,
                    components=[component],
                    status="error (resume failed)",
                    total_duration_seconds=total_duration,
                    error_message=error_message,
                ))
        except Exception as email_err:
            print(f"[Email] Failed to send error notification: {email_err}")


def _progress_callback(progress: Dict[str, Any]) -> None:
    """Thread-safe callback to queue progress updates."""
    global _progress_queue
    if _progress_queue:
        _progress_queue.put(progress)


async def _process_progress_queue(start_time: datetime) -> None:
    """Process progress updates from the queue and broadcast them."""
    global _progress_queue
    while _progress_queue:
        try:
            progress = _progress_queue.get_nowait()
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            
            # Calculate overall progress percentage
            stage_idx = progress.get("stage_index", 0)
            total_stages = progress.get("total_stages", 13)
            cycle = progress.get("cycle", 1)
            total_cycles = progress.get("total_cycles", 3)
            current_node = progress.get("current_node", 1)
            total_nodes = progress.get("total_nodes", 1)
            
            # Progress = (completed_nodes + current_node_progress) / total_nodes
            # current_node_progress = (completed_cycles + current_cycle_progress) / total_cycles
            # current_cycle_progress = stage_idx / total_stages
            cycle_progress = stage_idx / total_stages
            node_progress = ((cycle - 1) + cycle_progress) / total_cycles
            overall_progress = ((current_node - 1) + node_progress) / total_nodes
            percent = min(99, int(overall_progress * 100))  # Cap at 99% until complete
            
            # Estimate time remaining
            eta_seconds = None
            if percent > 0 and elapsed > 10:
                eta_seconds = int((elapsed / overall_progress) * (1 - overall_progress))
            
            await broadcast({
                "type": "progress",
                "stage": progress.get("stage"),
                "node": progress.get("node"),
                "cycle": cycle,
                "total_cycles": total_cycles,
                "current_node": current_node,
                "total_nodes": total_nodes,
                "percent": percent,
                "elapsed_seconds": int(elapsed),
                "eta_seconds": eta_seconds,
            })
        except queue.Empty:
            break


async def run_orchestrator(components: List[str]):
    global _progress_queue, _progress_start_time
    start_time = datetime.utcnow()
    _progress_start_time = start_time
    _progress_queue = queue.Queue()
    
    try:
        await broadcast({"type": "run_started", "components": components})
        
        from backend.llm_clients import reset_usage_stats, get_usage_stats
        from backend.orchestrator import run_root_component, run_system_integration, set_progress_callback
        from backend.notifications import (
            send_component_complete_email,
            send_run_complete_email,
            is_email_configured,
        )
        
        reset_usage_stats()
        all_node_results = []
        email_enabled = is_email_configured()
        
        # Set up progress callback
        set_progress_callback(_progress_callback)
        
        for comp in components:
            comp_start_time = datetime.utcnow()
            await broadcast({"type": "log", "message": f"[System] Starting component: {comp}"})
            
            loop = asyncio.get_event_loop()
            
            # Run orchestrator in executor while processing progress updates
            future = loop.run_in_executor(None, run_root_component, comp)
            while not future.done():
                await _process_progress_queue(start_time)
                await asyncio.sleep(0.1)
            
            node_results = await future
            await _process_progress_queue(start_time)  # Process any remaining
            all_node_results.extend(node_results)
            
            # Calculate component duration
            comp_duration = (datetime.utcnow() - comp_start_time).total_seconds()
            comp_timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            
            # Get final judgement from last node's last cycle if available
            final_judgement = None
            if node_results:
                last_node = node_results[-1]
                cycles = last_node.get("cycles", [])
                if cycles:
                    final_judgement = cycles[-1].get("final_arbiter", {}).get("final_judgement")
            
            await broadcast({"type": "component_complete", "component": comp, "nodes": len(node_results)})
            
            # Send component complete email (non-blocking)
            if email_enabled:
                asyncio.create_task(send_email_async(
                    send_component_complete_email,
                    component=comp,
                    status="complete",
                    duration_seconds=comp_duration,
                    timestamp=comp_timestamp,
                    nodes_count=len(node_results),
                    final_judgement=final_judgement,
                ))
        
        await broadcast({"type": "log", "message": "[System] Running system integration..."})
        await asyncio.get_event_loop().run_in_executor(None, run_system_integration, all_node_results)
        
        stats = get_usage_stats()
        total_duration = (datetime.utcnow() - start_time).total_seconds()
        
        usage_stats = {
            "openai_tokens": stats.openai_input_tokens + stats.openai_output_tokens,
            "gemini_tokens": stats.gemini_input_tokens + stats.gemini_output_tokens,
            "tavily_searches": stats.tavily_searches,
            "estimated_cost": stats.estimated_cost_usd,
        }
        
        await broadcast({
            "type": "run_complete",
            "components": components,
            "usage": usage_stats,
        })
        
        # Send run complete email (non-blocking)
        if email_enabled:
            asyncio.create_task(send_email_async(
                send_run_complete_email,
                components=components,
                status="success",
                total_duration_seconds=total_duration,
                usage_stats=usage_stats,
            ))
            
    except Exception as e:
        total_duration = (datetime.utcnow() - start_time).total_seconds()
        error_message = str(e)
        
        # Check if this is an OrchestratorError with resume info
        from backend.orchestrator import OrchestratorError
        is_resumable = isinstance(e, OrchestratorError)
        
        await broadcast({
            "type": "run_error",
            "error": error_message,
            "resumable": is_resumable,
            "components": components,
        })
        
        # Send run error email (non-blocking)
        try:
            from backend.notifications import send_run_complete_email, is_email_configured
            if is_email_configured():
                status_msg = "error (checkpoint saved, resumable)" if is_resumable else "error"
                asyncio.create_task(send_email_async(
                    send_run_complete_email,
                    components=components,
                    status=status_msg,
                    total_duration_seconds=total_duration,
                    error_message=error_message,
                ))
        except Exception as email_err:
            print(f"[Email] Failed to send error notification: {email_err}")
    finally:
        # Clean up progress tracking
        from backend.orchestrator import set_progress_callback
        set_progress_callback(None)
        _progress_queue = None


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
