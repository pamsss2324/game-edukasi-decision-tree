import os

def list_directory(path, exclude_dirs=None, exclude_files=None):
    if exclude_dirs is None:
        exclude_dirs = ['__pycache__', 'venv', '.git']
    if exclude_files is None:
        exclude_files = ['.gitignore']
    structure = []
    for root, dirs, files in os.walk(path):
        # Filter direktori yang akan dikecualikan
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        level = root.replace(path, '').count(os.sep)
        indent = ' ' * 4 * level
        structure.append(f"{indent}{os.path.basename(root)}/")
        for file in files:
            if file not in exclude_files:
                structure.append(f"{indent}    {file}")
    return '\n'.join(structure)

path = "C:/Users/Acer/Documents/Tugas_Akhir/quiz-app"
with open("structure.txt", "w", encoding="utf-8") as f:
    f.write(list_directory(path))
print("Struktur folder disimpan di structure.txt")