/**
 * Lógica de Control y Vista del Cliente (Frontend) - ControlFact
 */

// Estado Global
let allBills = [];

// Datos semilla para restablecer la base de datos
const SEED_BILLS = [
  {
    "name": "EPM - Energía y Gas",
    "category": "servicios",
    "amount": 145200,
    "dueDate": getRelativeDate(5),
    "status": "pendiente",
    "reference": "9876543-12",
    "paidDate": null,
    "paymentCode": null,
    "notes": "Pagar antes de la fecha límite para evitar recargo de reconexión."
  },
  {
    "name": "Claro - Internet y TV",
    "category": "servicios",
    "amount": 154900,
    "dueDate": getRelativeDate(-5),
    "status": "pagado",
    "reference": "32109876",
    "paidDate": getRelativeDate(-6),
    "paymentCode": "TRX-77631",
    "notes": "Débito automático falló, pagado por PSE."
  },
  {
    "name": "Arriendo Apto 502",
    "category": "arriendos",
    "amount": 1800000,
    "dueDate": getRelativeDate(15),
    "status": "pendiente",
    "reference": "Cuenta Ahorros Bancolombia #123456",
    "paidDate": null,
    "paymentCode": null,
    "notes": "Transferir directo al arrendador y enviar comprobante por WhatsApp."
  },
  {
    "name": "Administración Edificio Roble",
    "category": "administraciones",
    "amount": 250000,
    "dueDate": getRelativeDate(20),
    "status": "pendiente",
    "reference": "Apto 502",
    "paidDate": null,
    "paymentCode": null,
    "notes": "Tiene descuento del 10% si se paga antes del 5."
  },
  {
    "name": "Banco de Bogotá - Tarjeta Crédito",
    "category": "creditos",
    "amount": 420000,
    "dueDate": getRelativeDate(2),
    "status": "pendiente",
    "reference": "Tarj. Visa *4321",
    "paidDate": null,
    "paymentCode": null,
    "notes": "Pago mínimo de la tarjeta. Cupo para compras."
  },
  {
    "name": "Sufi - Crédito Vehículo",
    "category": "creditos",
    "amount": 680000,
    "dueDate": getRelativeDate(-10),
    "status": "pagado",
    "reference": "Obligación #98721",
    "paidDate": getRelativeDate(-11),
    "paymentCode": "PSE-883210",
    "notes": "Cuota 12 de 36."
  },
  {
    "name": "Acueducto Triple A",
    "category": "servicios",
    "amount": 82400,
    "dueDate": getRelativeDate(8),
    "status": "pendiente",
    "reference": "Poliza 765432",
    "paidDate": null,
    "paymentCode": null,
    "notes": "Llegó más barata que el mes pasado."
  }
];

// Helper para obtener fechas relativas a hoy
function getRelativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// Inicialización de la Aplicación
document.addEventListener('DOMContentLoaded', () => {
  initRouting();
  initEventListeners();
  fetchBills();
});

