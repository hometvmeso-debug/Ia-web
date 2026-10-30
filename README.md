# NEXCORE OPERATOR V1

**Tu demandes. Elle navigue. Elle agit.**

Agent web autonome contrôlé, indépendant de NEXCORE CORE. Il utilise Cloudflare Workers + Browser Run + `@cloudflare/playwright`.

## Fonctionnalités V1

- Interface de commande en français.
- Navigation dans un vrai navigateur Chrome distant.
- Recherche Google et lecture de pages.
- Mode observation : titre, URL, texte visible, liens et champs de formulaires.
- Clic sur un lien/bouton à partir de son texte.
- Remplissage de champs par nom, libellé, placeholder ou sélecteur CSS simple.
- Préparation d'un formulaire séparée de sa soumission.
- La soumission nécessite un deuxième appel explicite `Confirmer l'envoi`.
- Historique des missions dans KV.
- Stockage de l'état de navigation (cookies / local storage) dans KV, activable après déploiement.
- Clé d'accès obligatoire pour les API.

## Ce qu'il faut savoir

1. **Ce dépôt est un projet autonome.** Son nom Cloudflare est `nexcore-operator-v1`. Il ne modifie aucun Worker existant.
2. Le navigateur est fourni par **Cloudflare Browser Run**. Le compte Cloudflare doit avoir Browser Run disponible.
3. Il faut installer les dépendances et déployer le dossier avec Wrangler. Le tableau de bord Cloudflare ne transforme pas un ZIP en Worker exécutable à lui seul.
4. La V1 fournit un planificateur déterministe et des actions explicites. Elle n'inclut pas encore un LLM conversationnel, l'OCR visuel avancé, la résolution de CAPTCHA ou un système complet de connexion multi-utilisateur.
5. Les sites peuvent demander une connexion, une validation humaine ou bloquer l'automatisation. NEXCORE ne contourne pas les CAPTCHA, MFA, paywalls ou contrôles d'accès.
6. Chaque action réouvre la dernière URL connue et restaure les cookies / données de stockage via KV. Les champs de formulaire sont préparés puis reconstitués à l'identique au moment de la confirmation. Une session de navigateur vivante et partageable entre plusieurs requêtes nécessiterait une couche Durable Objects / session dédiée dans une version ultérieure.

## Déploiement direct sur Cloudflare

### Prérequis
- Compte Cloudflare avec Workers et Browser Run.
- Node.js 20.19+ ou 22.12+ recommandé.
- npm.

### 1. Extraire le ZIP
Extraire `NEXCORE-OPERATOR-V1.zip` sur l'ordinateur.

### 2. Ouvrir un terminal dans le dossier
```bash
npm install
npx wrangler login
```

### 3. Définir une clé privée
Créer une clé longue et unique, puis l'enregistrer comme secret Cloudflare :
```bash
npx wrangler secret put OPERATOR_ACCESS_KEY
```
Coller la clé dans l'invite. Ne jamais la mettre dans `public/`, dans Git ou dans le code.

Pour tester localement avec Browser Run distant :
```bash
cp .dev.vars.example .dev.vars
```
Modifier `.dev.vars` et remplacer la valeur exemple par la même clé. Ne pas téléverser `.dev.vars`.

### 4. Déployer
```bash
npm run deploy
```
Wrangler provisionne automatiquement le namespace KV déclaré dans `wrangler.jsonc` si le compte autorise le provisionnement automatique. Si Wrangler demande une configuration, suivre l'invite et conserver le nom `nexcore-operator-v1`.

### 5. Ouvrir l'application
Wrangler affiche une URL du type :
`https://nexcore-operator-v1.<ton-sous-domaine>.workers.dev`

Ouvrir l'URL, saisir la clé `OPERATOR_ACCESS_KEY` et lancer une mission.

## Mode développement
```bash
npm run dev
```
Le flag `--remote` permet d'utiliser le navigateur Browser Run distant. La clé locale doit être définie dans `.dev.vars`.

## Exemples de commandes

- `Ouvre https://example.com et observe la page`
- `Recherche NEXCORE sur Google`
- `Clique sur le lien Documentation`
- `Observe les formulaires de la page`
- `Remplis le formulaire avec {"name":"Ada Lovelace","email":"ada@example.com"}`

### Remplissage sécurisé
Pour remplir un formulaire, ouvrir d'abord la page puis lancer :
```json
{
  "action": "fill",
  "fields": {
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  }
}
```
NEXCORE prépare les champs et enregistre une proposition d'envoi. Il ne soumet pas le formulaire.
Pour soumettre, l'utilisateur doit cliquer sur **Confirmer l'envoi** dans l'interface. Cette confirmation appelle explicitement `POST /api/confirm-submit`.

## API

Toutes les routes `/api/*` requièrent `Authorization: Bearer <OPERATOR_ACCESS_KEY>`.

- `GET /api/health`
- `GET /api/history`
- `POST /api/mission` : `{ "command": "Recherche NEXCORE sur Google" }`
- `POST /api/act` : `{ "action":"navigate|observe|click|fill", ... }`
- `POST /api/confirm-submit` : `{ "confirmationId":"..." }`

### Actions explicites
- `navigate`: `{ "action":"navigate", "url":"https://example.com" }`
- `search`: `{ "action":"search", "query":"NEXCORE" }`
- `observe`: `{ "action":"observe" }`
- `click`: `{ "action":"click", "text":"Documentation" }`
- `fill`: `{ "action":"fill", "fields": { "email":"ada@example.com" } }`

## Sécurité

- Clé d'accès obligatoire côté serveur.
- Refus des URL non HTTP(S), des identifiants intégrés dans les URL, et des hôtes locaux/privés courants.
- Limitation de taille des requêtes.
- Pas d'envoi automatique de formulaire.
- Confirmation distincte avant soumission.
- Pas de stockage de mots de passe ou de valeurs de formulaire dans l'historique.
- Ne pas saisir de données sensibles sans examiner le site et les champs.
- Ne jamais partager la clé d'accès.

## Dépannage

- `Browser binding unavailable`: vérifier que Browser Run est disponible sur le compte et que `browser.binding` vaut `BROWSER`.
- `Unauthorized`: vérifier le secret `OPERATOR_ACCESS_KEY`.
- `KV binding unavailable`: redéployer après avoir laissé Wrangler créer le namespace KV.
- `Navigation failed`: vérifier l'URL, l'accès réseau du site ou ses protections anti-robot.
- Pour la première exécution, utiliser `https://example.com`.

## Références officielles

- https://developers.cloudflare.com/browser-run/
- https://developers.cloudflare.com/browser-run/playwright/
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/wrangler/configuration/
