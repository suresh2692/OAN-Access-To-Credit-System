import sys

def resolve_upstream(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    out_lines = []
    in_conflict = False
    in_upstream = False
    
    for line in lines:
        if line.startswith('<<<<<<<'):
            in_conflict = True
            in_upstream = False
        elif line.startswith('======='):
            in_upstream = True
        elif line.startswith('>>>>>>>'):
            in_conflict = False
            in_upstream = False
        else:
            if not in_conflict:
                out_lines.append(line)
            elif in_conflict and in_upstream:
                out_lines.append(line)
            
    with open(file_path, 'w') as f:
        f.writelines(out_lines)

for arg in sys.argv[1:]:
    resolve_upstream(arg)
