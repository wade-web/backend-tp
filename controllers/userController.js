const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');

// Créer un utilisateur
exports.createUser = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, dateNaissance, adresse, numPieceIdentite, role } = req.body;

    // Vérifier si l'email ou numéro pièce existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { numPieceIdentite },{telephone}]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Un utilisateur avec cet email ou numéro de pièce existe déjà' 
      });
    }

    // Générer numéro de compte unique
    const numeroCompte = `SN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

    const user = new User({
      nom,
      prenom,
      email,
      telephone,
      motDePasse: await bcrypt.hash('Passer123', 12), // Mot de passe par défaut
      dateNaissance: new Date(dateNaissance),
      adresse,
      numPieceIdentite,
      role: role || 'client',
      compte: {
        numeroCompte,
        solde: 0,
        statut: 'actif',
        qrCode: `QR_${numeroCompte}`
      },
      creePar: req.agent._id
    });

    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.motDePasse;

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: userResponse
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtenir tous les utilisateurs avec pagination
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = '', role = '' } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    
    // Filtre par recherche
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'compte.numeroCompte': { $regex: search, $options: 'i' } }
      ];
    }

    // Filtre par rôle
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-motDePasse -securite')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Modifier un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, telephone, dateNaissance, adresse, numPieceIdentite, role } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier les doublons (exclure l'utilisateur actuel)
    const existingUser = await User.findOne({
      _id: { $ne: id },
      $or: [
        { email },
        { numPieceIdentite },
        { telephone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Un autre utilisateur avec cet email, numéro de pièce ou téléphone existe déjà' 
      });
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        nom,
        prenom,
        email,
        telephone,
        dateNaissance: new Date(dateNaissance),
        adresse,
        numPieceIdentite,
        role,
        dateModification: new Date()
      },
      { new: true, runValidators: true }
    ).select('-motDePasse -securite');

    res.json({
      message: 'Utilisateur modifié avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Données de validation invalides' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
  }
};

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression d'un admin
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Non autorisé à supprimer un administrateur' });
    }

    await User.findByIdAndDelete(id);

    res.json({ 
      message: 'Utilisateur supprimé avec succès',
      deletedUserId: id 
    });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
};

// Actions groupées sur les utilisateurs
exports.bulkActionUsers = async (req, res) => {
  try {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Liste d\'utilisateurs invalide' });
    }

    let result;
    let message = '';

    switch (action) {
      case 'bloquer':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { 
            'compte.statut': 'bloque',
            dateModification: new Date()
          }
        );
        message = `${userIds.length} utilisateur(s) bloqué(s) avec succès`;
        break;

      case 'debloquer':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { 
            'compte.statut': 'actif',
            dateModification: new Date()
          }
        );
        message = `${userIds.length} utilisateur(s) débloqué(s) avec succès`;
        break;

      case 'supprimer':
        // Vérifier qu'on ne supprime pas d'admin
        const adminUsers = await User.find({ 
          _id: { $in: userIds }, 
          role: 'admin' 
        });
        
        if (adminUsers.length > 0) {
          return res.status(403).json({ 
            error: 'Non autorisé à supprimer des administrateurs' 
          });
        }

        result = await User.deleteMany({ _id: { $in: userIds } });
        message = `${userIds.length} utilisateur(s) supprimé(s) avec succès`;
        break;

      default:
        return res.status(400).json({ error: 'Action non reconnue' });
    }

    res.json({ 
      message,
      action,
      count: userIds.length,
      result 
    });
  } catch (error) {
    console.error('Erreur action groupée:', error);
    res.status(500).json({ error: 'Erreur lors de l\'action groupée' });
  }
};

// Bloquer/Débloquer un compte
exports.toggleBlockAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    const nouveauStatut = user.compte.statut === 'actif' ? 'bloque' : 'actif';
    user.compte.statut = nouveauStatut;
    user.dateModification = new Date();

    await user.save();

    res.json({
      message: `Compte ${nouveauStatut === 'bloque' ? 'bloqué' : 'débloqué'} avec succès`,
      statut: nouveauStatut
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtenir un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-motDePasse -securite');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};