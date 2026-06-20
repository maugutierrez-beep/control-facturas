require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Conexión a MongoDB Atlas
if (!MONGODB_URI) {
  console.error("CRÍTICO: No se ha definido la variable MONGODB_URI en el entorno.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Conectado exitosamente a MongoDB Atlas');
    seedIfEmpty(); // Cargar datos iniciales si la base de datos está vacía
  })
  .catch(err => {
    console.error('Error al conectar con MongoDB Atlas:', err);
  });

// Esquema de Mongoose para las Facturas
const BillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: String, required: true },
  status: { type: String, required: true },
  reference: { type: String, default: '' },
  paidDate: { type: String, default: null },
  paymentCode: { type: String, default: null },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

// Transformar el esquema al serializar a JSON para que use 'id' en lugar de '_id'
BillSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const Bill = mongoose.model('Bill', BillSchema);

// Función para precargar datos semilla si no hay facturas
async function seedIfEmpty() {
  try {
    const count = await Bill.countDocuments({});
    if (count === 0) {
      console.log('Base de datos vacía. Buscando datos semilla locales...');
      const seedFilePath = path.join(__dirname, 'data', 'bills.json');
      if (fs.existsSync(seedFilePath)) {
        const rawData = fs.readFileSync(seedFilePath, 'utf-8');
        const seeds = JSON.parse(rawData);
        if (seeds.length > 0) {
          // Limpiar ids locales de los datos semilla para dejar que MongoDB genere los suyos
          const cleanedSeeds = seeds.map(({ id, ...rest }) => rest);
          await Bill.insertMany(cleanedSeeds);
          console.log(`Cargados exitosamente ${cleanedSeeds.length} registros semilla en la nube.`);
        }
      }
    }
  } catch (error) {
    console.error('Error al inicializar datos semilla:', error);
  }
}

// ==========================================================================
// ENDPOINTS DE LA API REST
// ==========================================================================

// GET /api/bills - Obtener todas las facturas
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find({});
    res.json(bills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las facturas de la base de datos' });
  }
});

// POST /api/bills/bulk - Sobrescribir toda la base de datos (carga masiva/restablecimiento)
app.post('/api/bills/bulk', async (req, res) => {
  try {
    await Bill.deleteMany({});
    const newBills = Array.isArray(req.body) ? req.body : [];
    
    if (newBills.length > 0) {
      // Limpiar id si viene del frontend, para que MongoDB use el nuevo _id
      const cleanedBills = newBills.map(({ id, ...rest }) => rest);
      await Bill.insertMany(cleanedBills);
    }
    
    // Obtener y devolver los nuevos registros
    const updatedBills = await Bill.find({});
    res.json({ message: 'Base de datos cargada correctamente', count: updatedBills.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al restablecer la base de datos' });
  }
});

// POST /api/bills - Crear una factura nueva
app.post('/api/bills', async (req, res) => {
  try {
    const newBill = new Bill({
      name: req.body.name,
      category: req.body.category,
      amount: parseFloat(req.body.amount) || 0,
      dueDate: req.body.dueDate,
      status: req.body.status,
      reference: req.body.reference || '',
      paidDate: req.body.paidDate || null,
      paymentCode: req.body.paymentCode || null,
      notes: req.body.notes || ''
    });

    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar la factura' });
  }
});

// PUT /api/bills/:id - Actualizar factura existente
app.put('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      name: req.body.name,
      category: req.body.category,
      amount: req.body.amount !== undefined ? parseFloat(req.body.amount) : undefined,
      dueDate: req.body.dueDate,
      status: req.body.status,
      reference: req.body.reference,
      paidDate: req.body.paidDate,
      paymentCode: req.body.paymentCode,
      notes: req.body.notes
    };

    // Eliminar campos indefinidos para no sobreescribir con null/undefined indeseados
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedBill = await Bill.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedBill) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(updatedBill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la factura' });
  }
});

// DELETE /api/bills/:id - Eliminar factura
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBill = await Bill.findByIdAndDelete(id);

    if (!deletedBill) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la factura' });
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
