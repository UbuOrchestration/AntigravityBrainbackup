/**
 * app.js - Main dashboard state controller and UI binder
 */

// Application State
const state = {
  activeTab: 'overview',
  historyPage: 1,
  historyLogsPerPage: 10,
  historyFilter: 'all',
  historySearch: '',
  prefs: {},
  profile: {},
  logs: [],
  selectedBreastSide: 'both' // active selection for breast timer
};

// DOM Elements Cache
const elements = {
  body: document.body,
  
  // Navigation
  menuItems: document.querySelectorAll('.menu-item'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Header Info
  sidebarBabyName: document.getElementById('sidebar-baby-name'),
  sidebarBabyAge: document.getElementById('sidebar-baby-age'),
  headerGreeting: document.getElementById('header-greeting'),
  headerDate: document.getElementById('header-date'),
  
  // Preference Buttons
  unitMetricBtn: document.getElementById('unit-metric-btn'),
  unitImperialBtn: document.getElementById('unit-imperial-btn'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIconDark: document.querySelector('.theme-icon-dark'),
  themeIconLight: document.querySelector('.theme-icon-light'),

  // Stats Card Values
  statLastFeed: document.getElementById('stat-last-feed'),
  statLastFeedSub: document.getElementById('stat-last-feed-sub'),
  statVolumeToday: document.getElementById('stat-volume-today'),
  statVolumeCount: document.getElementById('stat-volume-count'),
  statDiapersToday: document.getElementById('stat-diapers-today'),
  statDiapersSub: document.getElementById('stat-diapers-sub'),
  statSleepToday: document.getElementById('stat-sleep-today'),
  statSleepCount: document.getElementById('stat-sleep-count'),
  
  // Timers UI
  feedTimerDisplay: document.getElementById('feed-timer-display'),
  feedTimerStatus: document.getElementById('feed-timer-status'),
  feedTimerStart: document.getElementById('feed-timer-start-btn'),
  feedTimerPause: document.getElementById('feed-timer-pause-btn'),
  feedTimerStop: document.getElementById('feed-timer-stop-btn'),
  sideLeftBtn: document.getElementById('side-left-btn'),
  sideRightBtn: document.getElementById('side-right-btn'),
  sideBothBtn: document.getElementById('side-both-btn'),
  timerTabs: document.querySelectorAll('.timer-tab'),
  timerFeedBody: document.getElementById('timer-feed-body'),
  timerSleepBody: document.getElementById('timer-sleep-body'),
  
  sleepTimerDisplay: document.getElementById('sleep-timer-display'),
  sleepTimerStatus: document.getElementById('sleep-timer-status'),
  sleepTimerStart: document.getElementById('sleep-timer-start-btn'),
  sleepTimerStop: document.getElementById('sleep-timer-stop-btn'),
  
  // Quick Log
  quickDiaperWet: document.getElementById('quick-diaper-wet'),
  quickDiaperDirty: document.getElementById('quick-diaper-dirty'),
  quickDiaperBoth: document.getElementById('quick-diaper-both'),
  quickLogFeedBtn: document.getElementById('quick-log-feed'),
  
  // Recent Activity Timeline
  recentTimelineContainer: document.getElementById('recent-timeline-container'),
  viewAllLogsLink: document.getElementById('view-all-logs-link'),
  
  // Log Forms & Sub-forms
  formTabBtns: document.querySelectorAll('.form-tab-btn'),
  logForms: document.querySelectorAll('.log-form'),
  formFeeding: document.getElementById('form-feeding'),
  formDiaper: document.getElementById('form-diaper'),
  formSleep: document.getElementById('form-sleep'),
  formGrowth: document.getElementById('form-growth'),
  
  // Feed Form Inputs
  feedMethod: document.getElementById('feed-method'),
  sectionBreast: document.getElementById('section-breast'),
  sectionBottle: document.getElementById('section-bottle'),
  sectionSolids: document.getElementById('section-solids'),
  feedStartTime: document.getElementById('feed-start-time'),
  breastLeftDur: document.getElementById('breast-left-dur'),
  breastRightDur: document.getElementById('breast-right-dur'),
  bottleContent: document.getElementById('bottle-content'),
  bottleVolume: document.getElementById('bottle-volume'),
  solidFoodType: document.getElementById('solid-food-type'),
  feedNotes: document.getElementById('feed-notes'),
  labelBottleVolume: document.getElementById('label-bottle-volume'),
  
  // Diaper Form Inputs
  diaperType: document.getElementById('diaper-type'),
  diaperTime: document.getElementById('diaper-time'),
  diaperNotes: document.getElementById('diaper-notes'),
  
  // Sleep Form Inputs
  sleepStartTime: document.getElementById('sleep-start-time'),
  sleepEndTime: document.getElementById('sleep-end-time'),
  sleepNotes: document.getElementById('sleep-notes'),
  
  // Growth Form Inputs
  growthTime: document.getElementById('growth-time'),
  growthWeight: document.getElementById('growth-weight'),
  growthHeight: document.getElementById('growth-height'),
  growthHead: document.getElementById('growth-head'),
  growthNotes: document.getElementById('growth-notes'),
  labelGrowthWeight: document.getElementById('label-growth-weight'),
  labelGrowthHeight: document.getElementById('label-growth-height'),
  labelGrowthHead: document.getElementById('label-growth-head'),
  
  // Advanced Query Builder UI
  queryFilterForm: document.getElementById('query-filter-form'),
  queryDatePreset: document.getElementById('query-date-preset'),
  queryCustomDates: document.getElementById('query-custom-dates'),
  queryStartDate: document.getElementById('query-start-date'),
  queryEndDate: document.getElementById('query-end-date'),
  queryTimeOfDay: document.getElementById('query-time-of-day'),
  qFeedBreast: document.getElementById('q-feed-breast'),
  qFeedBottle: document.getElementById('q-feed-bottle'),
  qFeedSolids: document.getElementById('q-feed-solids'),
  queryMinVolume: document.getElementById('query-min-volume'),
  queryMaxVolume: document.getElementById('query-max-volume'),
  queryKeyword: document.getElementById('query-keyword'),
  labelQMinVol: document.getElementById('label-q-min-vol'),
  labelQMaxVol: document.getElementById('label-q-max-vol'),
  
  // Advanced Query Result Panels
  qResultCount: document.getElementById('q-result-count'),
  qResultFrequency: document.getElementById('q-result-frequency'),
  qResultTotalVolume: document.getElementById('q-result-total-volume'),
  labelQResultTotalVol: document.getElementById('label-q-result-total-vol'),
  qResultAvgVolume: document.getElementById('q-result-avg-volume'),
  qResultAvgInterval: document.getElementById('q-result-avg-interval'),
  queryResultsTableBody: document.getElementById('query-results-table-body'),
  queryEmptyState: document.getElementById('query-empty-state'),

  // History Log UI
  historyTableBody: document.getElementById('history-table-body'),
  historyFilterType: document.getElementById('history-filter-type'),
  historySearchNotes: document.getElementById('history-search-notes'),
  historyEmptyState: document.getElementById('history-empty-state'),
  paginationInfoText: document.getElementById('pagination-info-text'),
  paginationPrevBtn: document.getElementById('pagination-prev-btn'),
  paginationNextBtn: document.getElementById('pagination-next-btn'),

  // Settings Forms & Inputs
  formProfileSettings: document.getElementById('form-profile-settings'),
  profileName: document.getElementById('profile-name'),
  profileBirthdate: document.getElementById('profile-birthdate'),
  profileWeight: document.getElementById('profile-weight'),
  profileHeight: document.getElementById('profile-height'),
  profileHead: document.getElementById('profile-head'),
  labelProfileWeight: document.getElementById('label-profile-weight'),
  labelProfileHeight: document.getElementById('label-profile-height'),
  labelProfileHead: document.getElementById('label-profile-head'),
  
  // Data Portability Buttons
  exportJsonBtn: document.getElementById('export-json-btn'),
  exportCsvBtn: document.getElementById('export-csv-btn'),
  importFileInput: document.getElementById('import-file-input'),
  resetDbBtn: document.getElementById('reset-db-btn'),

  // Edit Modal Elements
  editModal: document.getElementById('edit-modal'),
  editModalCloseBtn: document.getElementById('edit-modal-close-btn'),
  editModalCancelBtn: document.getElementById('edit-modal-cancel-btn'),
  formEditEntry: document.getElementById('form-edit-entry'),
  editEntryId: document.getElementById('edit-entry-id'),
  editEntryType: document.getElementById('edit-entry-type'),
  editEntryStartTime: document.getElementById('edit-entry-start-time'),
  editEntryNotes: document.getElementById('edit-entry-notes'),
  editSectionFeeding: document.getElementById('edit-section-feeding'),
  editFeedMethod: document.getElementById('edit-feed-method'),
  editBreastSub: document.getElementById('edit-breast-sub'),
  editBottleSub: document.getElementById('edit-bottle-sub'),
  editSolidsSub: document.getElementById('edit-solids-sub'),
  editBreastLeft: document.getElementById('edit-breast-left'),
  editBreastRight: document.getElementById('edit-breast-right'),
  editBottleContent: document.getElementById('edit-bottle-content'),
  editBottleVolume: document.getElementById('edit-bottle-volume'),
  labelEditBottleVolume: document.getElementById('label-edit-bottle-volume'),
  editSolidFood: document.getElementById('edit-solid-food'),
  editSectionDiaper: document.getElementById('edit-section-diaper'),
  editDiaperType: document.getElementById('edit-diaper-type'),
  editSectionSleep: document.getElementById('edit-section-sleep'),
  editSleepEndTime: document.getElementById('edit-sleep-end-time'),
  editSectionGrowth: document.getElementById('edit-section-growth'),
  editGrowthWeight: document.getElementById('edit-growth-weight'),
  editGrowthHeight: document.getElementById('edit-growth-height'),
  editGrowthHead: document.getElementById('edit-growth-head'),
  labelEditGrowthWeight: document.getElementById('label-edit-growth-weight'),
  labelEditGrowthHeight: document.getElementById('label-edit-growth-height'),
  labelEditGrowthHead: document.getElementById('label-edit-growth-head'),
  
  toastContainer: document.getElementById('toast-container')
};

/**
 * App Lifecycle Initializer
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  loadData();
  applyPreferences();
  initEventListeners();
  initDefaultFormTimes();
  
  // Timers restoration
  restoreActiveTimers(
    // Feeding tick callback
    (seconds, side, isPaused) => {
      elements.feedTimerDisplay.textContent = formatTimerDisplay(seconds);
      elements.feedTimerStart.disabled = !isPaused && seconds > 0;
      elements.feedTimerPause.disabled = isPaused;
      elements.feedTimerStop.disabled = false;
      elements.feedTimerStatus.textContent = `Tracking breastfeed on ${side} side (${isPaused ? 'paused' : 'running'}).`;
      selectBreastSideUI(side);
    },
    // Sleep tick callback
    (seconds) => {
      elements.sleepTimerDisplay.textContent = formatTimerDisplay(seconds);
      elements.sleepTimerStart.disabled = true;
      elements.sleepTimerStop.disabled = false;
      elements.sleepTimerStatus.textContent = `Nap is active (duration: ${formatTimerDisplay(seconds)}).`;
    }
  );

  // Initialize UI greeting and date
  updateHeaderDate();
  calculateDashboardStats();
  renderRecentTimeline();
  renderHistoryTable();
  runAdvancedQuery();
  updateCharts();
});

/**
 * Load logs, profile, and preferences from DB
 */
function loadData() {
  state.logs = getLogs();
  state.profile = getProfile();
  state.prefs = getPrefs();
}

/**
 * Save states to database and reload memory cache
 */
function dataChanged() {
  loadData();
  calculateDashboardStats();
  renderRecentTimeline();
  renderHistoryTable();
  runAdvancedQuery();
  updateCharts();
}

/**
 * Trigger Chart rendering with current units
 */
function updateCharts() {
  updateDashboardCharts(state.logs, state.prefs);
}

/**
 * Apply styling/layout units preferences
 */
function applyPreferences() {
  // Theme Toggle
  if (state.prefs.theme === 'dark') {
    elements.body.classList.add('dark-mode');
    elements.body.classList.remove('light-mode');
    elements.themeIconDark.style.display = 'none';
    elements.themeIconLight.style.display = 'block';
  } else {
    elements.body.classList.add('light-mode');
    elements.body.classList.remove('dark-mode');
    elements.themeIconDark.style.display = 'block';
    elements.themeIconLight.style.display = 'none';
  }

  // Active units indicators
  if (state.prefs.volumeUnit === 'ml') {
    elements.unitMetricBtn.classList.add('active');
    elements.unitImperialBtn.classList.remove('active');
  } else {
    elements.unitImperialBtn.classList.add('active');
    elements.unitMetricBtn.classList.remove('active');
  }

  // Labels update based on Metric / Imperial
  updateLabelsForUnits();
}

/**
 * Update dynamic input labels to show ml/oz or kg/lbs
 */
function updateLabelsForUnits() {
  const vol = state.prefs.volumeUnit; // ml or oz
  const wt = state.prefs.weightUnit; // kg or lbs
  const ht = state.prefs.lengthUnit; // cm or in

  elements.labelBottleVolume.textContent = `Volume (${vol})`;
  elements.labelGrowthWeight.textContent = `Weight (${wt})`;
  elements.labelGrowthHeight.textContent = `Height (${ht})`;
  elements.labelGrowthHead.textContent = `Head Circumference (${ht})`;
  
  elements.labelEditBottleVolume.textContent = `Volume (${vol})`;
  elements.labelEditGrowthWeight.textContent = `Weight (${wt})`;
  elements.labelEditGrowthHeight.textContent = `Height (${ht})`;
  elements.labelEditGrowthHead.textContent = `Head Circumference (${ht})`;

  elements.labelQMinVol.textContent = `Min Feed Volume (${vol})`;
  elements.labelQMaxVol.textContent = `Max Feed Volume (${vol})`;
  elements.labelQResultTotalVol.textContent = `Total Volume Ingested (${vol})`;
}

/**
 * Setup dynamic welcome header text and date
 */
function updateHeaderDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  elements.headerDate.textContent = new Date().toLocaleDateString(undefined, options);
  
  const hour = new Date().getHours();
  let greet = "Good morning";
  if (hour >= 12 && hour < 17) greet = "Good afternoon";
  else if (hour >= 17) greet = "Good evening";
  
  elements.headerGreeting.textContent = `${greet}, ${state.profile.name}'s Parents!`;
  
  // Update sidebar mini card
  elements.sidebarBabyName.textContent = state.profile.name;
  
  const ageStr = calculateAge(state.profile.birthdate);
  elements.sidebarBabyAge.textContent = ageStr;
  
  // Fill profile form fields
  elements.profileName.value = state.profile.name;
  elements.profileBirthdate.value = state.profile.birthdate;
  elements.profileWeight.value = state.profile.weight || '';
  elements.profileHeight.value = state.profile.height || '';
  elements.profileHead.value = state.profile.headCircumference || '';
}

/**
 * Calculate age based on birthdate
 */
function calculateAge(birthdateStr) {
  if (!birthdateStr) return '0 days old';
  const birth = new Date(birthdateStr);
  const now = new Date();
  const diffTime = Math.abs(now - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} old`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} old`;
  }
  
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  return `${months} month${months !== 1 ? 's' : ''} old`;
}

