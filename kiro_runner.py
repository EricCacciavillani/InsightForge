#!/usr/bin/env python3
"""
Kiro Task Runner - Automates execution of Kiro spec tasks

Usage:
    py -3 kiro_runner.py list                           # List all specs and tasks
    py -3 kiro_runner.py list <spec_name>               # List tasks for a specific spec
    py -3 kiro_runner.py run <spec_name>                # Run all incomplete tasks sequentially
    py -3 kiro_runner.py run <spec_name> -t 9.7         # Run a single task by number
    py -3 kiro_runner.py run <spec_name> --parallel 3   # Run 3 tasks in parallel with worktrees

Examples:
    py -3 kiro_runner.py list connect-frontend-backend
    py -3 kiro_runner.py run connect-frontend-backend -t 8.2
    py -3 kiro_runner.py run connect-frontend-backend --parallel 3
"""

import os
import re
import subprocess
import argparse
import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
import time


@dataclass
class Task:
    number: str           # e.g., "9.7"
    title: str            # e.g., "Add CI workflow"
    status: str           # "pending", "in_progress", "completed"
    description: str      # Full task description
    files: List[str]      # Files mentioned in task
    verify: Optional[str] # Verification command/steps


@dataclass
class Spec:
    name: str             # e.g., "connect-frontend-backend"
    path: Path            # Path to spec folder
    tasks: List[Task]


@dataclass
class KiroInstance:
    """Represents a running Kiro CLI instance."""
    id: str                    # Unique instance ID
    task: Task                 # Task being executed
    spec: Spec                 # Parent spec
    process: subprocess.Popen  # Process handle
    working_dir: Path          # Working directory
    branch: Optional[str]      # Git branch (if using worktree)
    worktree_path: Optional[Path]  # Worktree path (if using worktree)
    started_at: float          # Unix timestamp


# Windows-compatible status icons
ICONS = {
    'completed': '[x]',
    'in_progress': '[-]',
    'pending': '[ ]',
    'done': '[DONE]',
    'working': '[WORK]',
    'wait': '[WAIT]',
    'pause': '[PAUSE]',
    'check': '[OK]',
}


