# build-and-load.ps1 - Construire les images Docker et les charger dans le cluster (minikube/kind)
param(
  [string]$Tag = "local",
  [string]$Registry = ""
)

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Construction des images pour l'application 3-tiers (front/back)..." -ForegroundColor Cyan

# Backend
Push-Location "$projectRoot\3tiers-backend"
docker build -t "3tiers-backend:$Tag" .
if ($Registry) {
  docker tag "3tiers-backend:$Tag" "$Registry/3tiers-backend:$Tag"
  docker push "$Registry/3tiers-backend:$Tag"
}
Pop-Location

# Frontend
Push-Location "$projectRoot\3tiers-frontend"
docker build -t "3tiers-frontend:$Tag" .
if ($Registry) {
  docker tag "3tiers-frontend:$Tag" "$Registry/3tiers-frontend:$Tag"
  docker push "$Registry/3tiers-frontend:$Tag"
}
Pop-Location

# Charger dans minikube si disponible
if (Get-Command minikube -ErrorAction SilentlyContinue) {
  Write-Host "minikube détecté : chargement des images..." -ForegroundColor Yellow
  minikube image load "3tiers-backend:$Tag"
  minikube image load "3tiers-frontend:$Tag"
}

# Charger dans kind si disponible
if (Get-Command kind -ErrorAction SilentlyContinue) {
  $contexts = kind get clusters 2>$null
  if ($contexts) {
    Write-Host "kind détecté : chargement des images..." -ForegroundColor Yellow
    kind load docker-image "3tiers-backend:$Tag" 2>$null
    kind load docker-image "3tiers-frontend:$Tag" 2>$null
  }
}

Write-Host "Terminé." -ForegroundColor Green
