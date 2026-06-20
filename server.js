const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bills.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Asegurar que el directorio de datos y el archivo existan
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Helper para leer base de datos
const readBills = () => {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error leyendo base de datos:', error);
    return [];
  }
};

// Helper para escribir base de datos
const writeBills = (bills) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bills, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error escribiendo base de datos:', error);
    return false;
  }
};

// Endpoints API

// POST /api/bills/bulk - Sobrescribir toda la base de datos (para importación/restablecimiento)
app.post('/api/bills/bulk', (req, res) => {
  const newBills = Array.isArray(req.body) ? req.body : [];
  if (writeBills(newBills)) {
    res.json({ message: 'Base de datos cargada correctamente', count: newBills.length });
  } else {
    res.status(500).json({ error: 'No se pudo guardar la base de datos' });
  }
});

// GET /api/bills - Obtener todas las facturas
app.get('/api/bills', (req, res) => {
  const bills = readBills();
  res.json(bills);
});

// POST /api/bills - Crear una factura nueva
app.post('/api/bills', (req, res) => {
  const bills = readBills();
  const newBill = {
    id: `bill-${Date.now()}`,
    name: req.body.name || 'Nueva Factura',
    category: req.body.category || 'servicios',
    amount: parseFloat(req.body.amount) || 0,
    dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
    status: req.body.status || 'pendiente',
    reference: req.body.reference || '',
    paidDate: req.body.paidDate || null,
    paymentCode: req.body.paymentCode || null,
    notes: req.body.notes || ''
  };

  bills.push(newBill);
  if (writeBills(bills)) {
    res.status(201).json(newBill);
  } else {
    res.status(500).json({ error: 'No se pudo guardar la factura' });
  }
});

// PUT /api/bills/:id - Actualizar factura existente
app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const bills = readBills();
  const billIndex = bills.findIndex(b => b.id === id);

  if (billIndex === -1) {
    return res.status(404).json({ error: 'Factura no encontrada' });
  }

  const updatedBill = {
    ...bills[billIndex],
    name: req.body.name !== undefined ? req.body.name : bills[billIndex].name,
    category: req.body.category !== undefined ? req.body.category : bills[billIndex].category,
    amount: req.body.amount !== undefined ? parseFloat(req.body.amount) : bills[billIndex].amount,
    dueDate: req.body.dueDate !== undefined ? req.body.dueDate : bills[billIndex].dueDate,
    status: req.body.status !== undefined ? req.body.status : bills[billIndex].status,
    reference: req.body.reference !== undefined ? req.body.reference : bills[billIndex].reference,
    paidDate: req.body.paidDate !== undefined ? req.body.paidDate : bills[billIndex].paidDate,
    paymentCode: req.body.paymentCode !== undefined ? req.body.paymentCode : bills[billIndex].paymentCode,
    notes: req.body.notes !== undefined ? req.body.notes : bills[billIndex].notes
  };

  bills[billIndex] = updatedBill;

  if (writeBills(bills)) {
    res.json(updatedBill);
  } else {
    res.status(500).json({ error: 'No se pudo actualizar la factura' });
  }
});

// DELETE /api/bills/:id - Eliminar factura
app.delete('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  let bills = readBills();
  const initialLength = bills.length;
  bills = bills.filter(b => b.id !== id);

  if (bills.length === initialLength) {
    return res.status(404).json({ error: 'Factura no encontrada' });
  }

  if (writeBills(bills)) {
    res.json({ message: 'Factura eliminada correctamente' });
  } else {
    res.status(500).json({ error: 'No se pudo eliminar la factura' });
  }
});

// Servir frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de Control de Facturas corriendo en http://localhost:${PORT}`);
});
