/* ==========================================================================
   CHARTS MANAGEMENT (Chart.js Integration)
   ========================================================================== */

let spendingHabitsChart = null;

function renderSpendingHabitsChart(categoryData) {
  const ctx = document.getElementById('chart-spending-habits');
  if (!ctx) return;

  const labels = Object.keys(categoryData);
  const values = Object.values(categoryData);

  if (spendingHabitsChart) {
    spendingHabitsChart.destroy();
  }

  // Predefined vibrant palette
  const backgroundColors = [
    '#00f2fe',
    '#38ef7d',
    '#a855f7',
    '#f1c40f',
    '#ff4b2b',
    '#3b82f6',
    '#ec4899',
    '#10b981'
  ];

  spendingHabitsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#121824'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#8b949e',
            font: {
              family: 'Inter',
              size: 11
            },
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return ` ${label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}
