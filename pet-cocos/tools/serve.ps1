param([int]$Port = 8395)
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$config = Get-Content -LiteralPath (Join-Path $projectPath 'build-config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$webPath = Join-Path $projectPath ('build\' + $config.outputName)
if (-not (Test-Path -LiteralPath (Join-Path $webPath 'index.html'))) { throw 'Run tools/build.ps1 first.' }
Write-Output ('Open http://127.0.0.1:' + $Port + '/')
& python (Join-Path $PSScriptRoot 'preview-server.py') --port $Port --directory $webPath
