# GUIDE D'EXÉCUTION PAS À PAS — Déploiement 3-tiers sur Kubernetes

**Objectif :** Exécuter le déploiement des projets existants (`3tiers-frontend`, `3tiers-backend`, `database`) sur le cluster minikube, étape par étape, en vérifiant chaque point.

## 1. Pré-requis et vérification initiale

Ouvrir PowerShell en mode administrateur (recommandé pour hosts + minikube tunnel).

Vérifier les outils disponibles :

```powershell
docker --version
kubectl version --client
minikube version
kubectl config current-context
```

Attendu : `current-context = minikube`.

## 2. Démarrer Docker Desktop

Docker Desktop doit être démarré (engine WSL/containerd). Si arrêté :

1. Lancer **Docker Desktop**
2. Attendre que l'icône Docker devienne "Running"
3. Vérifier : `docker ps` doit retourner (vide ou liste) sans erreur "pipe introuvable"

## 3. Démarrer le cluster minikube

### 3.1 Démarrage

```powershell
minikube start --driver=docker
```

Si déjà démarré mais injoignable (erreur dial tcp 127.0.0.1:52043), arrêter puis relancer :

```powershell
minikube stop
minikube start --driver=docker
```

### 3.2 Vérification

```powershell
minikube status
kubectl cluster-info
kubectl get nodes -o wide
```

Tous doivent être **Ready/Running**.

## 4. Activer l'Ingress Controller

L'Ingress `todo-app.local` nécessite l'addon `ingress-nginx`.

```powershell
minikube addons enable ingress
```

Attendre que le controller soit prêt (peut prendre 1–2 min) :

```powershell
kubectl get pods -n ingress-nginx --watch
```

Appuyer sur `Ctrl+C` quand tous les pods sont `Running/Ready` (1/1 ou 2/2 selon version).

Vérification rapide :

```powershell
kubectl get pods -n ingress-nginx
```

## 5. Builder et charger les images Docker

Depuis la racine du TP :

```powershell
cd C:\Users\bbaba\OneDrive\Bureau\master\bbaly\docker-avancer\Kubernates\tp
.\scripts\build-and-load.ps1 -Tag local
```

**Ce que fait le script :**
- `docker build` backend → `3tiers-backend:local`
- `docker build` frontend → `3tiers-frontend:local`
- `minikube image load` des 2 images (indispensable avec containerd)

Vérifier après exécution :

```powershell
minikube image ls | Select-String "3tiers"
```

Doit afficher `3tiers-backend:local` et `3tiers-frontend:local`.

## 6. Déployer les manifests Kubernetes

Toujours depuis la racine `tp/`.

```powershell
.\scripts\deploy-all.ps1 -Namespace tp-app
```

**Ordre exécuté :** Namespace → ConfigMap/Secret → PostgreSQL (PVC+init) → attendre DB ready → Backend (3 réplicas) → attendre ready → Frontend (2 réplicas) + Ingress.

À la fin, le script affiche automatiquement `pods`, `svc`, `ingress`, `deployments`.

Vérification immédiate :

```powershell
kubectl get pods -n tp-app -o wide
kubectl get svc -n tp-app
kubectl get deploy -n tp-app
kubectl get ingress -n tp-app
```

**Résultats attendus :**
- `postgres-xxx` → `1/1 Running`
- `backend-xxx` (3 pods) → `3/3 Running`
- `frontend-xxx` (2 pods) → `2/2 Running`
- `frontend` Service → `TYPE=LoadBalancer` (EXTERNAL-IP peut être `<pending>` sur minikube)
- `ingress frontend-ingress` → `ADDRESS` renseigné (IP du minikube souvent)

## 7. Configurer le nom de domaine local (hosts)

Récupérer l'IP du cluster minikube :

```powershell
minikube ip
```

Exemple : `192.168.49.2`

Ouvrir **Notepad en tant qu'administrateur** et éditer :

`C:\Windows\System32\drivers\etc\hosts`

Ajouter cette ligne :

```text
192.168.49.2 todo-app.local
```

**Alternative (127.0.0.1)** : selon configuration Ingress, parfois `127.0.0.1 todo-app.local` fonctionne avec `minikube tunnel` ou port-forward. L'approche avec `minikube ip` est la plus fiable ici.

## 8. Rendre le LoadBalancer accessible (minikube)

Si `kubectl get svc frontend -n tp-app` montre `EXTERNAL-IP: <pending>` :

Ouvrir **un second PowerShell en mode administrateur** et laisser tourner :

```powershell
minikube tunnel
```

Laisser ce terminal ouvert pendant les tests. L'EXTERNAL-IP passera à `127.0.0.1` ou `10.96.x.x` selon tunnel.

## 9. Vérification complète

Exécuter le script de vérification :

```powershell
.\scripts\verify.ps1 -Namespace tp-app
```

