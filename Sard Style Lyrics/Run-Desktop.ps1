param([switch]$Build)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
# Prefer an installed Rust toolchain; otherwise use this workspace's portable tools.
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    $toolsRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\work\toolchain'))
    $rustBin = Join-Path $toolsRoot 'rustup\toolchains\stable-x86_64-pc-windows-gnu\bin'
    if (-not (Test-Path -LiteralPath (Join-Path $rustBin 'cargo.exe'))) { throw 'Install Rust and Visual Studio C++ Build Tools, then reopen PowerShell.' }
    $env:CARGO_HOME = Join-Path $toolsRoot 'cargo'
    $env:RUSTUP_HOME = Join-Path $toolsRoot 'rustup'
    $env:PATH = $rustBin + ';' + (Join-Path $toolsRoot 'w64devkit\bin') + ';' + $env:PATH
}
if (-not (Test-Path -LiteralPath 'node_modules')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE} }
if ($Build) { & npm.cmd run tauri build -- --no-bundle } else { & npm.cmd run tauri dev }
exit $LASTEXITCODE
