/**
 * Módulo de Gráficos de Chart.js para el Dashboard
 */

let categoryChartInstance = null;

/**
 * Inicializa o actualiza el gráfico de distribución por categorías
 * @param {Array} bills 
 */
function updateCategoryChart(bills) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  // Filtrar facturas para el mes actual o simplemente resumir las mostradas
  // Para que el gráfico sea representativo, acumulamos los montos de facturas
  // agrupados por sus categorías.
  const categories = {
    servicios: { label: 'Servicios Públicos', amount: 0, color: '#06b6d4' },
    creditos: { label: 'Créditos', amount: 0, color: '#8b5cf6' },
    arriendos: { label: 'Arriendos', amount: 0, color: '#ec4899' },
    administraciones: { label: 'Administraciones', amount: 0, color: '#10b981' }
  };

  bills.forEach(bill => {
    const cat = bill.category;
    if (categories[cat]) {
      categories[cat].amount += bill.amount;
    }
  });

  const labels = [];
  const data = [];
  const backgroundColor = [];

  Object.keys(categories).forEach(key => {
    if (categories[key].amount > 0) {
      labels.push(categories[key].label);
      data.push(categories[key].amount);
      backgroundColor.push(categories[key].color);
    }
  });

  // Si no hay datos, mostrar un placeholder o gráfico vacío
  if (data.length === 0) {
    labels.push('Sin Gastos');
    data.push(1);
    backgroundColor.push('#1e2942'); // color neutro
  }

  const chartData = {
    labels: labels,
    datasets: [{
      data: data,
      backgroundColor: backgroundColor,
      borderWidth: 2,
      borderColor: '#131a2d', // color del card background
      hoverOffset: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#f8fafc', // text-primary
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: '500'
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#131a2d',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.raw;
            if (context.label === 'Sin Gastos') return 'No hay registros';
            // Formatear a pesos colombianos
            return ` ${context.label}: $${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)} COP`;
          }
        }
      }
    },
    cutout: '70%' // Hace que sea un gráfico de dona estilizado (doughnut)
  };

  if (categoryChartInstance) {
    // Si ya existe la instancia, actualizar los datos
    categoryChartInstance.data = chartData;
    categoryChartInstance.update();
  } else {
    // Si no existe, crear una nueva instancia
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: chartOptions
    });
  }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { updateCategoryChart };
} else {
  window.updateCategoryChart = updateCategoryChart;
}