/**
 * Pre-populate form date pickers with current local date-times
 */
function initDefaultFormTimes() {
  const pad = (n) => String(n).padStart(2, '0');
  const getLocalISOString = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(date - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.substring(0, 16); // YYYY-MM-DDTHH:MM
  };

  const nowString = getLocalISOString(new Date());
  elements.feedStartTime.value = nowString;
  elements.diaperTime.value = nowString;
  elements.sleepStartTime.value = nowString;
  
  // sleep wake time standard is 1 hour later for quick manual logging placeholder
  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
  elements.sleepEndTime.value = getLocalISOString(oneHourLater);
  
  elements.growthTime.value = new Date().toISOString().split('T')[0];
}

/**
 * Bind Action Listeners
 */
function initEventListeners() {
  // Navigation Tabs switching
  elements.menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = item.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Welcome tab Quick Table link
  elements.viewAllLogsLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('history');
  });

  // Unit Selector Action
  elements.unitMetricBtn.addEventListener('click', () => {
    state.prefs.volumeUnit = 'ml';
    state.prefs.weightUnit = 'kg';
    state.prefs.lengthUnit = 'cm';
    savePrefs(state.prefs);
    applyPreferences();
    dataChanged();
    showToast('Switched dashboard to Metric units', 'info');
  });

  elements.unitImperialBtn.addEventListener('click', () => {
    state.prefs.volumeUnit = 'oz';
    state.prefs.weightUnit = 'lbs';
    state.prefs.lengthUnit = 'in';
    savePrefs(state.prefs);
    applyPreferences();
    dataChanged();
    showToast('Switched dashboard to Imperial units', 'info');
  });

  // Theme Toggle Button
  elements.themeToggleBtn.addEventListener('click', () => {
    state.prefs.theme = state.prefs.theme === 'light' ? 'dark' : 'light';
    savePrefs(state.prefs);
    applyPreferences();
    updateCharts();
  });

  // Timer tab switching (Feed vs Sleep stopwatch widgets)
  elements.timerTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.timerTabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const timerType = btn.getAttribute('data-timer');
      
      if (timerType === 'feed') {
        elements.timerFeedBody.style.display = 'flex';
        elements.timerSleepBody.style.display = 'none';
      } else {
        elements.timerFeedBody.style.display = 'none';
        elements.timerSleepBody.style.display = 'flex';
      }
    });
  });

  // Breast Side selectors on timer
  elements.sideLeftBtn.addEventListener('click', () => selectBreastSideUI('left'));
  elements.sideRightBtn.addEventListener('click', () => selectBreastSideUI('right'));
  elements.sideBothBtn.addEventListener('click', () => selectBreastSideUI('both'));

  // Feeding stopwatch triggers
  elements.feedTimerStart.addEventListener('click', () => {
    startFeedTimer(state.selectedBreastSide, (seconds, side) => {
      elements.feedTimerDisplay.textContent = formatTimerDisplay(seconds);
      elements.feedTimerStart.disabled = true;
      elements.feedTimerPause.disabled = false;
      elements.feedTimerStop.disabled = false;
      elements.feedTimerStatus.textContent = `Tracking feed on ${side} breast: ${formatTimerDisplay(seconds)}`;
    });
  });

  elements.feedTimerPause.addEventListener('click', () => {
    const elapsed = pauseFeedTimer();
    elements.feedTimerStart.disabled = false;
    elements.feedTimerPause.disabled = true;
    elements.feedTimerStatus.textContent = `Feeding timer paused at ${formatTimerDisplay(elapsed)}.`;
  });

  elements.feedTimerStop.addEventListener('click', () => {
    const feedSession = stopFeedTimer();
    
    // Clear UI Display
    elements.feedTimerDisplay.textContent = '00:00';
    elements.feedTimerStart.disabled = false;
    elements.feedTimerPause.disabled = true;
    elements.feedTimerStop.disabled = true;
    elements.feedTimerStatus.textContent = 'Timer stopped and session loaded below.';

    // Switch to Log Activity feeding subtab
    switchTab('log-entry');
    switchFormTab('feeding');

    // Populate breast values based on live timer
    elements.feedMethod.value = 'breast';
    toggleFeedMethodFields('breast');
    
    elements.feedStartTime.value = feedSession.startTime.substring(0, 16);
    
    const minutes = Math.round(feedSession.elapsed / 60);
    if (feedSession.side === 'left') {
      elements.breastLeftDur.value = minutes;
      elements.breastRightDur.value = 0;
    } else if (feedSession.side === 'right') {
      elements.breastRightDur.value = minutes;
      elements.breastLeftDur.value = 0;
    } else {
      // Split evenly
      const half = Math.round(minutes / 2);
      elements.breastLeftDur.value = half;
      elements.breastRightDur.value = half;
    }
    
    showToast('Breastfeed timer session loaded into log form!', 'success');
  });

  // Sleep stopwatch triggers
  elements.sleepTimerStart.addEventListener('click', () => {
    startSleepTimer((seconds) => {
      elements.sleepTimerDisplay.textContent = formatTimerDisplay(seconds);
      elements.sleepTimerStart.disabled = true;
      elements.sleepTimerStop.disabled = false;
      elements.sleepTimerStatus.textContent = `Sleep duration: ${formatTimerDisplay(seconds)}`;
    });
    showToast('Sleep tracking session started!', 'info');
  });

  elements.sleepTimerStop.addEventListener('click', () => {
    const sleepSession = stopSleepTimer();
    
    elements.sleepTimerDisplay.textContent = '00:00';
    elements.sleepTimerStart.disabled = false;
    elements.sleepTimerStop.disabled = true;
    elements.sleepTimerStatus.textContent = 'Tracking stopped.';

    // Switch to sleep sub-form
    switchTab('log-entry');
    switchFormTab('sleep');

    elements.sleepStartTime.value = sleepSession.startTime.substring(0, 16);
    elements.sleepEndTime.value = sleepSession.endTime.substring(0, 16);

    showToast('Sleep tracking completed and loaded into log form!', 'success');
  });

  // Quick Logs
  elements.quickDiaperWet.addEventListener('click', () => logQuickDiaper('wet'));
  elements.quickDiaperDirty.addEventListener('click', () => logQuickDiaper('dirty'));
  elements.quickDiaperBoth.addEventListener('click', () => logQuickDiaper('both'));
  elements.quickLogFeedBtn.addEventListener('click', () => {
    switchTab('log-entry');
    switchFormTab('feeding');
  });

  // Log Form tabs (Feed, Diaper, Sleep, Growth selectors)
  elements.formTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const formType = btn.getAttribute('data-form');
      switchFormTab(formType);
    });
  });

  // Feed Method Sub-conditional forms rendering
  elements.feedMethod.addEventListener('change', (e) => {
    toggleFeedMethodFields(e.target.value);
  });

  // Form Submissions
  elements.formFeeding.addEventListener('submit', (e) => {
    e.preventDefault();
    submitFeedingLog();
  });
  
  elements.formDiaper.addEventListener('submit', (e) => {
    e.preventDefault();
    submitDiaperLog();
  });

  elements.formSleep.addEventListener('submit', (e) => {
    e.preventDefault();
    submitSleepLog();
  });

  elements.formGrowth.addEventListener('submit', (e) => {
    e.preventDefault();
    submitGrowthLog();
  });

  // Query Filter Date Preset Selector
  elements.queryDatePreset.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      elements.queryCustomDates.style.display = 'block';
    } else {
      elements.queryCustomDates.style.display = 'none';
    }
  });

  // Advanced Query Builder Trigger
  elements.queryFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runAdvancedQuery();
  });

  // History Page Searching & Filtering
  elements.historyFilterType.addEventListener('change', () => {
    state.historyPage = 1;
    renderHistoryTable();
  });

  elements.historySearchNotes.addEventListener('input', () => {
    state.historyPage = 1;
    renderHistoryTable();
  });

  // History Pagination click handlers
  elements.paginationPrevBtn.addEventListener('click', () => {
    if (state.historyPage > 1) {
      state.historyPage--;
      renderHistoryTable();
    }
  });

  elements.paginationNextBtn.addEventListener('click', () => {
    const totalFiltered = getFilteredHistoryLogs().length;
    const maxPage = Math.ceil(totalFiltered / state.historyLogsPerPage);
    if (state.historyPage < maxPage) {
      state.historyPage++;
      renderHistoryTable();
    }
  });

  // Baby Profile Submission
  elements.formProfileSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    saveBabyProfile();
  });

  // Data Actions
  elements.exportJsonBtn.addEventListener('click', () => {
    exportToJSON();
    showToast('JSON Backup downloaded!', 'success');
  });

  elements.exportCsvBtn.addEventListener('click', () => {
    exportToCSV();
    showToast('CSV Export downloaded!', 'success');
  });

  // Import JSON trigger
  elements.importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const res = importFromJSON(evt.target.result);
      if (res.success) {
        showToast('Backup imported successfully!', 'success');
        elements.importFileInput.value = ''; // clear input
        dataChanged();
        applyPreferences();
        updateHeaderDate();
      } else {
        showToast(`Import failed: ${res.error}`, 'danger');
      }
    };
    reader.readAsText(file);
  });

  // Reset database trigger
  elements.resetDbBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all current entries and restore mock data? All your customized logs will be overwritten.')) {
      clearAllData();
      showToast('Database reset to mock templates!', 'info');
      dataChanged();
      applyPreferences();
      updateHeaderDate();
      switchTab('overview');
    }
  });

  // Edit Modal Cancel / Close actions
  const closeModal = () => elements.editModal.classList.remove('active');
  elements.editModalCloseBtn.addEventListener('click', closeModal);
  elements.editModalCancelBtn.addEventListener('click', closeModal);
  
  elements.editFeedMethod.addEventListener('change', (e) => {
    toggleEditFeedMethodFields(e.target.value);
  });

  elements.formEditEntry.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEditedEntry();
  });
}

