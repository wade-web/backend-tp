const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
// Configuration CORS pour votre application
// const allowedOrigins = [
//   'https://tp-react-snowy.vercel.app', // Votre frontend Vercel
//   'https://tp-react-snowy.vercel.app/', // Au cas où avec slash
//   'http://localhost:3000', // Dev React
//   'http://localhost:5173' // Dev Vite
// ];

// app.use(cors({
//   origin: allowedOrigins,
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Accept'],
//   credentials: false
// }));

// Gestion OPTIONS
// app.options('*', (req, res) => {
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.header('Access-Control-Allow-Origin', origin);
//   }
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
//   res.status(204).send(); // No Content
// });

app.use(express.json());

// Logging simplifié
// app.use((req, res, next) => {
//   console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
//   next();
// });
// app.use(express.json());

Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// mongoose.connect(process.env.MONGODB_URI || 'https://backend-tp-km23.onrender.com', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// Routes Agent
app.use('/api/agent', require('./routes/agentRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur Agent démarré sur le port ${PORT}`);

});









