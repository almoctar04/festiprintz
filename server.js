const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration sécurité
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Maimousidibe0@gmail.com';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Chemin des données
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Initialisation des données
function initialiserDonnees() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const fichiers = [
        { nom: 'produits.json', donnees: produitsParDefaut() },
        { nom: 'utilisateurs.json', donnees: [] },
        { nom: 'commandes.json', donnees: [] }
    ];
    
    fichiers.forEach(({ nom, donnees }) => {
        const chemin = path.join(DATA_DIR, nom);
        if (!fs.existsSync(chemin)) {
            fs.writeFileSync(chemin, JSON.stringify(donnees, null, 2), 'utf8');
        }
    });
    
    // Créer dossier uploads
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
}

function produitsParDefaut() {
    return [
        {
            id: 1,
            nom: "T-shirt personnalisé",
            description: "T-shirt 100% coton avec impression de qualité",
            prix: 5000,
            image: "/uploads/t-shirt.jpg",
            phare: true,
            dateCreation: new Date().toISOString()
        },
        {
            id: 2,
            nom: "Mug personnalisé",
            description: "Mug céramique avec impression personnalisée",
            prix: 3500,
            image: "/uploads/mug.jpg",
            phare: true,
            dateCreation: new Date().toISOString()
        }
    ];
}

// === FONCTION POUR CREER L'ADMIN SI INEXISTANT ===
async function creerAdminSiInexistant() {
    const utilisateurs = lireFichierJSON(UTILISATEURS_FILE);
    const adminEmail = process.env.ADMIN_EMAIL || 'Maimousidibe0@gmail.com';
    
    // Vérifier si l'admin existe déjà
    const adminExiste = utilisateurs.some(u => u.email === adminEmail && u.role === 'admin');
    
    if (!adminExiste) {
        console.log('🛠️ Création du compte administrateur...');
        
        const adminPassword = process.env.ADMIN_PASSWORD || 'mouna@24-93';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const nouvelAdmin = {
            id: utilisateurs.length > 0 ? Math.max(...utilisateurs.map(u => u.id)) + 1 : 1,
            email: adminEmail,
            password: hashedPassword,
            nom: 'Admin',
            prenom: 'FestiPrintz',
            telephone: '+227 8114 4032',
            dateInscription: new Date().toISOString(),
            adresse: null,
            role: 'admin'
        };
        
        utilisateurs.push(nouvelAdmin);
        ecrireFichierJSON(UTILISATEURS_FILE, utilisateurs);
        
        console.log('✅ Admin créé avec succès!');
        console.log(`📧 Email: ${adminEmail}`);
        
        // Ne pas afficher le mot de passe en clair
    } else {
        console.log('✅ Compte admin déjà existant.');
    }
}

// Appeler cette fonction au démarrage du serveur
creerAdminSiInexistant();

