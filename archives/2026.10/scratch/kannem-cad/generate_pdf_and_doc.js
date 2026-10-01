import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const pdfPath = path.resolve('Kannem_CAD_Invoice_INV-2026-MOCK.pdf');
const docPath = path.resolve('Kannem_CAD_Invoice_INV-2026-MOCK.doc');

// 1. Generate PDF File using jsPDF
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Primary Brand Colors
const NAVY = [11, 18, 36];
const CYAN = [0, 240, 255];
const RED = [220, 38, 38];
const SLATE = [71, 85, 105];
const LIGHT_BG = [248, 250, 252];

// Header Section
doc.setFillColor(...NAVY);
doc.rect(0, 0, 210, 38, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.text('KANNEM CAD', 14, 16);

doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...CYAN);
doc.text('PROFESSIONAL DRAFTING & LAND SURVEYING SERVICES', 14, 22);

doc.setTextColor(200, 220, 240);
doc.setFontSize(8);
doc.text('14000 Quail Springs Pkwy, Oklahoma City, OK  |  Ph: (405) 355-8123  |  info@kannem.com', 14, 28);

// Top Right Invoice Title
doc.setTextColor(255, 255, 255);
doc.setFontSize(22);
doc.setFont('helvetica', 'bold');
doc.text('INVOICE', 196, 18, { align: 'right' });

doc.setFontSize(8);
doc.setTextColor(...CYAN);
doc.text('OFFICIAL STATEMENT MOCK-UP', 196, 24, { align: 'right' });

// Accent Line
doc.setDrawColor(...CYAN);
doc.setLineWidth(0.8);
doc.line(0, 38, 210, 38);

// Meta Info Box
let y = 48;
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('INVOICE METADATA:', 14, y);

doc.setFont('helvetica', 'normal');
doc.setTextColor(...SLATE);
doc.text('Invoice Date: Sept 14, 2026', 14, y + 6);
doc.text('Due Date: Sept 29, 2026 (Net 15)', 14, y + 11);

doc.setFont('helvetica', 'bold');
doc.setTextColor(...SLATE);
doc.text('Invoice #:', 120, y + 6);
doc.setTextColor(...RED);
doc.text('[REQUIRED: INV-2026-XXXX]', 140, y + 6);

y += 22;

// Bill To & Project Section Cards
doc.setFillColor(...LIGHT_BG);
doc.setDrawColor(203, 213, 225);
doc.roundedRect(14, y, 88, 44, 2, 2, 'FD');
doc.roundedRect(108, y, 88, 44, 2, 2, 'FD');

// Bill To Content
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('🔴 BILL TO (CLIENT):', 18, y + 8);

doc.setFontSize(8.5);
doc.setTextColor(...RED);
doc.text('[REQUIRED: CLIENT / ORGANIZATION NAME]', 18, y + 16);
doc.text('[REQUIRED: CLIENT COMPANY OR FIRM NAME]', 18, y + 23);
doc.text('[REQUIRED: CLIENT BILLING EMAIL ADDRESS]', 18, y + 30);
doc.text('[REQUIRED: BILLING ADDRESS, CITY, STATE, ZIP]', 18, y + 37);

// Project Content
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('🔴 PROJECT / DWG REFERENCE:', 112, y + 8);

doc.setFontSize(8.5);
doc.setTextColor(...SLATE);
doc.text('Location:', 112, y + 16);
doc.setTextColor(...RED);
doc.text('[REQUIRED: PROPERTY SITE LOCATION]', 132, y + 16);

doc.setTextColor(...SLATE);
doc.text('DWG Job #:', 112, y + 23);
doc.setTextColor(...RED);
doc.text('[REQUIRED: DWG JOB # E.G. DWG-9283-OKC]', 132, y + 23);

doc.setTextColor(...SLATE);
doc.text('Parcel ID:', 112, y + 30);
doc.setTextColor(...RED);
doc.text('[REQUIRED: COUNTY PARCEL ID / TRACT #]', 132, y + 30);

y += 52;

// Itemized Line Items Table
doc.setFillColor(...NAVY);
doc.rect(14, y, 182, 8, 'F');

doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(255, 255, 255);
doc.text('SERVICE DESCRIPTION', 18, y + 5.5);
doc.text('UNIT', 115, y + 5.5);
doc.text('QTY', 135, y + 5.5);
doc.text('RATE ($)', 155, y + 5.5);
doc.text('AMOUNT ($)', 192, y + 5.5, { align: 'right' });

