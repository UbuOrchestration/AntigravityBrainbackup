const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'partner_profile.json');
const ideasPath = path.join(__dirname, '..', 'data', 'ideas_bank.json');
const historyPath = path.join(__dirname, '..', 'data', 'history.json');

const PARTNER_TIPS = [
  "True presence isn't just being in the same room—it's putting away distractions and giving her your full, uninterrupted focus for 10 solid minutes.",
  "When she expresses fatigue, don't try to fix it immediately. Simply validate her feelings first: 'I hear you, and that sounds so exhausting.'",
  "A small, consistent gesture done daily builds far more emotional intimacy over time than a single grand gesture once a year.",
  "Anticipate her needs before she has to ask. Asking 'What can I do to help?' still leaves mental load on her. Taking action directly relieves it.",
  "Your physical entrance when walking through the door sets the emotional tone for the entire evening. Bring warmth, calm, and ready arms.",
  "Stay-at-home parenting can feel isolating. Simply asking about her day's thoughts and listening intently makes her feel seen and connected.",
  "Affirmation is most powerful when it praises her character and daily effort, not just outcomes.",
  "Small physical touchpoints—a gentle hand on her lower back, a quiet kiss on the forehead—re-anchor romance during busy days.",
  "Protecting her quiet unwind time without making her feel guilty is one of the highest forms of care you can provide.",
  "Keep your mutual health & well-being goals fun and encouraging. Celebrate small daily wins together."
];

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function calculateDaysUntil(monthDayStr) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [m, d] = monthDayStr.split('-').map(Number);
  
  let target = new Date(currentYear, m - 1, d);
  if (target < now) {
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

  // 1. Determine Category Rotation across 5 categories
  const categories = [
    'acts_of_service',
    'words_of_affirmation',
    'creative_home_experiences',
    'thoughtful_surprises_and_treats',
    'conversational_prompts_and_questions'
  ];

  const lastCategory = history.sent_log.length > 0 ? history.sent_log[history.sent_log.length - 1].category : null;
  let categoryIdx = categories.indexOf(lastCategory);
  if (categoryIdx === -1) categoryIdx = 0;
  else categoryIdx = (categoryIdx + 1) % categories.length;

  const category = categories[categoryIdx];

  // 2. Select Gesture from category ensuring NO repeat until pool exhausted
  const categoryPool = bank.micro_gestures[category] || [];
  const sentIds = history.sent_log.map(item => item.id);
  
  let availableGestures = categoryPool.filter(g => !sentIds.includes(g.id));
  if (availableGestures.length === 0) {
    // If all items in this category have been used, reset for this category
    availableGestures = categoryPool;
  }

  const selectedGesture = availableGestures[Math.floor(Math.random() * availableGestures.length)];

  // 3. Weekend Date Ideas (on Wednesday / Thursday)
  const isDatePlanningDay = profile.reminder_preferences.weekend_date_planning_days.includes(dayOfWeek);
  let dateIdeas = [];
  if (isDatePlanningDay) {
    const allDates = bank.date_ideas || [];
    const usedDateTitles = (history.date_ideas_proposed || []).flatMap(d => d.ideas || []);
    let unusedDates = allDates.filter(d => !usedDateTitles.includes(d.title));
    if (unusedDates.length < 2) unusedDates = allDates;
    const shuffled = [...unusedDates].sort(() => 0.5 - Math.random());
    dateIdeas = shuffled.slice(0, 2);
  }

  // 4. Select Daily Partner Mindset Tip
  const tipIdx = history.sent_log.length % PARTNER_TIPS.length;
  const dailyTip = PARTNER_TIPS[tipIdx];

  // 5. Calculate Countdowns
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
    dailyTip: dailyTip,
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
