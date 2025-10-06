const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   nom: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   prenom: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
//   },
//   telephone: {
//     type: Number,
//     required: true,
//      unique: true,
//     match: [/^\+221[0-9]{9}$/, 'Numéro Sénégalais invalide (+221XXXXXXXXX)']
      
//   },
//   motDePasse: {
//     type: String,
//     required: true,
//     minlength: 6
//   },
//   dateNaissance: {
//     type: Date,
//     required: true
//   },
//   adresse: {
//     type: String,
//     required: true
//   },
//   numPieceIdentite: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   photo: {
//     type: String,
//     default: ''
//   },
//   role: {
//     type: String,
//     enum: ['client', 'distributeur', 'agent'],
//     default: 'client'
//   },
//   compte: {
//     numeroCompte: {
//       type: String,
//       unique: true,
//       required: true
//     },
//     solde: {
//       type: Number,
//       default: 0,
//       min: 0
//     },
//     statut: {
//       type: String,
//       enum: ['actif', 'bloque'],
//       default: 'actif'
//     },
//     qrCode: {
//       type: String,
//       default: ''
//     }
//   },
//   securite: {
//     tentativesConnexion: { 
//       type: Number, 
//       default: 0 
//     },
//     compteVerrouille: { 
//       type: Boolean, 
//       default: false 
//     },
//     verrouJusquA: { 
//       type: Date, 
//       default: null 
//     },
//     resetToken: { 
//       type: String, 
//       default: null 
//     },
//     tokenExpiry: { 
//       type: Date, 
//       default: null 
//     }
//   },
//   creePar: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Agent'
//   }
// }, {
//   timestamps: true
// });

// // Méthode pour obtenir le nom complet
// userSchema.virtual('nomComplet').get(function() {
//   return `${this.prenom} ${this.nom}`;
// });

// module.exports = mongoose.model('User', userSchema);

// models/User.js
const userSchema = new mongoose.Schema({
  nom: { 
    type: String, 
     required: [true, 'Le nom est obligatoire'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
    match: [/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes']
   },
  prenom: { type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true,
    minlength: [2, 'Le prénom doit contenir au moins 2 caractères'],
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères'],
    match: [/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes']
   },
  email: { type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Veuillez fournir un email valide'
    ],
    maxlength: [100, 'L\'email ne peut pas dépasser 100 caractères'] },
  telephone: { type: Number, 
    required: [true, 'Le numéro de téléphone est obligatoire'],
    unique: true,
    trim: true,
    match: [
      /^\+221[567][0-9]{7}$/,
      'Le numéro doit être au format sénégalais: +221XXXXXXXX']
   },
  motDePasse: { type: String,required: [true, 'Le mot de passe est obligatoire'], },
  dateNaissance: { type: Date, required: [true, 'L\'adresse est obligatoire'],
    trim: true,},
  adresse: { type: String, required: true },
  numPieceIdentite: { type: Number, required: [true, 'Le numéro de pièce d\'identité est obligatoire'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [
      /^[A-Z0-9]{8,15}$/,
      'Le numéro de pièce d\'identité doit contenir entre 8 et 15 caractères alphanumériques'
    ] },
  photo: { type: String, default: '' },
  
  // Rôle pour différencier les types d'utilisateurs
  role: {
    type: String,
    enum: ['client', 'distributeur', 'agent'],
    required: true
  },
  
  // Champs spécifiques aux agents
  matricule: { 
    type: String, 
    unique: true,
    sparse: true // Permet d'être null pour les non-agents
  },
  agence: {
    type: String,
    enum: ['Dakar', 'Thiès', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Mbour', 'Touba']
  },
  
  compte: {
    numeroCompte: { type: String, unique: true },
    solde: { type: Number, default: 0, min: 0 },
    statut: { 
      type: String, 
      enum: ['actif', 'bloque'], 
      default: 'actif' 
    },
    qrCode: { type: String, default: '' }
  },
  
  securite: {
    tentativesConnexion: { type: Number, default: 0 },
    compteVerrouille: { type: Boolean, default: false },
    verrouJusquA: { type: Date, default: null },
    resetToken: { type: String, default: null },
    tokenExpiry: { type: Date, default: null }
  },
  
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);