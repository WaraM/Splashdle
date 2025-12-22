# Loldle Discord Activity 🎮

Une **Discord Activity** inspirée de *Loldle*, centrée sur la reconnaissance de **champions League of Legends à partir de splash arts** partiellement dévoilés.

L’application s’exécute directement **dans un salon vocal Discord**, sous forme de web app embarquée (iframe), et propose des **parties infinies** en solo, en groupe ou en mode compétitif.

---

## ✨ Fonctionnalités

### 🎯 Gameplay
- Deviner un **champion** à partir d’une portion de splash art
- **Dézoom progressif** à chaque tentative ratée
- Une fois le champion trouvé :
  - une **modale optionnelle** permet de deviner le **nom du skin** (1 essai, purement fun)

### 🕹️ Modes de jeu
- **Groupe**
  - Une énigme partagée par salon vocal
  - Tous les joueurs voient le même splash et les mêmes tentatives
- **Compétitif**
  - Série de **5 splash arts identiques** pour tous les joueurs
  - Progression individuelle
  - Le premier à trouver les 5 gagne

### 🔊 Feedback
- Sons de succès / échec (joués localement)
- UI pensée pour un usage en vocal Discord

---

## 🧱 Stack technique

### Frontend
- **SvelteKit** (mode SPA)
- TypeScript
- Stores Svelte pour la gestion d’état
- HTML5 Audio / Web Audio API

### Backend (optionnel mais recommandé)
- Node.js
- WebSocket (gestion des rooms et de l’état partagé)
- State en mémoire (pas de base de données pour le MVP)

### Assets
- Splash arts servis depuis **Data Dragon (CDN officiel Riot Games)**
- Aucun asset image stocké dans le projet

---

## 📦 Sources de données

Les splash arts sont chargés dynamiquement depuis Data Dragon : https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{ChampionKey}_{SkinNum}.jpg

Les métadonnées (champions / skins) proviennent de : https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/championFull.json

Le projet est **non-commercial** et respecte les règles des *fan projects* de Riot Games.

---

## 🧠 Concepts clés

- **Room** = 1 salon vocal Discord (`guildId:channelId`)
- **Puzzle** = 1 splash art + focus + niveau de zoom
- **Réponse attendue** = champion uniquement
- **Skin guessing** = UX secondaire, sans impact sur le score