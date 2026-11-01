const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'partner_profile.json');
const ideasPath = path.join(__dirname, '..', 'data', 'ideas_bank.json');
const historyPath = path.join(__dirname, '..', 'data', 'history.json');

const PARTNER_TIPS = [
  "True presence isn't just being in the same room—it's putting away distractions and giving her your full, uninterrupted focus.",
  "When she expresses fatigue, don't try to fix it immediately. Simply validate her feelings first: 'I hear you, and that sounds exhausting.'",
  "A small, consistent gesture done daily builds far more emotional intimacy over time than grand gestures once in a while.",
  "Anticipate her needs before she has to ask. Asking 'What can I do to help?' still leaves mental load on her. Taking action directly relieves it.",
  "Stay-at-home parenting can feel isolating. Simply asking about her thoughts and listening intently makes her feel seen and connected.",
  "Affirmation is most powerful when it praises her character and daily patience, not just domestic output.",
  "Small physical touchpoints—a gentle hand on her back, a quiet kiss on the forehead—re-anchor romance during busy days.",
  "Protecting her quiet unwind time without making her feel guilty is one of the highest forms of care you can provide."
];

const COMMUTE_TIPS = [
  "The first 5 minutes through the front door set the emotional climate for the rest of the night. Enter with calm, ready energy.",
  "She has been touched and demanded of all day. Don't expect conversation right away—offer immediate arms-free baby relief first.",
  "Hunger magnifies evening fatigue. Triage dinner first so neither of you is running on empty while handling a fussy baby.",
  "Holding the baby so she gets to eat her dinner while it's piping hot with two hands is pure luxury for a full-time mom.",
  "Leave work stress in the driveway. Take 3 slow breaths before stepping inside so you enter as an aligned, grounding partner.",
  "If she feels overwhelmed or short, it's sensory fatigue from 10 hours of baby crying. Meet it with steady gentleness, not defense.",
  "Tonight is about teamwork: get through dinner together, knock out dishes, soothe baby, and protect quiet evening wind-down."
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

// Morning Briefing Generator (10 AM - 12 PM)
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

  // 2. Select Gesture ensuring NO repeat until pool exhausted
  const categoryPool = bank.micro_gestures[category] || [];
  const sentIds = history.sent_log.map(item => item.id);
  
  let availableGestures = categoryPool.filter(g => !sentIds.includes(g.id));
  if (availableGestures.length === 0) {
    availableGestures = categoryPool;
  }

  const selectedGesture = availableGestures[Math.floor(Math.random() * availableGestures.length)];

  // 3. Weekend Date Ideas (on Wednesday / Thursday) - 100% low-friction at-home or routine
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

// Evening Commute Briefing Generator (5:30 PM Weekdays)
function getCommuteBriefing() {
  const profile = loadJSON(configPath);
  const bank = loadJSON(ideasPath);
  const history = loadJSON(historyPath);
  if (!history.commute_sent_log) history.commute_sent_log = [];

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const commutePool = bank.commute_evening_focus || [];
  const sentIds = history.commute_sent_log.map(item => item.id);

  let availableFocus = commutePool.filter(g => !sentIds.includes(g.id));
  if (availableFocus.length === 0) {
    availableFocus = commutePool;
  }

  const selectedFocus = availableFocus[Math.floor(Math.random() * availableFocus.length)];

  const tipIdx = history.commute_sent_log.length % COMMUTE_TIPS.length;
  const commuteTip = COMMUTE_TIPS[tipIdx];

  return {
    dateStr: formattedDate,
    dayOfWeek: dayOfWeek,
    focus: selectedFocus,
    commuteTip: commuteTip,
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

function recordSentCommuteBriefing(briefing) {
  const history = loadJSON(historyPath);
  if (!history.commute_sent_log) history.commute_sent_log = [];

  history.commute_sent_log.push({
    date: new Date().toISOString(),
    id: briefing.focus.id,
    title: briefing.focus.title
  });

  saveJSON(historyPath, history);
}

module.exports = {
  getNextBriefing,
  getCommuteBriefing,
  recordSentBriefing,
  recordSentCommuteBriefing
};