Contrôler les points clés :
- Frontend replicas : `2/2`
- Backend replicas : `3/3`
- Health backend depuis pod : `{"status":"OK", ...}`
- Test DB depuis backend : `DB_CONNECT_OK` (via pg client dans le pod)

Vérifications manuelles complémentaires :

### 9.1 Endpoints API/DB via DNS interne

```powershell
$bp = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $bp -- wget -qO- http://backend:5000/api/health
kubectl exec -n tp-app $bp -- nslookup postgres
kubectl exec -n tp-app $bp -- nc -vz postgres 5432
```

### 9.2 Ingress accessible

```powershell
curl http://todo-app.local/api/health
# ou PowerShell
Invoke-RestMethod http://todo-app.local/api/health
```

Doit retourner `{"status":"OK", ...}`

### 9.3 Frontend accessible

Ouvrir dans navigateur : [http://todo-app.local](http://todo-app.local)

Vérifier : page React s'affiche, liste catégories/produits charge, CRUD fonctionne (ajout/modif/suppression).

## 10. Tests Haute Disponibilité (HA)

### 10.1 Tuer un Pod backend

```powershell
$bp = kubectl get pods -n tp-app -l app=backend -o jsonpath='{.items[0].metadata.name}'
Write-Host "Suppression de $bp"
kubectl delete pod $bp -n tp-app
kubectl get pods -n tp-app -l app=backend -w
```

Observer : un nouveau pod est créé immédiatement. `READY` revient à `3/3`. Appuyer sur `Ctrl+C`.

Tester que l'API reste joignable pendant/ après :

```powershell
1..10 | ForEach-Object { Invoke-RestMethod http://todo-app.local/api/health; Start-Sleep 1 }
```

### 10.2 Tuer un Pod frontend

```powershell
$fp = kubectl get pods -n tp-app -l app=frontend -o jsonpath='{.items[0].metadata.name}'
kubectl delete pod $fp -n tp-app
kubectl get pods -n tp-app -l app=frontend
```

L'interface reste accessible dans le navigateur (autre réplique prend le relais).

## 11. Test Persistance PostgreSQL

### 11.1 Insérer une donnée de test

```powershell
$pp = kubectl get pods -n tp-app -l app=postgres -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "INSERT INTO categories (nom, description) VALUES ('TEST_HA_PERSIST', 'Test persistance K8s') ON CONFLICT DO NOTHING;"
kubectl exec -n tp-app $pp -- psql -U productdb_user -d productdb -c "SELECT id,nom,description FROM categories WHERE nom='TEST_HA_PERSIST';"
```

### 11.2 Redémarrer PostgreSQL

```powershell
kubectl delete pod $pp -n tp-app
kubectl wait --for=condition=ready pod -l app=postgres -n tp-app --timeout=120s
```

### 11.3 Vérifier persistance

```powershell
$pp2 = kubectl get pods -n tp-app -l app=postgres -o jsonpath='{.items[0].metadata.name}'
kubectl exec -n tp-app $pp2 -- psql -U productdb_user -d productdb -c "SELECT id,nom,description FROM categories WHERE nom='TEST_HA_PERSIST';"
```

**Résultat attendu :** la ligne est toujours présente.

Nettoyage optionnel :

```powershell
kubectl exec -n tp-app $pp2 -- psql -U productdb_user -d productdb -c "DELETE FROM categories WHERE nom='TEST_HA_PERSIST';"
```

## 12. Vérification synthétique rapide

```powershell
kubectl get all -n tp-app
kubectl get pvc -n tp-app
kubectl get ingress -n tp-app
```

Tout doit être `Bound/Running/Ready`.

## 13. Arrêt / Nettoyage (facultatif)

**Arrêter sans supprimer** (garder données PVC) :

```powershell
minikube stop
```

**Nettoyer complètement le namespace TP** :

```powershell
kubectl delete namespace tp-app
# Vérif
kubectl get all -n tp-app
```

Doit retourner : `No resources found in tp-app namespace`.

**Détruire cluster** (rare) :

```powershell
minikube delete
```

## 14. Checklist finale

- [ ] Docker Desktop démarré
- [ ] `minikube start` OK + `kubectl get nodes` Ready
- [ ] `minikube addons enable ingress` OK
- [ ] Images `3tiers-backend:local` & `3tiers-frontend:local` chargées dans minikube
- [ ] `deploy-all.ps1` exécuté sans erreur
- [ ] Pods : postgres 1/1, backend 3/3, frontend 2/2
- [ ] `todo-app.local` dans hosts + accessible
- [ ] `/api/health` OK via Ingress
- [ ] Frontend CRUD fonctionnel
- [ ] HA testé (kill backend/frontend) → réplicas restaurés
- [ ] Persistance testée (donnée conservée après restart postgres)
- [ ] DB non exposée publiquement (ClusterIP)

**Succès si tous cochés.**