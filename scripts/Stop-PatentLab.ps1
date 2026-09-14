$ErrorActionPreference='Stop'
$env:PSModulePath="$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules"
$url='http://127.0.0.1:3000'
try {$health=Invoke-RestMethod ($url+'/health') -TimeoutSec 2} catch {Write-Output 'Patent Lab is already stopped.';exit 0}
if($health.app_id -ne 'patent-lab-local'){throw 'This port does not belong to Patent Lab.'}
$state=Invoke-RestMethod ($url+'/api/status') -TimeoutSec 5
if($state.active_run){throw 'An analysis is running. Cancel it in the application before stopping.'}
Stop-Process -Id $health.pid -ErrorAction Stop
Write-Output 'Patent Lab stopped. Saved work is retained.'
