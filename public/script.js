// Ajoutez au début du fichier
const bcrypt = require('bcryptjs');
const saltRounds = 10;

// Modifiez la route d'inscription :
app.post('/api/inscription', async (req, res) => {
    const utilisateurs = lireFichierJSON(UTILISATEURS_FILE);
    const { email, password, nom, prenom, telephone } = req.body;
    
    // Vérifier si l'email existe déjà
    if (utilisateurs.some(u => u.email === email)) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    // Crypter le mot de passe
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const nouvelUtilisateur = {
        id: utilisateurs.length > 0 ? Math.max(...utilisateurs.map(u => u.id)) + 1 : 1,
        email,
        password: hashedPassword, // Mot de passe crypté
        nom,
        prenom,
        telephone,
        dateInscription: new Date().toISOString(),
        adresse: null,
        role: 'client'
    };
    
    utilisateurs.push(nouvelUtilisateur);
    ecrireFichierJSON(UTILISATEURS_FILE, utilisateurs);
    
    // Ne pas renvoyer le mot de passe
    const { password: _, ...utilisateurSansPassword } = nouvelUtilisateur;
    res.status(201).json(utilisateurSansPassword);
});

// Modifiez la route de connexion :
app.post('/api/connexion', async (req, res) => {
    const utilisateurs = lireFichierJSON(UTILISATEURS_FILE);
    const { email, password } = req.body;
    
    const utilisateur = utilisateurs.find(u => u.email === email);
    
    if (utilisateur) {
        // Vérifier le mot de passe crypté
        const passwordMatch = await bcrypt.compare(password, utilisateur.password);
        
        if (passwordMatch) {
            const { password: _, ...utilisateurSansPassword } = utilisateur;
            res.json(utilisateurSansPassword);
        } else {
            res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
    } else {
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
});

// Configuration - URL relative pour la production
const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : '/api';

console.log('API URL:', API_URL);

let produits = [];
let utilisateurConnecte = null;

// === FONCTIONS API ===
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Erreur ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Erreur API ${endpoint}:`, error);
        throw error;
    }
}

async function chargerProduits() {
    try {
        produits = await fetchAPI('/produits');
        return produits;
    } catch (error) {
        console.error('Erreur chargement produits:', error);
        // Fallback sur localStorage
        const produitsLocaux = localStorage.getItem('produits');
        return produitsLocaux ? JSON.parse(produitsLocaux) : [];
    }
}

async function ajouterProduit(produit) {
    return await fetchAPI('/produits', {
        method: 'POST',
        body: JSON.stringify(produit)
    });
}

async function supprimerProduit(id) {
    return await fetchAPI(`/produits/${id}`, {
        method: 'DELETE'
    });
}

async function inscrireUtilisateur(utilisateur) {
    return await fetchAPI('/inscription', {
        method: 'POST',
        body: JSON.stringify(utilisateur)
    });
}

async function connecterUtilisateur(email, password) {
    const utilisateur = await fetchAPI('/connexion', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    localStorage.setItem('utilisateurConnecte', JSON.stringify(utilisateur));
    return utilisateur;
}

async function mettreAJourUtilisateur(id, data) {
    const utilisateur = await fetchAPI(`/utilisateurs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    
    localStorage.setItem('utilisateurConnecte', JSON.stringify(utilisateur));
    return utilisateur;
}

async function creerCommande(commande) {
    return await fetchAPI('/commandes', {
        method: 'POST',
        body: JSON.stringify(commande)
    });
}

// === FONCTIONS FRONTEND ===
async function afficherProduits() {
    const container = document.getElementById('produits-container');
    if (!container) return;

    try {
        await chargerProduits();
        
        if (produits.length === 0) {
            container.innerHTML = `
                <div class="panier-vide">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc;"></i>
                    <h3>Aucun produit disponible</h3>
                    <p>Les produits seront bientôt ajoutés.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = produits.map(produit => `
            <div class="produit-card">
                <div class="produit-image-container">
                    <img src="${produit.image}" alt="${produit.nom}" loading="lazy" class="produit-image">
                </div>
                <div class="produit-info">
                    <h3>${produit.nom}</h3>
                    <p>${produit.description}</p>
                    <div class="produit-footer">
                        <div class="prix">${produit.prix.toLocaleString()} FCFA</div>
                        <button class="btn-ajouter" data-id="${produit.id}">
                            <i class="fas fa-cart-plus"></i> Ajouter au panier
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Événements
        document.querySelectorAll('.produit-image-container').forEach(container => {
            container.addEventListener('click', (e) => {
                const img = container.querySelector('img');
                const nom = container.closest('.produit-card').querySelector('h3').textContent;
                const desc = container.closest('.produit-card').querySelector('p').textContent;
                
                const lightbox = document.getElementById('lightbox');
                if (lightbox) {
                    document.getElementById('lightbox-img').src = img.src;
                    document.getElementById('lightbox-title').textContent = nom;
                    document.getElementById('lightbox-desc').textContent = desc;
                    lightbox.classList.add('active');
                }
            });
        });

        document.querySelectorAll('.btn-ajouter').forEach(btn => {
            btn.addEventListener('click', function() {
                const produitId = parseInt(this.getAttribute('data-id'));
                const produit = produits.find(p => p.id === produitId);
                
                if (produit) {
                    ajouterAuPanier(produitId);
                    this.classList.add('added');
                    setTimeout(() => this.classList.remove('added'), 500);
                }
            });
        });

        // Animation images
        const images = document.querySelectorAll('.produit-image');
        images.forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', function() {
                    this.classList.add('loaded');
                });
            }
        });
    } catch (error) {
        container.innerHTML = `
            <div class="panier-vide">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff9800;"></i>
                <h3>Erreur de chargement</h3>
                <p>Impossible de charger les produits. Vérifiez votre connexion.</p>
            </div>
        `;
    }
}

