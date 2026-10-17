# TP : Déployer une application 3-tiers (Front + Back + PostgreSQL) sur Kubernetes

## 1. Objectifs

À l'issue de ce TP, vous serez capable de :

- Comprendre l'architecture 3-tiers (Frontend, Backend, Base de données)
- Containeriser une application existante avec Docker
- Déployer des ressources Kubernetes (Namespace, ConfigMap, Secret, PVC, Deployment, Service, Ingress)
- Assurer la haute disponibilité (2 réplicas frontend, 3 réplicas backend)
- Gérer le stockage persistant pour PostgreSQL
- Mettre en place la découverte de services via DNS Kubernetes
- Configurer un nom de domaine via Ingress (local)
- Vérifier la communication inter-composants et la persistance des données
- Appliquer les bonnes pratiques (séparation config/sensibles, ressources, health probes)

## 2. Contexte

On utilise ici les projets existants du dossier `tp/` :

- `3tiers-frontend/` : Application React (CRA). Buildé dans une image Nginx. `nginx.conf` proxie `/api` vers `http://backend:5000`.
- `3tiers-backend/` : API Node.js/Express + Sequelize. Se connecte à PostgreSQL via variables d'environnement (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). Endpoint `/api/health`.
- `database/init.sql` : Schéma + données initiales de catégories.

## 3. Architecture cible

```
Navigateur
    │
    ▼
Ingress (todo-app.local) ──► Frontend Service (LoadBalancer/NodePort)
                                └─► Frontend Pods (2) : Nginx sert build React + proxy /api
                                        │
                                        └─── HTTP /api ──► Backend Service (ClusterIP)
                                                            └─► Backend Pods (3) : Node/Express API
                                                                    │
                                                                    └─── TCP 5432 ──► PostgreSQL Service (ClusterIP)
                                                                                    └─► PostgreSQL Pod (1) + PVC (data persistée)
```

Points clés :

- **Frontend** : accessible publiquement via Ingress/LoadBalancer. Sert l'UI et relaie `/api` vers le backend.
- **Backend** : accessible uniquement depuis le cluster (ClusterIP). Exposé à l'extérieur uniquement via Ingress sur `/api`.
- **PostgreSQL** : **jamais exposé publiquement**. Uniquement accessible par le backend via `postgres.tp-app.svc.cluster.local:5432`.
- **Haute disponibilité** : Frontend 2 réplicas, Backend 3 réplicas. Si un Pod tombe, Kubernetes relance + Service redistribue le trafic.
- **Persistance** : Données PostgreSQL dans un `PersistentVolumeClaim` monté sur `/var/lib/postgresql/data`. Survivant aux redémarrages/suppressions de Pod.

## 4. Pré-requis

Avant de démarrer, vérifier les outils suivants :

| Outil | Vérification | Notes |
|---|---|---|
| Docker | `docker --version` | Pour builder les images front/back |
| kubectl | `kubectl version --client` | CLI Kubernetes |
| Cluster K8s | `kubectl cluster-info` | minikube / kind / kubeadm / k3d / Docker Desktop |
| minikube (optionnel) | `minikube status` / `minikube version` | Utile pour charger images localement |
| kind (optionnel) | `kind version` / `kind get clusters` | Alternative à minikube |

**Remarque importante** : Si `kubectl cluster-info` échoue (connexion refusée), démarrez votre cluster (`minikube start`, `kind create cluster`, ou activez Kubernetes dans Docker Desktop).

## 5. Organisation des fichiers

Tous les manifests/scripts/docs sont déjà créés dans ce répertoire.

```bash
tp/
├── 3tiers-backend/      # Code backend existant
├── 3tiers-frontend/     # Code frontend existant
├── database/            # init.sql existant
├── k8s/                 # Manifests Kubernetes
├── scripts/             # Scripts PowerShell de build/deploy/verify
└── docs/                # Ce document pédagogique
```

## 6. Étape par étape

### Étape 1 : Comprendre les projets existants

Objectif : s'assurer que le code est cohérent avec ce qu'on va déployer.

**Backend - variables attendues**

Fichier : `3tiers-backend/.env` (référence)

```env
PORT=5000
DB_HOST=database
DB_PORT=5432
DB_NAME=productdb
DB_USER=productdb_user
DB_PASSWORD=p&Ho8t9p@Cz5CazG
```

Dans Kubernetes, le nom du Service PostgreSQL sera **`postgres`**. C'est pourquoi nos manifests utilisent `DB_HOST: postgres`.

