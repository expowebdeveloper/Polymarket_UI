
path = "/home/dell/Desktop/Projects/Polymarket/frontend/src/pages/ProfileStat.tsx"

with open(path, "r") as f:
    lines = f.readlines()

# Check line 1300 (0-indexed: 1299)
line_idx = 1299
if "{loadingDistribution" in lines[line_idx]:
    lines[line_idx] = lines[line_idx].replace("{loadingDistribution", "loadingDistribution")
    print(f"Fixed line {line_idx+1}")

# Check line 1311 (0-indexed: 1310) or nearby?
# Since we modified the file via patch previously, lines might be shifted slightly or exactly as viewed.
# The view_file output showed:
# 1300: {loadingDistribution ? (
# ...
# 1311: )}
# 1312: )}

# Let's search for the closing brace associated with valid indentation
for i in range(1299, len(lines)):
    if lines[i].strip() == ")}":
        # This matches the error structure. We want to change ")}" to ")" if it corresponds to the extra brace.
        # But wait, the ternary end is `)`. So `}` closes the expression block.
        # If we remove `{` at start, we must remove `}` at end.
        
        # Check context: Is this inside the valid `marketDistribution` block?
        # Previous line (1310) is `/>`.
        # Line 1312 is `)}` (closing the `activeTab && (` expression).
        
        # So we have TWO lines with `)}` at 1311 and 1312?
        # My patch output said:
        # 1311: )}
        # 1312: )}
        # Correct. So we need to fix the FIRST `)}` to `)`.
        
        lines[i] = lines[i].replace(")}", ")")
        print(f"Fixed line {i+1}")
        break

with open(path, "w") as f:
    f.writelines(lines)
