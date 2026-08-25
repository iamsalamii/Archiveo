# 🐳 Guide de Déploiement Docker — Archivéo

Ce guide vous explique comment lancer et gérer la plateforme complète **Archivéo** (Backend .NET 9 + Frontend Next.js + Base de données PostgreSQL) en une seule commande grâce à Docker & Docker Compose.

---

## 📋 Prérequis

* **Docker Desktop** (ou Docker Engine sous Linux) installé et en cours d'exécution.
* **Docker Compose v2** (inclus par défaut avec Docker Desktop).

---

## 🚀 Démarrage en 1 commande

À la racine du projet (`project-archiveo`), exécutez simplement :

```bash
docker compose up -d --build
```

Docker va automatiquement :
1. Télécharger et démarrer **PostgreSQL 16** avec vérification de santé (*healthcheck*).
2. Compiler et exécuter l'API **ASP.NET Core (.NET 9)** sur le port `5000`.
3. Compiler et lancer l'application **Next.js** sur le port `3000`.
4. Initialiser automatiquement les tables, les paramètres et le compte administrateur.

---

## 🌐 Accès aux services

| Service | URL d'accès | Identifiants par défaut |
| :--- | :--- | :--- |
| **Application Web (Frontend)** | [http://localhost:3000](http://localhost:3000) | `admin@archiveo.com` / `Admin123!` |
| **API Backend & Swagger** | [http://localhost:5000/swagger](http://localhost:5000/swagger) | — |
| **Base de données PostgreSQL** | `localhost:5432` | User: `postgres` / Pass: `Salamsafe52@$` |

---

## 🛠️ Commandes Utiles

### 1. Voir les logs en direct
```bash
# Tous les services
docker compose logs -f

# Seulement le backend
docker compose logs -f backend

# Seulement le frontend
docker compose logs -f frontend
```

### 2. Arrêter les conteneurs
```bash
docker compose down
```

### 3. Réinitialiser la base de données et les volumes
```bash
docker compose down -v
```

### 4. Recompiler après des modifications de code
```bash
docker compose up -d --build
```

---

## 💾 Persistance des Données

Deux volumes persistants sont gérés automatiquement :
* `archiveo_postgres_data` : Stockage de la base de données PostgreSQL.
* `archiveo_uploads` : Stockage des fichiers documents et signatures déposés.
