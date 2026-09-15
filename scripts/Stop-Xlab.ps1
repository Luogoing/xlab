$ErrorActionPreference='Stop'
$env:PSModulePath="$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules"
$appRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$statePath=if($env:PATENT_LAB_STATE_DIR){[IO.Path]::GetFullPath($env:PATENT_LAB_STATE_DIR)}else{Join-Path $appRoot '.local'}
$launchPath=Join-Path $statePath 'launch.json'
if(-not(Test-Path -LiteralPath $launchPath)){Write-Output 'No launch receipt for this directory. Use the matching version stop command.';exit 0}
$launch=Get-Content -LiteralPath $launchPath -Raw -Encoding UTF8 | ConvertFrom-Json
try {$health=Invoke-RestMethod ($launch.url+'/health') -TimeoutSec 2} catch {Write-Output 'XLAB already stopped.';exit 0}
if($health.app_id -ne 'patent-lab-local' -or $health.instance_id -ne $launch.instance_id){throw 'This port is not the XLAB instance for this directory. No process was stopped.'}
$status=Invoke-RestMethod ($launch.url+'/api/status') -TimeoutSec 5
if($status.active_run){throw 'A task is active. Cancel it in the application and wait for saving before stopping.'}
Stop-Process -Id $health.pid -ErrorAction Stop
Write-Output 'XLAB stopped. Saved projects and reports remain on disk.'