**Backend - health check**

`server.js` expose `GET /api/health` → utilisé par nos `readiness/liveness/startupProbes`.

**Frontend - routage API**

`3tiers-frontend/nginx.conf` :

```nginx
location /api {
    proxy_pass http://backend:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

En K8s, le Service backend s'appelle `backend` dans le namespace `tp-app`. Le nom DNS est donc `backend.tp-app.svc.cluster.local`. Nginx pourra donc résoudre `backend:5000` grâce au DNS interne Kubernetes.

### Étape 2 : Créer/visualiser Namespace, ConfigMap, Secret

**Namespace** (`k8s/namespace/namespace.yaml`)

Isole toutes nos ressources dans `tp-app`. Permet de mieux organiser, appliquer des quotas, RBAC si besoin.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tp-app
```

**ConfigMap** (`k8s/config/configmap.yaml`)

Contient les paramètres **non sensibles** partagés entre composants.

- `REACT_APP_API_URL: "/api"` : l'URL que le frontend utilisera pour appeler l'API. Avec Ingress, tout passe par le même host.
- `NODE_ENV`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `PORT`

**Secret** (`k8s/config/secret.yaml`)

Contient les données **sensibles** (identifiants). En production on privilégierait External Secrets/Sealed Secrets/Vault. Pour ce TP, `stringData` est suffisant.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: tp-app
type: Opaque
stringData:
  DB_USER: productdb_user
  DB_PASSWORD: "p&Ho8t9p@Cz5CazG"
  DB_NAME: productdb
  DB_HOST: postgres
  DB_PORT: "5432"
  PORT: "5000"
  NODE_ENV: production
```

### Étape 3 : Déployer PostgreSQL avec persistance

L'objectif est d'avoir une base **persistante** et **interne** au cluster.

**3a) PersistentVolumeClaim** (`k8s/db/postgres-pvc.yaml`)

Demande 1Gi de stockage avec accès `ReadWriteOnce` (monter sur **un seul** nœud à la fois). Selon votre environnement, un `StorageClass` peut être requis (`standard`, `local-path`, `hostpath`, ...). Si non précisé, le default du cluster est utilisé.

**3b) Init SQL** (`k8s/db/postgres-configmap.yaml`)

On monte `init.sql` dans `/docker-entrypoint-initdb.d/`. À la **première** initialisation uniquement (si le volume est vide), PostgreSQL exécutera automatiquement ce script et créera tables + catégories.

**3c) Deployment PostgreSQL** (`k8s/db/postgres-deployment.yaml`)

- Image : `postgres:15-alpine` (légère, stable)
- Variables injectées depuis `Secret`
- Volumes :
  - `postgres-storage` : monté sur `/var/lib/postgresql/data` → **persistance**
  - `init-sql` : monté en lecture seule dans `docker-entrypoint-initdb.d`
- Probes : `pg_isready` pour s'assurer que Postgres accepte bien les connexions
- Resources : `requests/limits` pour éviter la surconsommation

**3d) Service PostgreSQL** (`k8s/db/postgres-service.yaml`)

```yaml
type: ClusterIP
port: 5432 -> targetPort: 5432
selector: app=postgres
```

`ClusterIP` signifie **inaccessible depuis l'extérieur du cluster**. Seuls les Pods du même namespace (ici backend) peuvent y accéder via `postgres:5432`.

### Étape 4 : Déployer le Backend (API) en HA

**Deployment** (`k8s/backend/backend-deployment.yaml`)

- `replicas: 3` → **Haute disponibilité**. 3 instances identiques pour répartir la charge et tolérer la panne d'1-2 Pods.
- `RollingUpdate` : mise à jour progressive sans indisponibilité (`maxUnavailable: 1`, `maxSurge: 1`)
- Image : `3tiers-backend:local` (construite localement)
- Variables d'env : toutes celles nécessaires à Sequelize (`DB_*`, `PORT`, `NODE_ENV`)
- Probes :
  - `readinessProbe` : Pod prêt à recevoir du trafic ? (dépend connexions DB)
  - `livenessProbe` : Pod sain ? Si échec répété → redémarrage
  - `startupProbe` : laisse le temps au Pod de se connecter à Postgres au démarrage

**Service** (`k8s/backend/backend-service.yaml`)

`type: ClusterIP`. Le frontend (via nginx) et les autres composants internes accèdent au backend via ce Service. Kubernetes fait du **load-balancing** entre les 3 réplicas automatiquement.

### Étape 5 : Déployer le Frontend en HA

**Deployment** (`k8s/frontend/frontend-deployment.yaml`)

- `replicas: 2` → HA pour l'interface
- `RollingUpdate` identique au backend
- Image : `3tiers-frontend:local` (nginx-unprivileged + build React, écoute sur **8080**)
- `containerPort: 8080` (nginx tourne en utilisateur non-root, donc port > 1024)
- `REACT_APP_API_URL` injecté via ConfigMap (même si déjà dans build, cohérent avec l'environnement)
- Probes sur `/` (page d'accueil)

**Service** (`k8s/frontend/frontend-service.yaml`)

```yaml
type: LoadBalancer
port: 80 -> targetPort: 8080   # nginx non-root écoute sur 8080
```

- **Sur cloud** (AKS/EKS/GKE) : provisionne un LoadBalancer externe avec IP publique.
- **Sur minikube** : `type=LoadBalancer` fonctionne avec `minikube tunnel` dans un autre terminal (ou utiliser `NodePort`).
- **Sur kind/Docker Desktop** : souvent besoin de `NodePort` ou port-mapping.

**Ingress** (`k8s/frontend/ingress.yaml`)

Permet d'accéder à l'app via un **nom de domaine** (HTTP/HTTPS) au lieu d'IP:PORT.

Règles :

```yaml
- host: todo-app.local
  http:
    paths:
      - path: /        -> frontend:80
      - path: /api     -> backend:5000
