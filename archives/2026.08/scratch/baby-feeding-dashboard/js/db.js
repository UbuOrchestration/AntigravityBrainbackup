/**
 * db.js - Data storage, retrieval, and conversion logic
 * Backed by LocalStorage with local API server synchronization
 */

const STORAGE_KEYS = {
  LOGS: 'baby_feeding_logs',
  PROFILE: 'baby_profile_settings',
  PREFERENCES: 'baby_dashboard_prefs'
};

// Default profile information
const DEFAULT_PROFILE = {
  name: 'Leo',
  birthdate: '2026-02-15', // approx 6 months old on Aug 2026
  weight: 7.2, // kg
  height: 66, // cm
  headCircumference: 43 // cm
};

// Default preferences
const DEFAULT_PREFS = {
  volumeUnit: 'ml', // 'ml' or 'oz'
  weightUnit: 'kg', // 'kg' or 'lbs'
  lengthUnit: 'cm', // 'cm' or 'in'
  theme: 'light' // 'light' or 'dark'
};

/**
 * Initialize storage with default data if not already set,
 * attempting to synchronize with API server if online
 */
async function initDB() {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const serverData = await res.json();
      
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(serverData.profile || DEFAULT_PROFILE));
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(serverData.prefs || DEFAULT_PREFS));
      
      if (serverData.logs && serverData.logs.length > 0) {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(serverData.logs));
      } else {
        // Generate mock data on first launch
        generateMockData();
        const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
        // Sync generated mock data back to server
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: serverData.profile || DEFAULT_PROFILE,
            prefs: serverData.prefs || DEFAULT_PREFS,
            logs: logs
          })
        });
      }
      console.log('Database synchronized with local server API.');
      return;
    }
  } catch (err) {
    console.warn('API server offline. Falling back to LocalStorage-only mode.');
  }

  // LocalStorage Fallback
  if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PREFERENCES)) {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(DEFAULT_PREFS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS) || JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)).length === 0) {
    generateMockData();
  }
}

/**
 * Get all logs sorted by timestamp descending (newest first)
 */
function getLogs() {
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
  return logs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
}

/**
 * Save new logs list
 */
function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  
  // Async Sync complete state back to server
  const profile = getProfile();
  const prefs = getPrefs();
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, logs, prefs })
  }).catch(e => console.warn('Could not sync logs to API server:', e));
}

/**
 * Add a new log entry
 */
function addLogEntry(entry) {
  const logs = getLogs();
  entry.id = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  entry.createdAt = new Date().toISOString();
  logs.push(entry);
  
  // Save locally
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  
  // Async sync to server
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).catch(e => console.warn('Could not sync log addition:', e));

  return entry;
}

/**
 * Update an existing log entry
 */
function updateLogEntry(updatedEntry) {
  const logs = getLogs();
  const index = logs.findIndex(log => log.id === updatedEntry.id);
  if (index !== -1) {
    logs[index] = { ...logs[index], ...updatedEntry, updatedAt: new Date().toISOString() };
    
    // Save locally
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    
    // Async sync to server
    fetch('/api/logs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEntry)
    }).catch(e => console.warn('Could not sync log update:', e));

    return true;
  }
  return false;
}

/**
 * Delete a log entry
 */
function deleteLogEntry(id) {
  const logs = getLogs();
  const filtered = logs.filter(log => log.id !== id);
  
  // Save locally
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(filtered));
  
  // Async sync to server
  fetch(`/api/logs/${id}`, {
    method: 'DELETE'
  }).catch(e => console.warn('Could not sync log delete:', e));
}

/**
 * Get Baby Profile Settings
 */
function getProfile() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE)) || DEFAULT_PROFILE;
}

/**
 * Save Baby Profile Settings
 */
function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  
  // Async sync to server
  fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  }).catch(e => console.warn('Could not sync profile settings:', e));
}

/**
 * Get User Preferences
 */
function getPrefs() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES)) || DEFAULT_PREFS;
}

/**
 * Save User Preferences
 */
function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));

  // Async sync to server
  fetch('/api/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  }).catch(e => console.warn('Could not sync preferences:', e));
}

/**
 * Unit conversion helper functions
 */
const Conversions = {
  mlToOz: (ml) => Math.round((ml * 0.033814) * 10) / 10,
  ozToMl: (oz) => Math.round(oz / 0.033814),
  kgToLbs: (kg) => Math.round((kg * 2.20462) * 10) / 10,
  lbsToKg: (lbs) => Math.round((lbs / 2.20462) * 10) / 10,
  cmToIn: (cm) => Math.round((cm * 0.393701) * 10) / 10,
  inToCm: (inVal) => Math.round((inVal / 0.393701) * 10) / 10
};

/**
 * Generate 7 days of realistic mock data for visualization and demo purposes
 */
