/**
 * Motor de análisis heurístico para facturas
 * Extrae proveedor, categoría, monto, fecha de vencimiento y referencia desde texto libre.
 */

const COMMON_PROVIDERS = [
  { name: 'EPM', category: 'servicios', keywords: ['epm', 'empresas publicas', 'energia epm', 'gas epm', 'agua epm'] },
  { name: 'Enel / Codensa', category: 'servicios', keywords: ['enel', 'codensa', 'energia de bogota', 'grupo enel'] },
  { name: 'Vanti / Gas Natural', category: 'servicios', keywords: ['vanti', 'gas natural', 'grupo vanti', 'gas oriente', 'gas cundi'] },
  { name: 'Triple A', category: 'servicios', keywords: ['triple a', 'triple-a', 'acueducto barranquilla'] },
  { name: 'Acueducto Bogotá', category: 'servicios', keywords: ['acueducto de bogota', 'eaab', 'alcantarillado bogota'] },
  { name: 'Claro', category: 'servicios', keywords: ['claro', 'telmex', 'comcel'] },
  { name: 'Movistar', category: 'servicios', keywords: ['movistar', 'telefonica'] },
  { name: 'Tigo', category: 'servicios', keywords: ['tigo', 'une', 'millicom'] },
  { name: 'ETB', category: 'servicios', keywords: ['etb', 'telefonos de bogota'] },
  { name: 'DirecTV', category: 'servicios', keywords: ['directv', 'direct tv'] },
  
  // Créditos / Bancos
  { name: 'Bancolombia', category: 'creditos', keywords: ['bancolombia', 'sufi', 'tuya', 'tarjeta visa bancolombia', 'mastercard bancolombia'] },
  { name: 'Banco Davivienda', category: 'creditos', keywords: ['davivienda', 'banco davivienda', 'tarjeta davivienda'] },
  { name: 'Banco de Bogotá', category: 'creditos', keywords: ['banco de bogota', 'tarjeta bogota'] },
  { name: 'Banco BBVA', category: 'creditos', keywords: ['bbva', 'banco bbva'] },
  { name: 'Scotiabank Colpatria', category: 'creditos', keywords: ['colpatria', 'scotiabank'] },
  { name: 'Banco Falabella', category: 'creditos', keywords: ['falabella', 'banco falabella', 'cmr'] },
  
  // Arriendos
  { name: 'Arriendo Apartamento', category: 'arriendos', keywords: ['arriendo', 'alquiler', 'canon arriendo', 'arrendador'] },
  
  // Administraciones
  { name: 'Administración Edificio', category: 'administraciones', keywords: ['administracion', 'cuota administracion', 'edificio', 'conjunto residencial', 'ph', 'propiedad horizontal', 'copropiedad'] }
];

const MONTHS_MAP = {
  'enero': '01', 'ene': '01', 'january': '01', 'jan': '01',
  'febrero': '02', 'feb': '02', 'february': '02',
  'marzo': '03', 'mar': '03', 'march': '03',
  'abril': '04', 'abr': '04', 'april': '04', 'apr': '04',
  'mayo': '05', 'may': '05',
  'junio': '06', 'jun': '06', 'june': '06',
  'julio': '07', 'jul': '07', 'july': '07',
  'agosto': '08', 'ago': '08', 'august': '08', 'aug': '08',
  'septiembre': '09', 'sept': '09', 'sep': '09', 'september': '09',
  'octubre': '10', 'oct': '10', 'october': '10',
  'noviembre': '11', 'nov': '11', 'november': '11',
  'diciembre': '12', 'dic': '12', 'december': '12', 'dec': '12'
};

/**
 * Normaliza un texto eliminando acentos y convirtiéndolo a minúsculas
 */
function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Parsea el texto de una factura para extraer datos clave
 * @param {string} rawText 
 * @returns {object}
 */