```

**Remarques** :

- L'ordre des paths est important. `/api` doit être routé vers backend, `/` vers frontend.
- `ingressClassName: nginx` peut être requis selon votre Ingress Controller (`nginx-ingress-controller` installé ?). Si non installé, l'Ingress restera `Pending`.
- Pour HTTPS : décommenter `tls:` + `cert-manager`/secret TLS.

### Étape 6 : Construire les images Docker

Depuis la racine `tp/`, on construit `3tiers-backend:local` et `3tiers-frontend:local`.

**Méthode 1 : Script PowerShell (recommandé)**

Ouvrir PowerShell dans `tp/` :

```powershell
.\scripts\build-and-load.ps1 -Tag local
```

Ce script :

1. Build `3tiers-backend:local` depuis `3tiers-backend/`
2. Build `3tiers-frontend:local` depuis `3tiers-frontend/`
3. Si `minikube` détecté → `minikube image load ...`
4. Si `kind` détecté → `kind load docker-image ...`

**Méthode 2 : Manuelle**

```powershell
cd .\3tiers-backend
docker build -t 3tiers-backend:local .
cd ..\3tiers-frontend
docker build -t 3tiers-frontend:local .
cd ..
```

Puis charger dans le cluster si besoin (minikube/kind).

Vérifier les images locales :

```powershell
docker images | findstr 3tiers
```

### Étape 7 : Déployer sur Kubernetes

**Vérifier connexion cluster**

```powershell
kubectl cluster-info
kubectl get nodes
```

**Déployer avec le script**

Depuis `tp/` :

```powershell
.\scripts\deploy-all.ps1 -Namespace tp-app
```

Le script exécute dans cet ordre :

1. `namespace.yaml`
2. `configmap.yaml` + `secret.yaml`
3. PostgreSQL (PVC, ConfigMap init, Deployment, Service)
4. **Attente** `ready` de PostgreSQL (`kubectl wait`)
5. Backend (Deployment, Service) + **attente** ready
6. Frontend (Deployment, Service, Ingress)
7. Affiche `pods`, `svc`, `ingress`, `deployments`

**Déploiement manuel (pour comprendre)**

```powershell
kubectl apply -f k8s/namespace/namespace.yaml

kubectl apply -f k8s/config/configmap.yaml -n tp-app
kubectl apply -f k8s/config/secret.yaml -n tp-app

# DB
kubectl apply -f k8s/db/postgres-pvc.yaml -n tp-app
kubectl apply -f k8s/db/postgres-configmap.yaml -n tp-app
kubectl apply -f k8s/db/postgres-deployment.yaml -n tp-app
kubectl apply -f k8s/db/postgres-service.yaml -n tp-app

kubectl wait --for=condition=ready pod -l app=postgres -n tp-app --timeout=120s

# Backend
kubectl apply -f k8s/backend/backend-deployment.yaml -n tp-app
kubectl apply -f k8s/backend/backend-service.yaml -n tp-app

