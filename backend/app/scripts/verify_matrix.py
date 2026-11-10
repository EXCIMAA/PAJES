"""Verify the Python permission matrix against the TypeScript source.

This script parses src/lib/permissions.ts, extracts the PERMISSION_MATRIX
object, and compares every cell against app.permissions.matrix.

Usage:
    uv run python -m app.scripts.verify_matrix

Run this after any change to either matrix file.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


def _parse_ts_matrix(ts_path: Path) -> dict[str, dict[str, dict[str, bool]]]:
    """Extract the PERMISSION_MATRIX from the TypeScript source."""
    content = ts_path.read_text()

    # Find the PERMISSION_MATRIX block
    start = content.index("export const PERMISSION_MATRIX: PermissionMatrix = {")
    # Find matching closing brace by counting
    depth = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    block = content[start:end]

    # Parse roles, modules, and P(c, v, e, d) calls
    matrix: dict[str, dict[str, dict[str, bool]]] = {}
    current_role: str | None = None

    for line in block.split("\n"):
        line = line.strip()

        # Role header: "role_name: {"
        role_match = re.match(r"^([a-z_]+):\s*\{", line)
        if role_match and not line.startswith("P("):
            current_role = role_match.group(1)
            matrix[current_role] = {}
            continue

        # Module line: "module: P(c, v, e, d)," or "module: FULL," or "module: NONE,"
        mod_match = re.match(r"^([a-z_]+):\s*(.+)", line)
        if mod_match and current_role:
            module = mod_match.group(1)
            # Strip trailing comma and any inline comment
            value = mod_match.group(2)
            # Remove // comments
            value = re.sub(r"//.*$", "", value).strip().rstrip(",").strip()

            if value == "FULL":
                matrix[current_role][module] = {"create": True, "view": True, "edit": True, "delete": True}
            elif value == "NONE":
                matrix[current_role][module] = {"create": False, "view": False, "edit": False, "delete": False}
            else:
                p_match = re.match(r"P\((true|false),\s*(true|false),\s*(true|false),\s*(true|false)\)", value, re.IGNORECASE)
                if p_match:
                    vals = [v.lower() == "true" for v in p_match.groups()]
                    matrix[current_role][module] = {
                        "create": vals[0],
                        "view": vals[1],
                        "edit": vals[2],
                        "delete": vals[3],
                    }

    return matrix


def main() -> int:
    repo_root = Path(__file__).resolve().parents[3]
    ts_path = repo_root / "src" / "lib" / "permissions.ts"

    if not ts_path.exists():
        print(f"Error: TypeScript matrix not found at {ts_path}", file=sys.stderr)  # noqa: T201
        return 1

    ts_matrix = _parse_ts_matrix(ts_path)

    from app.permissions.matrix import PERMISSION_MATRIX, ALL_ROLES, ALL_MODULES, SUPER_ADMIN_ROLE

    mismatches: list[str] = []
    missing_roles: list[str] = []
    missing_modules: list[str] = []

    for role in ALL_ROLES:
        if role == SUPER_ADMIN_ROLE:
            continue  # super_admin is implicit in both

        if role not in ts_matrix:
            missing_roles.append(role)
            continue

        for module in ALL_MODULES:
            if module not in ts_matrix[role]:
                missing_modules.append(f"{role}/{module}")
                continue

            ts_cell = ts_matrix[role][module]
            py_cell = PERMISSION_MATRIX.get(role, {}).get(module, {})

            for action in ("create", "view", "edit", "delete"):
                ts_val = ts_cell.get(action)
                py_val = py_cell.get(action)
                if ts_val != py_val:
                    mismatches.append(f"{role}/{module}/{action}: TS={ts_val} PY={py_val}")

    # Check for extra roles in TS that aren't in Python
    for ts_role in ts_matrix:
        if ts_role not in ALL_ROLES:
            print(f"Warning: Role '{ts_role}' in TS but not in Python ALL_ROLES")  # noqa: T201

    print(f"TypeScript roles found: {len(ts_matrix)}")  # noqa: T201
    print(f"Python roles (excl super_admin): {len(ALL_ROLES) - 1}")  # noqa: T201
    print(f"Modules per role: {len(ALL_MODULES)}")  # noqa: T201

    if missing_roles:
        print(f"\nMISSING ROLES ({len(missing_roles)}):", file=sys.stderr)  # noqa: T201
        for r in missing_roles:
            print(f"  - {r}", file=sys.stderr)  # noqa: T201

    if missing_modules:
        print(f"\nMISSING MODULES ({len(missing_modules)}):", file=sys.stderr)  # noqa: T201
        for m in missing_modules:
            print(f"  - {m}", file=sys.stderr)  # noqa: T201

    if mismatches:
        print(f"\nMISMATCHES ({len(mismatches)}):", file=sys.stderr)  # noqa: T201
        for m in mismatches:
            print(f"  - {m}", file=sys.stderr)  # noqa: T201

    total_cells = (len(ALL_ROLES) - 1) * len(ALL_MODULES) * 4
    checked = total_cells - len(mismatches)
    print(f"\nCells checked: {checked}/{total_cells}")  # noqa: T201

    if not mismatches and not missing_roles and not missing_modules:
        print("PASS: Python matrix matches TypeScript matrix exactly.")  # noqa: T201
        return 0
    else:
        print("FAIL: Matrix mismatch detected.", file=sys.stderr)  # noqa: T201
        return 1


if __name__ == "__main__":
    sys.exit(main())
