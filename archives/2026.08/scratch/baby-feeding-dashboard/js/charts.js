/**
 * charts.js - Chart.js setup and rendering
 * Dynamically draws feeding trends, diaper trends, sleep metrics, and query-based scatter plots.
 */

// Global instances so we can destroy/recreate them
let feedingTrendsChartInst = null;
let feedingTypesChartInst = null;
let sleepTrendsChartInst = null;
let diaperTrendsChartInst = null;
let queryScatterChartInst = null;

/**
 * Common chart style configurations based on active theme
 */
function getChartThemeColors(isDark) {
  return {
    text: isDark ? '#e2e8f0' : '#1e293b',
    grid: isDark ? '#334155' : '#e2e8f0',
    primary: '#4f46e5',
    accent: '#a855f7',
    warning: '#f97316',
    success: '#22c55e',
    info: '#06b6d4',
    warningLight: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
    infoLight: isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)',
    successLight: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
    accentLight: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
  };
}

/**
 * Generate dates array for the past 7 days (including today)
 */
function getPast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Format date string to display nicely on charts (e.g., "Aug 17")
 */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Update all dashboard charts
 */
function updateDashboardCharts(logs, prefs) {
  const isDark = prefs.theme === 'dark';
  const colors = getChartThemeColors(isDark);
  const dates = getPast7Days();
  const dateLabels = dates.map(formatDateLabel);

  // Group logs by date
  const logsByDate = {};
  dates.forEach(date => {
    logsByDate[date] = [];
  });

  logs.forEach(log => {
    const dateStr = log.startTime.split('T')[0];
    if (logsByDate[dateStr]) {
      logsByDate[dateStr].push(log);
    }
  });

  // Render individual charts
  renderFeedingTrendsChart(logsByDate, dates, dateLabels, colors, prefs);
  renderFeedingTypesChart(logs, colors);
  renderSleepTrendsChart(logsByDate, dates, dateLabels, colors);
  renderDiaperTrendsChart(logsByDate, dates, dateLabels, colors);
}

/**
 * Chart 1: Feeding Daily Volume & Session Counts (Dual Axis)
 */
function renderFeedingTrendsChart(logsByDate, dates, dateLabels, colors, prefs) {
  const volUnit = prefs.volumeUnit;
  
  const dailyVolumes = [];
  const dailyCounts = [];

  dates.forEach(date => {
    let dayVol = 0;
    let feedCount = 0;

    logsByDate[date].forEach(log => {
      if (log.type === 'feeding') {
        feedCount++;
        if (log.details.feedType === 'bottle' && log.details.volume) {
          let vol = log.details.volume;
          if (volUnit === 'oz') {
            vol = Conversions.mlToOz(vol);
          }
          dayVol += vol;
        }
      }
    });

    dailyVolumes.push(Math.round(dayVol * 10) / 10);
    dailyCounts.push(feedCount);
  });

  if (feedingTrendsChartInst) feedingTrendsChartInst.destroy();

  const ctx = document.getElementById('feedingTrendsChart').getContext('2d');
  feedingTrendsChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dateLabels,
      datasets: [
        {
          label: `Total Volume (${volUnit})`,
          data: dailyVolumes,
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'yVolume',
          order: 2
        },
        {
          label: 'Total Sessions',
          data: dailyCounts,
          type: 'line',
          borderColor: colors.warning,
          backgroundColor: colors.warning,
          borderWidth: 3,
          pointBackgroundColor: colors.warning,
          pointRadius: 4,
          fill: false,
          tension: 0.3,
          yAxisID: 'yCount',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: colors.text, font: { family: 'Inter', weight: 500 } }
        },
        tooltip: {
          padding: 10,
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Inter', size: 12 }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: { color: colors.text }
        },
        yVolume: {
          type: 'linear',
          position: 'left',
          grid: { color: colors.grid },
          ticks: { color: colors.text },
          title: {
            display: true,
            text: `Volume (${volUnit})`,
            color: colors.text,
            font: { family: 'Inter', weight: 600 }
          }
        },
        yCount: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false }, // only draw grid for left axis
          ticks: { color: colors.text, stepSize: 1 },
          title: {
            display: true,
            text: 'Sessions Count',
            color: colors.text,
            font: { family: 'Inter', weight: 600 }
          },
          min: 0
        }
      }
    }
  });
}

