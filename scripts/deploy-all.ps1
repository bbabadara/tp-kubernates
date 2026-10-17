param(
  [string]$Namespace = "tp-app"
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$k8sPath = "$projectRoot\k8s"

Write-Host "Déploiement sur le namespace $Namespace..." -ForegroundColor Cyan

kubectl apply -f "$k8sPath\namespace\namespace.yaml"

kubectl apply -f "$k8sPath\config\configmap.yaml" -n $Namespace
kubectl apply -f "$k8sPath\config\secret.yaml" -n $Namespace

kubectl apply -f "$k8sPath\db\postgres-pvc.yaml" -n $Namespace
kubectl apply -f "$k8sPath\db\postgres-configmap.yaml" -n $Namespace
kubectl apply -f "$k8sPath\db\postgres-deployment.yaml" -n $Namespace
kubectl apply -f "$k8sPath\db\postgres-service.yaml" -n $Namespace

Write-Host "Attente du démarrage de PostgreSQL..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=postgres -n $Namespace --timeout=120s

kubectl apply -f "$k8sPath\backend\backend-deployment.yaml" -n $Namespace
kubectl apply -f "$k8sPath\backend\backend-service.yaml" -n $Namespace

Write-Host "Attente du démarrage du backend..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=backend -n $Namespace --timeout=180s

kubectl apply -f "$k8sPath\frontend\frontend-deployment.yaml" -n $Namespace
kubectl apply -f "$k8sPath\frontend\frontend-service.yaml" -n $Namespace
kubectl apply -f "$k8sPath\frontend\ingress.yaml" -n $Namespace

kubectl get pods -n $Namespace
kubectl get svc -n $Namespace
kubectl get ingress -n $Namespace

Write-Host "Déploiement terminé." -ForegroundColor Green
