const https = require('https');
const path = require('path');
const fs = require('fs');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Drive time estimates from zip 32825 (East Orlando)
function estimateDriveFrom32825(locationStr = '') {
  const loc = locationStr.toLowerCase();
  if (loc.includes('avalon') || loc.includes('waterford') || loc.includes('curry ford') || loc.includes('32825') || loc.includes('32828')) {
    return '10-15 mins';
  }
  if (loc.includes('baldwin') || loc.includes('winter park') || loc.includes('mills') || loc.includes('lake eola') || loc.includes('downtown orlando') || loc.includes('audubon')) {
    return '20-25 mins';
  }
  if (loc.includes('lake nona') || loc.includes('boxi park') || loc.includes('narcoossee') || loc.includes('oviedo')) {
    return '25-30 mins';
  }
  if (loc.includes('winter garden') || loc.includes('altamonte') || loc.includes('kissimmee') || loc.includes('sanford') || loc.includes('clermont')) {
    return '35-45 mins';
  }
  return '20-35 mins';
}

// Calculates exact Friday, Saturday, Sunday dates for the subject weekend
function getSubjectWeekend(refDate = new Date()) {
  const d = new Date(refDate);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  
  let friday = new Date(d);
  if (dayOfWeek === 5) {
    // Current day is Friday
    friday = new Date(d);
  } else if (dayOfWeek === 6) {
    // Current day is Saturday (subject Friday was yesterday)
    friday.setDate(d.getDate() - 1);
  } else if (dayOfWeek === 0) {
    // Current day is Sunday (subject Friday was 2 days ago)
    friday.setDate(d.getDate() - 2);
  } else {
    // Monday through Thursday: upcoming Friday
    friday.setDate(d.getDate() + (5 - dayOfWeek));
  }
  
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const fridayStr = formatDateISO(friday);
  const saturdayStr = formatDateISO(saturday);
  const sundayStr = formatDateISO(sunday);

  const formatShort = (dateObj) => dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatHeader = `${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return {
    friday,
    saturday,
    sunday,
    fridayStr,
    saturdayStr,
    sundayStr,
    weekendDates: [fridayStr, saturdayStr, sundayStr],
    dateLabels: {
      [fridayStr]: formatShort(friday),
      [saturdayStr]: formatShort(saturday),
      [sundayStr]: formatShort(sunday)
    },
    headerLabel: formatHeader
  };
}

// Ongoing, trusted outdoor & family weekend staples in Central FL (within 45 mins of 32825)
function getStaplePicksForWeekend(weekend) {
  const staples = [
    {
      name: "Winter Park Farmers' Market",
      category: "Outdoor Market & Stroll",
      schedule: `Saturday, ${weekend.saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (8:00 AM – 1:00 PM)`,
      location: "Central Park West Meadow, Winter Park",
      driveTime: "20-25 mins",
      strollerFriendly: true,
      description: "Central Florida's top open-air market. Shady live oaks, fresh baked goods, artisan coffees, plants, and farm goods. Highly stroller-friendly.",
      url: "https://cityofwinterpark.org/departments/parks-recreation/farmers-market/"
    },
    {
      name: "Orlando Farmers Market at Lake Eola",
      category: "Outdoor Festival & Lake Walk",
      schedule: `Sunday, ${weekend.sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (10:00 AM – 3:00 PM)`,
      location: "Lake Eola Park (Southeast Corner / Eola Dr)",
      driveTime: "20-25 mins",
      strollerFriendly: true,
      description: "Lakefront market with local food trucks, seasonal artisans, fresh juices, and live music. Perfect for walking the 0.9-mile paved lake loop to see the swans.",
      url: "https://www.orlandofarmersmarket.com/"
    },
    {
      name: "Boxi Park Open-Air Family Lawn (Lake Nona)",
      category: "Outdoor Food Hall & Green Space",
      schedule: `Saturday & Sunday, ${weekend.saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekend.sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Opens 12:00 PM)`,
      location: "6877 Tavistock Lakes Blvd, Lake Nona",
      driveTime: "25-30 mins",
      strollerFriendly: true,
      description: "Open-air dining and live music district built from shipping containers. Large turf yard, shade canopies, family games, and casual food counters.",
      url: "https://boxiparklakenona.com/"
    },
    {
      name: "Avalon Park Town Center Weekend Stroll",
      category: "Neighborhood Family Gathering",
      schedule: `Saturday & Sunday Daytime`,
      location: "Downtown Avalon Park (3651 Avalon Park E Blvd)",
      driveTime: "10-15 mins",
      strollerFriendly: true,
      description: "Right next door in East Orlando. Wide brick sidewalks, fountain lake loop, casual cafes, and weekend artisan pop-ups.",
      url: "https://www.avalonparkorlando.com/"
    },
    {
      name: "Harry P. Leu Gardens Weekend Exploration",
      category: "Outdoor Nature & Botanical Adventure",
      schedule: `Saturday & Sunday, ${weekend.saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekend.sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (9:00 AM – 5:00 PM)`,
      location: "1920 N Forest Ave, Orlando",
      driveTime: "20-25 mins",
      strollerFriendly: true,
      description: "50-acre botanical oasis with miles of paved, shady walking paths under ancient oaks and subtropical flora. Quiet, peaceful, and effortless with a stroller.",
      url: "https://www.leugardens.org/"
    }
  ];

  // Rotate to show top 3 each week
  const weekNumber = Math.floor(weekend.friday.getTime() / (1000 * 60 * 60 * 24 * 7));
  return [...staples].sort((a, b) => {
    return (a.name.charCodeAt(0) + weekNumber) % 5 - (b.name.charCodeAt(0) + weekNumber) % 5;
  }).slice(0, 3);
}

async function scanLiveEvents(weekend) {
  const sources = [
    'https://www.eventbrite.com/d/fl--orlando/festivals/',
    'https://www.eventbrite.com/d/fl--orlando/outdoor--events/',
    'https://www.eventbrite.com/d/fl--orlando/family--events/'
  ];

  const scrapedEvents = [];

  for (const url of sources) {
    try {
      const data = await fetchPage(url);
      const jsonLdMatches = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        jsonLdMatches.forEach(block => {
          const raw = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          try {
            const parsed = JSON.parse(raw);
            if (parsed.itemListElement) {
              parsed.itemListElement.forEach(item => {
                const ev = item.item || item;
                if (!ev || !ev.name || !ev.startDate) return;

                const name = ev.name.trim();
                const startDateStr = ev.startDate.slice(0, 10); // YYYY-MM-DD

                // STRICT DATE FILTER: Only include events occurring on Friday, Saturday, or Sunday of THIS SUBJECT WEEKEND!
                const isExactWeekend = weekend.weekendDates.includes(startDateStr);
                if (!isExactWeekend) return;

                const locName = ev.location?.name || ev.location?.address?.addressLocality || 'Orlando Area';
                const eventUrl = ev.url || '';

                // Filter out irrelevant, indoor seminar, or adult-oriented events
                const lower = name.toLowerCase();
                const isAdult = lower.includes('bar crawl') || lower.includes('club') || lower.includes('nightclub') || lower.includes('pub crawl') || lower.includes('21+') || lower.includes('hookah') || lower.includes('party') || lower.includes('wasted');
                const isSeminar = lower.includes('round table') || lower.includes('mental health') || lower.includes('networking') || lower.includes('conference') || lower.includes('symposium') || lower.includes('lecture') || lower.includes('seminar') || lower.includes('webinar') || lower.includes('house in order') || (lower.includes('class') && !lower.includes('farm'));

                if (!isAdult && !isSeminar) {
                  const scheduleLabel = weekend.dateLabels[startDateStr] || startDateStr;

                  scrapedEvents.push({
                    name: name,
                    category: lower.includes('market') ? 'Outdoor Market' : (lower.includes('fest') ? 'Festival' : (lower.includes('farm') ? 'Farm Outing' : 'Outdoor Family Event')),
                    schedule: scheduleLabel,
                    dateISO: startDateStr,
                    location: locName,
                    driveTime: estimateDriveFrom32825(locName),
                    strollerFriendly: true,
                    description: `Special event in ${locName} happening this weekend. Child-friendly and accessible within the Orlando area.`,
                    url: eventUrl
                  });
                }
              });
            }
          } catch (e) {}
        });
      }
    } catch (e) {
      console.error(`Error scanning ${url}:`, e.message);
    }
  }

  // Deduplicate by name
  const seen = new Set();
  const uniqueScraped = [];
  for (const ev of scrapedEvents) {
    const key = ev.name.toLowerCase().slice(0, 20);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueScraped.push(ev);
    }
  }

  return uniqueScraped;
}

async function getWeekendFestivities(refDate = new Date()) {
  const weekend = getSubjectWeekend(refDate);
  const liveEvents = await scanLiveEvents(weekend);
  const staplePicks = getStaplePicksForWeekend(weekend);

  return {
    weekend: weekend,
    headerLabel: weekend.headerLabel,
    liveEvents: liveEvents.slice(0, 3),
    staplePicks: staplePicks
  };
}

module.exports = {
  getWeekendFestivities,
  getSubjectWeekend
};
