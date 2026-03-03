import re
html = open(r'd:\web_naturales\fisica_t2_tierra_universo.html', encoding='utf-8').read()

# Check for h4/h2 with id attribute -> anchor links becoming visible
# Pattern: anchor tag with id appearing as visible text before heading
matches = re.findall(r'<h[234][^>]*>([^<]{0,60})</h[234]>', html)
print("All headings:")
for m in matches:
    print("  ", repr(m))

# Also check for stray > in text
gt_positions = [m.start() for m in re.finditer(r'[^<>]&gt;[^<>]', html)]
print(f"\nStray &gt; count: {len(gt_positions)}")
for pos in gt_positions[:5]:
    print("  ", repr(html[max(0,pos-30):pos+40]))

# Check for duplicate text in same line
lines_with_dup = []
for i, line in enumerate(html.split('\n'), 1):
    stripped = line.strip()
    if len(stripped) > 10 and stripped.count(stripped[:20]) > 1:
        lines_with_dup.append((i, stripped[:80]))
print(f"\nLines with possible duplicates: {len(lines_with_dup)}")
for ln, txt in lines_with_dup[:5]:
    print(f"  L{ln}: {txt}")
