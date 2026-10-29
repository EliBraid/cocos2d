param([string]$Creator = $env:COCOS_CREATOR, [string]$Config = 'build-config.json')
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Creator) {
    $portable = Join-Path $projectPath '..\.work\cocos-tools\Creator-3.8.8\CocosCreator.exe'
    if (Test-Path -LiteralPath $portable) { $Creator = (Resolve-Path -LiteralPath $portable).Path }
}
if (-not $Creator -or -not (Test-Path -LiteralPath $Creator)) {
    throw 'Set COCOS_CREATOR to the full path of CocosCreator.exe (3.8.8).'
}
$logPath = Join-Path $projectPath 'build-logs'
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
$configPath = Join-Path $projectPath $Config
$process = Start-Process -FilePath $Creator -ArgumentList @('--project', ('"' + $projectPath + '"'), '--build', ('"configPath=' + $configPath + '"')) -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $logPath 'creator.log') -RedirectStandardError (Join-Path $logPath 'creator-error.log')
if ($process.ExitCode -ne 36) { throw ('Cocos build failed: exit ' + $process.ExitCode + '. See build-logs.') }
if ($Config -eq 'build-config-wechat.json') {
& node (Join-Path $PSScriptRoot 'finish-wechat.mjs')
if ($LASTEXITCODE -ne 0) { throw 'WeChat package check failed.' }
}
if ($Config -eq 'build-config.json') {
& node (Join-Path $PSScriptRoot 'finish-build.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Build postprocessing failed.' }
}
$buildConfig = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Output ('Cocos Creator build passed (exit 36). Output: build/' + $buildConfig.outputName)
