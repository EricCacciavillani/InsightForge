"""
Email notification service for Neura Phase Lab.

Sends email notifications when components complete and when full runs finish.
Uses Python's built-in smtplib + email modules (no extra dependencies).
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, Dict, Any, List


# Environment variable names for email configuration
EMAIL_ENABLED_ENV = "NEURA_EMAIL_ENABLED"
SMTP_SERVER_ENV = "NEURA_SMTP_SERVER"
SMTP_PORT_ENV = "NEURA_SMTP_PORT"
SMTP_EMAIL_ENV = "NEURA_SMTP_EMAIL"
SMTP_PASSWORD_ENV = "NEURA_SMTP_PASSWORD"
EMAIL_RECIPIENT_ENV = "NEURA_EMAIL_RECIPIENT"


def get_email_config() -> Dict[str, Any]:
    """Get email configuration from environment variables."""
    return {
        "enabled": os.environ.get(EMAIL_ENABLED_ENV, "false").lower() == "true",
        "smtp_server": os.environ.get(SMTP_SERVER_ENV, "smtp.gmail.com"),
        "smtp_port": int(os.environ.get(SMTP_PORT_ENV, "587")),
        "email": os.environ.get(SMTP_EMAIL_ENV, ""),
        "password": os.environ.get(SMTP_PASSWORD_ENV, ""),
        "recipient": os.environ.get(EMAIL_RECIPIENT_ENV, ""),
    }


def is_email_configured() -> bool:
    """Check if email notifications are properly configured."""
    config = get_email_config()
    return (
        config["enabled"]
        and bool(config["email"])
        and bool(config["password"])
        and bool(config["recipient"])
    )


def _create_html_template(title: str, content: str, footer: str = "") -> str:
    """Create a nicely formatted HTML email template."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            background: #f9fafb;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }}
        .status-success {{
            color: #059669;
            font-weight: bold;
        }}
        .status-error {{
            color: #dc2626;
            font-weight: bold;
        }}
        .info-box {{
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }}
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }}
        .info-row:last-child {{
            border-bottom: none;
        }}
        .label {{
            color: #6b7280;
            font-size: 14px;
        }}
        .value {{
            font-weight: 500;
            color: #111827;
        }}
        .footer {{
            text-align: center;
            padding: 15px;
            color: #9ca3af;
            font-size: 12px;
        }}
        .cost {{
            font-size: 18px;
            color: #059669;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 Neura Phase Lab</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">{title}</p>
    </div>
    <div class="content">
        {content}
    </div>
    <div class="footer">
        {footer if footer else f"Sent at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"}
    </div>
</body>
</html>
"""


def send_email(subject: str, html_content: str, plain_content: Optional[str] = None) -> bool:
    """
    Send an email using SMTP.
    
    Args:
        subject: Email subject line
        html_content: HTML formatted email body
        plain_content: Plain text fallback (optional)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not is_email_configured():
        print("[Email] Email notifications not configured, skipping.")
        return False
    
    config = get_email_config()
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = config["email"]
        msg["To"] = config["recipient"]
        
        # Add plain text version (fallback)
        if plain_content:
            msg.attach(MIMEText(plain_content, "plain"))
        
        # Add HTML version
        msg.attach(MIMEText(html_content, "html"))
        
        # Connect and send
        with smtplib.SMTP(config["smtp_server"], config["smtp_port"]) as server:
            server.starttls()
            server.login(config["email"], config["password"])
            server.sendmail(config["email"], config["recipient"], msg.as_string())
        
        print(f"[Email] Sent: {subject}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"[Email] Authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[Email] SMTP error: {e}")
        return False
    except Exception as e:
        print(f"[Email] Failed to send email: {e}")
        return False


def send_component_complete_email(
    component: str,
    status: str,
    duration_seconds: float,
    timestamp: str,
    nodes_count: int = 0,
    final_judgement: Optional[str] = None,
) -> bool:
    """
    Send email notification when a component completes.
    
    Args:
        component: Name of the component that completed
        status: Status of completion (e.g., "success", "error")
        duration_seconds: How long the component took to process
        timestamp: When the component completed
        nodes_count: Number of nodes processed
        final_judgement: Final arbiter judgement if available
    
    Returns:
        True if email sent successfully, False otherwise
    """
    is_success = status.lower() in ("success", "complete", "completed")
    status_class = "status-success" if is_success else "status-error"
    status_emoji = "✅" if is_success else "❌"
    
    # Format duration
    minutes = int(duration_seconds // 60)
    seconds = int(duration_seconds % 60)
    duration_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
    
    content = f"""
    <div class="info-box">
        <div class="info-row">
            <span class="label">Component</span>
            <span class="value">{component}</span>
        </div>
        <div class="info-row">
            <span class="label">Status</span>
            <span class="value {status_class}">{status_emoji} {status.title()}</span>
        </div>
        <div class="info-row">
            <span class="label">Duration</span>
            <span class="value">{duration_str}</span>
        </div>
        <div class="info-row">
            <span class="label">Nodes Processed</span>
            <span class="value">{nodes_count}</span>
        </div>
        <div class="info-row">
            <span class="label">Timestamp</span>
            <span class="value">{timestamp}</span>
        </div>
        {f'<div class="info-row"><span class="label">Final Judgement</span><span class="value">{final_judgement}</span></div>' if final_judgement else ''}
    </div>
    """
    
    html = _create_html_template(f"Component Complete: {component}", content)
    plain = f"Component: {component}\nStatus: {status}\nDuration: {duration_str}\nNodes: {nodes_count}\nTimestamp: {timestamp}"
    
    return send_email(f"[Neura Lab] {status_emoji} {component} - {status.title()}", html, plain)


def send_run_complete_email(
    components: List[str],
    status: str,
    total_duration_seconds: float,
    usage_stats: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> bool:
    """
    Send summary email when a full run completes.
    
    Args:
        components: List of components that were processed
        status: Overall status ("success" or "error")
        total_duration_seconds: Total run duration
        usage_stats: Token usage and cost statistics
        error_message: Error message if run failed
    
    Returns:
        True if email sent successfully, False otherwise
    """
    is_success = status.lower() in ("success", "complete", "completed")
    status_class = "status-success" if is_success else "status-error"
    status_emoji = "✅" if is_success else "❌"
    
    # Format duration
    hours = int(total_duration_seconds // 3600)
    minutes = int((total_duration_seconds % 3600) // 60)
    seconds = int(total_duration_seconds % 60)
    if hours > 0:
        duration_str = f"{hours}h {minutes}m {seconds}s"
    elif minutes > 0:
        duration_str = f"{minutes}m {seconds}s"
    else:
        duration_str = f"{seconds}s"
    
    # Build components list
    components_html = "".join([f"<li>{comp}</li>" for comp in components])
    
    # Build usage stats section
    usage_html = ""
    if usage_stats:
        cost = usage_stats.get("estimated_cost", usage_stats.get("estimated_cost_usd", 0))
        openai_tokens = usage_stats.get("openai_tokens", 0)
        gemini_tokens = usage_stats.get("gemini_tokens", 0)
        tavily_searches = usage_stats.get("tavily_searches", 0)
        
        usage_html = f"""
        <div class="info-box">
            <h3 style="margin-top: 0; color: #374151;">💰 Cost Estimate</h3>
            <div style="text-align: center; padding: 10px;">
                <span class="cost">${cost:.4f}</span>
            </div>
            <div class="info-row">
                <span class="label">OpenAI Tokens</span>
                <span class="value">{openai_tokens:,}</span>
            </div>
            <div class="info-row">
                <span class="label">Gemini Tokens</span>
                <span class="value">{gemini_tokens:,}</span>
            </div>
            <div class="info-row">
                <span class="label">Tavily Searches</span>
                <span class="value">{tavily_searches}</span>
            </div>
        </div>
        """
    
    # Build error section if applicable
    error_html = ""
    if error_message:
        error_html = f"""
        <div class="info-box" style="border-color: #fecaca; background: #fef2f2;">
            <h3 style="margin-top: 0; color: #dc2626;">⚠️ Error Details</h3>
            <p style="color: #7f1d1d; font-family: monospace; font-size: 13px;">{error_message}</p>
        </div>
        """
    
    content = f"""
    <div class="info-box">
        <div class="info-row">
            <span class="label">Status</span>
            <span class="value {status_class}">{status_emoji} {status.title()}</span>
        </div>
        <div class="info-row">
            <span class="label">Total Duration</span>
            <span class="value">{duration_str}</span>
        </div>
        <div class="info-row">
            <span class="label">Components</span>
            <span class="value">{len(components)}</span>
        </div>
    </div>
    
    <div class="info-box">
        <h3 style="margin-top: 0; color: #374151;">📦 Components Processed</h3>
        <ul style="margin: 0; padding-left: 20px;">
            {components_html}
        </ul>
    </div>
    
    {usage_html}
    {error_html}
    """
    
    title = "Run Complete" if is_success else "Run Failed"
    html = _create_html_template(title, content)
    
    plain_lines = [
        f"Status: {status}",
        f"Duration: {duration_str}",
        f"Components: {', '.join(components)}",
    ]
    if usage_stats:
        plain_lines.append(f"Estimated Cost: ${usage_stats.get('estimated_cost', usage_stats.get('estimated_cost_usd', 0)):.4f}")
    if error_message:
        plain_lines.append(f"Error: {error_message}")
    
    return send_email(
        f"[Neura Lab] {status_emoji} Run {status.title()} - {len(components)} component(s)",
        html,
        "\n".join(plain_lines),
    )


def send_test_email() -> bool:
    """
    Send a test email to verify configuration.
    
    Returns:
        True if email sent successfully, False otherwise
    """
    content = """
    <div class="info-box">
        <p style="text-align: center; font-size: 16px;">
            🎉 Your email notifications are configured correctly!
        </p>
        <p style="text-align: center; color: #6b7280;">
            You will receive notifications when components complete and when runs finish.
        </p>
    </div>
    """
    
    html = _create_html_template("Test Notification", content)
    plain = "Your email notifications are configured correctly! You will receive notifications when components complete and when runs finish."
    
    return send_email("[Neura Lab] ✅ Test Email - Configuration Verified", html, plain)
