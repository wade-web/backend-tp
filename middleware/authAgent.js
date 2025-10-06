const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'agent') {
      return res.status(403).json({ error: 'Accès réservé aux agents' });
    }

    const agent = await Agent.findById(decoded.agentId).select('-motDePasse');
    if (!agent) {
      return res.status(401).json({ error: 'Agent non trouvé' });
    }

    req.agent = agent;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};