class KiroRunner:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.specs_dir = project_root / ".kiro" / "specs"
        self.kiro_cmd = "kiro"  # Assumes kiro is in PATH

    def parse_tasks_md(self, tasks_file: Path) -> List[Task]:
        """Parse a tasks.md file and extract all tasks."""
        tasks = []
        content = tasks_file.read_text(encoding='utf-8')

        # Pattern to match task lines like:
        # - [x] **Task 9.7**: Add CI workflow (~30 min)
        # - [ ] **Task 9.7**: Add CI workflow (~30 min)
        # - [-] **Task 9.7**: Add CI workflow (~30 min)
        task_pattern = r'- \[([x\- ])\] \*\*Task ([0-9.]+)\*\*: (.+?)(?:\s*\(~[^)]+\))?$'

        lines = content.split('\n')
        current_task = None
        task_description_lines = []

        for i, line in enumerate(lines):
            match = re.match(task_pattern, line)
            if match:
                # Save previous task if exists
                if current_task:
                    current_task.description = '\n'.join(task_description_lines).strip()
                    tasks.append(current_task)

                status_char = match.group(1)
                if status_char == 'x':
                    status = 'completed'
                elif status_char == '-':
                    status = 'in_progress'
                else:
                    status = 'pending'

                current_task = Task(
                    number=match.group(2),
                    title=match.group(3).strip(),
                    status=status,
                    description='',
                    files=[],
                    verify=None
                )
                task_description_lines = []
            elif current_task:
                task_description_lines.append(line)

                # Extract file references
                file_match = re.search(r'File[s]?:\s*`([^`]+)`', line)
                if file_match:
                    files = file_match.group(1).split('`, `')
                    current_task.files.extend(files)

                # Extract verify steps
                verify_match = re.search(r'\*\*Verify:\*\*\s*(.+)', line)
                if verify_match:
                    current_task.verify = verify_match.group(1).strip()

        # Don't forget last task
        if current_task:
            current_task.description = '\n'.join(task_description_lines).strip()
            tasks.append(current_task)

        return tasks

    def load_specs(self) -> List[Spec]:
        """Load all specs from .kiro/specs directory."""
        specs = []

        if not self.specs_dir.exists():
            print(f"No specs directory found at {self.specs_dir}")
            return specs

        for spec_dir in self.specs_dir.iterdir():
            if spec_dir.is_dir():
                tasks_file = spec_dir / "tasks.md"
                if tasks_file.exists():
                    tasks = self.parse_tasks_md(tasks_file)
                    specs.append(Spec(
                        name=spec_dir.name,
                        path=spec_dir,
                        tasks=tasks
                    ))

        return specs

    def get_spec(self, name: str) -> Optional[Spec]:
        """Get a specific spec by name."""
        specs = self.load_specs()
        for spec in specs:
            if spec.name == name:
                return spec
        return None

    def list_specs(self, spec_name: Optional[str] = None):
        """List all specs or tasks in a specific spec."""
        specs = self.load_specs()

        if spec_name:
            spec = next((s for s in specs if s.name == spec_name), None)
            if not spec:
                print(f"Spec '{spec_name}' not found")
                return
            self._print_spec_details(spec)
        else:
            print(f"\n{'='*60}")
            print(f"KIRO SPECS ({len(specs)} found)")
            print(f"{'='*60}\n")

            for spec in sorted(specs, key=lambda s: s.name):
                pending = len([t for t in spec.tasks if t.status == 'pending'])
                in_progress = len([t for t in spec.tasks if t.status == 'in_progress'])
                completed = len([t for t in spec.tasks if t.status == 'completed'])
                total = len(spec.tasks)

                status_icon = ICONS['completed'] if pending == 0 and in_progress == 0 else ICONS['in_progress'] if in_progress > 0 else ICONS['pending']
                print(f"{status_icon} {spec.name}")
                print(f"   Tasks: {completed}/{total} completed, {in_progress} in progress, {pending} pending")
                print()

    def _print_spec_details(self, spec: Spec):
        """Print detailed task list for a spec."""
        print(f"\n{'='*60}")
        print(f"SPEC: {spec.name}")
        print(f"{'='*60}\n")

        for task in spec.tasks:
            if task.status == 'completed':
                icon = ICONS['completed']
            elif task.status == 'in_progress':
                icon = ICONS['in_progress']
            else:
                icon = ICONS['pending']

            print(f"{icon} Task {task.number}: {task.title}")
            if task.files:
                print(f"   Files: {', '.join(task.files)}")
            if task.verify:
                print(f"   Verify: {task.verify}")
            print()

    def build_kiro_prompt(self, spec: Spec, task: Task) -> str:
        """Build a detailed prompt for Kiro to execute a task."""
        prompt_parts = [
            f"Execute Task {task.number} from spec {spec.name}: {task.title}.",
        ]

        if task.files:
            prompt_parts.append(f"Files to modify: {', '.join(task.files)}.")

        # Add description details
        if task.description:
            # Extract bullet points from description
            bullets = re.findall(r'^\s*-\s+(.+)$', task.description, re.MULTILINE)
            if bullets:
                prompt_parts.append("Requirements: " + "; ".join(bullets[:5]))  # First 5 bullets

        if task.verify:
            prompt_parts.append(f"Verify by: {task.verify}")

        return " ".join(prompt_parts)

    def create_worktree(self, branch_name: str, worktree_path: Path) -> bool:
        """Create a git worktree for isolated task execution."""
        try:
            # Create new branch from current HEAD
            subprocess.run(
                ["git", "worktree", "add", str(worktree_path), "-b", branch_name],
                cwd=self.project_root,
                check=True,
                capture_output=True
            )
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to create worktree: {e.stderr.decode()}")
            return False

    def remove_worktree(self, worktree_path: Path, branch_name: str):
        """Remove a git worktree and its branch."""
        try:
            subprocess.run(
                ["git", "worktree", "remove", str(worktree_path)],
                cwd=self.project_root,
                check=True,
                capture_output=True
            )
            subprocess.run(
                ["git", "branch", "-d", branch_name],
                cwd=self.project_root,
                capture_output=True
            )
        except subprocess.CalledProcessError:
            pass  # Ignore cleanup errors

    def run_kiro_task(
        self,
        spec: Spec,
        task: Task,
        working_dir: Optional[Path] = None,
        branch: Optional[str] = None,
        worktree_path: Optional[Path] = None
    ) -> KiroInstance:
        """
        Launch a new Kiro CLI instance to execute a task.
        Each task gets its own isolated kiro process.
        Returns a KiroInstance for tracking.
        """
        prompt = self.build_kiro_prompt(spec, task)
        work_dir = working_dir or self.project_root
        instance_id = f"{spec.name}-{task.number}-{int(time.time())}"

        print(f"\n{'─'*50}")
        print(f"[KIRO INSTANCE: {instance_id}]")
        print(f"Task {task.number}: {task.title}")
        print(f"Working dir: {work_dir}")
        if branch:
            print(f"Branch: {branch}")
        print(f"Prompt: {prompt[:80]}...")
        print(f"{'─'*50}\n")

        # Launch kiro chat in a NEW window (-n flag ensures separate instance)
        process = subprocess.Popen(
            [self.kiro_cmd, "chat", "-m", "agent", "-n", prompt],
            cwd=work_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            # Ensure each process is independent
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )

        instance = KiroInstance(
            id=instance_id,
            task=task,
            spec=spec,
            process=process,
            working_dir=work_dir,
            branch=branch,
            worktree_path=worktree_path,
            started_at=time.time()
        )

        print(f"[OK] Kiro instance {instance_id} started (PID: {process.pid})")
        return instance

    def run_sequential(self, spec_name: str):
        """Run all incomplete tasks in a spec sequentially."""
        spec = self.get_spec(spec_name)
        if not spec:
            print(f"Spec '{spec_name}' not found")
            return

        pending_tasks = [t for t in spec.tasks if t.status in ('pending', 'in_progress')]

        if not pending_tasks:
            print(f"No pending tasks in spec '{spec_name}'")
            return

        print(f"\nFound {len(pending_tasks)} incomplete tasks in '{spec_name}'")
        print("Will launch each task and wait for you to confirm completion.\n")

        for i, task in enumerate(pending_tasks, 1):
            print(f"\n[{i}/{len(pending_tasks)}] Starting Task {task.number}: {task.title}")

            instance = self.run_kiro_task(spec, task)

            input("\n[PAUSE] Press ENTER when Kiro has completed this task...")

            # Kill the process if still running (user might have closed window)
            if instance.process.poll() is None:
                instance.process.terminate()

            elapsed = time.time() - instance.started_at
            print(f"[OK] Task {task.number} marked as handled (ran for {elapsed:.1f}s)\n")

        print("\n" + "="*50)
        print("All tasks launched! Remember to verify each task.")
        print("="*50)

    def run_single_task(self, spec_name: str, task_number: str):
        """Run a single specific task by its number."""
        spec = self.get_spec(spec_name)
        if not spec:
            print(f"Spec '{spec_name}' not found")
            return

        # Find the task by number
        task = next((t for t in spec.tasks if t.number == task_number), None)
        if not task:
            print(f"Task {task_number} not found in spec '{spec_name}'")
            print("\nAvailable tasks:")
            for t in spec.tasks:
                print(f"  {t.number}: {t.title}")
            return

        print(f"\n{'='*50}")
        print(f"Running single task: {task.number} - {task.title}")
        print(f"Status: {task.status}")
        print(f"{'='*50}")

        if task.status == 'completed':
            confirm = input("\nThis task is already completed. Run anyway? (y/N): ")
            if confirm.lower() != 'y':
                print("Aborted.")
                return

        instance = self.run_kiro_task(spec, task)

        input("\n[PAUSE] Press ENTER when Kiro has completed this task...")

        if instance.process.poll() is None:
            instance.process.terminate()

        elapsed = time.time() - instance.started_at
        print(f"\n[OK] Task {task.number} completed! (ran for {elapsed:.1f}s)")

    def run_parallel(self, spec_name: str, max_parallel: int = 3):
        """Run tasks in parallel using git worktrees."""
        spec = self.get_spec(spec_name)
        if not spec:
            print(f"Spec '{spec_name}' not found")
            return

        pending_tasks = [t for t in spec.tasks if t.status in ('pending', 'in_progress')]

        if not pending_tasks:
            print(f"No pending tasks in spec '{spec_name}'")
            return

        # Limit to max_parallel tasks
        tasks_to_run = pending_tasks[:max_parallel]

        print(f"\nRunning {len(tasks_to_run)} tasks in parallel")
        print(f"Each task gets its own Kiro CLI instance + git worktree")
        print("="*60)

        instances: List[KiroInstance] = []

        for task in tasks_to_run:
            branch_name = f"task/{spec.name}-{task.number}"
            worktree_path = self.project_root.parent / f"task-{spec.name}-{task.number}"

            print(f"\n[SETUP] Creating isolated environment for Task {task.number}...")

            if self.create_worktree(branch_name, worktree_path):
                instance = self.run_kiro_task(
                    spec, task,
                    working_dir=worktree_path,
                    branch=branch_name,
                    worktree_path=worktree_path
                )
                instances.append(instance)
            else:
                print(f"[SKIP] Task {task.number} - worktree creation failed")

        print("\n" + "="*60)
        print(f"[OK] Launched {len(instances)} isolated Kiro CLI instances!")
        print("="*60)

        print("\nRunning instances:")
        for inst in instances:
            print(f"  - {inst.id}")
            print(f"    PID: {inst.process.pid}")
            print(f"    Branch: {inst.branch}")
            print(f"    Working dir: {inst.working_dir}")

        print("\n[INFO] When all tasks are complete, run these commands to merge:")
        print("-"*50)
        for inst in instances:
            print(f"git merge {inst.branch}")
        print("-"*50)
        print("\nThen cleanup with:")
        for inst in instances:
            print(f"git worktree remove {inst.worktree_path}")

        input("\n[PAUSE] Press ENTER when all Kiro instances are complete to cleanup...")

        # Cleanup
        print("\nCleaning up worktrees and terminating any remaining processes...")
        for inst in instances:
            if inst.process.poll() is None:
                inst.process.terminate()
                print(f"  Terminated {inst.id}")
            if inst.worktree_path and inst.branch:
                self.remove_worktree(inst.worktree_path, inst.branch)
                print(f"  Removed worktree {inst.worktree_path}")

        print("\n[OK] Cleanup complete!")


