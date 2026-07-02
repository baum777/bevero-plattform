"""ROS-RUN (Rauschenberger OS Run Identifier) generator.

Rauschenberger-native adaptation of the Mavis MSPR scheme.
Mirrors the same logic and architecture, integrated with the existing
Rauschenberger OS audit trail (logs/audit-log.md) and evidence-contract.

Usage:
    from ros_run_id import ros_run
    identifier = ros_run(session_id="410041356513345", task="install os-health-auditor skill")
    # -> 'ROS-RUN-20260617-040507-7a3f9c'

Format: ROS-RUN-{YYYYMMDD}-{HHMMSS}-{6char_hash}

Rauschenberger-native improvement over the Mavis MSPR scheme:
the hash input includes microsecond + random-nonce precision so that
two calls within the same wall-clock second still produce distinct IDs,
honouring the SKILL.md non-negotiable "Always fresh per run. Never reuse."
The visible output format is unchanged (HHMMSS resolution).
"""
import hashlib
import datetime
import os


def ros_run(session_id: str, task: str, parent: str | None = None) -> str:
    """Generate a fresh ROS-RUN identifier for a single run context.

    Args:
        session_id: The agent session identifier.
        task: A short human-readable description of the task.
        parent: Optional parent ROS-RUN for follow-up runs.

    Returns:
        A string in the form 'ROS-RUN-YYYYMMDD-HHMMSS-xxxxxx'.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    ts = now.strftime("%Y%m%d-%H%M%S")
    nonce = f"{now.strftime('%f')}-{os.urandom(4).hex()}"
    raw = f"{session_id}|{task}|{ts}|{parent or ''}|{nonce}"
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:6]
    date, time = ts.split("-")
    return f"ROS-RUN-{date}-{time}-{h}"


if __name__ == "__main__":
    import sys
    sid = sys.argv[1] if len(sys.argv) > 1 else "manual"
    task = sys.argv[2] if len(sys.argv) > 2 else "unspecified"
    print(ros_run(sid, task))
