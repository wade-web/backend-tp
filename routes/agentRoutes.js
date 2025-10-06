const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const agentController = require('../controllers/agentController');
const authAgent = require('../middleware/authAgent');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Route de login (DOIT ÊTRE AVANT le middleware d'auth)
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Tentative de connexion agent:', req.body);
    
    const { matricule, motDePasse } = req.body;

    if (!matricule || !motDePasse) {
      return res.status(400).json({ error: 'Matricule et mot de passe requis' });
    }

    // Trouver l'agent par matricule
    const agent = await Agent.findOne({ matricule });
    if (!agent) {
      console.log('❌ Agent non trouvé:', matricule);
      return res.status(401).json({ error: 'Matricule ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(motDePasse, agent.motDePasse);
    if (!isMatch) {
      console.log('❌ Mot de passe incorrect pour:', matricule);
      return res.status(401).json({ error: 'Matricule ou mot de passe incorrect' });
    }

    // Vérifier si l'agent est actif
    if (agent.statut !== 'actif') {
      return res.status(401).json({ error: 'Compte agent désactivé' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { 
        agentId: agent._id, 
        role: 'agent',
        matricule: agent.matricule
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Retourner les informations de l'agent (sans le mot de passe)
    const agentInfo = {
      id: agent._id,
      nom: agent.nom,
      prenom: agent.prenom,
      email: agent.email,
      matricule: agent.matricule,
      agence: agent.agence,
      telephone: agent.telephone
    };

    console.log('✅ Connexion réussie pour:', agentInfo.matricule);

    res.json({
      token,
      agent: agentInfo,
      message: 'Connexion réussie'
    });

  } catch (error) {
    console.error('❌ Erreur login agent:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});
// Dans vos routes agentRoutes.js
// routes/agentRoutes.js - Modification profil
// Route de modification du profil - CORRIGÉE
// router.put('/profile', authAgent, async (req, res) => {
//   try {
//     const { nom, prenom, email, telephone, agence } = req.body;
    
//     console.log('📝 Modification profil agent:', req.agent.matricule);
    
//     // Rechercher dans la collection User
//     const agent = await User.findById(req.agent._id);
//     if (!agent) {
//       return res.status(404).json({ error: 'Agent non trouvé' });
//     }

//     // Vérifier si l'email est déjà utilisé par un autre utilisateur
//     if (email !== agent.email) {
//       const existingUser = await User.findOne({ 
//         email, 
//         _id: { $ne: req.agent._id } 
//       });
//       if (existingUser) {
//         return res.status(400).json({ error: 'Cet email est déjà utilisé' });
//       }
//     }

//     // Mettre à jour les informations
//     agent.nom = nom;
//     agent.prenom = prenom;
//     agent.email = email;
//     agent.telephone = telephone;
//     agent.agence = agence;
//     agent.dateModification = new Date();

//     await agent.save();

//     // Retourner l'agent mis à jour
//     const updatedAgent = {
//       id: agent._id,
//       nom: agent.nom,
//       prenom: agent.prenom,
//       email: agent.email,
//       matricule: agent.matricule,
//       agence: agent.agence,
//       telephone: agent.telephone
//     };

//     console.log('✅ Profil mis à jour:', updatedAgent.matricule);

//     res.json({
//       message: 'Profil mis à jour avec succès',
//       agent: updatedAgent
//     });

//   } catch (error) {
//     console.error('❌ Erreur modification profil:', error);
    
//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({ error: errors.join(', ') });
//     }
    
//     if (error.code === 11000) {
//       return res.status(400).json({ error: 'Email ou téléphone déjà existant' });
//     }
    
//     res.status(500).json({ error: 'Erreur serveur lors de la modification' });
//   }
// });
// router.put('/profile', authAgent, async (req, res) => {
//   try {
//     const { nom, prenom, email, telephone, agence } = req.body;
    
//     console.log('📝 Modification profil agent:', req.agent.matricule);
//     console.log('Données reçues:', { nom, prenom, email, telephone, agence });
    
//     // Validation des champs obligatoires
//     if (!nom || !prenom || !email || !telephone || !agence) {
//       return res.status(400).json({ 
//         error: 'Tous les champs sont obligatoires' 
//       });
//     }

//     // Rechercher dans la collection User
//     const agent = await User.findById(req.agent._id);
//     if (!agent) {
//       return res.status(404).json({ error: 'Agent non trouvé' });
//     }

//     // Vérifier si l'email est déjà utilisé par un autre utilisateur
//     if (email !== agent.email) {
//       const existingUser = await User.findOne({ 
//         email: email.toLowerCase().trim(), 
//         _id: { $ne: req.agent._id } 
//       });
//       if (existingUser) {
//         return res.status(400).json({ error: 'Cet email est déjà utilisé' });
//       }
//     }

//     // Mettre à jour les informations avec trim() et validation
//     agent.nom = nom.trim();
//     agent.prenom = prenom.trim();
//     agent.email = email.toLowerCase().trim();
//     agent.telephone = telephone.trim();
//     agent.agence = agence;
//     agent.dateModification = new Date();

//     await agent.save();

//     // Retourner l'agent mis à jour (sans le mot de passe)
//     const agentResponse = agent.toObject();
//     delete agentResponse.motDePasse;
//     delete agentResponse.securite;

//     console.log('✅ Profil mis à jour:', agent.matricule);

//     res.json({
//       message: 'Profil mis à jour avec succès',
//       agent: agentResponse
//     });

//   } catch (error) {
//     console.error('❌ Erreur modification profil:', error);
    
//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({ error: errors.join(', ') });
//     }
    
//     if (error.code === 11000) {
//       return res.status(400).json({ error: 'Email ou téléphone déjà existant' });
//     }
    
//     res.status(500).json({ error: 'Erreur serveur lors de la modification' });
//   }
// });
router.put('/profile', authAgent, async (req, res) => {
  try {
    const { nom, prenom, email, telephone, agence } = req.body;
    
    console.log('📝 Modification profil agent:', req.agent.matricule);
    console.log('Données reçues:', { nom, prenom, email, telephone, agence });
    
    // Validation des champs obligatoires
    if (!nom || !prenom || !email || !telephone || !agence) {
      return res.status(400).json({ 
        error: 'Tous les champs sont obligatoires' 
      });
    }

    // Rechercher dans la collection Agent
    const agent = await Agent.findById(req.agent._id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    console.log('Agent trouvé:', agent.matricule);

    // Vérifier si l'email est déjà utilisé par un autre agent
    if (email !== agent.email) {
      const existingAgent = await Agent.findOne({ 
        email: email.toLowerCase().trim(), 
        _id: { $ne: req.agent._id } 
      });
      if (existingAgent) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    // Mettre à jour les informations
    agent.nom = nom.trim();
    agent.prenom = prenom.trim();
    agent.email = email.toLowerCase().trim();
    agent.telephone = telephone; // Pas de trim() car c'est un Number
    agent.agence = agence;

    await agent.save();

    console.log('✅ Profil mis à jour:', agent.matricule);

    // Retourner l'agent mis à jour (sans le mot de passe)
    const agentResponse = agent.toObject();
    delete agentResponse.motDePasse;

    res.json({
      message: 'Profil mis à jour avec succès',
      agent: agentResponse
    });

  } catch (error) {
    console.error('❌ Erreur modification profil:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email ou téléphone déjà existant' });
    }
    
    res.status(500).json({ error: 'Erreur serveur lors de la modification' });
  }
});
// Toutes les routes suivantes sont protégées
router.use(authAgent);

// Dashboard
router.get('/dashboard/stats', agentController.getDashboardStats);
router.get('/dashboard/users', agentController.getUsers);

// Gestion des comptes
router.post('/comptes/create', agentController.createUser);
router.patch('/comptes/:id/toggle-block', agentController.toggleBlockAccount);

// Transactions
router.post('/transactions/depot', agentController.depotClient);
router.post('/transactions/annuler', agentController.annulerTransaction);
router.get('/transactions/historique', agentController.getHistoriqueTransactions);
router.post('/distributeurs/credit', agentController.creditDistributeur);

// NOUVELLES ROUTES MANQUANTES
router.put('/comptes/:id', agentController.updateUser);
router.delete('/comptes/:id', agentController.deleteUser);
router.get('/comptes/:id', agentController.getUserById);
router.post('/utilisateurs/bulk-action', agentController.bulkActionUsers);

// Routes alternatives pour la compatibilité
router.put('/users/:id', agentController.updateUser);
router.delete('/users/:id', agentController.deleteUser);
router.get('/users/:id', agentController.getUserById);

module.exports = router;