import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [gstinId] = useState('sample-gstin-uuid');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [returnPeriod, setReturnPeriod] = useState('042026');
  const [financialYear] = useState('2025-2026');
  const [isFiling, setIsFiling] = useState(false);
  const [filingResult, setFilingResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [reportData] = useState({
    sales_and_liability: [
      { return_period: '042026', gstr1_taxable_value: 450000, output_cgst: 40500, output_sgst: 40500, output_igst: 0, gstr3b_status: 'FILED' },
      { return_period: '052026', gstr1_taxable_value: 620000, output_cgst: 55800, output_sgst: 55800, output_igst: 18000, gstr3b_status: 'FILED' },
      { return_period: '062026', gstr1_taxable_value: 510000, output_cgst: 45900, output_sgst: 45900, output_igst: 9000, gstr3b_status: 'PENDING' }
    ],
    vendor_purchases: [
      { return_period: '052026', vendor_gstin: '29AABCT1332L1ZS', vendor_name: 'TechCorp Supplies India', total_invoices: 4, total_taxable_purchase: 210000, total_tax_paid: 37800, total_purchase_amount: 247800 },
      { return_period: '052026', vendor_gstin: '27AADCS5541K1ZU', vendor_name: 'Apex Logistics Solutions', total_invoices: 12, total_taxable_purchase: 85000, total_tax_paid: 4250, total_purchase_amount: 89250 }
    ],
    tds_details: [
      { return_period: '052026', invoice_number: 'INV-2026-089', deductor_name: 'Government Dept (PWD)', total_contract_value: 500000, cgst_deducted: 5000, sgst_deducted: 5000, filing_status: 'CREDITED' }
    ],
    gstr9_summary: {
      total_outward_taxable: 15800000,
      total_itc_availed: 1240000,
      total_cash_paid: 1850000
    }
  });

  const handleExcelDownload = async () => {
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/gstr9-excel/${gstinId}/${financialYear}`);
      if (!response.ok) throw new Error('Could not connect to backend to download Excel.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR9_${financialYear}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleFileGSTR3B = async () => {
    setIsFiling(true);
    setErrorMessage(null);
    setFilingResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/gstr3b/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstinId, returnPeriod })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Filing failed.');
      setFilingResult(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsFiling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Filing & Compliance Suite</h1>
          <p className="text-sm text-gray-500">Sales liabilities, vendor ITC reconciliation, GSTR-3B filing, and GSTR-9 exports.</p>
        </div>
        <button onClick={handleExcelDownload} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow">
          Download Annual Excel
        </button>
      </div>

      <div className="flex border-b border-gray-200 space-x-6 bg-white px-6 rounded-t-xl shadow-sm">
        {['dashboard', 'gstr3b', 'gstr9'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 px-2 border-b-2 font-bold text-sm uppercase ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          >
            {tab === 'dashboard' ? 'Compliance Dashboard' : tab === 'gstr3b' ? 'GSTR-3B Filing' : 'GSTR-9 Summary'}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errorMessage}</div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-4 border-b font-bold text-gray-800">Sales Declared & Output Liability</div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-500">Period</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">Taxable (₹)</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">CGST (₹)</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">SGST (₹)</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">IGST (₹)</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.sales_and_liability.map((row, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 font-semibold">{row.return_period}</td>
                    <td className="px-6 py-4 text-right">₹{row.gstr1_taxable_value.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">₹{row.output_cgst.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">₹{row.output_sgst.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">₹{row.output_igst.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${row.gstr3b_status === 'FILED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {row.gstr3b_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-4 border-b font-bold text-gray-800">Vendor Purchases</div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-500">Vendor</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-500">Invoices</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">Taxable (₹)</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">Tax Paid (₹)</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.vendor_purchases.map((row, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="font-bold">{row.vendor_name}</div>
                      <div className="text-xs text-gray-500">{row.vendor_gstin}</div>
                    </td>
                    <td className="px-6 py-4 text-center">{row.total_invoices}</td>
                    <td className="px-6 py-4 text-right">₹{row.total_taxable_purchase.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">₹{row.total_tax_paid.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold">₹{row.total_purchase_amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'gstr3b' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-xl font-bold">GSTR-3B Direct Filing</h2>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Return Period (MMYYYY)</label>
            <input type="text" maxLength="6" value={returnPeriod} onChange={(e) => setReturnPeriod(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <button onClick={handleFileGSTR3B} disabled={isFiling} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
            {isFiling ? 'Submitting...' : 'Compute & File GSTR-3B'}
          </button>
          {filingResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900 font-bold">
              Filed Successfully! ARN: {filingResult.arn}
            </div>
          )}
        </div>
      )}

      {activeTab === 'gstr9' && (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <span className="text-xs font-bold text-gray-500 uppercase">Outward Taxable</span>
            <p className="text-xl font-bold mt-1">₹{reportData.gstr9_summary.total_outward_taxable.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <span className="text-xs font-bold text-gray-500 uppercase">ITC Availed</span>
            <p className="text-xl font-bold text-green-600 mt-1">₹{reportData.gstr9_summary.total_itc_availed.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <span className="text-xs font-bold text-gray-500 uppercase">Cash Paid</span>
            <p className="text-xl font-bold text-blue-600 mt-1">₹{reportData.gstr9_summary.total_cash_paid.toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}
    </div>
  );
}