def main():
    parser = argparse.ArgumentParser(description="Kiro Task Runner")
    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # List command
    list_parser = subparsers.add_parser('list', help='List specs and tasks')
    list_parser.add_argument('spec_name', nargs='?', help='Specific spec to show')

    # Run command
    run_parser = subparsers.add_parser('run', help='Run tasks in a spec')
    run_parser.add_argument('spec_name', help='Spec name to run')
    run_parser.add_argument('--task', '-t', type=str, default=None,
                          help='Run a single task by number (e.g., 9.7)')
    run_parser.add_argument('--parallel', '-p', type=int, default=0,
                          help='Number of tasks to run in parallel (uses worktrees)')

    args = parser.parse_args()

    # Find project root (where .kiro folder is)
    project_root = Path.cwd()
    while project_root != project_root.parent:
        if (project_root / ".kiro").exists():
            break
        project_root = project_root.parent
    else:
        project_root = Path.cwd()

    runner = KiroRunner(project_root)

    if args.command == 'list':
        runner.list_specs(args.spec_name)
    elif args.command == 'run':
        if args.task:
            runner.run_single_task(args.spec_name, args.task)
        elif args.parallel > 0:
            runner.run_parallel(args.spec_name, args.parallel)
        else:
            runner.run_sequential(args.spec_name)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
