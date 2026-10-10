
from pathlib import Path

# Project directory
ROOT = Path(r"D:\Downloads\srv\srv")

# Output file
OUTPUT = ROOT / "codebase.txt"

# Directories to exclude
EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "target",
    "coverage",
    ".next",
    ".angular",
    "vendor",
}

# File extensions to include
CODE_EXTENSIONS = {
    ".py", ".java", ".kt", ".kts",
    ".js", ".jsx", ".ts", ".tsx",
    ".html", ".css", ".scss", ".sass",
    ".json", ".xml", ".yml", ".yaml",
    ".properties", ".toml", ".ini", ".cfg",
    ".conf", ".config", ".sql", ".sh", ".bat",
    ".ps1", ".md", ".txt", ".gradle",
    ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".php", ".rb", ".swift", ".dart",
    ".vue", ".svelte", ".graphql", ".proto",
    ".dockerfile", ".tf", ".env.example",
}

# Important filenames without extensions
SPECIAL_FILES = {
    ".gitignore",
    ".dockerignore",
    ".gitattributes",
    ".editorconfig",
    "Dockerfile",
    "Containerfile",
    "Makefile",
    "Jenkinsfile",
    "Procfile",
    "Vagrantfile",
    "CMakeLists.txt",
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "poetry.lock",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "settings.gradle.kts",
    "gradle.properties",
    "mvnw",
    "gradlew",
    ".env.example",
    ".env.sample",
    ".env.template",
}

# Sensitive files and generated outputs to exclude
EXCLUDED_FILES = {
    "codebase.txt",
    "c.py",
    ".env",
    "id_rsa",
    "id_ed25519",
}

# Binary or large data extensions to exclude
EXCLUDED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".ico", ".pdf", ".zip", ".rar", ".7z",
    ".exe", ".dll", ".so", ".class", ".jar",
    ".war", ".pyc", ".pyd", ".db", ".sqlite",
    ".mp3", ".mp4", ".wav", ".avi", ".mov",
    ".pt", ".pth", ".onnx", ".safetensors",
    ".bin", ".model", ".parquet", ".pkl",
    ".pickle", ".woff", ".woff2", ".ttf",
}


def should_include(path: Path) -> bool:
    name = path.name
    lower_name = name.lower()

    if name in EXCLUDED_FILES:
        return False

    if lower_name in {item.lower() for item in EXCLUDED_FILES}:
        return False

    if path.suffix.lower() in EXCLUDED_EXTENSIONS:
        return False

    # Include .gitignore and other important special files
    if name in SPECIAL_FILES:
        return True

    # Include extension-based source and configuration files
    if path.suffix.lower() in CODE_EXTENSIONS:
        return True

    # Include extensionless environment templates, not actual secrets
    if lower_name.startswith(".env.") and lower_name != ".env":
        return True

    return False


def collect_files():
    files = []

    for current_dir, dirs, filenames in __import__("os").walk(ROOT):
        current_path = Path(current_dir)

        # Prune excluded directories
        dirs[:] = [
            directory
            for directory in dirs
            if directory not in EXCLUDED_DIRS
        ]

        for filename in filenames:
            path = current_path / filename

            if path.resolve() == OUTPUT.resolve():
                continue

            if should_include(path):
                files.append(path)

    return sorted(files, key=lambda p: str(p).lower())


def main():
    if not ROOT.exists():
        print(f"ERROR: Project directory does not exist: {ROOT}")
        return

    files = collect_files()
    written = 0
    skipped = 0

    with OUTPUT.open("w", encoding="utf-8", newline="\n") as out:
        out.write("=" * 100 + "\n")
        out.write("PROJECT CODEBASE EXPORT\n")
        out.write(f"Project root: {ROOT}\n")
        out.write(f"Files discovered: {len(files)}\n")
        out.write("=" * 100 + "\n\n")

        for path in files:
            relative_path = path.relative_to(ROOT)

            out.write("\n" + "=" * 100 + "\n")
            out.write(f"FILE: {relative_path}\n")
            out.write("=" * 100 + "\n\n")

            try:
                # Avoid accidentally embedding enormous files
                if path.stat().st_size > 5 * 1024 * 1024:
                    out.write("[SKIPPED: File exceeds 5 MB]\n")
                    skipped += 1
                    continue

                content = path.read_text(
                    encoding="utf-8",
                    errors="replace",
                )

                out.write(content)

                if not content.endswith("\n"):
                    out.write("\n")

                written += 1

            except (OSError, PermissionError) as exc:
                out.write(f"[ERROR READING FILE: {exc}]\n")
                skipped += 1

    print("\nExport completed.")
    print(f"Project: {ROOT}")
    print(f"Output:  {OUTPUT}")
    print(f"Discovered: {len(files)}")
    print(f"Written: {written}")
    print(f"Skipped/errors: {skipped}")


if __name__ == "__main__":
    main()
