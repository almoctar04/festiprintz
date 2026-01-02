// Configuration API - Automatique pour Render
const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : '/api';

console.log('🌐 API URL:', API_URL);

// Données des produits
let produits = [
    
];

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