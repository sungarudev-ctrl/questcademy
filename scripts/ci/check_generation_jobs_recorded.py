#!/usr/bin/env python3
"""CI Gate: Generation Jobs Audit Logging.

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5, §8.10

Rule:
Every asynchronous task executed by Celery workers MUST register a row in
the generation_jobs table using create_generation_job and update its status
(running, completed, failed) with update_job_status.
"""

import ast
import os
import sys
from pathlib import Path

TASKS_DIR = Path("backend/app/workers/tasks")


def check_generation_jobs_recorded(repo_root: Path) -> int:
    target_dir = repo_root / TASKS_DIR
    if not target_dir.exists():
        print(f"Error: Directory {target_dir} not found.")
        return 1

    violations = []
    task_count = 0

    for root, _, files in os.walk(target_dir):
        for file_name in files:
            if not file_name.endswith(".py") or file_name.startswith("__"):
                continue

            full_path = Path(root) / file_name
            rel_path = full_path.relative_to(repo_root)

            try:
                tree = ast.parse(full_path.read_text(encoding="utf-8"), filename=str(rel_path))
            except Exception as e:
                print(f"Warning: Could not parse {rel_path}: {e}")
                continue

            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue

                # Check if decorated with @celery_app.task
                is_celery_task = False
                for dec in node.decorator_list:
                    dec_str = ast.unparse(dec) if hasattr(ast, "unparse") else ""
                    if "task" in dec_str:
                        is_celery_task = True
                        break

                if not is_celery_task:
                    continue

                task_count += 1
                func_code = ast.unparse(node) if hasattr(ast, "unparse") else ""

                has_create = "create_generation_job" in func_code
                has_update = "update_job_status" in func_code

                if not has_create or not has_update:
                    violations.append((
                        rel_path,
                        node.lineno,
                        node.name,
                        f"Missing create_generation_job ({has_create}) or update_job_status ({has_update})"
                    ))

    if violations:
        print("=" * 70)
        print("ERROR: Celery tasks missing generation_jobs audit logging!")
        for path, line_no, func_name, reason in violations:
            print(f"  {path}:{line_no} [{func_name}] -> {reason}")
        print("=" * 70)
        return 1

    print(f"SUCCESS: All {task_count} Celery tasks properly record generation_jobs.")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    sys.exit(check_generation_jobs_recorded(repo_root))
