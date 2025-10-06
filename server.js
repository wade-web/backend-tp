// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// app.use(cors());
// app.use(express.json());

// // Connexion MongoDB
// // mongoose.connect(process.env.MONGODB_URI, {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true,
// // });
// mongoose.connect(process.env.MONGODB_URI || 'https://backend-tp-km23.onrender.com', {
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

// Middleware CORS - Configurez correctement pour votre frontend Vercel
app.use(cors({
  origin: [
    'https://tp-react-snowy.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173' // Port par défaut de Vite
  ],
  credentials: true
}));

app.use(express.json());

// CORRECTION : Utilisez une véritable URI MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentdb';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion MongoDB réussie');
})
.catch((error) => {
  console.error('❌ Erreur connexion MongoDB:', error);
});

// Routes Agent
app.use('/api/agent', require('./routes/agentRoutes'));

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend fonctionne' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Agent démarré sur le port ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

