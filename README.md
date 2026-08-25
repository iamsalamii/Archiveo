# 📁 Archivéo — Plateforme Entreprise de GED, Records Management & Topographie

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](https://github.com/iamsalamii/Archiveo)
[![Stack](https://img.shields.io/badge/Backend-.NET%209%20%7C%20ASP.NET%20Core-512BD4.svg)](https://dotnet.microsoft.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20%7C%20React%2018%20%7C%20TypeScript-000000.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Standards](https://img.shields.io/badge/Conformit%C3%A9-ISO%2015489%20%7C%20eIDAS%20%7C%20RGPD-059669.svg)](#)

**Archivéo** est une solution logicielle d'entreprise souveraine, unifiée et 100% paramétrable pour la gestion électronique de documents (GED), la cartographie topographique des magasins d'archives physiques, la reconnaissance optique de caractères (OCR plein texte), la signature électronique probante avec notifications WhatsApp, et le records management réglementaire (ISO 15489 / OAIS).

---

## 📑 Sommaire
1. [Architecture & Technologies](#-architecture--technologies)
2. [Prérequis & Installation](#-prérequis--installation)
3. [Identifiants de Connexion par Défaut](#-identifiants-de-connexion-par-défaut)
4. [Guide de Test Complet par Module](#-guide-de-test-complet-par-module)
5. [Centre d'Import / Export & Brochure Commerciale](#-centre-dimport--export--brochure-commerciale)
6. [Sécurité & Bonnes Pratiques de Production](#-sécurité--bonnes-pratiques-de-production)
7. [Sauvegarde Automatisée de la Base de Données](#-sauvegarde-automatisée-de-la-base-de-données)

---

## 🏗️ Architecture & Technologies

```
project-archiveo/
├── project-archiveo-backend/        # API REST .NET 9 en Clean Architecture
│   ├── Archiveo.Domain/             # Entités Métier, Enums et Règles
│   ├── Archiveo.Application/        # DTOs, Mappings et Interfaces
│   ├── Archiveo.Infrastructure/     # Entity Framework Core, PostgreSQL, Services, Seeds
│   └── Archiveo.Api/                # Contrôleurs, Middlewares, Auth JWT, RBAC & SignalR Hubs
├── project-archiveo-frontend/       # Application Web Next.js 14 (App Router)
│   ├── app/                         # Pages Next.js, Layouts et Routes
│   ├── components/                  # Composants UI (GED, Topographie, OCR, Parapheur, etc.)
│   ├── contexts/                    # Auth, Paramètres, Thème, Notifications SignalR
│   ├── services/                    # Clients API typés et interceptors
│   └── utils/                       # Moteur d'exportation (jsPDF, Excel, CSV, XML, Brochure)
└── scripts/                         # Scripts d'automatisation (sauvegarde DB, etc.)
```

---

## 🚀 Prérequis & Installation

### 1. Prérequis Système
- **.NET SDK 9.0+** : [Télécharger .NET](https://dotnet.microsoft.com/download)
- **Node.js 18+** & **npm** : [Télécharger Node.js](https://nodejs.org/)
- **PostgreSQL 14+** : Serveur local ou distant en écoute (ex: port 5432).

---

### 2. Démarrage du Backend (.NET 9 API)

1. Ouvrez un terminal dans `project-archiveo-backend` :
   ```bash
   cd project-archiveo-backend
   ```
2. Vérifiez la chaîne de connexion PostgreSQL dans `Archiveo.Api/appsettings.json` :
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Port=5432;Database=archiveo_db;Username=postgres;Password=votre_mot_de_passe;"
   }
   ```
3. Compilez et lancez l'API REST :
   ```bash
   dotnet run --project Archiveo.Api
   ```
   > 🌐 L'API démarre sur : **`http://localhost:5000`** (Swagger disponible sur `/swagger` en dev).

---

### 3. Démarrage du Frontend (Next.js 14)

1. Ouvrez un second terminal dans `project-archiveo-frontend` :
   ```bash
   cd project-archiveo-frontend
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
   > 💻 L'application web est accessible sur : **`http://localhost:3000`**

---

## 🔑 Identifiants de Connexion par Défaut

| Rôle | Adresse Email | Mot de passe | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrateur** | `admin@archiveo.local` | `Admin123!` | Accès total (GED, Archives, Topographie, Outils, Audit, Utilisateurs) |
| **Records Manager** | `archivist@archiveo.local` | `Archivist123!` | Gestion des archives, DUA, versements, étiquetage et prêts |
| **Utilisateur Métier** | `user@archiveo.local` | `User123!` | Consultation, dépôt de documents, circuits de validation, courriers |

---

## 🧪 Guide de Test Complet par Module

### 1. 🌐 Landing Page & Demande de Démo
- **URL** : `http://localhost:3000/`
- **Actions à tester** :
  - Cliquez sur **« Demander une Démo »** : Le modal interactif s'ouvre pour enregistrer vos coordonnées professionnelles.
  - Cliquez sur **« Télécharger la Brochure »** : Génération instantanée et téléchargement du PDF officiel haute définition de 10 pages présentant l'intégralité des modules.
  - Cliquez sur **« Connexion »** en haut à droite pour accéder à l'interface de connexion.

---

### 2. 📄 Module GED & Visionneuse In-App
- **URL** : `http://localhost:3000/documents`
- **Actions à tester** :
  - **Dépôt d'un document** : Cliquez sur *« Nouveau document »*, chargez un fichier (PDF, image, Word), renseignez le type, le service et le niveau de confidentialité.
  - **Visionneuse In-App** : Cliquez sur l'icône **Œil** (👁️) sur n'importe quel document :
    - Testez les boutons **Zoom In (+)**, **Zoom Out (-)** et **Réinitialiser**.
    - Testez la **Rotation à 90°** horaire.
    - Ouvrez le panneau latéral rétractable de métadonnées pour inspecter les propriétés complètes et l'empreinte de sécurité.

---

### 3. 🏢 Module Topographie des Magasins & Étiquettes QR Codes A4
- **URL** : `http://localhost:3000/topography`
- **Actions à tester** :
  - **Ajout d'un carton / rayonnage** : Cliquez sur *« Nouveau Carton / Rayon »*. Sélectionnez le Bâtiment et le Magasin (alimentés par les paramètres), saisissez la Travée, l'Étagère et l'Année d'échéance de conservation.
  - **Impression des étiquettes QR Codes** :
    - Cliquez sur l'icône **QR Code** d'un carton spécifique pour imprimer son étiquette individuelle.
    - Ou cliquez sur **« Imprimer planche QR »** pour générer la planche A4 officielle avec repères de découpe et codes de localisation.

---

### 4. 🔍 Module Moteur OCR DeepScan & Recherche Plein Texte
- **URL** : `http://localhost:3000/ocr-search`
- **Actions à tester** :
  - **Numérisation d'un document** : Déposez une facture, contrat ou courrier scanné (PDF ou Image) dans l'espace de numérisation.
  - Cliquez sur **« Lancer l'extraction OCR »** : Le texte intégral est extrait avec le score de précision.
  - Cliquez sur **« Indexer dans la recherche »** : Le document rejoint immédiatement la base plein texte.
  - Saisissez un mot-clé dans la barre de recherche plein texte : Le système met en surbrillance jaune contextuelle chaque occurrence trouvée dans le corps du texte.

---

### 5. ✍️ Module Parapheur Électronique & Signatures WhatsApp
- **URL** : `http://localhost:3000/signatures`
- **Actions à tester** :
  - Cliquez sur **« Nouvelle demande de signature »**.
  - Renseignez le nom du signataire, son email, son **numéro WhatsApp** et cochez le canal **WhatsApp**.
  - Validez la demande : L'application ouvre automatiquement l'onglet **WhatsApp Web** pré-rempli avec l'invitation personnalisée et le lien direct vers le document à signer.
  - L'écran de confirmation permet également de copier le lien en 1 clic.

---

### 6. 🔄 Module Circuits de Validation (Workflows & Modèles Types)
- **URL** : `http://localhost:3000/workflows`
- **Actions à tester** :
  - **Modèles de circuits types** : Cliquez sur l'onglet *« Modèles & Circuits Types »* pour consulter, créer ou personnaliser vos modèles de validation standard (*ex: Factures Fournisseurs, Contrats Cadres, Versement Archives*).
  - **Lancer un circuit** : Cliquez sur *« Lancer un Circuit »*, sélectionnez le modèle type souhaité dans le menu déroulant : toutes les étapes séquentielles et les rôles de validateurs sont pré-remplis automatiquement.
  - Validez ou rejetez les étapes en cours avec les boutons **Valider** (vert) et **Rejeter** (rouge).

---

### 7. ✉️ Module Courriers & Flux (Entrants / Sortants)
- **URL** : `http://localhost:3000/correspondence`
- **Actions à tester** :
  - Cliquez sur **« Nouveau courrier »**.
  - Sélectionnez le type (*Entrant, Sortant, Interne*), saisissez l'objet, l'expéditeur, le destinataire et associez un document GED si souhaité.
  - Enregistrez : le courrier est instantanément ajouté au registre avec sa référence légale unique générée automatiquement (`CR-IN-2024-XXXX`).

---

### 8. 📖 Module Prêts, Emprunts & Consultations
- **URL** : `http://localhost:3000/loans`
- **Actions à tester** :
  - Enregistrez une demande de prêt de dossier physique avec date de retour prévue.
  - Effectuez une prolongation en 1 clic ou marquez le retour en magasin d'archives.

---

### 9. 🛠️ Module Outils & Paramétrage 100% Sans Code
- **URL** : `http://localhost:3000/parameters`
- **Actions à tester** :
  - Modifiez ou ajoutez des éléments dans les 56 groupes de paramètres système (*Types de documents, Catégories, Statuts, Magasins, Services, Langues, Rôles, Pays, etc.*).
  - Tous les changements sont répercutés instantanément dans l'ensemble des formulaires et sélecteurs de l'application sans toucher au code.

---

### 10. 👤 Module Mon Profil & Code PIN de Signature
- **URL** : `http://localhost:3000/profile`
- **Actions à tester** :
  - Modifiez vos coordonnées professionnelles (*Prénom, Nom, Téléphone, Service*) et cliquez sur **« Enregistrer les modifications »**.
  - Onglet **Signature & PIN** : Définissez votre code PIN personnel à 4 chiffres et tracez votre signature manuscrite pour le parapheur électronique.
  - Onglet **Mot de passe** : Modifiez votre mot de passe avec validation sécurisée.

---

### 11. 🔒 Module Journal d'Audit Métier
- **URL** : `http://localhost:3000/audit`
- **Actions à tester** :
  - Consultez la traçabilité complète des actions : Date & Heure, Utilisateur émetteur, Module concerné, Action réalisée, et Résultat conforme/rejeté.
  - Exportez le journal d'audit officiel en PDF ou Excel en 1 clic.

---

## 📦 Centre d'Import / Export & Brochure Commerciale

- **URL** : `http://localhost:3000/import-export`
- **Exportation Universelle** : Sélectionnez n'importe quel module (*GED, Topographie, OCR, Parapheur, Archives, Courriers, Prêts, Workflows, Paramètres, Utilisateurs, Audit*) et exportez en :
  - 📊 **Tableur Excel** (`.xlsx`)
  - 📄 **Document PDF Structuré A4** (`.pdf`)
  - 📝 **Fichier CSV Universel UTF-8** (`.csv`)
  - 🗄️ **Objet JSON Standard** (`.json`)
  - 🏷️ **Bordereau XML Interopérable** (`.xml`)
  - 🖨️ **Impression Directe A4**

---

## 🛡️ Sécurité & Bonnes Pratiques de Production

- **Protection des Secrets** : Fichiers `.env`, `.env*.local`, clés privées (`*.key`, `*.pem`, `*.pfx`, `*.cert`) et `appsettings.Production.json` exclus du dépôt Git via `.gitignore`.
- **Anti-Énumération de Comptes** : Message d'erreur de connexion générique **« Identifiants invalides »**.
- **Hachage & Verrouillage Anti Brute-force** : `PBKDF2/HMAC-SHA512` avec sel aléatoire unique, verrouillage automatique après 5 tentatives infructueuses (15 min).
- **Contrôle Strict des Fichiers** : Taille maximale fixée à **50 Mo** et validation des types MIME (PDF, TIFF, JPEG, PNG, DOCX, XLSX).
- **En-têtes HTTP de Sécurité** : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.

---

## 💾 Sauvegarde Automatisée de la Base de Données

Un script PowerShell de sauvegarde PostgreSQL est disponible dans [`scripts/backup-db.ps1`](scripts/backup-db.ps1).

### Exécution manuelle :
```powershell
./scripts/backup-db.ps1 -DbName "archiveo_db" -DbUser "postgres" -OutputDir "./backups"
```

### Automatisation Windows (Tâche planifiée) :
```powershell
$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument '-NoProfile -WindowStyle Hidden -File "C:\Chemin\Vers\project-archiveo\scripts\backup-db.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 02:00
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Archivéo_Daily_Backup" -Description "Sauvegarde nocturne automatique de la base Archivéo"
```
> Le script génère un fichier `.dump` compressé et purge automatiquement les sauvegardes datant de plus de 30 jours.

---

## 📞 Support & Démonstration
Pour toute assistance technique, demande de démonstration personnalisée ou intégration sur-mesure :
- **Site Web** : [https://app.archiveo.enterprise](http://localhost:3000)
- **Support Entreprise** : `contact@archiveo.enterprise`
