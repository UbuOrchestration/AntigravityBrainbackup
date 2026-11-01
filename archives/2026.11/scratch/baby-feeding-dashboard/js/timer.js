/**
 * timer.js - Real-time timers for feeds and sleep
 * Features localStorage backing to persist timers across browser reloads
 */

const TIMER_KEYS = {
  FEED: 'nurture_active_feed_timer',
  SLEEP: 'nurture_active_sleep_timer'
};

// Local cache for intervals
let feedInterval = null;
let sleepInterval = null;

// Callbacks to update UI
let feedTimerCallback = null;
let sleepTimerCallback = null;

/**
 * Format seconds into MM:SS or HH:MM:SS
 */
function formatTimerDisplay(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Get active feed timer state from localStorage
 */
function getActiveFeedTimer() {
  const raw = localStorage.getItem(TIMER_KEYS.FEED);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Get active sleep timer state from localStorage
 */
function getActiveSleepTimer() {
  const raw = localStorage.getItem(TIMER_KEYS.SLEEP);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Start/Resume Feed Timer
 */
function startFeedTimer(side, onTick) {
  if (onTick) feedTimerCallback = onTick;
  
  let state = getActiveFeedTimer();
  const now = Date.now();
  
  if (!state) {
    // New timer
    state = {
      startTime: now,
      side: side,
      accumulatedSeconds: 0,
      isPaused: false,
      lastStartedTime: now
    };
  } else {
    // Resuming timer
    state.side = side; // allow changing side on resume if desired
    if (state.isPaused) {
      state.isPaused = false;
      state.lastStartedTime = now;
    }
  }

  localStorage.setItem(TIMER_KEYS.FEED, JSON.stringify(state));
  
  // Start interval
  if (feedInterval) clearInterval(feedInterval);
  
  feedInterval = setInterval(() => {
    const elapsed = calculateFeedElapsed(state);
    if (feedTimerCallback) feedTimerCallback(elapsed, state.side);
  }, 500);

  // Initial trigger
  if (feedTimerCallback) {
    feedTimerCallback(calculateFeedElapsed(state), state.side);
  }
}

/**
 * Pause Feed Timer
 */
function pauseFeedTimer() {
  const state = getActiveFeedTimer();
  if (!state || state.isPaused) return;

  const now = Date.now();
  state.accumulatedSeconds += Math.floor((now - state.lastStartedTime) / 1000);
  state.isPaused = true;
  state.lastStartedTime = null;

  localStorage.setItem(TIMER_KEYS.FEED, JSON.stringify(state));
  
  if (feedInterval) {
    clearInterval(feedInterval);
    feedInterval = null;
  }
  
  return calculateFeedElapsed(state);
}

/**
 * Stop and Clear Feed Timer
 * Returns final elapsed seconds and the side
 */
function stopFeedTimer() {
  const state = getActiveFeedTimer();
  if (feedInterval) {
    clearInterval(feedInterval);
    feedInterval = null;
  }
  localStorage.removeItem(TIMER_KEYS.FEED);
  
  if (!state) return { elapsed: 0, side: 'both', startTime: new Date().toISOString() };

  let elapsed = state.accumulatedSeconds;
  if (!state.isPaused && state.lastStartedTime) {
    elapsed += Math.floor((Date.now() - state.lastStartedTime) / 1000);
  }

  return {
    elapsed: elapsed,
    side: state.side,
    startTime: new Date(state.startTime).toISOString(),
    endTime: new Date().toISOString()
  };
}

/**
 * Calculate current elapsed seconds for feeding state
 */
function calculateFeedElapsed(state) {
  let elapsed = state.accumulatedSeconds;
  if (!state.isPaused && state.lastStartedTime) {
    elapsed += Math.floor((Date.now() - state.lastStartedTime) / 1000);
  }
  return elapsed;
}

/**
 * Start Sleep Timer
 */
function startSleepTimer(onTick) {
  if (onTick) sleepTimerCallback = onTick;
  
  let state = getActiveSleepTimer();
  const now = Date.now();
  
  if (!state) {
    state = {
      startTime: now
    };
    localStorage.setItem(TIMER_KEYS.SLEEP, JSON.stringify(state));
  }

  if (sleepInterval) clearInterval(sleepInterval);
  
  sleepInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    if (sleepTimerCallback) sleepTimerCallback(elapsed);
  }, 1000);
  
  if (sleepTimerCallback) {
    sleepTimerCallback(Math.floor((Date.now() - state.startTime) / 1000));
  }
}

/**
 * Stop Sleep Timer
 * Returns final elapsed seconds and startTime/endTime
 */
function stopSleepTimer() {
  const state = getActiveSleepTimer();
  if (sleepInterval) {
    clearInterval(sleepInterval);
    sleepInterval = null;
  }
  localStorage.removeItem(TIMER_KEYS.SLEEP);

  if (!state) return { elapsed: 0, startTime: new Date().toISOString(), endTime: new Date().toISOString() };

  const endTime = Date.now();
  const elapsed = Math.floor((endTime - state.startTime) / 1000);

  return {
    elapsed: elapsed,
    startTime: new Date(state.startTime).toISOString(),
    endTime: new Date(endTime).toISOString()
  };
}

/**
 * Restore active timers on page load
 */
function restoreActiveTimers(onFeedTick, onSleepTick) {
  const feedState = getActiveFeedTimer();
  if (feedState) {
    feedTimerCallback = onFeedTick;
    if (!feedState.isPaused) {
      // Resume running
      startFeedTimer(feedState.side, onFeedTick);
    } else {
      // Show paused state
      const elapsed = calculateFeedElapsed(feedState);
      if (onFeedTick) onFeedTick(elapsed, feedState.side, true);
    }
  }

  const sleepState = getActiveSleepTimer();
  if (sleepState) {
    startSleepTimer(onSleepTick);
  }
}
