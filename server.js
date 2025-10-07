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
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

/* ==============================
   🔐 CONFIGURATION CORS
================================ */
const allowedOrigins = [
  'https://tp-react-snowy.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans "Origin" (comme certains preflights)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 Origine bloquée par CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Gestion automatique des requêtes préflight OPTIONS
app.options('*', cors(corsOptions));

/* ==============================
   ⚙️  CONFIG EXPRESS
================================ */
app.use(express.json());

// Middleware de logging (utile pour Render)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('🌍 Origin:', req.headers.origin);
  next();
});

/* ==============================
   💾 CONNEXION MONGODB
================================ */
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agentdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connexion MongoDB réussie'))
  .catch((error) => {
    console.error('❌ Erreur MongoDB:', error.message);
    console.log('📝 Utilisation des données mockées');
  });

/* ==============================
   🧩 ROUTES
================================ */
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
    message: '🚀 API Agent Backend opérationnelle',
    endpoints: {
      health: '/api/health',
      login: 'POST /api/agent/login'
    }
  });
});

/* ==============================
   🚫 GESTION ERREURS
================================ */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée: ' + req.originalUrl
  });
});

/* ==============================
   🚀 LANCEMENT SERVEUR
================================ */
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

