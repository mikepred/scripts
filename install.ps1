#!pwsh

# PowerShell script to install essential software for full stack development

# Set error action preference to stop on any error
$ErrorActionPreference = "Stop"

# Function to install software using winget
function Install-Software {
    param (
        [string]$PackageId,
        [string]$PackageName
    )
    try {
        Write-Host "Installing $PackageName..."
        winget install --id $PackageId --exact --silent --accept-package-agreements --accept-source-agreements
        Write-Host "$PackageName installed successfully."
    }
    catch {
        Write-Host ("Error installing {0}: {1}" -f $PackageName, $($_.Exception.Message))
        throw
    }
}

# Main script
try {
    $transcriptLog = "$PSScriptRoot\install_transcript.log"
    Start-Transcript -Path $transcriptLog -Append
    Write-Host "Starting installation script..."

    # Install essential software

    # Core Development Tools
    Install-Software -PackageId Git.Git -PackageName "Git"
    Install-Software -PackageId Microsoft.Powershell -PackageName "PowerShell"

    # Runtimes & SDKs
    Install-Software -PackageId OpenJS.NodeJS -PackageName "Node.js"
    Install-Software -PackageId Python.Python.3.12 -PackageName "Python 3.12"
    Install-Software -PackageId Microsoft.DotNet.SDK.8 -PackageName ".NET SDK 8"
    Install-Software -PackageId Microsoft.OpenJDK.17 -PackageName "Java JDK 17"

    # Virtualization & Containers
    Install-Software -PackageId Docker.DockerDesktop -PackageName "Docker Desktop"

    # IDEs & Editors
    Install-Software -PackageId Microsoft.VisualStudioCode -PackageName "Visual Studio Code"
    # Install-Software -PackageId Microsoft.VisualStudio.2022.Community -PackageName "Visual Studio 2022 Community Edition"
    Install-Software -PackageId Microsoft.VisualStudio.2022.BuildTools -PackageName "Visual Studio 2022 Build Tools"

    # Browsers
    Install-Software -PackageId Mozilla.Firefox -PackageName "Firefox"
    Install-Software -PackageId Google.Chrome -PackageName "Chrome"

    # Utilities
    Install-Software -PackageId 7zip.7zip -PackageName "7-Zip"

    # Additional Tools
    Install-Software -PackageId flux.flux -PackageName "Flux"
    Install-Software -PackageId GitHub.GitHubDesktop -PackageName "GitHub Desktop"
    Write-Host "All software installed successfully."
}
catch {
    Write-Host ("Script failed: {0}" -f $($_.Exception.Message))
    Write-Host "Installation script failed. Check transcript log for details."
    if (Get-Transcript) { Stop-Transcript }
    exit 1
}

Write-Host "Installation script completed. Full transcript saved to $transcriptLog"
if (Get-Transcript) { Stop-Transcript }
exit 0
