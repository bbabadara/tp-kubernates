param(
  [string]$Namespace = "tp-app"
)

Write-Host "Vérification du déploiement (réplicas, services, communication)..." -ForegroundColor Cyan

Write-Host "`n=== Pods ===" -ForegroundColor Yellow
kubectl get pods -n $Namespace -o wide

Write-Host "`n=== Services ===" -ForegroundColor Yellow
kubectl get svc -n $Namespace

Write-Host "`n=== Ingress ===" -ForegroundColor Yellow
kubectl get ingress -n $Namespace

Write-Host "`n=== Deployments ===" -ForegroundColor Yellow
kubectl get deployments -n $Namespace

Write-Host "`n=== Frontend replicas ===" -ForegroundColor Yellow
kubectl get deployment frontend -n $Namespace -o jsonpath='{.status.readyReplicas}/{.spec.replicas}{"\n"}'

Write-Host "`n=== Backend replicas ===" -ForegroundColor Yellow
kubectl get deployment backend -n $Namespace -o jsonpath='{.status.readyReplicas}/{.spec.replicas}{"\n"}'

Write-Host "`n=== Test backend health ===" -ForegroundColor Yellow
$backendPod = (kubectl get pods -n $Namespace -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $Namespace $backendPod -- wget -qO- http://localhost:5000/api/health

Write-Host "`n=== Test DB connectivity depuis backend ===" -ForegroundColor Yellow
kubectl exec -n $Namespace $backendPod -- node -e "
const {Client}=require('pg');
const c=new Client({host:'postgres',port:5432,user:process.env.DB_USER||'$((kubectl get secret app-secrets -n tp-app -o jsonpath='{.data.DB_USER}')|base64 -d)',password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
c.connect().then(()=>{console.log('OK');return c.end();}).catch(e=>{console.error('ERR',e.message);process.exit(1);});
" 2>&1 | tail -5
