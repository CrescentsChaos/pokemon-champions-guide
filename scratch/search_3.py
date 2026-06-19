import re

with open('builds/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '3' in line and ('synergy' in line.lower() or 'rcmd' in line.lower() or 'count' in line.lower() or 'slice' in line.lower()):
        print(f"Line {i+1}: {line.strip()}")