// ==========================================================================
// RUTEADOR DE VISTAS (SPA)
// ==========================================================================
function initRouting() {
  const handleRoute = () => {
    const hash = window.location.hash || '#dashboard';
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    
    // Títulos por defecto
    let title = 'Dashboard';
    let subtitle = 'Resumen financiero y estado actual de facturas';
    
    if (hash === '#dashboard') {
      document.getElementById('section-dashboard').style.display = 'block';
      document.getElementById('nav-dashboard').classList.add('active');
      title = 'Dashboard';
      subtitle = 'Resumen financiero y estado actual de facturas';
      updateDashboardUI();
    } else if (hash === '#bills') {
      document.getElementById('section-bills').style.display = 'block';
      document.getElementById('nav-bills').classList.add('active');
      title = 'Control de Facturas';
      subtitle = 'Gestiona, filtra y realiza el seguimiento de tus pagos';
      updateBillsTable();
    } else if (hash === '#import') {
      document.getElementById('section-import').style.display = 'block';
      document.getElementById('nav-import').classList.add('active');
      title = 'Asistente de Importación';
      subtitle = 'Extrae información de facturas a partir de texto o PDFs';
    } else if (hash === '#settings') {
      document.getElementById('section-settings').style.display = 'block';
      document.getElementById('nav-settings').classList.add('active');
      title = 'Configuración';
      subtitle = 'Administra copias de seguridad e inicialización del sistema';
    }
    
    document.getElementById('view-title').innerText = title;
    document.getElementById('view-subtitle').innerText = subtitle;
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Ejecutar en carga inicial
}

// ==========================================================================
// CONTROLADORES DE EVENTOS
// ==========================================================================
function initEventListeners() {
  // Modal de agregar/editar factura
  const addModal = document.getElementById('bill-modal');
  document.getElementById('btn-open-add-modal').addEventListener('click', () => openBillModal());
  document.getElementById('btn-close-modal').addEventListener('click', closeBillModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeBillModal);
  
  // Cambiar campos de pago según el estado
  const statusPending = document.getElementById('status-pending');
  const statusPaid = document.getElementById('status-paid');
  const paymentFields = document.querySelectorAll('.payment-detail-field');
  
  const togglePaymentFields = () => {
    if (statusPaid.checked) {
      paymentFields.forEach(f => f.style.display = 'flex');
      // Rellenar fecha de pago con hoy si está vacía
      if (!document.getElementById('form-paid-date').value) {
        document.getElementById('form-paid-date').value = new Date().toISOString().split('T')[0];
      }
    } else {
      paymentFields.forEach(f => f.style.display = 'none');
    }
  };
  
  statusPending.addEventListener('change', togglePaymentFields);
  statusPaid.addEventListener('change', togglePaymentFields);

  // Guardar factura
  document.getElementById('bill-form').addEventListener('submit', handleSaveBill);

  // Filtros de tabla
  document.getElementById('filter-search').addEventListener('input', updateBillsTable);
  document.getElementById('filter-category').addEventListener('change', updateBillsTable);
  document.getElementById('filter-status').addEventListener('change', updateBillsTable);
  document.getElementById('filter-month').addEventListener('change', updateBillsTable);

  // Asistente de Importación
  document.getElementById('btn-process-import').addEventListener('click', handleProcessImport);
  document.getElementById('btn-clear-import').addEventListener('click', () => {
    document.getElementById('import-text').value = '';
  });
  
  // Modal Confirmar Importación
  document.getElementById('btn-close-import-modal').addEventListener('click', closeImportModal);
  document.getElementById('btn-cancel-import-modal').addEventListener('click', closeImportModal);
  document.getElementById('import-confirm-form').addEventListener('submit', handleSaveImportedBill);

  // Configuración
  document.getElementById('btn-export-data').addEventListener('click', handleExportData);
  document.getElementById('input-import-json').addEventListener('change', handleImportData);
  document.getElementById('btn-reset-db').addEventListener('click', handleResetDB);
  document.getElementById('btn-clear-db').addEventListener('click', handleClearDB);
}

// ==========================================================================
// CLIENTE API REST
// ==========================================================================
async function fetchBills() {
  try {
    const res = await fetch('/api/bills');
    if (!res.ok) throw new Error('Error al obtener facturas');
    allBills = await res.json();
    
    // Actualizar la vista actual
    const hash = window.location.hash || '#dashboard';
    if (hash === '#dashboard') {
      updateDashboardUI();
    } else if (hash === '#bills') {
      updateBillsTable();
      populateMonthFilter();
    }
  } catch (error) {
    console.error(error);
    showToast('No se pudieron cargar los datos del servidor.', 'error');
  }
}

async function handleSaveBill(e) {
  e.preventDefault();
  
  const id = document.getElementById('bill-id').value;
  const name = document.getElementById('form-name').value;
  const category = document.getElementById('form-category').value;
  const amount = parseFloat(document.getElementById('form-amount').value);
  const dueDate = document.getElementById('form-due-date').value;
  const status = document.querySelector('input[name="form-status"]:checked').value;
  const reference = document.getElementById('form-reference').value;
  const paidDate = status === 'pagado' ? document.getElementById('form-paid-date').value : null;
  const paymentCode = status === 'pagado' ? document.getElementById('form-payment-code').value : null;
  const notes = document.getElementById('form-notes').value;

  const payload = { name, category, amount, dueDate, status, reference, paidDate, paymentCode, notes };

  try {
    let res;
    if (id) {
      // Editar existente
      res = await fetch(`/api/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Crear nueva
      res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) throw new Error('Error al guardar la factura');
    
    showToast(id ? 'Factura actualizada exitosamente.' : 'Factura agregada exitosamente.', 'success');
    closeBillModal();
    await fetchBills();
  } catch (error) {
    console.error(error);
    showToast('Error al intentar guardar la factura.', 'error');
  }
}

async function handleQuickPay(id) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/bills/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'pagado',
        paidDate: today,
        paymentCode: `PSE-RAPIDO`
      })
    });

    if (!res.ok) throw new Error('Error al pagar la factura');
    showToast('Factura marcada como pagada.', 'success');
    await fetchBills();
  } catch (error) {
    console.error(error);
    showToast('No se pudo actualizar el pago.', 'error');
  }
}

async function handleDeleteBill(id, name) {
  if (!confirm(`¿Estás seguro de que deseas eliminar la factura de "${name}"?`)) return;

  try {
    const res = await fetch(`/api/bills/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Error al eliminar');
    showToast('Factura eliminada.', 'success');
    await fetchBills();
  } catch (error) {
    console.error(error);
    showToast('No se pudo eliminar la factura.', 'error');
  }
}

// ==========================================================================
// VISTA: DASHBOARD
// ==========================================================================
function updateDashboardUI() {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth(); // 0-11
  const currentYear = new Date().getFullYear();
  
  let totalPending = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  let countPending = 0;
  let countPaid = 0;
  let countOverdue = 0;
  
  let pendingBills = [];
  
  allBills.forEach(bill => {
    const billDate = new Date(bill.dueDate);
    const isThisMonth = billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
    
    if (bill.status === 'pendiente') {
      // Si está vencida (fecha menor que hoy y sigue pendiente)
      if (bill.dueDate < todayStr) {
        totalOverdue += bill.amount;
        countOverdue++;
      } else {
        // Pendiente normal del mes
        totalPending += bill.amount;
        countPending++;
      }
      pendingBills.push(bill);
    } else if (bill.status === 'pagado') {
      // Si fue pagada en este mes (usamos la fecha de pago o de vencimiento como fallback)
      const payDateStr = bill.paidDate || bill.dueDate;
      const payDate = new Date(payDateStr);
      if (payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear) {
        totalPaid += bill.amount;
        countPaid++;
      }
    }
  });

  // Formateador de moneda
  const formatCOP = (val) => '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val);

  // Actualizar Tarjetas
  document.getElementById('metric-total-pending').innerText = formatCOP(totalPending);
  document.getElementById('metric-count-pending').innerText = `${countPending} facturas pendientes`;
  
  document.getElementById('metric-total-paid').innerText = formatCOP(totalPaid);
  document.getElementById('metric-count-paid').innerText = `${countPaid} facturas pagadas`;
  
  document.getElementById('metric-total-overdue').innerText = formatCOP(totalOverdue);
  document.getElementById('metric-count-overdue').innerText = `${countOverdue} vencidas`;
  if (countOverdue > 0) {
    document.getElementById('metric-count-overdue').className = 'metric-sub text-danger font-bold';
  } else {
    document.getElementById('metric-count-overdue').className = 'metric-sub';
  }

  // Próximo Vencimiento
  // Buscar la pendiente más cercana a hoy (futura o de hoy)
  const upcoming = pendingBills
    .filter(b => b.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  
  if (upcoming) {
    document.getElementById('metric-next-due-name').innerText = upcoming.name;
    document.getElementById('metric-next-due-date').innerText = `Vence el ${formatDateLocale(upcoming.dueDate)} (${formatCOP(upcoming.amount)})`;
  } else if (pendingBills.length > 0) {
    // Si no hay futuras pero hay vencidas pasadas
    const oldestOverdue = pendingBills.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    document.getElementById('metric-next-due-name').innerText = oldestOverdue.name;
    document.getElementById('metric-next-due-date').innerText = `¡Vencida el ${formatDateLocale(oldestOverdue.dueDate)}!`;
    document.getElementById('metric-next-due-date').className = 'metric-sub text-danger';
  } else {
    document.getElementById('metric-next-due-name').innerText = 'Al día';
    document.getElementById('metric-next-due-date').innerText = 'No hay facturas pendientes';
    document.getElementById('metric-next-due-date').className = 'metric-sub';
  }

  // Renderizar lista rápida (máximo 5 facturas pendientes ordenadas por fecha)
  const quickList = document.getElementById('quick-bills-list');
  const sortedPending = pendingBills.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  
  if (sortedPending.length === 0) {
    quickList.innerHTML = `<p class="empty-state">¡Felicidades! No tienes facturas pendientes.</p>`;
  } else {
    quickList.innerHTML = sortedPending.map(bill => {
      const isOverdue = bill.dueDate < todayStr;
      return `
        <div class="quick-bill-item">
          <div class="qb-details">
            <span class="qb-name">${bill.name}</span>
            <div class="qb-meta">
              <span class="badge badge-${bill.category}">${getCategoryLabel(bill.category)}</span>
              <span>Ref: ${bill.reference || 'N/A'}</span>
            </div>
          </div>
          <div class="qb-right">
            <span class="qb-amount">${formatCOP(bill.amount)}</span>
            <span class="qb-date ${isOverdue ? 'overdue' : 'text-muted'}">
              ${isOverdue ? 'Vencida' : 'Vence'}: ${formatDateLocale(bill.dueDate)}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Actualizar Gráfico
  if (window.updateCategoryChart) {
    window.updateCategoryChart(allBills);
  }
}

// ==========================================================================
// VISTA: TABLA DE FACTURAS
// ==========================================================================
function populateMonthFilter() {
  const select = document.getElementById('filter-month');
  if (!select) return;

  // Extraer todos los meses únicos del dataset
  const months = new Set();
  allBills.forEach(bill => {
    // Formato YYYY-MM
    if (bill.dueDate) {
      months.add(bill.dueDate.substring(0, 7));
    }
  });

  // Guardar valor seleccionado
  const selectedVal = select.value;
  
  // Reset
  select.innerHTML = '<option value="all">Todos los Meses</option>';
  
  // Ordenar de más reciente a más antiguo
  Array.from(months).sort((a, b) => b.localeCompare(a)).forEach(m => {
    const [year, month] = m.split('-');
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
    
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = capitalized;
    select.appendChild(opt);
  });

  // Restaurar selección
  if (Array.from(select.options).some(o => o.value === selectedVal)) {
    select.value = selectedVal;
  }
}

function updateBillsTable() {
  const tbody = document.getElementById('bills-table-body');
  if (!tbody) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const searchQuery = document.getElementById('filter-search').value.toLowerCase().trim();
  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;
  const monthFilter = document.getElementById('filter-month').value;

  // Filtrar
  const filtered = allBills.filter(bill => {
    // 1. Filtro de Búsqueda
    const matchesSearch = 
      bill.name.toLowerCase().includes(searchQuery) ||
      (bill.reference && bill.reference.toLowerCase().includes(searchQuery)) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchQuery));
    
    // 2. Filtro de Categoría
    const matchesCategory = categoryFilter === 'all' || bill.category === categoryFilter;
    
    // 3. Filtro de Estado
    let matchesStatus = true;
    if (statusFilter === 'pendiente') {
      matchesStatus = bill.status === 'pendiente' && bill.dueDate >= todayStr;
    } else if (statusFilter === 'vencido') {
      matchesStatus = bill.status === 'pendiente' && bill.dueDate < todayStr;
    } else if (statusFilter === 'pagado') {
      matchesStatus = bill.status === 'pagado';
    }

    // 4. Filtro de Mes
    const matchesMonth = monthFilter === 'all' || (bill.dueDate && bill.dueDate.startsWith(monthFilter));

    return matchesSearch && matchesCategory && matchesStatus && matchesMonth;
  });

  // Ordenar: primero las pendientes más vencidas, luego pendientes futuras, luego pagadas (ordenadas por vencimiento descendente)
  filtered.sort((a, b) => {
    if (a.status !== b.status) {
      // pendientes primero
      return a.status === 'pendiente' ? -1 : 1;
    }
    // Si tienen el mismo estado, ordenar por fecha de vencimiento
    return a.dueDate.localeCompare(b.dueDate);
  });

  // Renderizar
  const formatCOP = (val) => '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No se encontraron facturas con los filtros aplicados.</td>
      </tr>
    `;
    document.getElementById('table-footer-info').innerText = 'Mostrando 0 facturas';
    return;
  }

  tbody.innerHTML = filtered.map(bill => {
    const isOverdue = bill.status === 'pendiente' && bill.dueDate < todayStr;
    let statusClass = bill.status;
    let statusLabel = bill.status === 'pagado' ? 'Pagado' : 'Pendiente';
    
    if (isOverdue) {
      statusClass = 'overdue';
      statusLabel = 'Vencido';
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 600;">${bill.name}</div>
          ${bill.notes ? `<div class="text-muted" style="font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${bill.notes.replace(/\n/g, ' ')}</div>` : ''}
        </td>
        <td>
          <span class="badge badge-${bill.category}">${getCategoryLabel(bill.category)}</span>
        </td>
        <td style="font-weight: 700;">${formatCOP(bill.amount)}</td>
        <td>${formatDateLocale(bill.dueDate)}</td>
        <td>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </td>
        <td><code style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 4px;">${bill.reference || 'N/A'}</code></td>
        <td>${bill.paidDate ? formatDateLocale(bill.paidDate) : '<span class="text-muted">-</span>'}</td>
        <td>
          <div class="table-actions">
            ${bill.status === 'pendiente' ? `
              <button class="btn btn-secondary btn-icon" onclick="handleQuickPay('${bill.id}')" title="Marcar como Pagado">
                <i class="fa-solid fa-check text-success"></i>
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-icon" onclick="openBillModal('${bill.id}')" title="Editar">
              <i class="fa-solid fa-pen-to-square text-primary"></i>
            </button>
            <button class="btn btn-secondary btn-icon" onclick="handleDeleteBill('${bill.id}', '${bill.name}')" title="Eliminar">
              <i class="fa-solid fa-trash-can text-danger"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('table-footer-info').innerText = `Mostrando ${filtered.length} factura(s)`;
}

// ==========================================================================
// VENTANAS MODALES
// ==========================================================================
function openBillModal(id = null) {
  const modal = document.getElementById('bill-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('bill-form');
  
  form.reset();
  document.getElementById('bill-id').value = '';
  document.getElementById('status-pending').checked = true;
  document.querySelectorAll('.payment-detail-field').forEach(f => f.style.display = 'none');
  
  if (id) {
    title.innerText = 'Editar Factura';
    const bill = allBills.find(b => b.id === id);
    if (bill) {
      document.getElementById('bill-id').value = bill.id;
      document.getElementById('form-name').value = bill.name;
      document.getElementById('form-category').value = bill.category;
      document.getElementById('form-amount').value = bill.amount;
      document.getElementById('form-due-date').value = bill.dueDate;
      document.getElementById('form-reference').value = bill.reference || '';
      document.getElementById('form-notes').value = bill.notes || '';
      
      if (bill.status === 'pagado') {
        document.getElementById('status-paid').checked = true;
        document.querySelectorAll('.payment-detail-field').forEach(f => f.style.display = 'flex');
        document.getElementById('form-paid-date').value = bill.paidDate || '';
        document.getElementById('form-payment-code').value = bill.paymentCode || '';
      } else {
        document.getElementById('status-pending').checked = true;
      }
    }
  } else {
    title.innerText = 'Agregar Nueva Factura';
    // Poner fecha predeterminada dentro de 5 días
    document.getElementById('form-due-date').value = getRelativeDate(5);
  }

  modal.classList.add('open');
}

function closeBillModal() {
  document.getElementById('bill-modal').classList.remove('open');
}

// Modal Confirmar Importación
function openImportModal(parsed) {
  const modal = document.getElementById('import-confirm-modal');
  document.getElementById('import-name').value = parsed.name || 'Nueva Factura';
  document.getElementById('import-category').value = parsed.category || 'servicios';
  document.getElementById('import-amount').value = parsed.amount || 0;
  document.getElementById('import-due-date').value = parsed.dueDate || getRelativeDate(5);
  document.getElementById('import-reference').value = parsed.reference || '';
  document.getElementById('import-notes').value = parsed.notes || '';
  modal.classList.add('open');
}

function closeImportModal() {
  document.getElementById('import-confirm-modal').classList.remove('remove');
  document.getElementById('import-confirm-modal').classList.remove('open');
}

// ==========================================================================
// ASISTENTE DE IMPORTACIÓN DE FACTURAS
// ==========================================================================
function handleProcessImport() {
  const text = document.getElementById('import-text').value.trim();
  if (!text) {
    showToast('Por favor introduce el texto de la factura.', 'error');
    return;
  }

  if (window.parseInvoiceText) {
    const parsed = window.parseInvoiceText(text);
    openImportModal(parsed);
  } else {
    showToast('Error interno: motor de análisis no cargado.', 'error');
  }
}

async function handleSaveImportedBill(e) {
  e.preventDefault();

  const name = document.getElementById('import-name').value;
  const category = document.getElementById('import-category').value;
  const amount = parseFloat(document.getElementById('import-amount').value);
  const dueDate = document.getElementById('import-due-date').value;
  const reference = document.getElementById('import-reference').value;
  const notes = document.getElementById('import-notes').value;

  const payload = {
    name,
    category,
    amount,
    dueDate,
    status: 'pendiente', // Por defecto se importa pendiente
    reference,
    notes
  };

  try {
    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Error al importar la factura');

    showToast('Factura analizada e importada con éxito.', 'success');
    closeImportModal();
    
    // Limpiar input y redireccionar a facturas
    document.getElementById('import-text').value = '';
    window.location.hash = '#bills';
    await fetchBills();
  } catch (error) {
    console.error(error);
    showToast('No se pudo guardar la factura importada.', 'error');
  }
}

// ==========================================================================
// CONFIGURACIÓN (EXPORTAR / IMPORTAR / RESTABLECER)
// ==========================================================================
function handleExportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allBills, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", `copia_seguridad_facturas_${new Date().toISOString().split('T')[0]}.json`);
  dlAnchorElem.click();
  showToast('Base de datos exportada en archivo JSON.', 'success');
}

function handleImportData(e) {
  const fileReader = new FileReader();
  const file = e.target.files[0];
  if (!file) return;

  fileReader.onload = async function (event) {
    try {
      const parsedData = JSON.parse(event.target.result);
      if (!Array.isArray(parsedData)) {
        throw new Error('El formato debe ser un array de facturas.');
      }
      
      const res = await fetch('/api/bills/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });

      if (!res.ok) throw new Error('Error en el servidor al subir datos');
      
      showToast('Base de datos importada exitosamente.', 'success');
      // Resetear file input
      document.getElementById('input-import-json').value = '';
      await fetchBills();
    } catch (err) {
      console.error(err);
      showToast('Error al importar archivo JSON. Formato no válido.', 'error');
    }
  };
  fileReader.readAsText(file);
}

async function handleResetDB() {
  if (!confirm('¿Estás seguro de que quieres restablecer la base de datos a los valores de prueba originales? Se perderán tus cambios locales.')) return;

  try {
    const res = await fetch('/api/bills/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SEED_BILLS)
    });

    if (!res.ok) throw new Error('Error al restablecer');

    showToast('Base de datos restablecida a los valores de prueba.', 'success');
    await fetchBills();
  } catch (error) {
    console.error(error);
    showToast('Error al intentar restablecer los datos.', 'error');
  }
}

async function handleClearDB() {
  if (!confirm('¡PELIGRO! ¿Estás completamente seguro de que deseas eliminar todas las facturas? Esta acción no se puede deshacer.')) return;

  try {
    const res = await fetch('/api/bills/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    });

    if (!res.ok) throw new Error('Error al limpiar');

    showToast('Se han eliminado todos los registros.', 'info');
    await fetchBills();
  } catch (error) {
    console.error(error);
    showToast('No se pudo vaciar la base de datos.', 'error');
  }
}

// ==========================================================================
// UTILIDADES
// ==========================================================================
function getCategoryLabel(cat) {
  const cats = {
    servicios: 'Servicios Públicos',
    creditos: 'Créditos',
    arriendos: 'Arriendos',
    administraciones: 'Administración'
  };
  return cats[cat] || cat;
}

function formatDateLocale(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Sistema de Toasts (Notificaciones)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);
  
  // Trigger animation reflow
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Exponer funciones onclick para HTML dinámico
window.handleQuickPay = handleQuickPay;
window.openBillModal = openBillModal;
window.handleDeleteBill = handleDeleteBill;