function parseInvoiceText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      name: '',
      category: 'servicios',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      reference: '',
      notes: ''
    };
  }

  const text = rawText.trim();
  const lowerText = text.toLowerCase();
  const normalizedText = normalizeText(text);
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. EXTRAER PROVEEDOR Y CATEGORÍA
  let name = '';
  let category = 'servicios';

  // Buscar coincidencia en proveedores comunes usando texto normalizado
  for (const provider of COMMON_PROVIDERS) {
    for (const keyword of provider.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedText.includes(normalizedKeyword)) {
        name = provider.name;
        category = provider.category;
        break;
      }
    }
    if (name) break;
  }

  // Si no se encuentra proveedor conocido, usar la primera línea como nombre provisional
  if (!name && lines.length > 0) {
    name = lines[0].substring(0, 35);
    if (lines[0].length > 35) name += '...';
    
    // Autodetectar categoría basada en palabras sueltas si no hubo proveedor directo
    if (normalizedText.includes('arriendo') || normalizedText.includes('alquiler') || normalizedText.includes('apartamento') || normalizedText.includes('apto')) {
      category = 'arriendos';
    } else if (normalizedText.includes('credito') || normalizedText.includes('prestamo') || normalizedText.includes('banco') || normalizedText.includes('tarjeta') || normalizedText.includes('visa') || normalizedText.includes('mastercard')) {
      category = 'creditos';
    } else if (normalizedText.includes('administracion') || normalizedText.includes('edificio') || normalizedText.includes('conjunto') || normalizedText.includes('administradora')) {
      category = 'administraciones';
    }
  }

  // 2. EXTRAER MONTO (AMOUNT)
  let amount = 0;
  
  // Buscar líneas que contengan palabras indicativas de monto total + números
  const amountKeywords = ['total', 'pagar', 'monto', 'valor', 'cuota', 'saldo', 'neto', 'arriendo', 'administracion', 'pesos'];
  let candidateAmounts = [];

  const currencyRegex = /(?:\$|cop|usd)?\s*([1-9]\d{0,2}(?:\.\d{3})+(?:,\d{2})?|[1-9]\d{0,2}(?:\,\d{3})+(?:\.\d{2})?|[1-9]\d{3,7})/gi;
  
  lines.forEach(line => {
    const normLine = normalizeText(line);
    const isAmountLine = amountKeywords.some(kw => normLine.includes(kw));
    let match;
    currencyRegex.lastIndex = 0;
    
    while ((match = currencyRegex.exec(line)) !== null) {
      const rawNum = match[1];
      let cleanedNum = rawNum.replace(/\s/g, '');
      
      if (cleanedNum.includes('.') && cleanedNum.includes(',')) {
        if (cleanedNum.indexOf('.') < cleanedNum.indexOf(',')) {
          cleanedNum = cleanedNum.replace(/\./g, '').replace(',', '.');
        } else {
          cleanedNum = cleanedNum.replace(/,/g, '');
        }
      } else if (cleanedNum.includes('.')) {
        const parts = cleanedNum.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 3 || parts.length > 2) {
          cleanedNum = cleanedNum.replace(/\./g, '');
        } else {
          if (lastPart.length <= 2) {
            cleanedNum = cleanedNum;
          } else {
            cleanedNum = cleanedNum.replace(/\./g, '');
          }
        }
      } else if (cleanedNum.includes(',')) {
        const parts = cleanedNum.split(',');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 3 || parts.length > 2) {
          cleanedNum = cleanedNum.replace(/,/g, '');
        } else {
          cleanedNum = cleanedNum.replace(/,/g, '.');
        }
      }
      
      const parsedVal = parseFloat(cleanedNum);
      if (!isNaN(parsedVal) && parsedVal > 1000) {
        candidateAmounts.push({
          value: parsedVal,
          isAmountLine: isAmountLine,
          line: line
        });
      }
    }
  });

  if (candidateAmounts.length > 0) {
    const priorityCandidates = candidateAmounts.filter(c => c.isAmountLine);
    if (priorityCandidates.length > 0) {
      amount = Math.max(...priorityCandidates.map(c => c.value));
    } else {
      amount = Math.max(...candidateAmounts.map(c => c.value));
    }
  }

  // 3. EXTRAER FECHA DE VENCIMIENTO (DUE DATE)
  let dueDate = '';
  
  const dateKeywords = ['vence', 'vencimiento', 'limite', 'oportuno', 'pago hasta', 'pagar antes', 'fecha de pago', 'due date'];
  let candidateDates = [];

  // Patrones de fecha
  // Formato ISO: YYYY-MM-DD o YYYY/MM/DD
  const isoDateRegex = /\b(20\d{2})[\/\-\.](0?\d|1[0-2])[\/\-\.]([0-2]?\d|3[01])\b/g;
  // Formato: DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const numDateRegex = /\b([0-2]?\d|3[01])[\/\-\.](0?\d|1[0-2])[\/\-\.](20\d{2}|\d{2})\b/g;
  // Formato texto: DD de [Mes] [Año] (soporta comas y espacios, ej: "22 de Junio, 2026" o "5 de Julio de 2026")
  const textDateRegex = /\b([0-2]?\d|3[01])\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*(?:[\s,]+(?:de\s+)?(20\d{2}|\d{2}))?\b/gi;

  lines.forEach(line => {
    const normLine = normalizeText(line);
    const isDateLine = dateKeywords.some(kw => normLine.includes(kw));
    let match;

    // 1. Probar fecha ISO
    isoDateRegex.lastIndex = 0;
    while ((match = isoDateRegex.exec(line)) !== null) {
      const year = match[1];
      const month = String(parseInt(match[2])).padStart(2, '0');
      const day = String(parseInt(match[3])).padStart(2, '0');
      
      candidateDates.push({
        iso: `${year}-${month}-${day}`,
        isDateLine: isDateLine,
        line: line
      });
    }

    // 2. Probar fecha numérica DD/MM/YYYY
    numDateRegex.lastIndex = 0;
    while ((match = numDateRegex.exec(line)) !== null) {
      let day = parseInt(match[1]);
      let month = parseInt(match[2]);
      let year = match[3];

      if (year.length === 2) {
        year = '20' + year;
      }
      
      const sDay = String(day).padStart(2, '0');
      const sMonth = String(month).padStart(2, '0');
      
      candidateDates.push({
        iso: `${year}-${sMonth}-${sDay}`,
        isDateLine: isDateLine,
        line: line
      });
    }

    // 3. Probar fecha con texto (Mes en letras)
    textDateRegex.lastIndex = 0;
    while ((match = textDateRegex.exec(line)) !== null) {
      let day = parseInt(match[1]);
      let monthText = match[2].toLowerCase();
      let year = match[3] || new Date().getFullYear().toString();

      if (year.length === 2) {
        year = '20' + year;
      }

      const sMonth = MONTHS_MAP[monthText] || '01';
      const sDay = String(day).padStart(2, '0');

      candidateDates.push({
        iso: `${year}-${sMonth}-${sDay}`,
        isDateLine: isDateLine,
        line: line
      });
    }
  });

  if (candidateDates.length > 0) {
    const priorityDates = candidateDates.filter(c => c.isDateLine);
    if (priorityDates.length > 0) {
      dueDate = priorityDates[0].iso;
    } else {
      dueDate = candidateDates[0].iso;
    }
  } else {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);
    dueDate = defaultDate.toISOString().split('T')[0];
  }

  // 4. EXTRAER REFERENCIA (REFERENCE)
  let reference = '';
  const refKeywords = ['referencia', 'contrato', 'cuenta', 'obligacion', 'convenio', 'factura no', 'ref', 'no'];
  
  const refRegex = /(?:referencia|contrato|cuenta|obligacion|convenio|no\.|factura\s*no|ref)\s*[:\-\#]?\s*([0-9a-zA-Z\-\/]{4,20})/gi;
  
  refRegex.lastIndex = 0;
  let refMatch = refRegex.exec(text);
  if (refMatch) {
    reference = refMatch[1].trim();
  } else {
    const numberRegex = /\b\d{5,15}\b/g;
    for (const line of lines) {
      const normLine = normalizeText(line);
      const isRefLine = refKeywords.some(kw => normLine.includes(kw));
      if (isRefLine) {
        numberRegex.lastIndex = 0;
        let numMatch = numberRegex.exec(line);
        if (numMatch) {
          reference = numMatch[0];
          break;
        }
      }
    }
  }

  // 5. NOTAS
  let notes = '';
  if (text.length > 0) {
    notes = `Factura importada automáticamente.\nTexto detectado:\n"${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`;
  }

  return {
    name,
    category,
    amount,
    dueDate,
    reference,
    notes
  };
}

// Exportar si estamos en un ambiente Node, de lo contrario adjuntar al objeto global window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseInvoiceText };
} else {
  window.parseInvoiceText = parseInvoiceText;
}
