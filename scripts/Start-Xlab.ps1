param([switch]$NoBrowser,[int]$Port=3000)
$ErrorActionPreference='Stop'
$env:PSModulePath="$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules"
$appRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$statePath=if($env:PATENT_LAB_STATE_DIR){[IO.Path]::GetFullPath($env:PATENT_LAB_STATE_DIR)}else{Join-Path $appRoot '.local'}
$version=(Get-Content -LiteralPath (Join-Path $appRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$sha=[Security.Cryptography.SHA256]::Create()
$instance=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($statePath.ToLowerInvariant())))).Replace('-','').ToLowerInvariant()
$sha.Dispose()
$url='http://127.0.0.1:'+$Port
function Get-LabHealth {try {Invoke-RestMethod ($url+'/health') -TimeoutSec 2} catch {$null}}
$health=Get-LabHealth
if($health -and ($health.app_id -ne 'patent-lab-local' -or $health.instance_id -ne $instance -or $health.version -ne $version)){throw 'Port belongs to another application, directory or version. Stop that version first, or use -Port 3001.'}
if(-not $health){
 $node=Join-Path $appRoot 'runtime\node.exe'
 if(-not(Test-Path -LiteralPath $node)){$node=(Get-Command node.exe -ErrorAction Stop).Source}
 $nodeVersion=(& $node --version).TrimStart('v')
 if([version]$nodeVersion -lt [version]'22.13.0'){throw 'Node.js 22.13+ required. Use the complete portable package with its bundled runtime.'}
 [void][IO.Directory]::CreateDirectory($statePath)
 $env:HOST='127.0.0.1';$env:PORT=[string]$Port;$env:PATENT_LAB_STATE_DIR=$statePath
 $service=Start-Process -FilePath $node -ArgumentList @('scripts/serve.mjs') -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $statePath 'server-output.log') -RedirectStandardError (Join-Path $statePath 'server-error.log') -PassThru
 for($i=0;$i -lt 120;$i++){Start-Sleep -Milliseconds 250;$health=Get-LabHealth;if($health -and $health.app_id -eq 'patent-lab-local'){break};$service.Refresh();if($service.HasExited){throw 'XLAB could not start. See .local/server-error.log. Saved projects remain on disk.'}}
 if(-not $health -or $health.instance_id -ne $instance){throw 'Startup did not complete for this directory. See local server logs.'}
}
$launchFile=Join-Path $statePath 'launch.json'
$launch=@{url=$url;port=$Port;pid=$health.pid;instance_id=$instance;version=$health.version}|ConvertTo-Json -Compress
[IO.File]::WriteAllText($launchFile,$launch,[Text.UTF8Encoding]::new($false))
if(-not $NoBrowser){Start-Process $url}
$launch
