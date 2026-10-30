# builds the single-file "Update Lu Cube.bat" from the repo's current files
import sys, base64, os
repo, ps1, out = sys.argv[1:4]
files = [('index.html', 'web/index.html'), ('main.js', 'desktop/main.js'), ('preload.js', 'desktop/preload.js'), ('musiccube.py', 'musiccube.py'), ('get_audiobooks.py', 'get_audiobooks.py'), ('MakeStick.bat', 'Make Lu Cube Stick.bat'), ('InstallStick.bat', 'stick/Install Lu Cube.bat')]
ps = open(ps1, newline='').read().replace('\r\n', '\n')
a = "$src = Join-Path $PSScriptRoot 'files'"
if a in ps:
    ps = ps.replace(a, """# the new Lu Cube files travel inside this .bat; unpack them to a temporary folder
$self = [IO.File]::ReadAllText($env:LUSELF)
$src = Join-Path $env:TEMP ('lucube-update-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $src | Out-Null
foreach ($m in [regex]::Matches($self, '(?ms)^::FILE (\\S+)\\r?\\n(.*?)^::END')) {
  $b = ($m.Groups[2].Value -replace '[^A-Za-z0-9+/=]', '')
  [IO.File]::WriteAllBytes((Join-Path $src $m.Groups[1].Value), [Convert]::FromBase64String($b))
}""")
head = ('@echo off\ntitle Update Lu Cube\necho Updating Lu Cube ...\necho.\nset "LUSELF=%~f0"\n'
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText($env:LUSELF); $a=$t.IndexOf(\'#PS-\'+\'START\'); $b=$t.IndexOf(\'#PS-\'+\'END\'); iex $t.Substring($a, $b-$a)"\n'
        'if errorlevel 1 (echo. & pause)\nexit /b\n\n')
body = '#PS-START\n' + ps.rstrip() + '\n#PS-END\n\n'
for name, rel in files:
    d = base64.b64encode(open(os.path.join(repo, rel), 'rb').read()).decode()
    body += '::FILE ' + name + '\n' + '\n'.join(d[i:i + 76] for i in range(0, len(d), 76)) + '\n::END\n'
open(out, 'w', newline='').write((head + body).replace('\n', '\r\n'))
