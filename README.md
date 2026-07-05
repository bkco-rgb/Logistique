# 📱 BK Pochette Congo — Gestion de stock

Application de gestion de stock pour la personnalisation de pochettes de téléphone.
**Toutes les données restent en local sur votre appareil** (localStorage du navigateur) — rien n'est envoyé sur internet.

## ✨ Fonctionnalités

- **Deux interfaces** : Utilisation quotidienne (libre) et Espace Gérant (protégé par mot de passe)
- **81 modèles préchargés** : iPhone (X → 17 Pro Max) et Samsung (Galaxy S, Note, Z Flip/Fold), extensibles
- **Alertes de stock** automatiques par modèle et seuil global
- **Compensations / erreurs** suivies à part, avec menu de ravitaillement des défaillances
- **🎯 Pilotage & Budget** : dette de stock, budget de réapprovisionnement, objectifs, enveloppe intelligente, plafond budgétaire
- **🧠 Conseiller stratégique** : score de santé /100, conseils automatiques, analyse 80/20, jour de pointe, recalibrage des objectifs, les 3 actions de la semaine
- **💾 Sauvegarde robuste** : double copie automatique (principale + secours), export/import par fichier ou copier-coller pour transférer entre téléphones
- **🧨 Réinitialisation** : effacer l'historique ou tout remettre à zéro (double confirmation)

## 🚀 Mise en ligne sur GitHub Pages (gratuit)

1. Crée un dépôt sur GitHub (ex : `bk-pochette-stock`)
2. Ajoute les fichiers de ce dossier (`index.html` suffit)
3. Va dans **Settings → Pages → Source : Deploy from a branch → main / (root)** puis **Save**
4. Ton application sera accessible à `https://TON-PSEUDO.github.io/bk-pochette-stock/`
5. Sur ton téléphone, ouvre ce lien puis **« Ajouter à l'écran d'accueil »** : l'app s'ouvrira comme une vraie application

## 📲 Utilisation sans internet (100% locale)

`index.html` est autonome : tu peux aussi simplement copier le fichier sur ton téléphone et l'ouvrir dans Chrome/Safari — tout fonctionne hors ligne (seule la police d'écriture nécessite internet la première fois, sinon une police système est utilisée).

## ⚠️ Important — vos données

- Les données sont stockées dans le **navigateur de l'appareil**. Si tu vides les données du navigateur, elles seront perdues : **exporte régulièrement une sauvegarde** (Espace Gérant → ⚙ Réglages → 💾 Sauvegarde & transfert).
- Pour changer de téléphone : Exporter sur l'ancien → Importer sur le nouveau.
- Mot de passe gérant initial : `1705` (modifiable dans les Réglages).

## 🛠 Développement

- `App.jsx` : code source complet (React)
- `index.html` : application compilée, prête à l'emploi
- Pour recompiler après modification : `npx esbuild entry.jsx --bundle --minify --loader:.jsx=jsx --jsx=automatic --outfile=app.min.js` puis réinjecter dans `index.html`

---
*Fait avec ❤️ pour BK Pochette Congo*
