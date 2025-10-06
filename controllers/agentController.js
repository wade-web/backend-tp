const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');

// Fonctions de validation réutilisables
const validators = {
  // Validation nom et prénom
  validateNomPrenom: (value, fieldName) => {
    if (!value || value.trim().length === 0) {
      return `${fieldName} est obligatoire`;
    }
    if (value.length < 2) {
      return `${fieldName} doit contenir au moins 2 caractères`;
    }
    if (value.length > 50) {
      return `${fieldName} ne peut pas dépasser 50 caractères`;
    }
    if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(value)) {
      return `${fieldName} ne peut contenir que des lettres, espaces, tirets et apostrophes`;
    }
    return null;
  },

  // Validation email
  validateEmail: (email) => {
    if (!email || email.trim().length === 0) {
      return 'Email est obligatoire';
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return 'Veuillez fournir un email valide';
    }
    if (email.length > 100) {
      return 'L\'email ne peut pas dépasser 100 caractères';
    }
    return null;
  },

  // Validation téléphone Sénégal
  validateTelephone: (telephone) => {
    if (!telephone || telephone.trim().length === 0) {
      return 'Le numéro de téléphone est obligatoire';
    }
    if (!/^\+221[567][0-9]{7}$/.test(telephone)) {
      return 'Le numéro doit être au format sénégalais: +2217XXXXXXX, +2216XXXXXXX ou +2215XXXXXXX';
    }
    return null;
  },

  // Validation date de naissance
  validateDateNaissance: (date) => {
    if (!date) {
      return 'La date de naissance est obligatoire';
    }
    const birthDate = new Date(date);
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    
    if (isNaN(birthDate.getTime())) {
      return 'Date de naissance invalide';
    }
    if (birthDate > minAgeDate) {
      return 'L\'utilisateur doit avoir au moins 18 ans';
    }
    if (birthDate < new Date('1900-01-01')) {
      return 'Date de naissance invalide';
    }
    return null;
  },

  // Validation adresse
  validateAdresse: (adresse) => {
    if (!adresse || adresse.trim().length === 0) {
      return 'L\'adresse est obligatoire';
    }
    if (adresse.length < 10) {
      return 'L\'adresse doit contenir au moins 10 caractères';
    }
    if (adresse.length > 200) {
      return 'L\'adresse ne peut pas dépasser 200 caractères';
    }
    return null;
  },

  // Validation numéro pièce identité
  validateNumPieceIdentite: (num) => {
    if (!num || num.trim().length === 0) {
      return 'Le numéro de pièce d\'identité est obligatoire';
    }
    if (!/^[A-Z0-9]{8,15}$/.test(num.toUpperCase())) {
      return 'Le numéro de pièce d\'identité doit contenir entre 8 et 15 caractères alphanumériques';
    }
    return null;
  },

  // Validation rôle
  validateRole: (role) => {
    const rolesValides = ['client', 'distributeur', 'agent'];
    if (!role) {
      return 'Le rôle est obligatoire';
    }
    if (!rolesValides.includes(role)) {
      return `Le rôle doit être: ${rolesValides.join(', ')}`;
    }
    return null;
  },

  // Validation matricule (pour agents)
  validateMatricule: (matricule, role) => {
    if (role === 'agent') {
      if (!matricule || matricule.trim().length === 0) {
        return 'Le matricule est obligatoire pour un agent';
      }
      if (!/^[A-Z0-9]{6,10}$/.test(matricule.toUpperCase())) {
        return 'Le matricule doit contenir entre 6 et 10 caractères alphanumériques';
      }
    }
    return null;
  },

  // Validation agence (pour agents)
  validateAgence: (agence, role) => {
    const agencesValides = ['Dakar', 'Thiès', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Mbour', 'Touba'];
    if (role === 'agent') {
      if (!agence) {
        return 'L\'agence est obligatoire pour un agent';
      }
      if (!agencesValides.includes(agence)) {
        return `L'agence doit être: ${agencesValides.join(', ')}`;
      }
    }
    return null;
  },
}

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalClients,
      totalDistributeurs,
      totalAgents,
      transactionsAujourdhui,
      soldeTotal
    ] = await Promise.all([
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'distributeur' }),
      User.countDocuments({ role: 'agent' }),
      Transaction.countDocuments({ 
        dateTransaction: { $gte: today },
        statut: 'complete'
      }),
      User.aggregate([
        { $match: { 'compte.statut': 'actif' } },
        { $group: { _id: null, total: { $sum: '$compte.solde' } } }
      ])
    ]);

    res.json({
      distributeurs: totalDistributeurs,
      clients: totalClients,
      agents: totalAgents,
      transactionsAujourdhui,
      soldeTotal: soldeTotal[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Lister tous les utilisateurs avec pagination et recherche
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
      .sort({ dateCreation: -1 })
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

// Créer un compte utilisateur
// exports.createUser = async (req, res) => {
//   try {
//     const { nom, prenom, email, telephone, dateNaissance, adresse, numPieceIdentite, role } = req.body;

//     // Vérifier si l'email ou numéro pièce existe déjà
//     const existingUser = await User.findOne({
//       $or: [{ email }, { numPieceIdentite }]
//     });

//     if (existingUser) {
//       return res.status(400).json({ 
//         error: 'Un utilisateur avec cet email ou numéro de pièce existe déjà' 
//       });
//     }

//     // Générer numéro de compte unique
//     const numeroCompte = `SN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

//     const user = new User({
//       nom,
//       prenom,
//       email,
//       telephone,
//       motDePasse: await bcrypt.hash('Passer123', 12), // Mot de passe par défaut
//       dateNaissance: new Date(dateNaissance),
//       adresse,
//       numPieceIdentite,
//       role: role || 'client',
//       compte: {
//         numeroCompte,
//         solde: 0,
//         statut: 'actif',
//         qrCode: `QR_${numeroCompte}`
//       },
//       creePar: req.agent._id
//     });

//     await user.save();
    
//     const userResponse = user.toObject();
//     delete userResponse.motDePasse;

//     res.status(201).json({
//       message: 'Compte créé avec succès',
//       user: userResponse
//     });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };
// // Modifier un utilisateur
// exports.updateUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { nom, prenom, email, telephone, dateNaissance, adresse, numPieceIdentite, role } = req.body;

//     // Vérifier si l'utilisateur existe
//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({ error: 'Utilisateur non trouvé' });
//     }

//     // Vérifier les doublons (exclure l'utilisateur actuel)
//     const existingUser = await User.findOne({
//       _id: { $ne: id },
//       $or: [
//         { email },
//         { numPieceIdentite },
//         { telephone }
//       ]
//     });

//     if (existingUser) {
//       return res.status(400).json({ 
//         error: 'Un autre utilisateur avec cet email, numéro de pièce ou téléphone existe déjà' 
//       });
//     }

//     // Mettre à jour l'utilisateur
//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       {
//         nom,
//         prenom,
//         email,
//         telephone,
//         dateNaissance: new Date(dateNaissance),
//         adresse,
//         numPieceIdentite,
//         role,
//         dateModification: new Date()
//       },
//       { new: true, runValidators: true }
//     ).select('-motDePasse -securite');

//     res.json({
//       message: 'Utilisateur modifié avec succès',
//       user: updatedUser
//     });
//   } catch (error) {
//     console.error('Erreur modification utilisateur:', error);
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ error: 'Données de validation invalides' });
//     }
//     res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
//   }
// };
// Créer un compte utilisateur avec validation
exports.createUser = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, dateNaissance, adresse, numPieceIdentite, role, matricule, agence } = req.body;

    // Validation des champs obligatoires
    const errors = [];

    // Validation de base
    const validationErrors = [
      validators.validateNomPrenom(nom, 'Le nom'),
      validators.validateNomPrenom(prenom, 'Le prénom'),
      validators.validateEmail(email),
      validators.validateTelephone(telephone),
      validators.validateDateNaissance(dateNaissance),
      validators.validateAdresse(adresse),
      validators.validateNumPieceIdentite(numPieceIdentite),
      validators.validateRole(role),
      validators.validateMatricule(matricule, role),
      validators.validateAgence(agence, role)
    ];

    validationErrors.forEach(error => {
      if (error) errors.push(error);
    });

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: errors 
      });
    }

    // Vérifier les doublons
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { numPieceIdentite: numPieceIdentite.toUpperCase().trim() },
        { telephone: telephone.trim() }
      ]
    });

    if (existingUser) {
      let duplicateField = '';
      if (existingUser.email === email.toLowerCase()) duplicateField = 'email';
      else if (existingUser.numPieceIdentite === numPieceIdentite.toUpperCase()) duplicateField = 'numéro de pièce d\'identité';
      else if (existingUser.telephone === telephone) duplicateField = 'téléphone';
      
      return res.status(400).json({ 
        error: `Un utilisateur avec ce ${duplicateField} existe déjà` 
      });
    }

    // Générer numéro de compte unique
    const numeroCompte = `SN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

    const user = new User({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.toLowerCase().trim(),
      telephone: telephone.trim(),
      motDePasse: await bcrypt.hash('Passer123', 12),
      dateNaissance: new Date(dateNaissance),
      adresse: adresse.trim(),
      numPieceIdentite: numPieceIdentite.toUpperCase().trim(),
      role: role,
      matricule: matricule ? matricule.toUpperCase().trim() : undefined,
      agence: agence,
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
    console.error('❌ Erreur création utilisateur:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Erreur de validation',
        details: errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Un utilisateur avec ces informations existe déjà' 
      });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création de l\'utilisateur' 
    });
  }
};

// Modifier un utilisateur avec validation
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, telephone, dateNaissance, adresse, numPieceIdentite, role, matricule, agence } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        error: 'Utilisateur non trouvé' 
      });
    }

    // Validation des champs
    const errors = [];

    const validationErrors = [
      validators.validateNomPrenom(nom, 'Le nom'),
      validators.validateNomPrenom(prenom, 'Le prénom'),
      validators.validateEmail(email),
      validators.validateTelephone(telephone),
      validators.validateDateNaissance(dateNaissance),
      validators.validateAdresse(adresse),
      validators.validateNumPieceIdentite(numPieceIdentite),
      validators.validateRole(role),
      validators.validateMatricule(matricule, role),
      validators.validateAgence(agence, role)
    ];

    validationErrors.forEach(error => {
      if (error) errors.push(error);
    });

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: errors 
      });
    }

    // Vérifier les doublons (exclure l'utilisateur actuel)
    const existingUser = await User.findOne({
      _id: { $ne: id },
      $or: [
        { email: email.toLowerCase().trim() },
        { numPieceIdentite: numPieceIdentite.toUpperCase().trim() },
        { telephone: telephone.trim() }
      ]
    });

    if (existingUser) {
      let duplicateField = '';
      if (existingUser.email === email.toLowerCase()) duplicateField = 'email';
      else if (existingUser.numPieceIdentite === numPieceIdentite.toUpperCase()) duplicateField = 'numéro de pièce d\'identité';
      else if (existingUser.telephone === telephone) duplicateField = 'téléphone';
      
      return res.status(400).json({ 
        error: `Un autre utilisateur avec ce ${duplicateField} existe déjà` 
      });
    }

    // Préparer les données de mise à jour
    const updateData = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.toLowerCase().trim(),
      telephone: telephone.trim(),
      dateNaissance: new Date(dateNaissance),
      adresse: adresse.trim(),
      numPieceIdentite: numPieceIdentite.toUpperCase().trim(),
      role: role,
      dateModification: new Date()
    };

    // Ajouter les champs spécifiques aux agents
    if (role === 'agent') {
      updateData.matricule = matricule.toUpperCase().trim();
      updateData.agence = agence;
    } else {
      // Supprimer les champs agents si le rôle change
      updateData.matricule = undefined;
      updateData.agence = undefined;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).select('-motDePasse -securite');

    res.json({
      message: 'Utilisateur modifié avec succès',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Erreur modification utilisateur:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Erreur de validation',
        details: errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Un utilisateur avec ces informations existe déjà' 
      });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la modification de l\'utilisateur' 
    });
  }
};
//Supprimer un utilisateur
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
// Archiver un utilisateur au lieu de le supprimer
// router.patch('/:id/archive', authAgent, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({ error: 'Utilisateur non trouvé' });
//     }

//     // Empêcher l'archivage d'un admin
//     if (user.role === 'admin') {
//       return res.status(403).json({ error: 'Non autorisé à archiver un administrateur' });
//     }

//     // Marquer comme archivé
//     user.archived = true;
//     user.dateArchivage = new Date();
//     user.archivedBy = req.agent._id;

//     await user.save();

//     res.json({ 
//       message: 'Utilisateur archivé avec succès',
//       archivedUserId: id 
//     });
//   } catch (error) {
//     console.error('Erreur archivage utilisateur:', error);
//     res.status(500).json({ error: 'Erreur lors de l\'archivage de l\'utilisateur' });
//   }
// });

// Actions groupées sur les utilisateurs
exports.bulkActionUsers = async (req, res) => {
  try {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Liste d\'utilisateurs invalide' });
    }

    let result;
    let message = '';
    let updatedCount = 0;

    // Récupérer les utilisateurs avec leurs statuts actuels
    const users = await User.find({ _id: { $in: userIds } });

    switch (action) {
      case 'bloquer':
        // Bloquer seulement les utilisateurs actifs
        const activeUsersToBlock = users.filter(user => user.compte.statut === 'actif');
        if (activeUsersToBlock.length > 0) {
          result = await User.updateMany(
            { 
              _id: { $in: activeUsersToBlock.map(u => u._id) },
              'compte.statut': 'actif'
            },
            { 
              'compte.statut': 'bloque',
              dateModification: new Date()
            }
          );
          updatedCount = activeUsersToBlock.length;
          message = `${updatedCount} utilisateur(s) bloqué(s) avec succès`;
        } else {
          message = 'Aucun utilisateur actif à bloquer';
        }
        break;

      case 'debloquer':
        // Débloquer seulement les utilisateurs bloqués
        const blockedUsersToUnblock = users.filter(user => user.compte.statut === 'bloque');
        if (blockedUsersToUnblock.length > 0) {
          result = await User.updateMany(
            { 
              _id: { $in: blockedUsersToUnblock.map(u => u._id) },
              'compte.statut': 'bloque'
            },
            { 
              'compte.statut': 'actif',
              dateModification: new Date()
            }
          );
          updatedCount = blockedUsersToUnblock.length;
          message = `${updatedCount} utilisateur(s) débloqué(s) avec succès`;
        } else {
          message = 'Aucun utilisateur bloqué à débloquer';
        }
        break;

      case 'supprimer':
        // Vérifier qu'on ne supprime pas d'admin
        const adminUsers = users.filter(user => user.role === 'admin');
        
        if (adminUsers.length > 0) {
          return res.status(403).json({ 
            error: 'Non autorisé à supprimer des administrateurs' 
          });
        }

        result = await User.deleteMany({ _id: { $in: userIds } });
        updatedCount = userIds.length;
        message = `${updatedCount} utilisateur(s) supprimé(s) avec succès`;
        break;

      default:
        return res.status(400).json({ error: 'Action non reconnue' });
    }

    res.json({ 
      message,
      action,
      count: updatedCount,
      totalSelected: userIds.length,
      result 
    });
  } catch (error) {
    console.error('Erreur action groupée:', error);
    res.status(500).json({ error: 'Erreur lors de l\'action groupée' });
  }
};

// Obtenir un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-motDePasse -securite');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
};

exports.toggleBlockAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    // Empêcher un agent de bloquer un autre agent
    if (user.role === 'agent') {
      return res.status(403).json({ 
        error: 'Non autorisé à bloquer/débloquer un compte agent' 
      });
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
// Dépôt pour un client
exports.depotClient = async (req, res) => {
  try {
    const { clientId, montant } = req.body;

    const client = await User.findOne({ 
      _id: clientId, 
      role: 'client' 
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    if (client.compte.statut === 'bloque') {
      return res.status(400).json({ error: 'Compte client bloqué' });
    }

    // Créer la transaction de dépôt
    const transaction = new Transaction({
      type: 'depot',
      montant: parseFloat(montant),
      // frais: parseFloat(montant) * 0.01, // 1% de frais
      // commission: parseFloat(montant) * 0.01, // 1% de commission
      statut: 'complete',
      compteDestinataire: clientId,
      description: `Dépôt agent - ${req.agent.matricule}`,
      effectuePar: req.agent._id
    });

    // Mettre à jour le solde du client
    client.compte.solde += parseFloat(montant);
    client.dateModification = new Date();

    await Promise.all([transaction.save(), client.save()]);

    res.json({
      message: 'Dépôt effectué avec succès',
      nouveauSolde: client.compte.solde,
      transactionId: transaction._id,
      // frais: transaction.frais,
      // commission: transaction.commission
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Annuler une transaction
exports.annulerTransaction = async (req, res) => {
  try {
    const { transactionId } = req.body;

    const transaction = await Transaction.findById(transactionId)
      .populate('compteSource', 'compte role')
      .populate('compteDestinataire', 'compte role');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }

    if (transaction.statut === 'annulee') {
      return res.status(400).json({ error: 'Transaction déjà annulée' });
    }

    // Vérifier si la transaction date de moins de 24h
    const now = new Date();
    const transactionDate = new Date(transaction.dateTransaction);
    const diffHours = (now - transactionDate) / (1000 * 60 * 60);
    
    if (diffHours > 24) {
      return res.status(400).json({ error: 'Impossible d\'annuler une transaction de plus de 24h' });
    }

    // Annuler la transaction et inverser les soldes
    transaction.statut = 'annulee';
    transaction.description += ` - Annulée par agent ${req.agent.matricule}`;

    // Inverser le solde pour le destinataire
    if (transaction.compteDestinataire) {
      const destinataire = await User.findById(transaction.compteDestinataire._id);
      if (destinataire && transaction.type !== 'retrait') {
        destinataire.compte.solde -= transaction.montant;
        await destinataire.save();
      }
    }

    // Inverser le solde pour la source
    if (transaction.compteSource) {
      const source = await User.findById(transaction.compteSource._id);
      if (source && transaction.type !== 'depot') {
        source.compte.solde += transaction.montant;
        await source.save();
      }
    }

    await transaction.save();

    res.json({
      message: 'Transaction annulée avec succès',
      transaction
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Historique des transactions
exports.getHistoriqueTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = '', dateDebut = '', dateFin = '' } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (type) {
      filter.type = type;
    }

    // Filtre par date
    if (dateDebut || dateFin) {
      filter.dateTransaction = {};
      if (dateDebut) filter.dateTransaction.$gte = new Date(dateDebut);
      if (dateFin) {
        const dateFinObj = new Date(dateFin);
        dateFinObj.setHours(23, 59, 59, 999);
        filter.dateTransaction.$lte = dateFinObj;
      }
    }

    const transactions = await Transaction.find(filter)
      .populate('compteSource', 'nom prenom compte.numeroCompte')
      .populate('compteDestinataire', 'nom prenom compte.numeroCompte')
      .populate('effectuePar', 'nom prenom matricule')
      .sort({ dateTransaction: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Créditer un distributeur
exports.creditDistributeur = async (req, res) => {
  try {
    const { distributeurId, montant } = req.body;

    const distributeur = await User.findOne({ 
      _id: distributeurId, 
      role: 'distributeur' 
    });
    
    if (!distributeur) {
      return res.status(404).json({ error: 'Distributeur non trouvé' });
    }

    // Créer la transaction de crédit
    const transaction = new Transaction({
      type: 'depot',
      montant: parseFloat(montant),
      // frais: 0,
      // commission: 0,
      statut: 'complete',
      compteDestinataire: distributeurId,
      description: `Crédit agent - ${req.agent.matricule}`,
      effectuePar: req.agent._id
    });

    // Mettre à jour le solde du distributeur
    distributeur.compte.solde += parseFloat(montant);
    distributeur.dateModification = new Date();

    await Promise.all([transaction.save(), distributeur.save()]);

    res.json({
      message: 'Distributeur crédité avec succès',
      nouveauSolde: distributeur.compte.solde,
      transactionId: transaction._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};