param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$env:PSModulePath="$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules"
$project=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$url='http://127.0.0.1:3000'
function Get-LabHealth {try {Invoke-RestMethod ($url+'/health') -TimeoutSec 2} catch {$null}}
$health=Get-LabHealth
if($health -and $health.app_id -ne 'patent-lab-local'){throw 'Port 3000 belongs to another application. Close it or choose another port in the developer setup.'}
if(-not $health){
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $state=Join-Path $project '.local'
 [void][IO.Directory]::CreateDirectory($state)
 $env:HOST='127.0.0.1';$env:PORT='3000'
 $service=Start-Process -FilePath $node -ArgumentList @('scripts/serve.mjs') -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput (Join-Path $state 'server-output.log') -RedirectStandardError (Join-Path $state 'server-error.log') -PassThru
 for($i=0;$i -lt 40;$i++){Start-Sleep -Milliseconds 250;$health=Get-LabHealth;if($health -and $health.app_id -eq 'patent-lab-local'){break};if($service.HasExited){throw 'Patent Lab could not start. Check .local/server-error.log.'}}
 if(-not $health){throw 'Patent Lab startup timed out. Existing tasks remain on disk.'}
}
if(-not $NoBrowser){Start-Process $url}
[pscustomobject]@{url=$url;pid=$health.pid;version=$health.version;running=$true}|ConvertTo-Json -Compress
