from pathlib import Path

# ============================================================
# CONFIGURATION
# ============================================================

ROOT_DIR = Path(r"D:\Downloads\srv\srv")
OUTPUT_FILE = ROOT_DIR / "combined_codebase.txt"

# File extensions to include
EXTENSIONS = {
    ".java",
    ".xml",
    ".properties",
    ".yml",
    ".yaml",
    ".json",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".css",
    ".scss",
    ".html",
    ".sql",
}

# Specific filenames to include even when they have no standard extension
# or would otherwise be excluded by the .env* rule.
INCLUDED_FILENAMES = {
    "Dockerfile",
    ".gitignore",
    ".dockerignore",
    ".env.example",
    "render.yaml",
}

# Directories to exclude
EXCLUDED_DIRS = {
    ".git",
    ".idea",
    "target",
    "build",
    "node_modules",
    "dist",
    "out",
    ".mvn",
    ".vite",
    "coverage",
}

# Specific filenames to exclude
EXCLUDED_FILENAMES = {
    "combined_codebase.txt",
    "package-lock.json",
}


# ============================================================
# HELPERS
# ============================================================

def should_exclude(file_path: Path) -> bool:
    """
    Returns True if the file should not be included.
    """

    # Exclude specific filenames
    if file_path.name in EXCLUDED_FILENAMES:
        return True

    # Exclude if ANY parent directory is an excluded directory
    try:
        relative_path = file_path.relative_to(ROOT_DIR)
    except ValueError:
        return True

    for part in relative_path.parts[:-1]:
        if part in EXCLUDED_DIRS:
            return True

    # Explicitly include required project/deployment files.
    if file_path.name in INCLUDED_FILENAMES:
        return False

    # Exclude .env* files
    if file_path.name.startswith(".env"):
        return True

    # Exclude files whose extension is not allowed
    if file_path.suffix.lower() not in EXTENSIONS:
        return True

    return False


def read_file_safely(file_path: Path) -> str:
    """
    Read a file as UTF-8.
    If UTF-8 fails, try UTF-8 with BOM handling.
    If the file still cannot be read, return an error marker.
    """

    try:
        return file_path.read_text(
            encoding="utf-8",
            errors="strict"
        )

    except UnicodeDecodeError:
        try:
            return file_path.read_text(
                encoding="utf-8-sig",
                errors="strict"
            )

        except Exception as exc:
            return (
                f"[Unable to read file: {exc}]\n"
            )

    except Exception as exc:
        return (
            f"[Unable to read file: {exc}]\n"
        )


# ============================================================
# MAIN
# ============================================================

def main():
    # Verify root directory exists
    if not ROOT_DIR.exists():
        print(f"ERROR: Directory does not exist:")
        print(ROOT_DIR)
        return

    if not ROOT_DIR.is_dir():
        print(f"ERROR: Path is not a directory:")
        print(ROOT_DIR)
        return

    print("=" * 70)
    print("Enterprise Sentinel Codebase Combiner")
    print("=" * 70)
    print(f"Root directory : {ROOT_DIR}")
    print(f"Output file    : {OUTPUT_FILE}")
    print()

    # --------------------------------------------------------
    # Find all candidate files
    # --------------------------------------------------------

    files = []

    for file_path in ROOT_DIR.rglob("*"):

        # Ignore directories
        if not file_path.is_file():
            continue

        # Apply exclusions
        if should_exclude(file_path):
            continue

        files.append(file_path)

    # Sort exactly by full path
    files.sort(key=lambda p: str(p).lower())

    print(f"Files included: {len(files)}")
    print()

    # --------------------------------------------------------
    # Build combined content
    # --------------------------------------------------------

    output_parts = []

    for file_path in files:

        # Relative path from ROOT_DIR
        relative_path = file_path.relative_to(ROOT_DIR)

        header = (
            "================================================================================\n"
            f"FILE PATH: {relative_path}\n"
            "================================================================================\n"
        )

        output_parts.append(header)

        # Read file
        content = read_file_safely(file_path)

        output_parts.append(content)

        # Match PowerShell's extra newlines
        output_parts.append("\n\n")

    combined_content = "".join(output_parts)

    # --------------------------------------------------------
    # Write UTF-8 WITHOUT BOM
    # --------------------------------------------------------

    try:
        OUTPUT_FILE.write_text(
            combined_content,
            encoding="utf-8",
            newline=""
        )

        print("=" * 70)
        print("SUCCESS")
        print("=" * 70)
        print(f"Created      : {OUTPUT_FILE}")
        print(f"Files        : {len(files)}")
        print(f"Output size  : {OUTPUT_FILE.stat().st_size:,} bytes")

    except Exception as exc:
        print("=" * 70)
        print("ERROR")
        print("=" * 70)
        print(f"Could not write output file:")
        print(exc)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()