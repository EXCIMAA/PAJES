import re
s = open(r'c:\Users\treso\Downloads\ProjectPajes\project\src\App.tsx', encoding='utf-8').read()
for m in re.finditer(r'path="([^"]*)"', s):
    line = s[:m.start()].count('\n') + 1
    print(line, '::', m.group(0))
for m in re.finditer(r'activate-account', s):
    line = s[:m.start()].count('\n') + 1
    print(line, ':: activate-account')
