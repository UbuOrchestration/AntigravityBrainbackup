const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'partner_profile.json');
const ideasPath = path.join(__dirname, '..', 'data', 'ideas_bank.json');
const historyPath = path.join(__dirname, '..', 'data', 'history.json');

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function calculateDaysUntil(monthDayStr) {
  // monthDayStr formatted "MM-DD", e.g. "12-26"
  const now = new Date();
  const currentYear = now.getFullYear();
  const [m, d] = monthDayStr.split('-').map(Number);
  
  let target = new Date(currentYear, m - 1, d);
  if (target < now) {
    // If date has passed this year, set for next year
    target = new Date(currentYear + 1, m - 1, d);
  }
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getNextBriefing() {
  const profile = loadJSON(configPath);
  const bank = loadJSON(ideasPath);
  const history = loadJSON(historyPath);
  if (!history.sent_log) history.sent_log = [];

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Determine category rotation (Acts of Service vs Words of Affirmation)
  const lastGesture = history.sent_log.slice(-1)[0];
  let category = 'acts_of_service';
  if (lastGesture && lastGesture.category === 'acts_of_service') {
    category = 'words_of_affirmation';
  }

  // Get list of recent IDs to avoid repeating
  const recentIds = history.sent_log.slice(-10).map(item => item.id);
  const availableGestures = bank.micro_gestures[category].filter(g => !recentIds.includes(g.id));
  
  // Pick one randomly from available, or reset pool if exhausted
  const pool = availableGestures.length > 0 ? availableGestures : bank.micro_gestures[category];
  const selectedGesture = pool[Math.floor(Math.random() * pool.length)];

  // Determine if today is a date planning day (Wed/Thu or if force requested)
  const isDatePlanningDay = profile.reminder_preferences.weekend_date_planning_days.includes(dayOfWeek);
  let dateIdeas = [];
  if (isDatePlanningDay) {
    // Pick 2 date ideas
    const allDates = bank.date_ideas || [];
    const shuffled = [...allDates].sort(() => 0.5 - Math.random());
    dateIdeas = shuffled.slice(0, 2);
  }

  // Calculate countdowns
  const countdowns = (profile.key_dates || []).map(kd => {
    const daysLeft = calculateDaysUntil(kd.date);
    return {
      event: kd.event,
      formattedDate: kd.formatted,
      daysRemaining: daysLeft,
      notes: kd.notes
    };
  });

  return {
    dateStr: formattedDate,
    dayOfWeek: dayOfWeek,
    category: category,
    micro_gesture: selectedGesture,
    isDatePlanningDay: isDatePlanningDay,
    date_ideas: dateIdeas,
    countdowns: countdowns,
    profile: profile
  };
}

function recordSentBriefing(briefing) {
  const history = loadJSON(historyPath);
  if (!history.sent_log) history.sent_log = [];
  
  history.sent_log.push({
    date: new Date().toISOString(),
    id: briefing.micro_gesture.id,
    category: briefing.category,
    title: briefing.micro_gesture.title
  });

  if (briefing.isDatePlanningDay && briefing.date_ideas.length > 0) {
    if (!history.date_ideas_proposed) history.date_ideas_proposed = [];
    history.date_ideas_proposed.push({
      date: new Date().toISOString(),
      ideas: briefing.date_ideas.map(d => d.title)
    });
  }

  saveJSON(historyPath, history);
}

module.exports = {
  getNextBriefing,
  recordSentBriefing
};