kubectl wait --for=condition=ready pod -l app=backend -n tp-app --timeout=180s

# Frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml -n tp-app
kubectl apply -f k8s/frontend/frontend-service.yaml -n tp-app
kubectl apply -f k8s/frontend/ingress.yaml -n tp-app
```

### Étape 8 : Vérifier le déploiement

**Avec le script de vérification**

```powershell
.\scripts\verify.ps1 -Namespace tp-app
```

**Vérifications manuelles indispensables**

1) **Pods en Running/Ready**

```powershell
kubectl get pods -n tp-app -o wide
```

Attendu : `postgres-xxx` 1/1, `backend-xxx` 3/3, `frontend-xxx` 2/2.

2) **Déploiements & réplicas**

```powershell
kubectl get deploy -n tp-app
kubectl get deploy frontend -n tp-app -o jsonpath='{.status.readyReplicas}/{.spec.replicas}'; echo
kubectl get deploy backend  -n tp-app -o jsonpath='{.status.readyReplicas}/{.spec.replicas}'; echo
```

Attendu : `frontend 2/2`, `backend 3/3`.

3) **Services**

```powershell
kubectl get svc -n tp-app
```

- `postgres` : ClusterIP (10.x.x.x) → interne uniquement
- `backend`  : ClusterIP → interne uniquement
- `frontend` : LoadBalancer/NodePort selon cluster

4) **Ingress**

```powershell
kubectl get ingress -n tp-app
kubectl describe ingress frontend-ingress -n tp-app
```

Si `ADDRESS` vide → vérifier que l'Ingress Controller tourne (`kubectl get pods -n ingress-nginx`).

5) **Health check backend depuis un Pod**

```powershell
$bp = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $bp -- wget -qO- http://localhost:5000/api/health
```

Résultat attendu : `{"status":"OK",...}`

6) **Vérifier la connexion DB depuis backend**

```powershell
$bp = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $bp -- node -e "
const {Client}=require('pg');
const c=new Client({host:'postgres',port:5432,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
c.connect().then(()=>{console.log('DB_CONNECT_OK');return c.end();}).catch(e=>{console.error('ERR',e.message);process.exit(1);});
"
```

Doit afficher `DB_CONNECT_OK`.

7) **Vérifier tables créées dans Postgres**

```powershell
$pp = kubectl get pods -n tp-app -l app=postgres -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "\dt"
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "SELECT * FROM categories;"
```

### Étape 9 : Accéder à l'application

**A) Via Service LoadBalancer (frontend)**

```powershell
kubectl get svc frontend -n tp-app
```

Récupérer `EXTERNAL-IP`. Si `<pending>` (minikube sans tunnel) :

```powershell
minikube tunnel  # dans un 2e terminal
# ou
minikube service frontend -n tp-app
```

Puis ouvrir `http://<EXTERNAL-IP>/`

**B) Via NodePort**

Si vous changez `frontend-service.yaml` en `type: NodePort`, récupérer `NODE_PORT` :

```powershell
kubectl get svc frontend -n tp-app -o jsonpath='{.spec.ports[0].nodePort}'; echo
# IP noeud : minikube ip ou IP Docker Desktop
```

Ouvrir `http://<NODE-IP>:<NODE-PORT>/`

**C) Via Ingress (nom de domaine)**

1) S'assurer que l'Ingress Controller est actif

```powershell
kubectl get pods -n ingress-nginx
```

Si absent → installer (ex. minikube: `minikube addons enable ingress`)

2) Ajouter une entrée DNS locale

**Windows** : `C:\Windows\System32\drivers\etc\hosts` (en tant qu'admin)

```text
127.0.0.1 todo-app.local
```

**Linux/Mac** : `/etc/hosts`

```text
127.0.0.1 todo-app.local
```

3) Accéder à `http://todo-app.local`

Selon votre setup (minikube avec tunnel, port-forward Ingress, kind avec extraPortMappings), l'Ingress peut être joignable via `127.0.0.1` ou IP du cluster.

Astuce minikube :

```powershell
minikube addons enable ingress
minikube tunnel  # si LoadBalancer requis ailleurs
# ou
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
# puis http://todo-app.local:8080
```

**Vérifier l'API via Ingress**

```powershell
curl http://todo-app.local/api/health
# ou depuis navigateur/Invoke-RestMethod
Invoke-RestMethod http://todo-app.local/api/health
```

### Étape 10 : Tester Haute Disponibilité (HA)