// Fonctions utilitaires
function lireJSON(fichier) {
    try {
        const data = fs.readFileSync(fichier, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Erreur lecture ${fichier}:`, error.message);
        return [];
    }
}

function ecrireJSON(fichier, donnees) {
    try {
        fs.writeFileSync(fichier, JSON.stringify(donnees, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`❌ Erreur écriture ${fichier}:`, error.message);
        return false;
    }
}

// Initialisation
initialiserDonnees();

// === ROUTES API ===

// 1. PRODUITS
app.get('/api/produits', (req, res) => {
    try {
        const produits = lireJSON(path.join(DATA_DIR, 'produits.json'));
        res.json(produits);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/produits', async (req, res) => {
    try {
        const filePath = path.join(DATA_DIR, 'produits.json');
        const produits = lireJSON(filePath);
        
        const nouveauProduit = {
            id: produits.length ? Math.max(...produits.map(p => p.id)) + 1 : 1,
            ...req.body,
            dateCreation: new Date().toISOString()
        };
        
        produits.push(nouveauProduit);
        
        if (ecrireJSON(filePath, produits)) {
            res.status(201).json(nouveauProduit);
        } else {
            res.status(500).json({ error: 'Erreur sauvegarde' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/produits/:id', (req, res) => {
    try {
        const filePath = path.join(DATA_DIR, 'produits.json');
        let produits = lireJSON(filePath);
        const id = parseInt(req.params.id);
        
        const initialLength = produits.length;
        produits = produits.filter(p => p.id !== id);
        
        if (produits.length < initialLength) {
            if (ecrireJSON(filePath, produits)) {
                res.json({ message: 'Produit supprimé' });
            } else {
                res.status(500).json({ error: 'Erreur sauvegarde' });
            }
        } else {
            res.status(404).json({ error: 'Produit non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 2. AUTHENTIFICATION
app.post('/api/inscription', async (req, res) => {
    try {
        const { email, password, nom, prenom, telephone } = req.body;
        
        if (!email || !password || !nom || !prenom) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const filePath = path.join(DATA_DIR, 'utilisateurs.json');
        const utilisateurs = lireJSON(filePath);
        
        // Vérifier email unique
        if (utilisateurs.some(u => u.email === email)) {
            return res.status(400).json({ error: 'Email déjà utilisé' });
        }
        
        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const nouvelUtilisateur = {
            id: utilisateurs.length ? Math.max(...utilisateurs.map(u => u.id)) + 1 : 1,
            email,
            password: hashedPassword,
            nom,
            prenom,
            telephone: telephone || '',
            dateInscription: new Date().toISOString(),
            adresse: null,
            role: email === ADMIN_EMAIL ? 'admin' : 'client'
        };
        
        utilisateurs.push(nouvelUtilisateur);
        
        if (ecrireJSON(filePath, utilisateurs)) {
            const { password: _, ...userWithoutPassword } = nouvelUtilisateur;
            res.status(201).json(userWithoutPassword);
        } else {
            res.status(500).json({ error: 'Erreur sauvegarde' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/connexion', async (req, res) => {
    try {
        const { email, password } = req.body;
        const filePath = path.join(DATA_DIR, 'utilisateurs.json');
        const utilisateurs = lireJSON(filePath);
        
        const utilisateur = utilisateurs.find(u => u.email === email);
        
        if (!utilisateur) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        
        const passwordMatch = await bcrypt.compare(password, utilisateur.password);
        
        if (passwordMatch) {
            const { password: _, ...userWithoutPassword } = utilisateur;
            res.json(userWithoutPassword);
        } else {
            res.status(401).json({ error: 'Identifiants incorrects' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. COMMANDES
app.post('/api/commandes', (req, res) => {
    try {
        const filePath = path.join(DATA_DIR, 'commandes.json');
        const commandes = lireJSON(filePath);
        
        const nouvelleCommande = {
            id: commandes.length ? Math.max(...commandes.map(c => c.id)) + 1 : 1,
            ...req.body,
            date: new Date().toISOString(),
            statut: 'en attente'
        };
        
        commandes.push(nouvelleCommande);
        
        if (ecrireJSON(filePath, commandes)) {
            res.status(201).json(nouvelleCommande);
        } else {
            res.status(500).json({ error: 'Erreur sauvegarde' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. UPLOAD D'IMAGES
app.post('/api/upload', (req, res) => {
    try {
        const { image, filename } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }
        
        // Extraire les données base64
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Générer un nom de fichier unique
        const uniqueName = `${Date.now()}-${filename || 'image'}.png`;
        const uploadPath = path.join(__dirname, 'public', 'uploads', uniqueName);
        
        fs.writeFileSync(uploadPath, buffer);
        
        res.json({ url: `/uploads/${uniqueName}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour toutes les autres requêtes - servir le frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 FestiPrintz démarré sur le port ${PORT}`);
    console.log(`📧 Admin: ${ADMIN_EMAIL}`);
    console.log(`📁 Données: ${DATA_DIR}`);
});