const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
const { generateGSTR3BPayload } = require('./gstr3bGenerator');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.post('/gstr3b/file', async (req, res) => {
  const { gstinId, returnPeriod } = req.body;
  if (!gstinId || !returnPeriod) {
    return res.status(400).json({ status: 'error', message: 'gstinId and returnPeriod are required.' });
  }

  const client = await pool.connect();
  try {
    const gstr3bResult = await generateGSTR3BPayload(gstinId, returnPeriod);
    const payload = gstr3bResult.payload;

    await client.query('BEGIN');
    await client.query(
      `INSERT INTO return_filings (gstin_id, return_type, return_period, status, response_payload, updated_at)
       VALUES ($1, 'GSTR-3B', $2, 'GENERATED', $3, CURRENT_TIMESTAMP)
       ON CONFLICT (gstin_id, return_type, return_period)
       DO UPDATE SET status = 'GENERATED', response_payload = EXCLUDED.response_payload, updated_at = CURRENT_TIMESTAMP;`,
      [gstinId, returnPeriod, JSON.stringify(payload)]
    );
    await client.query('COMMIT');

    const gspFilingUrl = `${process.env.GSP_BASE_URL || 'https://sandbox.gst.gov.in/taxpayer/v1.1'}/returns/gstr3b`;
    const gspResponse = await axios.post(gspFilingUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'gsp-app-key': process.env.GSP_API_KEY || '',
        'Authorization': `Bearer ${req.headers['x-authtoken'] || process.env.GSP_TEST_AUTH_TOKEN || ''}`,
        'gstin': payload.gstin
      },
      timeout: 15000
    });

    const arn = gspResponse.data.arn || gspResponse.data.ReferenceId || 'SANDBOX-ARN-2026';
    await client.query(
      `UPDATE return_filings SET status = 'FILED', arn = $1, response_payload = $2, filing_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE gstin_id = $3 AND return_type = 'GSTR-3B' AND return_period = $4`,
      [arn, JSON.stringify(gspResponse.data), gstinId, returnPeriod]
    );

    return res.status(200).json({ status: 'success', arn, gstn_response: gspResponse.data });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;