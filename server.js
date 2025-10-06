const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Connexion MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
mongoose.connect(process.env.MONGODB_URI || 'https://backend-tp-km23.onrender.com', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes Agent
app.use('/api/agent', require('./routes/agentRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur Agent démarré sur le port ${PORT}`);

});
