import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { utils, write } from 'xlsx';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PROFIT_GREEN_ARGB = 'FF316729';
const STYLES_PATH = 'xl/styles.xml';
const FIRST_SHEET_PATH = 'xl/worksheets/sheet1.xml';

export interface TradingHistoryExportItem {
  type: 'BUY' | 'SELL';
  date: string;
  symbol: string;
  shares: number;
  price: number;
  total: number;
  fee: number;
  profit?: number;
  profit_pct?: number;
  port_type: string;
}

function colorPositivePercentages(xlsxData: Uint8Array) {
  const files = unzipSync(xlsxData);
  const stylesFile = files[STYLES_PATH];
  const sheetFile = files[FIRST_SHEET_PATH];

  if (!stylesFile || !sheetFile) return xlsxData;

  let stylesXml = strFromU8(stylesFile);
  let sheetXml = strFromU8(sheetFile);
  const percentCells = [...sheetXml.matchAll(/<c r="K\d+" s="(\d+)"><v>([^<]+)<\/v><\/c>/g)];
  const firstProfitCell = percentCells.find((match) => Number(match[2]) > 0);
  const fonts = stylesXml.match(/<fonts count="(\d+)">([\s\S]*?)<\/fonts>/);
  const cellStyles = stylesXml.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);

  if (!firstProfitCell || !fonts || !cellStyles) return xlsxData;

  const fontEntries = [...fonts[2].matchAll(/<font>[\s\S]*?<\/font>/g)].map((match) => match[0]);
  const styleEntries = [...cellStyles[2].matchAll(/<xf\b[^>]*\/>/g)].map((match) => match[0]);
  const baseFont = fontEntries[0];
  const baseStyle = styleEntries[Number(firstProfitCell[1])];

  if (!baseFont || !baseStyle) return xlsxData;

  const greenFontId = fontEntries.length;
  const greenStyleId = styleEntries.length;
  const greenFont = baseFont.replace(
    /<color\b[^>]*\/>/,
    `<color rgb="${PROFIT_GREEN_ARGB}"/>`,
  );
  const greenStyleWithFont = baseStyle.replace(/fontId="\d+"/, `fontId="${greenFontId}"`);
  const greenStyle = greenStyleWithFont.includes('applyFont=')
    ? greenStyleWithFont.replace(/applyFont="\d+"/, 'applyFont="1"')
    : greenStyleWithFont.replace('/>', ' applyFont="1"/>');

  stylesXml = stylesXml
    .replace(
      fonts[0],
      `<fonts count="${greenFontId + 1}">${fonts[2]}${greenFont}</fonts>`,
    )
    .replace(
      cellStyles[0],
      `<cellXfs count="${greenStyleId + 1}">${cellStyles[2]}${greenStyle}</cellXfs>`,
    );

  sheetXml = sheetXml.replace(
    /<c r="K(\d+)" s="\d+"><v>([^<]+)<\/v><\/c>/g,
    (cell, rowNumber, value) => (
      Number(value) > 0
        ? `<c r="K${rowNumber}" s="${greenStyleId}"><v>${value}</v></c>`
        : cell
    ),
  );

  files[STYLES_PATH] = strToU8(stylesXml);
  files[FIRST_SHEET_PATH] = strToU8(sheetXml);
  return zipSync(files, { level: 6 });
}

function createWorksheet(history: TradingHistoryExportItem[]) {
  const headers = [
    'ลำดับ',
    'วันที่',
    'ประเภท',
    'Symbol',
    'Port',
    'จำนวนหุ้น',
    'ราคา/หุ้น',
    'ค่าธรรมเนียม',
    'มูลค่าสุทธิ',
    'กำไร/ขาดทุนจริง',
    'กำไร/ขาดทุน (%)',
  ];
  const rows = history.map((item, index) => {
    const [year, month, day] = item.date.split('-').map(Number);
    return [
      index + 1,
      new Date(year, month - 1, day),
      item.type,
      item.symbol,
      item.port_type,
      Number(item.shares),
      Number(item.price),
      Number(item.fee),
      Number(item.total),
      item.type === 'SELL' && item.profit !== undefined ? Number(item.profit) : null,
      item.type === 'SELL' && item.profit_pct !== undefined ? item.profit_pct : null,
    ];
  });
  const worksheet = utils.aoa_to_sheet([headers, ...rows], {
    cellDates: true,
    dateNF: 'dd/mm/yyyy',
  });

  worksheet['!cols'] = [
    { wch: 8 }, { wch: 13 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 17 }, { wch: 20 },
    { wch: 18 },
  ];
  worksheet['!autofilter'] = { ref: `A1:K${rows.length + 1}` };

  rows.forEach((_, index) => {
    const rowNumber = index + 2;
    worksheet[`B${rowNumber}`].z = 'dd/mm/yyyy';
    worksheet[`F${rowNumber}`].z = '#,##0';
    ['G', 'H', 'I', 'J'].forEach((column) => {
      const cell = worksheet[`${column}${rowNumber}`];
      if (cell) cell.z = '"฿"#,##0.00;[Red]-"฿"#,##0.00';
    });
    const percentageCell = worksheet[`K${rowNumber}`];
    if (percentageCell) percentageCell.z = '0.00%;[Red]-0.00%';
  });

  return worksheet;
}

export function downloadTradingHistoryExcel(history: TradingHistoryExportItem[]) {
  const workbook = utils.book_new();
  workbook.Props = {
    Title: 'PORT_TRACK Trading History',
    Subject: 'ประวัติการซื้อขายทั้งหมด',
    Author: 'PORT_TRACK',
    CreatedDate: new Date(),
  };
  utils.book_append_sheet(workbook, createWorksheet(history), 'Trading History');

  const rawWorkbook = write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    compression: true,
    cellStyles: true,
  });
  const coloredWorkbook = colorPositivePercentages(new Uint8Array(rawWorkbook));
  const blob = new Blob([coloredWorkbook.slice().buffer], { type: MIME_XLSX });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  const reportDate = new Date().toISOString().slice(0, 10);

  downloadLink.href = downloadUrl;
  downloadLink.download = `PORT_TRACK_Trading_History_${reportDate}.xlsx`;
  downloadLink.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}
