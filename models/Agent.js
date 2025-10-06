const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  telephone: {
    type: Number,
       unique: true,
    required: true,
    // match: [/^\+221[0-9]{7}$/, 'Numéro Sénégalais invalide']
  },
  motDePasse: {
    type: String,
    required: true,
    minlength: 6
  },
  matricule: {
    type: String,
    unique: true,
    required: true
  },
  agence: {
    type: String,
    required: true,
    enum: ['Dakar', 'Thiès', 'Saint-Louis', 'Kaolack', 'Ziguinchor']
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif'],
    default: 'actif'
  },
  dateCreation: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Agent', agentSchema);