/**
 * Chart 2: Feeding Methods Pie/Doughnut
 */
function renderFeedingTypesChart(logs, colors) {
  let breast = 0;
  let bottleFormula = 0;
  let bottleBreastmilk = 0;
  let solids = 0;

  logs.forEach(log => {
    if (log.type === 'feeding') {
      const ft = log.details.feedType;
      if (ft === 'breast') breast++;
      else if (ft === 'solids') solids++;
      else if (ft === 'bottle') {
        if (log.details.bottleType === 'formula') bottleFormula++;
        else bottleBreastmilk++;
      }
    }
  });

  const total = breast + bottleFormula + bottleBreastmilk + solids;

  if (feedingTypesChartInst) feedingTypesChartInst.destroy();

  // If no feeding data, draw empty state
  if (total === 0) {
    const ctx = document.getElementById('feedingTypesChart').getContext('2d');
    feedingTypesChartInst = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Feedings Logged'],
        datasets: [{
          data: [1],
          backgroundColor: [colors.grid],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: colors.text } }
        }
      }
    });
    return;
  }

  const ctx = document.getElementById('feedingTypesChart').getContext('2d');
  feedingTypesChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Breast', 'Bottle (Formula)', 'Bottle (Breast Milk)', 'Solids'],
      datasets: [{
        data: [breast, bottleFormula, bottleBreastmilk, solids],
        backgroundColor: [
          colors.warning,
          colors.info,
          '#6366f1',
          colors.success
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colors.text, font: { family: 'Inter' } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = Math.round((val / total) * 100);
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Chart 3: Sleep Trends (Hours slept per day)
 */
function renderSleepTrendsChart(logsByDate, dates, dateLabels, colors) {
  const dailySleepHours = [];

  dates.forEach(date => {
    let daySleepSec = 0;
    logsByDate[date].forEach(log => {
      if (log.type === 'sleep' && log.duration) {
        daySleepSec += log.duration;
      }
    });
    // Convert to hours
    const hours = Math.round((daySleepSec / 3600) * 10) / 10;
    dailySleepHours.push(hours);
  });

  if (sleepTrendsChartInst) sleepTrendsChartInst.destroy();

  const ctx = document.getElementById('sleepTrendsChart').getContext('2d');
  sleepTrendsChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dateLabels,
      datasets: [{
        label: 'Sleep Duration (hrs)',
        data: dailySleepHours,
        borderColor: colors.accent,
        backgroundColor: colors.accentLight,
        borderWidth: 3,
        pointBackgroundColor: colors.accent,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: colors.text } }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: { color: colors.text }
        },
        y: {
          grid: { color: colors.grid },
          ticks: { color: colors.text },
          min: 0,
          title: {
            display: true,
            text: 'Hours',
            color: colors.text,
            font: { family: 'Inter', weight: 600 }
          }
        }
      }
    }
  });
}

/**
 * Chart 4: Diaper Trends (Wet vs Dirty stacked counts)
 */
function renderDiaperTrendsChart(logsByDate, dates, dateLabels, colors) {
  const wetCounts = [];
  const dirtyCounts = [];

  dates.forEach(date => {
    let wet = 0;
    let dirty = 0;

    logsByDate[date].forEach(log => {
      if (log.type === 'diaper') {
        const type = log.details.diaperType;
        if (type === 'wet') {
          wet++;
        } else if (type === 'dirty') {
          dirty++;
        } else if (type === 'both') {
          wet++;
          dirty++;
        }
      }
    });

    wetCounts.push(wet);
    dirtyCounts.push(dirty);
  });

  if (diaperTrendsChartInst) diaperTrendsChartInst.destroy();

  const ctx = document.getElementById('diaperTrendsChart').getContext('2d');
  diaperTrendsChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dateLabels,
      datasets: [
        {
          label: 'Wet Diapers',
          data: wetCounts,
          backgroundColor: 'rgba(6, 182, 212, 0.7)',
          borderRadius: 4
        },
        {
          label: 'Dirty Diapers',
          data: dirtyCounts,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: colors.text } }
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: colors.grid },
          ticks: { color: colors.text }
        },
        y: {
          stacked: true,
          grid: { color: colors.grid },
          ticks: { color: colors.text, stepSize: 1 },
          min: 0
        }
      }
    }
  });
}