L'objectif : prouver que l'app reste accessible malgré la chute de Pods.

**A) Vérifier répartition backend**

```powershell
$pods = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[*].metadata.name}'; echo $pods
```

**B) Tuer un Pod backend et observer**

```powershell
# Supprimer un Pod backend aléatoirement
$bp = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[0].metadata.name}'
kubectl delete pod $bp -n tp-app
```

Observer immédiatement :

```powershell
kubectl get pods -n tp-app -l app=backend -w
# Ctrl+C pour sortir
```

Résultat attendu : le Pod supprimé passe `Terminating` puis un **nouveau** Pod `Pending→ContainerCreating→Running` apparaît. `READY 3/3` revient rapidement (grâce à `replicas: 3` + Deployment).

**C) Tuer un Pod frontend**

Même démarche avec `frontend` :

```powershell
$fp = kubectl get pods -n tp-app -l app=frontend -o jsonpath='{.items[0].metadata.name}'
kubectl delete pod $fp -n tp-app
kubectl get pods -n tp-app -l app=frontend -w
```

L'application reste accessible dans le navigateur pendant ce temps (Service route vers l'autre réplique).

**D) Tester résilience via curl répété (facultatif)**

```powershell
# Si accessible via Ingress
for ($i=1; $i -le 15; $i++) { 
  try { (Invoke-RestMethod http://todo-app.local/api/health).status; Start-Sleep -s 1 } 
  catch { Write-Host "ERR" }
}
```

Aucun `ERR` ne doit apparaître pendant le redémarrage d'un Pod.

### Étape 11 : Tester la persistance des données

Vérifions que les données survivent à un redémarrage de PostgreSQL.

**1) Créer/voir données existantes**

```powershell
$pp = kubectl get pods -n tp-app -l app=postgres -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "SELECT id,nom FROM categories ORDER BY id;"
```

**2) Insérer une donnée test**

```powershell
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "INSERT INTO categories (nom, description) VALUES ('TEST_K8S', 'Donnée de test persistance') ON CONFLICT DO NOTHING;"
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "SELECT * FROM categories WHERE nom='TEST_K8S';"
```

**3) Supprimer le Pod PostgreSQL**

```powershell
kubectl delete pod $pp -n tp-app
```

**4) Attendre qu'il revienne up**

```powershell
kubectl wait --for=condition=ready pod -l app=postgres -n tp-app --timeout=120s
kubectl get pods -n tp-app -l app=postgres
```

**5) Vérifier que la donnée est toujours là**

```powershell
$pp2 = kubectl get pods -n tp-app -l app=postgres -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $pp2 -- psql -U productdb_user -d productdb -c "SELECT * FROM categories WHERE nom='TEST_K8S';"
```

**Résultat attendu** : la ligne `TEST_K8S` est toujours présente. Si oui → **persistance validée** via PVC.

*(Facultatif : nettoyer)*

```powershell
kubectl exec -n tp-app $pp2 -- psql -U productdb_user -d productdb -c "DELETE FROM categories WHERE nom='TEST_K8S';"
```

### Étape 12 : Vérifier la communication Frontend↔Backend↔DB

**Depuis le navigateur**

Ouvrir `http://todo-app.local` (ou IP LoadBalancer). Tester :

- Affichage de la liste des catégories/produits (chargée depuis API)
- Créer un produit/catégorie
- Modifier/Supprimer
- Rafraîchir la page

Si toutes ces actions fonctionnent → la chaîne **Frontend → Ingress/Service → Backend → Postgres** est opérationnelle.

**Depuis un Pod backend (trace réseau)**

```powershell
$bp = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[0].metadata.name}'
# Résolution DNS
kubectl exec -n tp-app $bp -- nslookup postgres
kubectl exec -n tp-app $bp -- nslookup backend
# Connectivité
kubectl exec -n tp-app $bp -- nc -vz postgres 5432
kubectl exec -n tp-app $bp -- wget -qO- http://backend:5000/api/health
```

## 7. Bonnes pratiques appliquées

| Pratique | Justification |
|---|---|
| **Namespace dédié** | Isolation, clarté, nettoyage facile |
| **ConfigMap vs Secret** | Séparer config non-sensible / credentials |
| **ClusterIP pour DB/Backend** | Réduire surface d'attaque (pas d'exposition publique) |
| **PVC pour PostgreSQL** | Données durables malgré cycle de vie Pod |
| **Health Probes** | Auto-réparation (restart) + trafic uniquement vers Pods sains |
| **RollingUpdate** | Zéro-downtime lors de mises à jour |
| **Resources requests/limits** | QoS, évite "noisy neighbor", meilleur scheduling |
| **DNS Service** | Découplage noms → pas d'IPs en dur |
| **Ingress pour routage** | Point d'entrée unique + possibilité TLS + règles host/path |