/**
 * Handle Switching Tabs
 */
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update sidebar active class
  elements.menuItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show corresponding tab container
  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Redraw charts if entering Analytics or Query Builder tabs
  if (tabId === 'analytics' || tabId === 'query-builder') {
    setTimeout(updateCharts, 50); // slight timeout to allow CSS layout reflow
  }
}

/**
 * Handle switching form views inside the Log Activity tab
 */
function switchFormTab(formType) {
  elements.formTabBtns.forEach(btn => {
    if (btn.getAttribute('data-form') === formType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  elements.logForms.forEach(form => {
    if (form.id === `form-${formType}`) {
      form.classList.add('active');
    } else {
      form.classList.remove('active');
    }
  });
}

/**
 * Handle Breast Side Selection in Stopwatch Timer widget
 */
function selectBreastSideUI(side) {
  state.selectedBreastSide = side;
  [elements.sideLeftBtn, elements.sideRightBtn, elements.sideBothBtn].forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (side === 'left') elements.sideLeftBtn.classList.add('active');
  else if (side === 'right') elements.sideRightBtn.classList.add('active');
  else elements.sideBothBtn.classList.add('active');
}

/**
 * Toggle feeding subforms conditionally
 */
function toggleFeedMethodFields(method) {
  elements.sectionBreast.style.display = method === 'breast' ? 'block' : 'none';
  elements.sectionBottle.style.display = method === 'bottle' ? 'block' : 'none';
  elements.sectionSolids.style.display = method === 'solids' ? 'block' : 'none';
}

function toggleEditFeedMethodFields(method) {
  elements.editBreastSub.style.display = method === 'breast' ? 'block' : 'none';
  elements.editBottleSub.style.display = method === 'bottle' ? 'block' : 'none';
  elements.editSolidsSub.style.display = method === 'solids' ? 'block' : 'none';
}

/**
 * Quick diaper logger
 */
function logQuickDiaper(type) {
  const entry = {
    type: 'diaper',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    details: {
      diaperType: type,
      notes: 'Quick logged from dashboard.'
    }
  };
  addLogEntry(entry);
  showToast(`Quick logged ${type} diaper change!`, 'success');
  dataChanged();
}

/**
 * Submit: Feed Log Form
 */
function submitFeedingLog() {
  const method = elements.feedMethod.value;
  const startTime = new Date(elements.feedStartTime.value).toISOString();
  
  let durationSeconds = 0;
  const details = { feedType: method };

  if (method === 'breast') {
    const leftMin = parseFloat(elements.breastLeftDur.value) || 0;
    const rightMin = parseFloat(elements.breastRightDur.value) || 0;
    durationSeconds = (leftMin + rightMin) * 60;
    
    details.leftDuration = leftMin * 60;
    details.rightDuration = rightMin * 60;
    
    if (leftMin > 0 && rightMin > 0) details.breastSide = 'both';
    else if (leftMin > 0) details.breastSide = 'left';
    else details.breastSide = 'right';
  } 
  else if (method === 'bottle') {
    durationSeconds = 15 * 60; // 15 mins default bottle feed
    details.bottleType = elements.bottleContent.value;
    
    let volVal = parseFloat(elements.bottleVolume.value) || 0;
    // Database always stores in ML
    if (state.prefs.volumeUnit === 'oz') {
      volVal = Conversions.ozToMl(volVal);
    }
    details.volume = volVal;
  }
  else if (method === 'solids') {
    durationSeconds = 15 * 60;
    details.foodType = elements.solidFoodType.value;
  }

  details.notes = elements.feedNotes.value;

  const endTime = new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString();

  addLogEntry({
    type: 'feeding',
    startTime: startTime,
    endTime: endTime,
    duration: durationSeconds,
    details: details
  });

  showToast('Feeding log saved!', 'success');
  elements.formFeeding.reset();
  initDefaultFormTimes();
  dataChanged();
  switchTab('overview');
}

/**
 * Submit: Diaper Log Form
 */
function submitDiaperLog() {
  const time = new Date(elements.diaperTime.value).toISOString();
  addLogEntry({
    type: 'diaper',
    startTime: time,
    endTime: time,
    details: {
      diaperType: elements.diaperType.value,
      notes: elements.diaperNotes.value
    }
  });

  showToast('Diaper log saved!', 'success');
  elements.formDiaper.reset();
  initDefaultFormTimes();
  dataChanged();
  switchTab('overview');
}

/**
 * Submit: Sleep Log Form
 */
function submitSleepLog() {
  const start = new Date(elements.sleepStartTime.value);
  const end = new Date(elements.sleepEndTime.value);
  
  if (end <= start) {
    showToast('Wake up time must be after sleep start time!', 'danger');
    return;
  }

  const durationSec = Math.floor((end - start) / 1000);

  addLogEntry({
    type: 'sleep',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    duration: durationSec,
    details: {
      notes: elements.sleepNotes.value
    }
  });

  showToast('Sleep log saved!', 'success');
  elements.formSleep.reset();
  initDefaultFormTimes();
  dataChanged();
  switchTab('overview');
}

/**
 * Submit: Growth Log Form
 */
function submitGrowthLog() {
  const time = new Date(elements.growthTime.value + 'T12:00:00').toISOString();
  
  let weight = parseFloat(elements.growthWeight.value) || 0;
  let height = parseFloat(elements.growthHeight.value) || 0;
  let head = parseFloat(elements.growthHead.value) || 0;

  // DB stores in metric (kg, cm)
  if (state.prefs.weightUnit === 'lbs') weight = Conversions.lbsToKg(weight);
  if (state.prefs.lengthUnit === 'in') {
    height = Conversions.inToCm(height);
    head = Conversions.inToCm(head);
  }

  addLogEntry({
    type: 'growth',
    startTime: time,
    endTime: time,
    details: {
      weight: weight,
      height: height,
      headCircumference: head,
      notes: elements.growthNotes.value
    }
  });

  // Automatically update active baby stats if these are the latest measurements
  state.profile.weight = weight || state.profile.weight;
  state.profile.height = height || state.profile.height;
  state.profile.headCircumference = head || state.profile.headCircumference;
  saveProfile(state.profile);

  showToast('Growth metrics saved!', 'success');
  elements.formGrowth.reset();
  initDefaultFormTimes();
  dataChanged();
  updateHeaderDate();
  switchTab('overview');
}

/**
 * Save Baby Profile Updates
 */
function saveBabyProfile() {
  state.profile.name = elements.profileName.value;
  state.profile.birthdate = elements.profileBirthdate.value;
  
  let weight = parseFloat(elements.profileWeight.value) || 0;
  let height = parseFloat(elements.profileHeight.value) || 0;
  let head = parseFloat(elements.profileHead.value) || 0;

  if (state.prefs.weightUnit === 'lbs') weight = Conversions.lbsToKg(weight);
  if (state.prefs.lengthUnit === 'in') {
    height = Conversions.inToCm(height);
    head = Conversions.inToCm(head);
  }

  state.profile.weight = weight;
  state.profile.height = height;
  state.profile.headCircumference = head;

  saveProfile(state.profile);
  showToast('Baby profile settings updated!', 'success');
  dataChanged();
  updateHeaderDate();
}

/**
 * Calculate Overview Panel Statistics (Totals for Today)
 */
function calculateDashboardStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  let todayVol = 0;
  let feedCount = 0;
  let sleepDuration = 0;
  let sleepCount = 0;
  let diaperCount = 0;
  let wetCount = 0;
  let dirtyCount = 0;
  
  let lastFeedLog = null;

  state.logs.forEach(log => {
    const isToday = log.startTime.split('T')[0] === todayStr;
    
    if (log.type === 'feeding') {
      if (!lastFeedLog) {
        lastFeedLog = log; // logs are pre-sorted descending, first one is newest
      }
      
      if (isToday) {
        feedCount++;
        if (log.details.feedType === 'bottle' && log.details.volume) {
          todayVol += log.details.volume;
        }
      }
    } 
    else if (log.type === 'sleep' && isToday) {
      sleepCount++;
      if (log.duration) sleepDuration += log.duration;
    } 
    else if (log.type === 'diaper' && isToday) {
      diaperCount++;
      const dt = log.details.diaperType;
      if (dt === 'wet') wetCount++;
      else if (dt === 'dirty') dirtyCount++;
      else if (dt === 'both') {
        wetCount++;
        dirtyCount++;
      }
    }
  });

  // 1. Last feeding time calculations
  if (lastFeedLog) {
    const diffMs = Date.now() - new Date(lastFeedLog.startTime);
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let lastFeedText = '';
    if (hrs > 24) {
      lastFeedText = '> 24 hrs ago';
    } else if (hrs > 0) {
      lastFeedText = `${hrs}h ${mins}m ago`;
    } else {
      lastFeedText = `${mins}m ago`;
    }

    elements.statLastFeed.textContent = lastFeedText;
    
    // Last Feed sub-details description
    const details = lastFeedLog.details;
    let desc = '';
    if (details.feedType === 'breast') {
      desc = `Breast (${details.breastSide})`;
    } else if (details.feedType === 'bottle') {
      let vol = details.volume;
      if (state.prefs.volumeUnit === 'oz') vol = Conversions.mlToOz(vol);
      desc = `Bottle: ${vol} ${state.prefs.volumeUnit} (${details.bottleType === 'formula' ? 'Formula' : 'EBM'})`;
    } else {
      desc = `Solids: ${details.foodType.substring(0, 15)}`;
    }
    elements.statLastFeedSub.textContent = desc;
  } else {
    elements.statLastFeed.textContent = '--';
    elements.statLastFeedSub.textContent = 'No feeding records found';
  }

  // 2. Feeding Volume Display
  let displayVol = todayVol;
  if (state.prefs.volumeUnit === 'oz') {
    displayVol = Conversions.mlToOz(todayVol);
  }
  elements.statVolumeToday.textContent = `${displayVol} ${state.prefs.volumeUnit}`;
  elements.statVolumeCount.textContent = `${feedCount} feed${feedCount !== 1 ? 's' : ''} logged today`;

  // 3. Diapers Display
  elements.statDiapersToday.textContent = diaperCount;
  elements.statDiapersSub.textContent = `${wetCount} wet · ${dirtyCount} dirty`;

  // 4. Sleep Display
  const sleepHrs = Math.floor(sleepDuration / 3600);
  const sleepMins = Math.floor((sleepDuration % 3600) / 60);
  elements.statSleepToday.textContent = `${sleepHrs}h ${sleepMins}m`;
  elements.statSleepCount.textContent = `${sleepCount} session${sleepCount !== 1 ? 's' : ''} today`;
}

/**
 * Render recent events timeline on the Overview page (Up to 5 items)
 */
function renderRecentTimeline() {
  elements.recentTimelineContainer.innerHTML = '';
  const recent = state.logs.slice(0, 5);

  if (recent.length === 0) {
    elements.recentTimelineContainer.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 0;">
        <p>No recent activity recorded yet.</p>
      </div>
    `;
    return;
  }

  recent.forEach(log => {
    const time = new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let title = '';
    let desc = '';
    
    if (log.type === 'feeding') {
      const type = log.details.feedType;
      if (type === 'breast') {
        title = 'Breast Feeding';
        desc = `Fed on ${log.details.breastSide} breast for ${Math.round(log.duration / 60)} minutes total.`;
      } else if (type === 'bottle') {
        title = `Bottle Feed (${log.details.bottleType === 'formula' ? 'Formula' : 'Expressed Milk'})`;
        let vol = log.details.volume;
        if (state.prefs.volumeUnit === 'oz') vol = Conversions.mlToOz(vol);
        desc = `Ingested ${vol} ${state.prefs.volumeUnit}.`;
      } else {
        title = 'Solids Fed';
        desc = `Ate solids: ${log.details.foodType}`;
      }
    } 
    else if (log.type === 'diaper') {
      title = 'Diaper Changed';
      const dt = log.details.diaperType;
      desc = `Type: ${dt.toUpperCase()} diaper change.`;
    } 
    else if (log.type === 'sleep') {
      title = 'Sleep Cycle';
      const durationHr = Math.floor(log.duration / 3600);
      const durationMin = Math.round((log.duration % 3600) / 60);
      desc = `Napped for ${durationHr > 0 ? durationHr + 'h ' : ''}${durationMin} mins.`;
    } 
    else if (log.type === 'growth') {
      title = 'Growth Recorded';
      let wt = log.details.weight;
      let ht = log.details.height;
      if (state.prefs.weightUnit === 'lbs') wt = Conversions.kgToLbs(wt);
      if (state.prefs.lengthUnit === 'in') ht = Conversions.cmToIn(ht);
      desc = `Weight: ${wt} ${state.prefs.weightUnit}, Height: ${ht} ${state.prefs.lengthUnit}.`;
    }

    const item = document.createElement('div');
    item.className = `timeline-item ${log.type}`;
    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-header">
        <span class="timeline-title">${title}</span>
        <span class="timeline-time">${time}</span>
      </div>
      <p class="timeline-desc">${desc}</p>
      ${log.details.notes ? `<p class="timeline-notes">"${log.details.notes}"</p>` : ''}
    `;
    elements.recentTimelineContainer.appendChild(item);
  });
}

/**
 * Filter logs based on History filters
 */
function getFilteredHistoryLogs() {
  const typeFilter = elements.historyFilterType.value;
  const keyword = elements.historySearchNotes.value.toLowerCase().trim();

  return state.logs.filter(log => {
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const notesStr = (log.details.notes || '').toLowerCase();
    
    // Also match food details or diaper types inside search
    let detailMatches = false;
    if (log.type === 'feeding') {
      detailMatches = (log.details.foodType || '').toLowerCase().includes(keyword) || 
                      (log.details.bottleType || '').toLowerCase().includes(keyword);
    } else if (log.type === 'diaper') {
      detailMatches = log.details.diaperType.toLowerCase().includes(keyword);
    }

    const matchesKeyword = keyword === '' || notesStr.includes(keyword) || detailMatches;
    
    return matchesType && matchesKeyword;
  });
}

/**
 * Render Historical Logs Table (with sorting and pagination)
 */
function renderHistoryTable() {
  elements.historyTableBody.innerHTML = '';
  
  const filtered = getFilteredHistoryLogs();
  
  if (filtered.length === 0) {
    elements.historyEmptyState.style.display = 'flex';
    elements.paginationInfoText.textContent = 'Showing 0-0 of 0 entries';
    elements.paginationPrevBtn.disabled = true;
    elements.paginationNextBtn.disabled = true;
    return;
  }

  elements.historyEmptyState.style.display = 'none';

  // Calculate Pagination bounds
  const total = filtered.length;
  const totalPages = Math.ceil(total / state.historyLogsPerPage);
  
  // Bounds check
  if (state.historyPage > totalPages) state.historyPage = totalPages;
  if (state.historyPage < 1) state.historyPage = 1;

  const startIdx = (state.historyPage - 1) * state.historyLogsPerPage;
  const endIdx = Math.min(startIdx + state.historyLogsPerPage, total);
  
  // Enable / disable pagination buttons
  elements.paginationPrevBtn.disabled = state.historyPage === 1;
  elements.paginationNextBtn.disabled = state.historyPage === totalPages;
  elements.paginationInfoText.textContent = `Showing ${startIdx + 1}-${endIdx} of ${total} entries`;

  // Render logs slice
  const pageLogs = filtered.slice(startIdx, endIdx);

  pageLogs.forEach(log => {
    const logDate = new Date(log.startTime);
    const dateFormatted = logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    const timeFormatted = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let category = log.type.toUpperCase();
    let detailsStr = '';

    if (log.type === 'feeding') {
      const type = log.details.feedType;
      if (type === 'breast') {
        category = 'FEED (BREAST)';
        detailsStr = `Breast (${log.details.breastSide}) · ${Math.round(log.duration / 60)}m`;
      } else if (type === 'bottle') {
        category = 'FEED (BOTTLE)';
        let vol = log.details.volume;
        if (state.prefs.volumeUnit === 'oz') vol = Conversions.mlToOz(vol);
        detailsStr = `${vol} ${state.prefs.volumeUnit} ${log.details.bottleType === 'formula' ? 'Formula' : 'EBM'}`;
      } else if (type === 'solids') {
        category = 'FEED (SOLIDS)';
        detailsStr = log.details.foodType.substring(0, 15);
      }
    } 
    else if (log.type === 'diaper') {
      category = 'DIAPER';
      detailsStr = log.details.diaperType.toUpperCase();
    } 
    else if (log.type === 'sleep') {
      category = 'SLEEP';
      const durationHr = Math.floor(log.duration / 3600);
      const durationMin = Math.round((log.duration % 3600) / 60);
      detailsStr = `${durationHr > 0 ? durationHr + 'h ' : ''}${durationMin}m`;
    } 
    else if (log.type === 'growth') {
      category = 'GROWTH';
      let wt = log.details.weight;
      let ht = log.details.height;
      if (state.prefs.weightUnit === 'lbs') wt = Conversions.kgToLbs(wt);
      if (state.prefs.lengthUnit === 'in') ht = Conversions.cmToIn(ht);
      detailsStr = `${wt} ${state.prefs.weightUnit} · ${ht} ${state.prefs.lengthUnit}`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div style="font-weight: 500;">${dateFormatted}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted}</div>
      </td>
      <td>
        <span class="row-badge badge-${log.type}">${category}</span>
      </td>
      <td>
        <strong>${detailsStr}</strong>
      </td>
      <td style="color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.details.notes || ''}">
        ${log.details.notes || '--'}
      </td>
      <td>
        <div class="history-actions">
          <button class="action-btn edit-btn" onclick="openEditModal('${log.id}')" title="Edit Entry">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="action-btn delete-btn" onclick="deleteHistoryEntry('${log.id}')" title="Delete Entry">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;
    elements.historyTableBody.appendChild(row);
  });
  
  // Re-generate icons inside history table rows
  lucide.createIcons();
}

/**
 * Handle Deleting Log Entry
 */
window.deleteHistoryEntry = function(id) {
  if (confirm('Are you sure you want to permanently delete this log entry?')) {
    deleteLogEntry(id);
    showToast('Log entry deleted successfully!', 'info');
    dataChanged();
  }
};

/**
 * Open Edit Entry Modal
 */
window.openEditModal = function(id) {
  const log = state.logs.find(l => l.id === id);
  if (!log) return;

  // Set standard fields
  elements.editEntryId.value = log.id;
  elements.editEntryType.value = log.type;
  
  // Form Date mapping helper
  const dateObj = new Date(log.startTime);
  const tzoffset = dateObj.getTimezoneOffset() * 60000;
  const localString = (new Date(dateObj - tzoffset)).toISOString().slice(0, -1).substring(0, 16);
  elements.editEntryStartTime.value = localString;

  elements.editEntryNotes.value = log.details.notes || '';

  // Reset Subsections
  elements.editSectionFeeding.style.display = 'none';
  elements.editSectionDiaper.style.display = 'none';
  elements.editSectionSleep.style.display = 'none';
  elements.editSectionGrowth.style.display = 'none';

  if (log.type === 'feeding') {
    elements.editSectionFeeding.style.display = 'block';
    const method = log.details.feedType;
    elements.editFeedMethod.value = method;
    toggleEditFeedMethodFields(method);

    if (method === 'breast') {
      elements.editBreastLeft.value = Math.round((log.details.leftDuration || 0) / 60);
      elements.editBreastRight.value = Math.round((log.details.rightDuration || 0) / 60);
    } 
    else if (method === 'bottle') {
      elements.editBottleContent.value = log.details.bottleType;
      let vol = log.details.volume;
      if (state.prefs.volumeUnit === 'oz') vol = Conversions.mlToOz(vol);
      elements.editBottleVolume.value = vol;
    } 
    else if (method === 'solids') {
      elements.editSolidFood.value = log.details.foodType;
    }
  } 
  else if (log.type === 'diaper') {
    elements.editSectionDiaper.style.display = 'block';
    elements.editDiaperType.value = log.details.diaperType;
  } 
  else if (log.type === 'sleep') {
    elements.editSectionSleep.style.display = 'block';
    const wakeObj = new Date(log.endTime);
    const wakeTz = wakeObj.getTimezoneOffset() * 60000;
    elements.editSleepEndTime.value = (new Date(wakeObj - wakeTz)).toISOString().slice(0, -1).substring(0, 16);
  } 
  else if (log.type === 'growth') {
    elements.editSectionGrowth.style.display = 'block';
    
    let wt = log.details.weight;
    let ht = log.details.height;
    let hd = log.details.headCircumference;

    if (state.prefs.weightUnit === 'lbs') wt = Conversions.kgToLbs(wt);
    if (state.prefs.lengthUnit === 'in') {
      ht = Conversions.cmToIn(ht);
      hd = Conversions.cmToIn(hd);
    }

    elements.editGrowthWeight.value = wt || '';
    elements.editGrowthHeight.value = ht || '';
    elements.editGrowthHead.value = hd || '';
  }

  elements.editModal.classList.add('active');
};

/**
 * Save Edited Log Entry Details
 */
function saveEditedEntry() {
  const id = elements.editEntryId.value;
  const type = elements.editEntryType.value;
  const startTime = new Date(elements.editEntryStartTime.value).toISOString();
  
  const updatedEntry = {
    id: id,
    startTime: startTime,
    endTime: startTime,
    details: {
      notes: elements.editEntryNotes.value
    }
  };

  if (type === 'feeding') {
    const method = elements.editFeedMethod.value;
    updatedEntry.details.feedType = method;
    
    if (method === 'breast') {
      const leftMin = parseFloat(elements.editBreastLeft.value) || 0;
      const rightMin = parseFloat(elements.editBreastRight.value) || 0;
      updatedEntry.duration = (leftMin + rightMin) * 60;
      updatedEntry.details.leftDuration = leftMin * 60;
      updatedEntry.details.rightDuration = rightMin * 60;
      
      if (leftMin > 0 && rightMin > 0) updatedEntry.details.breastSide = 'both';
      else if (leftMin > 0) updatedEntry.details.breastSide = 'left';
      else updatedEntry.details.breastSide = 'right';
    } 
    else if (method === 'bottle') {
      updatedEntry.duration = 15 * 60;
      updatedEntry.details.bottleType = elements.editBottleContent.value;
      
      let vol = parseFloat(elements.editBottleVolume.value) || 0;
      if (state.prefs.volumeUnit === 'oz') vol = Conversions.ozToMl(vol);
      updatedEntry.details.volume = vol;
    } 
    else if (method === 'solids') {
      updatedEntry.duration = 15 * 60;
      updatedEntry.details.foodType = elements.editSolidFood.value;
    }
    
    updatedEntry.endTime = new Date(new Date(startTime).getTime() + (updatedEntry.duration || 0) * 1000).toISOString();
  } 
  else if (type === 'diaper') {
    updatedEntry.details.diaperType = elements.editDiaperType.value;
  } 
  else if (type === 'sleep') {
    const endTime = new Date(elements.editSleepEndTime.value).toISOString();
    if (new Date(endTime) <= new Date(startTime)) {
      showToast('Wake time must be after sleep time!', 'danger');
      return;
    }
    updatedEntry.endTime = endTime;
    updatedEntry.duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
  } 
  else if (type === 'growth') {
    let wt = parseFloat(elements.editGrowthWeight.value) || 0;
    let ht = parseFloat(elements.editGrowthHeight.value) || 0;
    let hd = parseFloat(elements.editGrowthHead.value) || 0;

    if (state.prefs.weightUnit === 'lbs') wt = Conversions.lbsToKg(wt);
    if (state.prefs.lengthUnit === 'in') {
      ht = Conversions.inToCm(ht);
      hd = Conversions.inToCm(hd);
    }

    updatedEntry.details.weight = wt;
    updatedEntry.details.height = ht;
    updatedEntry.details.headCircumference = hd;
  }

  updateLogEntry(updatedEntry);
  showToast('Entry modified successfully!', 'success');
  elements.editModal.classList.remove('active');
  dataChanged();
}

/**
 * Advanced Filtering & Data Queries (Individually Querying Volume and Frequencies)
 */
function runAdvancedQuery() {
  const preset = elements.queryDatePreset.value;
  const timeOfDay = elements.queryTimeOfDay.value;
  
  const queryBreast = elements.qFeedBreast.checked;
  const queryBottle = elements.qFeedBottle.checked;
  const querySolids = elements.qFeedSolids.checked;
  
  const minVol = parseFloat(elements.queryMinVolume.value) || 0;
  const maxVol = parseFloat(elements.queryMaxVolume.value) || Infinity;
  const keyword = elements.queryKeyword.value.toLowerCase().trim();

  // Bounds for date range calculation
  let startBound = new Date(0); // far past
  let endBound = new Date(); // now

  const today = new Date();
  today.setHours(0,0,0,0);

  if (preset === 'today') {
    startBound = today;
  } 
  else if (preset === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0,0,0,0);
    startBound = d;
  } 
  else if (preset === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0,0,0,0);
    startBound = d;
  } 
  else if (preset === 'custom') {
    if (elements.queryStartDate.value) {
      startBound = new Date(elements.queryStartDate.value + 'T00:00:00');
    }
    if (elements.queryEndDate.value) {
      endBound = new Date(elements.queryEndDate.value + 'T23:59:59');
    }
  }

  // Filter logs list based on query parameters
  const matchingFeeds = state.logs.filter(log => {
    // 1. Must be feeding
    if (log.type !== 'feeding') return false;

    // 2. Date Bounds
    const logTime = new Date(log.startTime);
    if (logTime < startBound || logTime > endBound) return false;

    // 3. Time of Day Bounds
    const hour = logTime.getHours();
    if (timeOfDay === 'morning' && (hour < 6 || hour >= 12)) return false;
    if (timeOfDay === 'afternoon' && (hour < 12 || hour >= 18)) return false;
    if (timeOfDay === 'evening' && (hour < 18 || hour >= 24)) return false;
    if (timeOfDay === 'night' && (hour < 0 || hour >= 6)) return false;

    // 4. Feeding Type checks
    const ft = log.details.feedType;
    if (ft === 'breast' && !queryBreast) return false;
    if (ft === 'bottle' && !queryBottle) return false;
    if (ft === 'solids' && !querySolids) return false;

    // 5. Volume filters (bottle feeds only)
    if (ft === 'bottle') {
      let vol = log.details.volume || 0;
      if (state.prefs.volumeUnit === 'oz') {
        vol = Conversions.mlToOz(vol);
      }
      if (vol < minVol || vol > maxVol) return false;
    } else {
      // If querying specifically for volume, filter out breast/solids that have no volume
      if (minVol > 0) return false;
    }

    // 6. Keywords notes matching
    if (keyword !== '') {
      const notes = (log.details.notes || '').toLowerCase();
      const food = (log.details.foodType || '').toLowerCase();
      if (!notes.includes(keyword) && !food.includes(keyword)) return false;
    }

    return true;
  });

  // Calculate Matching Query Statistics
  const count = matchingFeeds.length;
  elements.qResultCount.textContent = count;

  // Average Feeding Frequency (Sessions per day inside matching dates)
  const timeSpanMs = Math.abs(endBound - startBound);
  const timeSpanDays = Math.ceil(timeSpanMs / (1000 * 60 * 60 * 24)) || 1;
  const dailyFreq = Math.round((count / timeSpanDays) * 10) / 10;
  elements.qResultFrequency.textContent = `Avg: ${dailyFreq} feeds / day`;

  // Volumes Sum & Averages
  let totalVolMl = 0;
  let bottleCount = 0;
  matchingFeeds.forEach(feed => {
    if (feed.details.feedType === 'bottle' && feed.details.volume) {
      totalVolMl += feed.details.volume;
      bottleCount++;
    }
  });

  const volUnit = state.prefs.volumeUnit;
  let displayTotalVol = totalVolMl;
  if (volUnit === 'oz') displayTotalVol = Conversions.mlToOz(totalVolMl);
  elements.qResultTotalVolume.textContent = `${displayTotalVol} ${volUnit}`;

  const avgVol = bottleCount > 0 ? Math.round((displayTotalVol / bottleCount) * 10) / 10 : 0;
  elements.qResultAvgVolume.textContent = `Avg: ${avgVol} ${volUnit} (${bottleCount} bottle feeds)`;

  // Average time interval between feeds
  if (count > 1) {
    // Sort chronological to find intervals
    const cronFeeds = [...matchingFeeds].sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
    let totalIntervalMs = 0;
    for (let i = 1; i < cronFeeds.length; i++) {
      totalIntervalMs += (new Date(cronFeeds[i].startTime) - new Date(cronFeeds[i-1].startTime));
    }
    const avgIntervalMs = totalIntervalMs / (count - 1);
    const avgHrs = Math.floor(avgIntervalMs / (1000 * 60 * 60));
    const avgMins = Math.round((avgIntervalMs % (1000 * 60 * 60)) / (1000 * 60));
    elements.qResultAvgInterval.textContent = `${avgHrs}h ${avgMins}m`;
  } else {
    elements.qResultAvgInterval.textContent = '--';
  }

  // Populate Query Results table list
  elements.queryResultsTableBody.innerHTML = '';
  if (count === 0) {
    elements.queryEmptyState.style.display = 'flex';
  } else {
    elements.queryEmptyState.style.display = 'none';
    
    // Sort query list by newest first
    matchingFeeds.forEach(feed => {
      const feedDate = new Date(feed.startTime);
      const dateFormatted = feedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeFormatted = feedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let typeBadge = '';
      let quant = '';
      if (feed.details.feedType === 'breast') {
        typeBadge = `<span class="row-badge badge-feeding">BREAST</span>`;
        quant = `${Math.round(feed.duration / 60)} min (${feed.details.breastSide})`;
      } else if (feed.details.feedType === 'bottle') {
        typeBadge = `<span class="row-badge badge-feeding">BOTTLE</span>`;
        let volVal = feed.details.volume;
        if (volUnit === 'oz') volVal = Conversions.mlToOz(volVal);
        quant = `${volVal} ${volUnit} (${feed.details.bottleType === 'formula' ? 'Formula' : 'EBM'})`;
      } else {
        typeBadge = `<span class="row-badge badge-feeding">SOLIDS</span>`;
        quant = feed.details.foodType;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 500;">${dateFormatted}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted}</div>
        </td>
        <td>${typeBadge}</td>
        <td><strong>${quant}</strong></td>
        <td style="color: var(--text-muted); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${feed.details.notes || ''}">
          ${feed.details.notes || '--'}
        </td>
      `;
      elements.queryResultsTableBody.appendChild(tr);
    });
  }

  // Trigger scatter plot redraw
  renderQueryScatterChart(matchingFeeds, state.prefs);
}

/**
 * Toast Notifications Engine
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  else if (type === 'danger') iconName = 'alert-triangle';
  else if (type === 'warning') iconName = 'alert-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);
  lucide.createIcons();

  // Remove toast after duration
  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
