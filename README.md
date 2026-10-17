# Application 3-tiers sur Kubernetes

Déploiement d'une application **3-tiers** (Frontend React + Backend Node/Express + PostgreSQL) sur Kubernetes, avec **haute disponibilité**, **persistance** des données et **exposition via Ingress**.

## Architecture

```
                     ┌──────────────────────────────────────────────┐
   Navigateur        │                 Cluster Kubernetes            │
      │              │                                               │
      ▼              │   Ingress (todo-app.local)                    │
 http://... ────────►│   ├── /      → Service frontend (80)           │
                     │   └── /api   → Service backend  (5000)        │
                     │                                               │
                     │   Frontend Deployment (2 réplicas) : nginx    │
                     │        │                                      │
                     │        └─ proxy /api → Service backend        │
                     │                                               │
                     │   Backend Deployment (3 réplicas) : Node API  │
                     │        │                                      │
                     │        └─ TCP 5432 → Service postgres         │
                     │                                               │
                     │   PostgreSQL Deployment (1 réplica) + PVC     │
                     └──────────────────────────────────────────────┘
```

| Composant | Image | Réplicas | Service | Exposé |
|---|---|---|---|---|
| Frontend | `3tiers-frontend:local` | 2 | `frontend` (LoadBalancer/NodePort) | Oui (via Ingress/LB) |
| Backend | `3tiers-backend:local` | 3 | `backend` (ClusterIP:5000) | Interne + `/api` via Ingress |
| Database | `postgres:15-alpine` | 1 | `postgres` (ClusterIP:5432) | Interne uniquement |

## Structure du dépôt

```
tp/
├── 3tiers-backend/     # API Node/Express (Sequelize) + Dockerfile multi-stage
├── 3tiers-frontend/    # UI React (CRA) + Dockerfile multi-stage (nginx non-root)
├── database/init.sql   # Schéma + données initiales
├── k8s/                # Manifests Kubernetes
│   ├── namespace/
│   ├── config/         # ConfigMap + Secret
│   ├── db/             # PVC, init, Deployment, Service PostgreSQL
│   ├── backend/        # Deployment (3) + Service
│   └── frontend/       # Deployment (2) + Service + Ingress
├── scripts/            # build-and-load.ps1, deploy-all.ps1, verify.ps1
└── docs/
    ├── TP-3Tiers-Kubernetes-Pedagogique.md  # Cours/architecture pas-à-pas
    └── GUIDE_EXECUTION_PAS_A_PAS.md         # Guide pratique d'exécution
```

## Pré-requis

- Docker Desktop (démarré)
- `kubectl`
- `minikube` (ou tout autre cluster : kind, k3d, kubeadm…)
- PowerShell (les scripts fournis sont en `.ps1`)

## Démarrage rapide

```powershell
# 1. Démarrer le cluster
minikube start
minikube addons enable ingress

# 2. Construire et charger les images
.\scripts\build-and-load.ps1 -Tag local

# 3. Déployer l'application
.\scripts\deploy-all.ps1 -Namespace tp-app

# 4. Vérifier
.\scripts\verify.ps1 -Namespace tp-app
```

Puis configurer le DNS local (fichier `hosts`) :

```text
127.0.0.1 todo-app.local
```

Accès : [http://todo-app.local](http://todo-app.local)

> Guide détaillé : [`docs/GUIDE_EXECUTION_PAS_A_PAS.md`](docs/GUIDE_EXECUTION_PAS_A_PAS.md)

## Dockerfiles (multi-stage)

- **Backend** (`3tiers-backend/Dockerfile`) : stages `deps` (dépendances prod) / `dev` (dev avec nodemon) / `production` (image finale, utilisateur non-root, `HEALTHCHECK`).
- **Frontend** (`3tiers-frontend/Dockerfile`) : stage `build` (build React) puis image finale `nginx-unprivileged` sur le port **8080**, utilisateur non-root, `HEALTHCHECK`.

## Configuration

| Variable | Source | Valeur |
|---|---|---|
| `DB_HOST` | Secret | `postgres` |
| `DB_PORT` | Secret | `5432` |
| `DB_NAME` | Secret | `productdb` |
| `DB_USER` | Secret | `productdb_user` |
| `DB_PASSWORD` | Secret | (voir `k8s/config/secret.yaml`) |
| `PORT` | Secret | `5000` |
| `NODE_ENV` | ConfigMap | `production` |
| `REACT_APP_API_URL` | ConfigMap | `/api` |

> Les credentials dans `k8s/config/secret.yaml` sont en clair pour le TP. En production, utiliser un gestionnaire de secrets (Sealed Secrets, External Secrets, Vault…).

## Livrables

- [x] Dockerfiles multi-stage frontend & backend
- [x] Manifests Kubernetes (Deployments, Services, ConfigMaps, Secrets, PVC, Ingress)
- [x] Déploiement et configuration de la base de données
- [x] Documentation domaine/DNS
- [x] Scripts de déploiement
- [x] README + documents pédagogiques

## Nettoyage

```powershell
kubectl delete namespace tp-app
```