y += 8;

// Row 1
doc.setDrawColor(226, 232, 240);
doc.line(14, y + 12, 196, y + 12);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...RED);
doc.text('[REQUIRED: PRIMARY DRAFTING SERVICE - E.G. BOUNDARY SURVEY CADASTRAL MAPPING]', 18, y + 7);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...SLATE);
doc.text('Acres', 115, y + 7);
doc.text('1.5', 135, y + 7);
doc.text('$300.00', 155, y + 7);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('$450.00', 192, y + 7, { align: 'right' });

y += 12;

// Row 2
doc.line(14, y + 12, 196, y + 12);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...RED);
doc.text('[REQUIRED: SECONDARY EXHIBIT - E.G. EASEMENT & UTILITY ENCUMBRANCE DRAFTING]', 18, y + 7);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...SLATE);
doc.text('Flat', 115, y + 7);
doc.text('1.0', 135, y + 7);
doc.text('$250.00', 155, y + 7);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('$250.00', 192, y + 7, { align: 'right' });

y += 20;

// Summary Box
doc.setFillColor(...LIGHT_BG);
doc.setDrawColor(203, 213, 225);
doc.roundedRect(120, y, 76, 32, 2, 2, 'FD');

doc.setFontSize(8.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...SLATE);
doc.text('Subtotal:', 124, y + 8);
doc.text('$700.00', 190, y + 8, { align: 'right' });

doc.text('Discount:', 124, y + 14);
doc.text('-$0.00', 190, y + 14, { align: 'right' });

doc.text('Sales Tax (0%):', 124, y + 20);
doc.text('+$0.00', 190, y + 20, { align: 'right' });

doc.setDrawColor(...NAVY);
doc.line(124, y + 23, 192, y + 23);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...NAVY);
doc.text('BALANCE DUE:', 124, y + 29);
doc.text('$700.00', 190, y + 29, { align: 'right' });

// Remittance Box
doc.setFillColor(...LIGHT_BG);
doc.setDrawColor(203, 213, 225);
doc.roundedRect(14, y, 98, 32, 2, 2, 'FD');

doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('REMITTANCE & PAYMENT INSTRUCTIONS:', 18, y + 7);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...SLATE);
doc.text('Please remit payment via ACH Direct Deposit, Wire, or Check.', 18, y + 13);
doc.text('Payable To: Kannem Professional CAD Services', 18, y + 18);
doc.text('Address: 14000 Quail Springs Pkwy, Oklahoma City, OK', 18, y + 23);
doc.text('Support: (405) 355-8123  |  info@kannem.com', 18, y + 28);

// Save PDF
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(pdfPath, pdfBuffer);
console.log('Successfully generated PDF:', pdfPath);

