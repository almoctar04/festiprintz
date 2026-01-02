# 🛍️ FestiPrintz - Site E-commerce

Site de vente d'objets personnalisés à Niamey, Niger.

## 🚀 Déploiement sur Render

### Prérequis
- Compte [Render](https://render.com)
- Compte [GitHub](https://github.com)

### Étapes de déploiement

1. **Forkez ce dépôt** sur GitHub
2. **Connectez Render à GitHub**
   - Allez sur [dashboard.render.com](https://dashboard.render.com)
   - Cliquez sur "New +" → "Web Service"
   - Connectez votre compte GitHub
   - Sélectionnez ce dépôt

3. **Configurez le service**
   - **Name:** `festiprintz` (ou votre choix)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

4. **Ajoutez les variables d'environnement:**
ADMIN_EMAIL=votre_email@gmail.com
ADMIN_PASSWORD=votre_mot_de_passe_fort
NODE_ENV=production


5. **Déployez**
- Cliquez sur "Create Web Service"
- Attendez la fin du déploiement (3-5 minutes)

6. **Accédez au site**
- Votre site sera disponible à: `https://festiprintz.onrender.com`

## 🔧 Configuration Admin

Après déploiement:
1. Allez sur `/admin.html`
2. Connectez-vous avec:
- Email: Celui défini dans `ADMIN_EMAIL`
- Mot de passe: Celui défini dans `ADMIN_PASSWORD`

## 📞 Contact
- WhatsApp: +227 8114 4032
- Instagram: @FestiPrintz
- TikTok: @festiprintz.ny
- Snapchat: Festiprintz

## 🛠️ Développement local

```bash
# 1. Clonez le dépôt
git clone https://github.com/votre-username/festiprintz.git
cd festiprintz

# 2. Installez les dépendances
npm install

# 3. Démarrez le serveur
npm start

# 4. Ouvrez http://localhost:3000