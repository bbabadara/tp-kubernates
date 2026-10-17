const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./src/routes');
const errorHandler = require('./src/middlewares/errorHandler');
const db = require('./src/models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

app.use(errorHandler);

const start = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Connexion PostgreSQL établie avec succès.');

    await db.sequelize.sync({ alter: false });
    console.log('Tables synchronisées.');

    app.listen(PORT, () => {
      console.log(`Serveur backend démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur de démarrage:', error.message);
    process.exit(1);
  }
};

start();
