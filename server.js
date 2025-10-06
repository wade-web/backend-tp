// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// app.use(cors());
// app.use(express.json());

// // Connexion MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// // Routes Agent
// app.use('/api/agent', require('./routes/agentRoutes'));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Serveur Agent démarré sur le port ${PORT}`);
// });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuration CORS SPÉCIFIQUE
const allowedOrigins = [
  'https://tp-react-snowy.vercel.app',
  'https://tp-react-snowy.vercel.app/',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    // En développement, autoriser toutes les origines
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En production, vérifier les origines autorisées
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 Origine bloquée:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Gestion MANUELLE des pré-vols OPTIONS
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  console.log('User-Agent:', req.headers['user-agent']?.substring(0, 80));
  next();
});

// Connexion MongoDB avec gestion d'erreur
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agentdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion MongoDB réussie');
})
.catch((error) => {
  console.error('❌ Erreur MongoDB:', error.message);
  console.log('📝 Utilisation des données mockées');
});

// Routes Agent
app.use('/api/agent', require('./routes/agentRoutes'));

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend fonctionne',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'API Agent Backend',
    health: '/api/health',
    login: 'POST /api/agent/login'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée: ' + req.originalUrl
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
});
