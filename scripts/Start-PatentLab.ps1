param([switch]$NoBrowser,[int]$Port=3000)
& (Join-Path $PSScriptRoot 'Start-Xlab.ps1') @PSBoundParameters
