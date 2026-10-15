#!/usr/bin/env python3
"""
Валидатор инженерного комплекта: Пульт ·31 РУМА ЛАДОМ v1.0
"""
import os
import sys

REQUIRED_FILES = [
    "README_RU.md",
    "index.html",
    "css/console_styles.css",
    "js/console_engine.js",
    "spec/SPECIFICATION.md",
    "spec/ERGONOMICS.md",
    "spec/ARCHITECTURE.md",
    "spec/ROADMAP.md",
    "tests/validate_bundle.py"
]

def validate():
    print("=== STARTING ROOM 31 CONSOLE BUNDLE VALIDATION v1.0 ===")
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    missing = []
    
    for rel_path in REQUIRED_FILES:
        full_path = os.path.join(root, rel_path)
        if not os.path.exists(full_path):
            print(f"[FAIL] Missing required file: {rel_path}")
            missing.append(rel_path)
        else:
            size = os.path.getsize(full_path)
            print(f"[OK] {rel_path} ({size} bytes)")

    if missing:
        print(f"=== BUNDLE VALIDATION FAILED: {len(missing)} missing files ===")
        sys.exit(1)
    else:
        print("=== BUNDLE VALIDATION SUCCESSFUL (100% COMPLETE) ===")

if __name__ == "__main__":
    validate()
