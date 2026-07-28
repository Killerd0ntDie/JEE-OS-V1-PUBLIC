import re

with open('src/features/mission/PlannerPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
target_idx = -1

for i, line in enumerate(lines):
    if "{/* TELEMETRY & BOTTLENECK SUMMARY BAR (IMAGE 2 FIXED) */}" in line:
        start_idx = i
    if "{/* SCHEDULE & STRATEGY MATRIX CONTAINER */}" in line:
        end_idx = i
    if "{/* 3. MONTHLY STRATEGY VIEW MODE */}" in line:
        target_idx = i

if start_idx != -1 and end_idx != -1 and target_idx != -1:
    # Extract the block (start_idx to end_idx - 1)
    block = lines[start_idx:end_idx]
    
    # Remove it from the original place
    del lines[start_idx:end_idx]
    
    # Recalculate target index after deletion
    target_idx -= (end_idx - start_idx)
    
    # Find where to insert it in the target (after viewMode === 'monthly' && ( <div className="space-y-6">)
    insert_idx = target_idx + 2
    
    # Insert the block
    lines = lines[:insert_idx] + block + lines[insert_idx:]
    
    with open('src/features/mission/PlannerPage.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("SUCCESS")
else:
    print(f"FAILED: start={start_idx}, end={end_idx}, target={target_idx}")