## 8. Dépannage courant

| Problème | Cause probable | Solution |
|---|---|---|
| `ImagePullBackOff` | Image non trouvée dans cluster | Vérifier `imagePullPolicy: IfNotPresent`. Charger avec `minikube image load` / `kind load`. Ou utiliser registry. |
| `CrashLoopBackOff` backend | Ne parvient pas à se connecter à Postgres | Vérifier Secret/ConfigMap, ordre de démarrage (DB d'abord), logs backend. |
| `Pending` PVC | Pas de StorageClass disponible | `kubectl get sc`. Ajuster `storageClassName` ou activer default storage (minikube addon `storage-provisioner`). |
| Ingress `ADDRESS: <none>` | Ingress Controller non installé | `minikube addons enable ingress` ou installer `ingress-nginx`. |
| `Connection refused` vers frontend via Ingress | Tunnel/port-forward manquant | `minikube tunnel` ou `kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 80:80`. |
| Backend 503 via /api | Service backend incorrect ou selector mismatch | `kubectl describe svc backend -n tp-app` + `kubectl get pods -l app=backend -n tp-app --show-labels` |
| Données perdues après delete postgres | PVC supprimé ou StorageClass ReclaimPolicy=Delete | Ne **jamais** supprimer PVC sauf volontairement. Vérifier `kubectl get pvc -n tp-app`. |

**Commandes logs utiles**

```powershell
kubectl logs -n tp-app -l app=backend --tail=40
kubectl logs -n tp-app -l app=frontend --tail=20
kubectl logs -n tp-app -l app=postgres --tail=30
kubectl describe pod <pod> -n tp-app
kubectl events -n tp-app --sort-by=.lastTimestamp
```

## 9. Nettoyage

Pour supprimer **complètement** l'environnement TP :

```powershell
kubectl delete namespace tp-app
# OU supprimer ressources une par une mais namespace est plus simple
```

Vérifier :

```powershell
kubectl get all -n tp-app
```

Doit retourner `No resources found`.

## 10. Checklist de validation (à rendre)

Avant validation, cocher ces points :

- [ ] Images `3tiers-backend:local` et `3tiers-frontend:local` construites avec succès
- [ ] Namespace `tp-app` créé
- [ ] ConfigMap + Secret appliqués
- [ ] PostgreSQL : Deployment 1, Service ClusterIP, PVC lié, init.sql exécuté
- [ ] Backend : Deployment 3 réplicas **Ready 3/3**, Service ClusterIP, probes OK
- [ ] Frontend : Deployment 2 réplicas **Ready 2/2**, Service LoadBalancer/NodePort, Ingress configuré
- [ ] Communication backend↔postgres validée (`DB_CONNECT_OK`)
- [ ] `/api/health` accessible depuis backend et via Ingress
- [ ] Application accessible via domaine `todo-app.local` (ou IP)
- [ ] Test HA : suppression Pod backend → nouveau Pod recréé, réplicas restaurés
- [ ] Test persistance : insertion donnée → suppression Pod postgres → donnée toujours présente
- [ ] Frontend consomme bien l'API (CRUD fonctionne)
- [ ] DB non exposée publiquement (seul ClusterIP)
- [ ] Manifests, scripts, ce document présents dans `tp/`

## 11. Commandes "raccourcis" à garder sous le coude

```powershell
# État global
kubectl get all,pvc,ingress,configmap,secret -n tp-app

# Restart rollout si changement image
kubectl rollout restart deploy/backend -n tp-app
kubectl rollout restart deploy/frontend -n tp-app
kubectl rollout status deploy/backend -n tp-app

# Scale (pour tester)
kubectl scale deploy/frontend --replicas=3 -n tp-app
kubectl scale deploy/backend  --replicas=5 -n tp-app

# Accès shell
kubectl exec -it -n tp-app <pod> -- sh  # alpine
kubectl exec -it -n tp-app <pod> -- bash # debian/ubuntu
```

**Fin du TP. Objectif atteint : déploiement 3-tiers fonctionnel, hautement disponible, persistant et sécurisé au niveau cluster.**
