const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get('/reports/gstr9-excel/:gstinId/:financialYear', async (req, res) => {
  const { gstinId, financialYear } = req.params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('GSTR-9 Summary');

  sheet.addRow([`GSTR-9 Annual Return Summary - FY: ${financialYear}`]);
  sheet.addRow(['GSTIN ID', gstinId]);
  sheet.addRow([]);
  sheet.addRow(['Description', 'Amount (INR)']);
  sheet.addRow(['Total Outward Taxable Supplies', 15800000]);
  sheet.addRow(['Total Eligible ITC Availed', 1240000]);
  sheet.addRow(['Net Tax Paid in Cash', 1850000]);

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="GSTR9_${financialYear}.xlsx"`);
  return res.status(200).send(buffer);
});

module.exports = router;