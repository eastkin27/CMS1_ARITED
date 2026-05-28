ARITED E-CMS - Nuit de l'Informatique
ARITED E-CMS est un système de gestion de contenu (CMS) léger et performant, développé en React et Firebase. Ce projet a été conçu dans le cadre de la Nuit de l'Informatique pour permettre une gestion dynamique de sites web (projets, actualités, pages) avec une synchronisation en temps réel.

🚀 Fonctionnalités
Le projet se divise en deux parties majeures :

👤 Interface Publique (Front-Office)

Visualisation des Projets : Affichage des projets en cours avec barres de progression dynamiques.

Flux d'Actualités : Consultation des dernières news publiées.

Pages Statiques : Accès aux informations clés du site.

Demandes de Services : Formulaire de contact permettant aux utilisateurs de soumettre des demandes de rendez-vous ou des signalements.

🛠️ Interface Administrateur (Back-Office)

Dashboard Complet : Gestion centralisée par onglets.

CRUD de Contenu : Création et suppression d'actualités, de projets et de pages.

Gestion des Demandes : Système de ticketing pour traiter les demandes des utilisateurs (Statuts : Nouveau ➔ En cours ➔ Traité).

Multi-site : Support de plusieurs instances de sites via un identifiant siteId unique dans l'URL.

🛠️ Stack Technique
Frontend : React.js (Hooks : useState, useEffect, useCallback)

Backend-as-a-Service : Firebase

Firestore : Base de données NoSQL en temps réel.

Authentication : Gestion des accès anonymes et par tokens.

Styling : Tailwind CSS (Design responsive et moderne).

⚙️ Installation et Configuration
Cloner le projet :

Bash
git clone https://github.com/eastkin27/CMS1_ARITED.git
cd CMS1_ARITED

Installer les dépendances :

Bash
npm install
Configuration Firebase :
Dans le fichier App.js, remplacez l'objet firebaseConfig par vos propres identifiants Firebase :

JavaScript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  // ...
};
Lancer l'application :

Bash
npm start

📖 Utilisation
Pour accéder à la vue publique : http://localhost:3000/?siteId=demo-site&view=public

Pour accéder à l'administration : http://localhost:3000/?siteId=demo-site&view=admin

⚠️ Note technique (Hackathon) : Ce projet a été réalisé en mode sprint intensif lors de la Nuit de l'Informatique. Il est présenté ici en tant que MVP (Minimum Viable Product). N'étant pas un produit finalisé à 100% pour la production, certaines fonctionnalités secondaires ou cas limites sont en cours d'optimisation et le code est sujet à des sessions de refactoring (notamment sur la robustesse globale, la gestion des erreurs et la configuration Firebase).

Auteur :
Rafael Azevedo - Étudiant en L2 MIASHS (Parcours MIAGE) (Nuit de l'informatique 2025).
