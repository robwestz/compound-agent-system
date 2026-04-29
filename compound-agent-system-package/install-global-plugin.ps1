param(
  [ValidateSet("codex", "claude", "both")]
  [string]$Client = "both",
  [string]$CodexPluginHome = "$env:USERPROFILE\plugins",
  [string]$CodexMarketplacePath = "$env:USERPROFILE\.agents\plugins\marketplace.json",
  [string]$ClaudeMarketplaceHome = "$env:USERPROFILE\.claude\plugins\marketplaces\compound-agent-system"
)

$ErrorActionPreference = "Stop"
$SourcePlugin = Join-Path $PSScriptRoot "plugins\compound-agent-system"

if (-not (Test-Path -LiteralPath $SourcePlugin)) {
  throw "Source plugin not found: $SourcePlugin"
}

if ($Client -eq "codex" -or $Client -eq "both") {
  $TargetPlugin = Join-Path $CodexPluginHome "compound-agent-system"
  New-Item -ItemType Directory -Force -Path $CodexPluginHome | Out-Null
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $CodexMarketplacePath) | Out-Null

  if (Test-Path -LiteralPath $TargetPlugin) {
    Write-Host "Updating Codex plugin: $TargetPlugin"
  } else {
    Write-Host "Installing Codex plugin: $TargetPlugin"
  }

  Copy-Item -LiteralPath $SourcePlugin -Destination $CodexPluginHome -Recurse -Force

  if (Test-Path -LiteralPath $CodexMarketplacePath) {
    $marketplace = Get-Content -LiteralPath $CodexMarketplacePath -Raw | ConvertFrom-Json
  } else {
    $marketplace = [pscustomobject]@{
      name = "local"
      interface = [pscustomobject]@{ displayName = "Local Plugins" }
      plugins = @()
    }
  }

  $plugins = @($marketplace.plugins | Where-Object { $_.name -ne "compound-agent-system" })
  $entry = [pscustomobject]@{
    name = "compound-agent-system"
    source = [pscustomobject]@{
      source = "local"
      path = "./plugins/compound-agent-system"
    }
    policy = [pscustomobject]@{
      installation = "AVAILABLE"
      authentication = "ON_INSTALL"
    }
    category = "Productivity"
  }
  $marketplace.plugins = @($plugins + $entry)
  $marketplace | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $CodexMarketplacePath -Encoding UTF8

  Write-Host "Codex marketplace updated: $CodexMarketplacePath"
  Write-Host "Codex plugin installed at: $TargetPlugin"
}

if ($Client -eq "claude" -or $Client -eq "both") {
  $ClaudePluginDir = Join-Path $ClaudeMarketplaceHome "plugins"
  $ClaudePluginTarget = Join-Path $ClaudePluginDir "compound-agent-system"
  New-Item -ItemType Directory -Force -Path $ClaudePluginDir | Out-Null

  if (Test-Path -LiteralPath $ClaudePluginTarget) {
    Write-Host "Updating Claude marketplace plugin: $ClaudePluginTarget"
  } else {
    Write-Host "Staging Claude marketplace plugin: $ClaudePluginTarget"
  }

  Copy-Item -LiteralPath $SourcePlugin -Destination $ClaudePluginDir -Recurse -Force

  $claudeMarketplace = [pscustomobject]@{
    name = "compound-agent-system"
    owner = [pscustomobject]@{
      name = "Robin Westerlund"
      email = "analys@camjo.se"
    }
    metadata = [pscustomobject]@{
      description = "Local Claude Code marketplace entry for the Compound Agent System workspace harness."
    }
    plugins = @(
      [pscustomobject]@{
        name = "compound-agent-system"
        source = "./plugins/compound-agent-system"
        description = "Workspace harness for task ledger, DoD gates, handoff bridge, agent profiles, and portable verification."
        author = [pscustomobject]@{
          name = "Robin Westerlund"
          email = "analys@camjo.se"
        }
        category = "productivity"
      }
    )
  }
  $claudeMarketplace | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $ClaudeMarketplaceHome "marketplace.json") -Encoding UTF8

  Write-Host "Claude marketplace staged at: $ClaudeMarketplaceHome"
  Write-Host "In Claude Code, run:"
  Write-Host "  /plugin marketplace add $ClaudeMarketplaceHome"
  Write-Host "  /plugin install compound-agent-system@compound-agent-system"
  Write-Host "For development without marketplace install:"
  Write-Host "  claude --plugin-dir $ClaudePluginTarget"
}