// 2. Generate Word Document (.doc / .docx)
const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Kannem CAD Red Mock-up Invoice</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 30px; }
    h1 { color: #0b1224; font-size: 24pt; margin: 0 0 4px 0; }
    .subtitle { color: #00f0ff; font-size: 10pt; font-weight: bold; margin-bottom: 20px; }
    .header-table { width: 100%; margin-bottom: 20px; }
    .company-info { font-size: 9.5pt; color: #334155; line-height: 1.5; }
    .inv-meta { text-align: right; font-size: 10pt; }
    .inv-meta h2 { font-size: 22pt; color: #0b1224; margin: 0 0 8px 0; }
    .red-ph { color: #dc2626 !important; font-weight: bold; background-color: #fef2f2; padding: 2px 6px; border: 1px solid #ef4444; }
    .parties-table { width: 100%; margin-bottom: 24px; }
    .party-cell { width: 50%; vertical-align: top; padding: 12px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 9.5pt; }
    .label { font-weight: bold; color: #0b1224; font-size: 9pt; margin-bottom: 6px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9.5pt; }
    .items-table th { background-color: #f1f5f9; color: #0f172a; border-bottom: 2px solid #0b1224; padding: 8px; text-align: left; font-size: 9pt; }
    .totals-table { width: 45%; float: right; margin-bottom: 24px; font-size: 10pt; }
    .totals-table td { padding: 6px; }
    .grand-total { font-size: 13pt; font-weight: bold; color: #0b1224; border-top: 2px solid #0b1224; border-bottom: 2px solid #0b1224; }
    .clear { clear: both; }
    .remittance { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; font-size: 9pt; color: #334155; line-height: 1.5; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="company-info" style="vertical-align: top;">
        <h1>KANNEM CAD</h1>
        <div class="subtitle">PROFESSIONAL DRAFTING & LAND SURVEYING SERVICES</div>
        <strong>Kannem Professional CAD Services</strong><br>
        14000 Quail Springs Pkwy<br>
        Oklahoma City, OK<br>
        Office: (405) 355-8123 | Mobile: (321) 960-1143<br>
        Email: info@kannem.com | Web: kannem.com
      </td>
      <td class="inv-meta" style="vertical-align: top;">
        <h2>INVOICE</h2>
        <strong>Invoice #:</strong> <span class="red-ph">[REQUIRED: INV-2026-XXXX]</span><br>
        <strong>Invoice Date:</strong> Sept 14, 2026<br>
        <strong>Due Date:</strong> Sept 29, 2026<br>
        <strong>Payment Terms:</strong> Net 15 Days
      </td>
    </tr>
  </table>

  <table class="parties-table">
    <tr>
      <td class="party-cell">
        <div class="label">🔴 BILL TO (CLIENT):</div>
        <div style="margin-bottom: 4px;"><span class="red-ph">[REQUIRED: CLIENT / ORGANIZATION NAME]</span></div>
        <div style="margin-bottom: 4px;"><span class="red-ph">[REQUIRED: CLIENT COMPANY OR FIRM NAME]</span></div>
        <div style="margin-bottom: 4px;"><span class="red-ph">[REQUIRED: CLIENT BILLING EMAIL ADDRESS]</span></div>
        <div><span class="red-ph">[REQUIRED: BILLING ADDRESS, CITY, STATE, ZIP]</span></div>
      </td>
      <td class="party-cell">
        <div class="label">🔴 PROJECT / DWG REFERENCE:</div>
        <div style="margin-bottom: 4px;"><strong>Location:</strong> <span class="red-ph">[REQUIRED: PROPERTY SITE LOCATION ADDRESS]</span></div>
        <div style="margin-bottom: 4px;"><strong>DWG Job #:</strong> <span class="red-ph">[REQUIRED: DWG JOB # E.G. DWG-9283-OKC]</span></div>
        <div><strong>Parcel ID:</strong> <span class="red-ph">[REQUIRED: COUNTY PARCEL ID OR LEGAL TRACT #]</span></div>
      </td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 45%;">SERVICE DESCRIPTION</th>
        <th style="width: 15%;">UNIT TYPE</th>
        <th style="width: 12%; text-align: center;">QTY</th>
        <th style="width: 13%; text-align: right;">RATE ($)</th>
        <th style="width: 15%; text-align: right;">AMOUNT ($)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><span class="red-ph">[REQUIRED: PRIMARY DRAFTING SERVICE - E.G. BOUNDARY SURVEY & CADASTRAL MAPPING]</span></td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">Acres</td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;">1.5</td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">$300.00</td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold;">$450.00</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><span class="red-ph">[REQUIRED: SECONDARY EXHIBIT - E.G. EASEMENT & UTILITY ENCUMBRANCE DRAFTING]</span></td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">Flat</td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;">1.0</td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">$250.00</td>
        <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold;">$250.00</td>
      </tr>
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td>Subtotal:</td>
      <td style="text-align: right; font-weight: bold;">$700.00</td>
    </tr>
    <tr>
      <td>Discount:</td>
      <td style="text-align: right;">-$0.00</td>
    </tr>
    <tr>
      <td>Sales Tax (0%):</td>
      <td style="text-align: right;">+$0.00</td>
    </tr>
    <tr class="grand-total">
      <td>BALANCE DUE:</td>
      <td style="text-align: right;">$700.00</td>
    </tr>
  </table>

  <div class="clear"></div>

  <div class="remittance">
    <div class="label">REMITTANCE & PAYMENT INSTRUCTIONS:</div>
    Please remit payment via ACH Direct Deposit, Wire Transfer, or Check.<br>
    <strong>Payable To:</strong> Kannem Professional CAD Services<br>
    <strong>Office Remittance Address:</strong> 14000 Quail Springs Pkwy, Oklahoma City, OK<br>
    <strong>Questions/Billing Support:</strong> (405) 355-8123 | info@kannem.com
  </div>
</body>
</html>
`;

fs.writeFileSync(docPath, '\ufeff' + wordHtml, 'utf8');
console.log('Successfully generated Word Doc:', docPath);