function generateMockData() {
  const logs = [];
  const now = new Date();
  
  const relativeDate = (daysAgo, hour, minute) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  for (let i = 6; i >= 0; i--) {
    if (Math.random() > 0.3) {
      logs.push({
        id: `mock_feed_night_${i}`,
        type: 'feeding',
        startTime: relativeDate(i, 3, 15),
        endTime: relativeDate(i, 3, 30),
        duration: 900,
        createdAt: relativeDate(i, 3, 30),
        details: {
          feedType: 'bottle',
          bottleType: 'breastmilk',
          volume: 110 + Math.floor(Math.random() * 30),
          notes: 'Woke up hungry, fed quickly.'
        }
      });
    }

    const morningLeft = 300 + Math.floor(Math.random() * 180);
    const morningRight = 360 + Math.floor(Math.random() * 180);
    logs.push({
      id: `mock_feed_morning_${i}`,
      type: 'feeding',
      startTime: relativeDate(i, 7, 0),
      endTime: relativeDate(i, 7, 20),
      duration: morningLeft + morningRight,
      createdAt: relativeDate(i, 7, 20),
      details: {
        feedType: 'breast',
        breastSide: 'both',
        leftDuration: morningLeft,
        rightDuration: morningRight,
        notes: 'Very active morning feed.'
      }
    });

    logs.push({
      id: `mock_feed_midmorn_${i}`,
      type: 'feeding',
      startTime: relativeDate(i, 10, 30),
      endTime: relativeDate(i, 10, 45),
      duration: 900,
      createdAt: relativeDate(i, 10, 45),
      details: {
        feedType: 'bottle',
        bottleType: 'formula',
        volume: 120 + Math.floor(Math.random() * 40),
        notes: 'Drank eagerly.'
      }
    });

    if (i <= 4) {
      logs.push({
        id: `mock_feed_solid_${i}`,
        type: 'feeding',
        startTime: relativeDate(i, 13, 0),
        endTime: relativeDate(i, 13, 15),
        duration: 900,
        createdAt: relativeDate(i, 13, 15),
        details: {
          feedType: 'solids',
          foodType: 'Oatmeal & Pureed Pear',
          notes: 'Ate about 3 spoonfuls.'
        }
      });
    }
    
    const lunchLeft = 400 + Math.floor(Math.random() * 100);
    logs.push({
      id: `mock_feed_lunch_${i}`,
      type: 'feeding',
      startTime: relativeDate(i, 13, 45),
      endTime: relativeDate(i, 13, 55),
      duration: lunchLeft,
      createdAt: relativeDate(i, 13, 55),
      details: {
        feedType: 'breast',
        breastSide: 'left',
        leftDuration: lunchLeft,
        rightDuration: 0,
        notes: 'Top-up feed after solids.'
      }
    });

    logs.push({
      id: `mock_feed_afternoon_${i}`,
      type: 'feeding',
      startTime: relativeDate(i, 16, 30),
      endTime: relativeDate(i, 16, 45),
      duration: 900,
      createdAt: relativeDate(i, 16, 45),
      details: {
        feedType: 'bottle',
        bottleType: 'formula',
        volume: 130 + Math.floor(Math.random() * 30),
        notes: 'Finished the bottle.'
      }
    });

    const bedLeft = 480 + Math.floor(Math.random() * 120);
    const bedRight = 480 + Math.floor(Math.random() * 120);
    logs.push({
      id: `mock_feed_bedtime_${i}`,
      type: 'feeding',
      startTime: relativeDate(i, 19, 30),
      endTime: relativeDate(i, 19, 50),
      duration: bedLeft + bedRight,
      createdAt: relativeDate(i, 19, 50),
      details: {
        feedType: 'breast',
        breastSide: 'both',
        leftDuration: bedLeft,
        rightDuration: bedRight,
        notes: 'Fell asleep on breast.'
      }
    });

    logs.push({
      id: `mock_feed_dream_${i}`,
      type: 'feeding',
      startTime: relativeDate(i, 22, 30),
      endTime: relativeDate(i, 22, 45),
      duration: 900,
      createdAt: relativeDate(i, 22, 45),
      details: {
        feedType: 'bottle',
        bottleType: 'breastmilk',
        volume: 120 + Math.floor(Math.random() * 20),
        notes: 'Dreamfeed.'
      }
    });

    logs.push({
      id: `mock_diaper_1_${i}`,
      type: 'diaper',
      startTime: relativeDate(i, 7, 15),
      endTime: relativeDate(i, 7, 15),
      createdAt: relativeDate(i, 7, 15),
      details: { diaperType: 'both', notes: 'Heavy wet and dirty.' }
    });
    logs.push({
      id: `mock_diaper_2_${i}`,
      type: 'diaper',
      startTime: relativeDate(i, 10, 0),
      endTime: relativeDate(i, 10, 0),
      createdAt: relativeDate(i, 10, 0),
      details: { diaperType: 'wet', notes: '' }
    });
    logs.push({
      id: `mock_diaper_3_${i}`,
      type: 'diaper',
      startTime: relativeDate(i, 13, 30),
      endTime: relativeDate(i, 13, 30),
      createdAt: relativeDate(i, 13, 30),
      details: { diaperType: 'wet', notes: 'Medium wet.' }
    });
    if (Math.random() > 0.4) {
      logs.push({
        id: `mock_diaper_4_${i}`,
        type: 'diaper',
        startTime: relativeDate(i, 16, 15),
        endTime: relativeDate(i, 16, 15),
        createdAt: relativeDate(i, 16, 15),
        details: { diaperType: 'dirty', notes: 'Soft stool.' }
      });
    } else {
      logs.push({
        id: `mock_diaper_4_${i}`,
        type: 'diaper',
        startTime: relativeDate(i, 16, 15),
        endTime: relativeDate(i, 16, 15),
        createdAt: relativeDate(i, 16, 15),
        details: { diaperType: 'wet', notes: '' }
      });
    }
    logs.push({
      id: `mock_diaper_5_${i}`,
      type: 'diaper',
      startTime: relativeDate(i, 19, 45),
      endTime: relativeDate(i, 19, 45),
      createdAt: relativeDate(i, 19, 45),
      details: { diaperType: 'wet', notes: 'Before bed change.' }
    });

    logs.push({
      id: `mock_sleep_1_${i}`,
      type: 'sleep',
      startTime: relativeDate(i, 9, 0),
      endTime: relativeDate(i, 10, 15),
      duration: 4500,
      createdAt: relativeDate(i, 10, 15),
      details: { notes: 'Slept in crib.' }
    });
    logs.push({
      id: `mock_sleep_2_${i}`,
      type: 'sleep',
      startTime: relativeDate(i, 14, 15),
      endTime: relativeDate(i, 15, 45),
      duration: 5400,
      createdAt: relativeDate(i, 15, 45),
      details: { notes: 'Contact nap on mom.' }
    });
    logs.push({
      id: `mock_sleep_3_${i}`,
      type: 'sleep',
      startTime: relativeDate(i, 20, 0),
      endTime: relativeDate(i, 6, 45),
      duration: 38700,
      createdAt: relativeDate(i, 6, 45),
      details: { notes: 'Slept well.' }
    });
  }

  logs.push({
    id: 'mock_growth_1',
    type: 'growth',
    startTime: relativeDate(6, 12, 0),
    endTime: relativeDate(6, 12, 0),
    createdAt: relativeDate(6, 12, 0),
    details: {
      weight: 7.05,
      height: 65.5,
      headCircumference: 42.8,
      notes: 'Doctor checkup.'
    }
  });
  
  logs.push({
    id: 'mock_growth_2',
    type: 'growth',
    startTime: relativeDate(1, 12, 0),
    endTime: relativeDate(1, 12, 0),
    createdAt: relativeDate(1, 12, 0),
    details: {
      weight: 7.2,
      height: 66.0,
      headCircumference: 43.0,
      notes: 'Home measurement.'
    }
  });

  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

/**
 * Export data to JSON file download
 */
function exportToJSON() {
  const data = {
    profile: getProfile(),
    logs: getLogs(),
    prefs: getPrefs()
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `baby_tracker_export_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export logs to CSV file download
 */
function exportToCSV() {
  const logs = getLogs();
  const headers = ['ID', 'Type', 'Start Time', 'End Time', 'Duration (s)', 'Feed Type', 'Breast Side', 'Left Duration (s)', 'Right Duration (s)', 'Bottle Type', 'Volume (ml)', 'Food Type', 'Diaper Type', 'Weight (kg)', 'Height (cm)', 'Head Circ (cm)', 'Notes'];
  
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n";
  
  logs.forEach(log => {
    const row = [
      log.id,
      log.type,
      log.startTime,
      log.endTime,
      log.duration || '',
      log.details.feedType || '',
      log.details.breastSide || '',
      log.details.leftDuration || '',
      log.details.rightDuration || '',
      log.details.bottleType || '',
      log.details.volume || '',
      log.details.foodType || '',
      log.details.diaperType || '',
      log.details.weight || '',
      log.details.height || '',
      log.details.headCircumference || '',
      `"${(log.details.notes || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", encodedUri);
  downloadAnchor.setAttribute("download", `baby_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Import data from a JSON file string
 */
function importFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.profile) saveProfile(data.profile);
    if (data.logs) saveLogs(data.logs);
    if (data.prefs) savePrefs(data.prefs);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Clear all local storage data
 */
function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  // Re-init state
  const profile = DEFAULT_PROFILE;
  const prefs = DEFAULT_PREFS;
  generateMockData();
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
  
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, logs, prefs })
  }).catch(e => console.warn('Could not sync database reset:', e));
}
