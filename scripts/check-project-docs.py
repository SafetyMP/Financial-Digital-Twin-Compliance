#!/usr/bin/env python3
"""Check local Markdown link targets without crawling external sites or archives."""
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    files = sorted(set(ROOT.glob('*.md')) | set((ROOT / 'docs').rglob('*.md')) |
                   set((ROOT / '.github').glob('*.md')))
    errors = []
    checked = 0
    for source in files:
        content = re.sub(r'```.*?```', '', source.read_text(), flags=re.S)
        # Inline Markdown destinations and HTML image sources used by READMEs.
        destinations = re.findall(r'\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"\n]*")?\)', content)
        destinations += re.findall(r'<img\b[^>]*\bsrc=[\"\x27]([^\"\x27]+)', content)
        for destination in destinations:
            destination = destination.strip('<>')
            url = urlsplit(destination)
            if url.scheme or url.netloc or not url.path or '*' in url.path:
                continue
            target = source.parent / unquote(url.path)
            checked += 1
            if not target.exists():
                errors.append(f'{source.relative_to(ROOT)}: missing target {destination}')
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'Checked {checked} local link targets across {len(files)} project documents.')
    print('External URLs and heading fragments are not covered by this file-existence check.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