function ajouterAuPanier(produitId) {
    const produit = produits.find(p => p.id === produitId);
    if (!produit) return;
    
    let panier = JSON.parse(localStorage.getItem('panier')) || [];
    const index = panier.findIndex(item => item.id === produitId);
    
    if (index !== -1) {
        panier[index].quantite += 1;
    } else {
        panier.push({
            id: produit.id,
            nom: produit.nom,
            prix: produit.prix,
            quantite: 1,
            image: produit.image
        });
    }
    
    localStorage.setItem('panier', JSON.stringify(panier));
    mettreAJourCompteurPanier();
    afficherNotification('Produit ajouté au panier !');
}

function mettreAJourCompteurPanier() {
    const panier = JSON.parse(localStorage.getItem('panier')) || [];
    const totalItems = panier.reduce((total, item) => total + item.quantite, 0);
    
    document.querySelectorAll('.cart-count').forEach(compteur => {
        compteur.textContent = totalItems;
    });
}

function afficherNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `confirmation-message ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function initialiserLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    
    if (!lightbox || !lightboxClose) return;
    
    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            lightbox.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
        }
    });
}

function verifierConnexion() {
    const utilisateur = localStorage.getItem('utilisateurConnecte');
    if (utilisateur) {
        try {
            utilisateurConnecte = JSON.parse(utilisateur);
            return true;
        } catch (error) {
            localStorage.removeItem('utilisateurConnecte');
            return false;
        }
    }
    return false;
}

async function initialiser() {
    initialiserLightbox();
    mettreAJourCompteurPanier();
    
    // Vérifier si l'utilisateur est toujours valide
    if (verifierConnexion()) {
        // Mettre à jour l'interface si nécessaire
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => {
            el.textContent = utilisateurConnecte.prenom || 'Mon compte';
        });
    }
    
    // Charger les produits si nécessaire
    if (document.getElementById('produits-container')) {
        await afficherProduits();
    }
}

// Initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiser);
} else {
    initialiser();
}

// Export pour les autres fichiers
window.festiPrintzAPI = {
    chargerProduits,
    ajouterProduit,
    supprimerProduit,
    inscrireUtilisateur,
    connecterUtilisateur,
    mettreAJourUtilisateur,
    creerCommande,
    afficherProduits,
    ajouterAuPanier,
    mettreAJourCompteurPanier,
    verifierConnexion
};


// Charger les produits depuis localStorage s'ils existent
function chargerProduitsLocalStorage() {
    const produitsStockes = localStorage.getItem('produits');
    if (produitsStockes) {
        produits = JSON.parse(produitsStockes);
    } else {
        // Initialiser avec les produits par défaut
        localStorage.setItem('produits', JSON.stringify(produits));
    }
}

// Fonction pour afficher les produits
function afficherProduits() {
    const container = document.getElementById('produits-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    produits.forEach(produit => {
        const produitCard = document.createElement('div');
        produitCard.className = 'produit-card';
        produitCard.innerHTML = `
            <div class="produit-image-container">
                <img src="${produit.image}" alt="${produit.nom}" loading="lazy" class="produit-image">
            </div>
            <div class="produit-info">
                <h3>${produit.nom}</h3>
                <p>${produit.description}</p>
                <div class="produit-footer">
                    <div class="prix">${produit.prix.toLocaleString()} FCFA</div>
                    <button class="btn-ajouter" data-id="${produit.id}">
                        <i class="fas fa-cart-plus"></i> Ajouter au panier
                    </button>
                </div>
            </div>
        `;
        container.appendChild(produitCard);
        
        // Ajouter l'événement pour le zoom de l'image
        const imageContainer = produitCard.querySelector('.produit-image-container');
        imageContainer.addEventListener('click', () => {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const lightboxTitle = document.getElementById('lightbox-title');
            const lightboxDesc = document.getElementById('lightbox-desc');
            
            if (lightbox && lightboxImg && lightboxTitle && lightboxDesc) {
                lightboxImg.src = produit.image;
                lightboxTitle.textContent = produit.nom;
                lightboxDesc.textContent = produit.description;
                lightbox.classList.add('active');
            }
        });
        
        // Ajouter l'événement pour le bouton d'ajout au panier
        const btnAjouter = produitCard.querySelector('.btn-ajouter');
        btnAjouter.addEventListener('click', function() {
            ajouterAuPanier(produit.id);
            this.classList.add('added');
            setTimeout(() => this.classList.remove('added'), 500);
        });
    });
    
    // Animation d'apparition des images
    const images = document.querySelectorAll('.produit-image');
    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', function() {
                this.classList.add('loaded');
            });
        }
    });
}

// Fonction pour ajouter un produit au panier
function ajouterAuPanier(produitId) {
    const produit = produits.find(p => p.id === produitId);
    if (!produit) return;
    
    let panier = JSON.parse(localStorage.getItem('panier')) || [];
    
    // Vérifier si le produit est déjà dans le panier
    const index = panier.findIndex(item => item.id === produitId);
    
    if (index !== -1) {
        panier[index].quantite += 1;
    } else {
        panier.push({
            id: produit.id,
            nom: produit.nom,
            prix: produit.prix,
            quantite: 1,
            image: produit.image
        });
    }
    
    localStorage.setItem('panier', JSON.stringify(panier));
    mettreAJourCompteurPanier();
    
    // Afficher une notification
    afficherNotification('Produit ajouté au panier !');
}

// Fonction pour afficher une notification
function afficherNotification(message) {
    // Créer la notification si elle n'existe pas
    let notification = document.querySelector('.confirmation-message');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'confirmation-message';
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        document.body.appendChild(notification);
    } else {
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    }
    
    notification.classList.add('show');
    
    // Masquer la notification après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Fonction pour mettre à jour le compteur du panier
function mettreAJourCompteurPanier() {
    const panier = JSON.parse(localStorage.getItem('panier')) || [];
    const totalItems = panier.reduce((total, item) => total + item.quantite, 0);
    
    const compteurs = document.querySelectorAll('.cart-count');
    compteurs.forEach(compteur => {
        compteur.textContent = totalItems;
    });
}

// Gestion de la lightbox
function initialiserLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    
    if (!lightbox || !lightboxClose) return;
    
    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            lightbox.classList.remove('active');
        }
    });
    
    // Fermer avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    chargerProduitsLocalStorage();
    initialiserLightbox();
});

// Exporter les fonctions pour les utiliser dans les autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        produits,
        afficherProduits,
        ajouterAuPanier,
        mettreAJourCompteurPanier
    };
}
