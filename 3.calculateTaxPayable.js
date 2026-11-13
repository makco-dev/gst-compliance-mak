function calculateNetTaxPayable(outputLiability, availableItc) {
  let outIgst = outputLiability.igst || 0;
  let outCgst = outputLiability.cgst || 0;
  let outSgst = outputLiability.sgst || 0;
  let outCess = outputLiability.cess || 0;

  let itcIgst = availableItc.igst || 0;
  let itcCgst = availableItc.cgst || 0;
  let itcSgst = availableItc.sgst || 0;
  let itcCess = availableItc.cess || 0;

  let usedIgst = 0, usedCgst = 0, usedSgst = 0, usedCess = 0;

  // Step 1: Offset IGST
  let fromIgstToIgst = Math.min(itcIgst, outIgst);
  outIgst -= fromIgstToIgst; itcIgst -= fromIgstToIgst; usedIgst += fromIgstToIgst;

  let fromCgstToIgst = Math.min(itcCgst, outIgst);
  outIgst -= fromCgstToIgst; itcCgst -= fromCgstToIgst; usedCgst += fromCgstToIgst;

  let fromSgstToIgst = Math.min(itcSgst, outIgst);
  outIgst -= fromSgstToIgst; itcSgst -= fromSgstToIgst; usedSgst += fromSgstToIgst;

  // Step 2: Offset CGST
  let fromCgstToCgst = Math.min(itcCgst, outCgst);
  outCgst -= fromCgstToCgst; itcCgst -= fromCgstToCgst; usedCgst += fromCgstToCgst;

  let fromIgstToCgst = Math.min(itcIgst, outCgst);
  outCgst -= fromIgstToCgst; itcIgst -= fromIgstToCgst; usedIgst += fromIgstToCgst;

  // Step 3: Offset SGST
  let fromSgstToSgst = Math.min(itcSgst, outSgst);
  outSgst -= fromSgstToSgst; itcSgst -= fromSgstToSgst; usedSgst += fromSgstToSgst;

  let fromIgstToSgst = Math.min(itcIgst, outSgst);
  outSgst -= fromIgstToSgst; itcIgst -= fromIgstToSgst; usedIgst += fromIgstToSgst;

  // Step 4: Offset Cess
  let fromCessToCess = Math.min(itcCess, outCess);
  outCess -= fromCessToCess; itcCess -= fromCessToCess; usedCess += fromCessToCess;

  return {
    netPayableInCash: {
      igst: Math.round(outIgst * 100) / 100,
      cgst: Math.round(outCgst * 100) / 100,
      sgst: Math.round(outSgst * 100) / 100,
      cess: Math.round(outCess * 100) / 100,
      total: Math.round((outIgst + outCgst + outSgst + outCess) * 100) / 100
    },
    utilizedItc: {
      igst: Math.round(usedIgst * 100) / 100,
      cgst: Math.round(usedCgst * 100) / 100,
      sgst: Math.round(usedSgst * 100) / 100,
      cess: Math.round(usedCess * 100) / 100
    },
    closingItcBalance: {
      igst: Math.round(itcIgst * 100) / 100,
      cgst: Math.round(itcCgst * 100) / 100,
      sgst: Math.round(itcSgst * 100) / 100,
      cess: Math.round(itcCess * 100) / 100
    }
  };
}

module.exports = { calculateNetTaxPayable };