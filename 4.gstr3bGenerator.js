const { Pool } = require('pg');
const { calculateNetTaxPayable } = require('./calculateTaxPayable');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function generateGSTR3BPayload(gstinId, returnPeriod) {
  const client = await pool.connect();
  try {
    const gstinRes = await client.query('SELECT gstin FROM gstins WHERE gstin_id = $1', [gstinId]);
    if (gstinRes.rows.length === 0) throw new Error('GSTIN not found');
    const gstin = gstinRes.rows[0].gstin;

    const liabilityQuery = `
      SELECT 
        COALESCE(SUM(total_taxable_value), 0) as taxable_value,
        COALESCE(SUM(total_cgst), 0) as cgst,
        COALESCE(SUM(total_sgst), 0) as sgst,
        COALESCE(SUM(total_igst), 0) as igst,
        COALESCE(SUM(total_cess), 0) as cess
      FROM invoices
      WHERE gstin_id = $1 
        AND invoice_type IN ('B2B', 'B2C_LARGE', 'B2C_SMALL', 'EXPORT')
        AND TO_CHAR(invoice_date, 'MMYYYY') = $2;
    `;
    const liabilityRes = await client.query(liabilityQuery, [gstinId, returnPeriod]);
    const outward = liabilityRes.rows[0];

    const itcQuery = `
      SELECT 
        COALESCE(SUM(total_cgst), 0) as cgst,
        COALESCE(SUM(total_sgst), 0) as sgst,
        COALESCE(SUM(total_igst), 0) as igst,
        COALESCE(SUM(total_cess), 0) as cess
      FROM invoices
      WHERE gstin_id = $1 
        AND invoice_type = 'PURCHASE'
        AND TO_CHAR(invoice_date, 'MMYYYY') = $2;
    `;
    const itcRes = await client.query(itcQuery, [gstinId, returnPeriod]);
    const itc = itcRes.rows[0];

    const taxOffset = calculateNetTaxPayable(
      { cgst: +outward.cgst, sgst: +outward.sgst, igst: +outward.igst, cess: +outward.cess },
      { cgst: +itc.cgst, sgst: +itc.sgst, igst: +itc.igst, cess: +itc.cess }
    );

    return {
      status: 'success',
      return_period: returnPeriod,
      payload: {
        gstin,
        ret_period: returnPeriod,
        sup_details: {
          os_supp_details: {
            txval: +outward.taxable_value,
            iamt: +outward.igst,
            camt: +outward.cgst,
            samt: +outward.sgst,
            csamt: +outward.cess
          }
        },
        itc_elg: {
          itc_avl: [{ ty: "ALL", iamt: +itc.igst, camt: +itc.cgst, samt: +itc.sgst, csamt: +itc.cess }],
          itc_net: { iamt: +itc.igst, camt: +itc.cgst, samt: +itc.sgst, csamt: +itc.cess }
        },
        payment_of_tax: {
          paid: [{
            tran_typ: "RET",
            iamt: taxOffset.netPayableInCash.igst,
            camt: taxOffset.netPayableInCash.cgst,
            samt: taxOffset.netPayableInCash.sgst,
            csamt: taxOffset.netPayableInCash.cess
          }]
        },
        audit_metadata: {
          utilized_itc: taxOffset.utilizedItc,
          closing_itc_balance: taxOffset.closingItcBalance
        }
      }
    };
  } finally {
    client.release();
  }
}

module.exports = { generateGSTR3BPayload };