/**
 * Chart 5: Query Insights Scatter Plot (Time of Day vs Volume/Duration)
 * X-axis represents Time of Day (0 to 24h as decimal)
 * Y-axis represents Volume (for bottle feeds) or duration scaled (for breast feeds)
 */
function renderQueryScatterChart(matchingFeeds, prefs) {
  const isDark = prefs.theme === 'dark';
  const colors = getChartThemeColors(isDark);
  const volUnit = prefs.volumeUnit;

  const datasetBottle = [];
  const datasetBreast = [];
  const datasetSolids = [];

  matchingFeeds.forEach(feed => {
    const timeObj = new Date(feed.startTime);
    // Decimal time of day: hours + minutes/60
    const timeDecimal = timeObj.getHours() + timeObj.getMinutes() / 60;
    const timeFormatted = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = timeObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (feed.details.feedType === 'bottle') {
      let vol = feed.details.volume || 0;
      if (volUnit === 'oz') {
        vol = Conversions.mlToOz(vol);
      }
      datasetBottle.push({
        x: timeDecimal,
        y: vol,
        label: `${feed.details.bottleType === 'formula' ? 'Formula' : 'EBM'}: ${vol} ${volUnit}`,
        timeStr: timeFormatted,
        dateStr: dateFormatted,
        notes: feed.details.notes || 'No notes'
      });
    } else if (feed.details.feedType === 'breast') {
      // For breast feeds, we plot on secondary representation (let's map duration as Y to separate visually)
      const durationMin = Math.round((feed.duration || 0) / 60);
      datasetBreast.push({
        x: timeDecimal,
        y: durationMin, // plot duration in minutes
        label: `Breast (${feed.details.breastSide}): ${durationMin} min`,
        timeStr: timeFormatted,
        dateStr: dateFormatted,
        notes: feed.details.notes || 'No notes'
      });
    } else if (feed.details.feedType === 'solids') {
      datasetSolids.push({
        x: timeDecimal,
        y: 5, // constant baseline for solids
        label: `Solids: ${feed.details.foodType || 'puree'}`,
        timeStr: timeFormatted,
        dateStr: dateFormatted,
        notes: feed.details.notes || 'No notes'
      });
    }
  });

  if (queryScatterChartInst) queryScatterChartInst.destroy();

  const ctx = document.getElementById('queryScatterChart').getContext('2d');
  queryScatterChartInst = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: `Bottle Feeds (${volUnit})`,
          data: datasetBottle,
          backgroundColor: colors.info,
          borderColor: colors.info,
          pointRadius: 7,
          pointHoverRadius: 9
        },
        {
          label: 'Breast Feeds (Duration in min)',
          data: datasetBreast,
          backgroundColor: colors.warning,
          borderColor: colors.warning,
          pointRadius: 7,
          pointHoverRadius: 9,
          pointStyle: 'triangle'
        },
        {
          label: 'Solids Logged',
          data: datasetSolids,
          backgroundColor: colors.success,
          borderColor: colors.success,
          pointRadius: 7,
          pointHoverRadius: 9,
          pointStyle: 'rectRot'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: colors.text, font: { family: 'Inter' } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const dataPoint = context.raw;
              return [
                `Time: ${dataPoint.timeStr} (${dataPoint.dateStr})`,
                `Type: ${dataPoint.label}`,
                `Notes: ${dataPoint.notes}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            callback: function(value) {
              // Convert decimal hours to 12h AM/PM
              const hour = Math.floor(value);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour % 12 === 0 ? 12 : hour % 12;
              return `${displayHour} ${ampm}`;
            },
            stepSize: 3
          },
          min: 0,
          max: 24,
          title: {
            display: true,
            text: 'Time of Day',
            color: colors.text,
            font: { family: 'Inter', weight: 600 }
          }
        },
        y: {
          grid: { color: colors.grid },
          ticks: { color: colors.text },
          min: 0,
          title: {
            display: true,
            text: `Value (Volume in ${volUnit} / Breast Duration in min)`,
            color: colors.text,
            font: { family: 'Inter', weight: 600 }
          }
        }
      }
    }
  });
}
