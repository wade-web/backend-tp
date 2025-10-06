const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['depot', 'retrait', 'transfert'],
    required: true
  },
  montant: {
    type: Number,
    required: true,
    min: 1
  },
  frais: {
    type: Number,
    default: 0,
    min: 0
  },
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  statut: {
    type: String,
    enum: ['complete', 'annulee'],
    default: 'complete'
  },
  dateTransaction: {
    type: Date,
    default: Date.now
  },
  compteSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  compteDestinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  effectuePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
transactionSchema.index({ dateTransaction: -1 });
transactionSchema.index({ compteSource: 1 });
transactionSchema.index({ compteDestinataire: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);