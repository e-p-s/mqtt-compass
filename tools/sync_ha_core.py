"""Copy the shared core and the built web UI into the Home Assistant integration.

The standalone server and the Home Assistant integration use the same code:

- ``mqtt_compass/tree.py``, ``mqtt_compass/broker.py`` and ``mqtt_compass/config.py``
  are the core. They do not know anything about a web framework, so both the FastAPI server
  and the Home Assistant integration can use them.
- the web UI is built once and is used by both.

A Home Assistant installation cannot import a pip package that is not installed, so the core
is copied into the integration. This script keeps the copy in sync.

Usage::

    python tools/sync_ha_core.py [--check]
"""

from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from pathlib import Path



def _copy2(src, dst):
    """copy2, aber ohne utime-Rechte zu brauchen (NFS wirft sonst PermissionError)."""
    try:
        shutil.copy2(src, dst)
    except PermissionError:
        shutil.copyfile(src, dst)


ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "mqtt_compass"
TARGET = ROOT / "custom_components" / "mqtt_compass"

#: The files of the core that are copied.
CORE_FILES = ["tree.py", "broker.py", "config.py"]

#: The directories of the built web UI that are copied.
STATIC_DIRS = ["assets", ".vite"]


def copy_core(check_only: bool) -> list[str]:
    """Copy the core into the integration. Returns the list of the changed files."""
    changed: list[str] = []
    core_target = TARGET / "core"
    core_target.mkdir(parents=True, exist_ok=True)

    for name in CORE_FILES:
        source = PACKAGE / name
        destination = core_target / name
        if destination.exists() and filecmp.cmp(source, destination, shallow=False):
            continue
        changed.append(str(destination.relative_to(ROOT)))
        if not check_only:
            try:
                _copy2(source, destination)
            except PermissionError:
                # Mounts without permission for utime/chmod (e.g. NFS with strict options).
                shutil.copyfile(source, destination)

    # The __init__.py of the core package is not copied - the files are used as plain modules.
    init = core_target / "__init__.py"
    content = '"""The shared core of MQTT Compass. Copied from the `mqtt_compass` package."""\n'
    if not init.exists() or init.read_text("utf-8") != content:
        changed.append(str(init.relative_to(ROOT)))
        if not check_only:
            init.write_text(content, "utf-8")

    return changed


def _copy_tree(source: Path, destination: Path) -> bool:
    """Copy a directory over another one.

    The files are overwritten one by one and the ones that are not in the source any more
    are removed. The directory itself is not deleted - on Windows a file that is being
    served cannot be deleted, and the running server would keep it open.
    """
    changed = False
    destination.mkdir(parents=True, exist_ok=True)

    for item in source.iterdir():
        target = destination / item.name
        if item.is_dir():
            changed = _copy_tree(item, target) or changed
        elif not target.exists() or not filecmp.cmp(item, target, shallow=False):
            _copy2(item, target)
            changed = True

    for item in destination.iterdir():
        if not (source / item.name).exists():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            else:
                item.unlink(missing_ok=True)
            changed = True

    return changed


def copy_static(check_only: bool) -> list[str]:
    """Copy the built web UI into the integration. Returns the list of the changed files."""
    changed: list[str] = []
    source_root = PACKAGE / "static"
    if not source_root.is_dir():
        return changed

    target_root = TARGET / "static"
    target_root.mkdir(parents=True, exist_ok=True)

    for name in STATIC_DIRS:
        source = source_root / name
        if not source.is_dir():
            continue
        destination = target_root / name
        if destination.exists():
            if check_only:
                comparison = filecmp.dircmp(source, destination)
                if comparison.left_only or comparison.right_only or comparison.diff_files:
                    changed.append(str(destination.relative_to(ROOT)))
            else:
                if _copy_tree(source, destination):
                    changed.append(str(destination.relative_to(ROOT)))
        else:
            changed.append(str(destination.relative_to(ROOT)))
            if not check_only:
                shutil.copytree(source, destination)

    # The index.html is built by the Home Assistant integration from the manifest, so it is
    # not needed here. It is copied nevertheless, so that the integration also works
    # without the manifest.
    source = source_root / "index.html"
    destination = target_root / "index.html"
    if source.is_file() and (
        not destination.exists() or not filecmp.cmp(source, destination, shallow=False)
    ):
        changed.append(str(destination.relative_to(ROOT)))
        if not check_only:
            try:
                _copy2(source, destination)
            except PermissionError:
                # Mounts without permission for utime/chmod (e.g. NFS with strict options).
                shutil.copyfile(source, destination)

    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only report what would change - do not write anything.",
    )
    args = parser.parse_args()

    changed = copy_core(args.check) + copy_static(args.check)

    if not changed:
        print("The Home Assistant integration is up to date.")
        return 0

    if args.check:
        print("The following files are not in sync:")
        for name in changed:
            print(f"  {name}")
        print("Run 'python tools/sync_ha_core.py' to update them.")
        return 1

    print("The following files were updated:")
    for name in changed:
        print(f"  {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
