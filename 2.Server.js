require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const gstr3bRouter = require('./gstr3bRoute');
const gstr9ExportRouter = require('./gstr9ExportRoute');

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database.');
    release();
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/returns', gstr3bRouter);
app.use('/api', gstr9ExportRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', service: 'GST Filing Backend' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});