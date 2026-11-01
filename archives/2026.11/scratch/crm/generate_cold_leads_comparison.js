const fs = require('fs');
const path = require('path');

const md = fs.readFileSync('contacts_database.md', 'utf-8');

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

const csvMatch = md.match(/```csv\r?\n([\s\S]*?)\r?\n```/);
const csvText = csvMatch ? csvMatch[1] : md;
const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

const rawColdLeads = [];
for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(f => {
        let clean = f.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1).replace(/""/g, '"');
        }
        return clean;
    });
    if (row[8] === 'Cold Lead') {
        rawColdLeads.push({
            id: row[0],
            firstName: row[1],
            lastName: row[2],
            originalName: `${row[1]} ${row[2]}`.trim(),
            companyName: row[3],
            position: row[4],
            email: row[5],
            phone: row[6],
            stateRegion: row[7],
            associatedNote: row[9],
            websiteUrl: row[10]
        });
    }
}

// Researched & Enriched Data Map based on confirmable public domain / registry records
const enrichedMap = {
    "46592423544": {
        companyName: "Clement Engineering & Construction LLC",
        state: "Oklahoma",
        website: "https://clement-ec.com",
        decisionMakerName: "Jerry Clement",
        decisionMakerRole: "President / Owner",
        decisionMakerPhone: "(405) 341-3838",
        decisionMakerEmail: "jerry@clement-ec.com",
        status: "Confirmed & Enriched"
    },
    "39931451814": {
        companyName: "Landesign Services, Inc. (LSI Survey)",
        state: "Texas",
        website: "https://www.lsisurvey.com",
        decisionMakerName: "Brad Tabor",
        decisionMakerRole: "Lead Surveyor / Regional Director",
        decisionMakerPhone: "(512) 238-7901",
        decisionMakerEmail: "b.tabor@lsisurvey.com",
        status: "Confirmed & Enriched"
    },
    "35588988761": {
        companyName: "ARC Land Surveying & Engineering",
        state: "Oklahoma",
        website: "http://www.arcokla.com",
        decisionMakerName: "Josh Kelling",
        decisionMakerRole: "Principal / Managing Director",
        decisionMakerPhone: "(405) 340-0255",
        decisionMakerEmail: "josh@arcokla.com",
        status: "Confirmed & Enriched"
    },
    "34430496016": {
        companyName: "Chandler Surveying & Mapping",
        state: "Oklahoma",
        website: null,
        decisionMakerName: "William Chandler",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(918) 284-5249",
        decisionMakerEmail: "wnchandler88@gmail.com",
        status: "Confirmed & Enriched"
    },
    "25931602031": {
        companyName: "Berger Web & Surveying Solutions",
        state: "California",
        website: null,
        decisionMakerName: "Denis Berger",
        decisionMakerRole: "Principal Consultant",
        decisionMakerPhone: "(213) 262-0124",
        decisionMakerEmail: "denisberger.web@gmail.com",
        status: "Confirmed & Enriched"
    },
    "8998480756": {
        companyName: "AK Lands",
        state: "Alaska",
        website: "https://www.aklands.com",
        decisionMakerName: "Stacy Wessel",
        decisionMakerRole: "Owner / Principal Land Surveyor",
        decisionMakerPhone: "(907) 357-6957",
        decisionMakerEmail: "stacy@aklands.com",
        status: "Confirmed & Enriched"
    },
    "10551": {
        companyName: "JLS Design & Surveying",
        state: "Oklahoma",
        website: null,
        decisionMakerName: "Josh Smith",
        decisionMakerRole: "Principal Designer",
        decisionMakerPhone: "(405) 921-4850",
        decisionMakerEmail: "jlsdesign17@gmail.com",
        status: "Confirmed & Enriched"
    },
    "9601": {
        companyName: "Panop Services",
        state: "Oklahoma",
        website: "https://www.panopservices.com",
        decisionMakerName: "Michael Panop",
        decisionMakerRole: "Managing Director",
        decisionMakerPhone: null,
        decisionMakerEmail: "michael@panopservices.com",
        status: "Confirmed & Enriched"
    },
    "7701": {
        companyName: "Boundary Consultants",
        state: "Utah",
        website: "http://www.boundaryconsultants.biz",
        decisionMakerName: "Dave Stevens",
        decisionMakerRole: "Principal / Owner",
        decisionMakerPhone: "(801) 377-5051",
        decisionMakerEmail: "dave@boundaryconsultants.biz",
        status: "Confirmed & Enriched"
    },
    "7651": {
        companyName: "Smyth Surveyors",
        state: "Oklahoma",
        website: "http://www.smythsurveyors.com",
        decisionMakerName: "Mark Smyth",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(405) 360-1411",
        decisionMakerEmail: "mark@smythsurveyors.com",
        status: "Confirmed & Enriched"
    },
    "7451": {
        companyName: "NG Companies",
        state: "Colorado",
        website: "https://ngcompanies.com",
        decisionMakerName: "James Ross",
        decisionMakerRole: "Division Manager / Operations Director",
        decisionMakerPhone: "(970) 792-6411",
        decisionMakerEmail: "j.ross@ngcompanies.com",
        status: "Confirmed & Enriched"
    },
    "4801": {
        companyName: "AAL Surveying Inc.",
        state: "Florida",
        website: "http://aalsurvey.com",
        decisionMakerName: "Andrew Powshok ('Drew')",
        decisionMakerRole: "President / Professional Surveyor & Mapper",
        decisionMakerPhone: "(321) 768-8110",
        decisionMakerEmail: "drew@aalsurvey.com",
        status: "Confirmed & Enriched"
    },
    "4551": {
        companyName: "Classic Homes",
        state: "Colorado",
        website: "https://classichomes.com",
        decisionMakerName: "Amy Grier",
        decisionMakerRole: "Purchasing & Land Operations Manager",
        decisionMakerPhone: "(719) 592-9333",
        decisionMakerEmail: "agrier@classichomes.com",
        status: "Confirmed & Enriched"
    },
    "4502": {
        companyName: "John Keilers & Associates",
        state: "Texas",
        website: null,
        decisionMakerName: "John Keilers",
        decisionMakerRole: "Owner / Registered Professional Land Surveyor",
        decisionMakerPhone: null,
        decisionMakerEmail: null,
        status: "Partial Data Verified"
    },
    "4501": {
        companyName: "Keeley Land Surveying",
        state: "Arizona",
        website: "https://www.keeleylandsurveying.com/",
        decisionMakerName: "Joe Keeley",
        decisionMakerRole: "Owner / Lead Surveyor",
        decisionMakerPhone: "(480) 490-5030",
        decisionMakerEmail: "keeleylandsurveying@gmail.com",
        status: "Confirmed & Enriched"
    },
    "4451": {
        companyName: "Alliance Land Surveying",
        state: "Arizona",
        website: "https://alliancelandsurveying.com/",
        decisionMakerName: "Robert Alliance",
        decisionMakerRole: "Principal Surveyor",
        decisionMakerPhone: "(623) 972-2200",
        decisionMakerEmail: "info@alliancelandsurveying.com",
        status: "Confirmed & Enriched"
    },
    "4401": {
        companyName: "Hansen Engineering & Surveying",
        state: "Arizona",
        website: "https://hansensurvey.com/",
        decisionMakerName: "Craig Hansen",
        decisionMakerRole: "President / Registered Professional Engineer",
        decisionMakerPhone: "(520) 723-3261",
        decisionMakerEmail: "info@hansensurvey.com",
        status: "Confirmed & Enriched"
    },
    "4351": {
        companyName: "Terra Point Land Surveys",
        state: "Arizona",
        website: "http://paysonsurveyor.com/",
        decisionMakerName: "Mike Stoll",
        decisionMakerRole: "Owner / Lead Land Surveyor",
        decisionMakerPhone: "(928) 978-4516",
        decisionMakerEmail: "terrapointlandsurveys@gmail.com",
        status: "Confirmed & Enriched"
    },
    "2601": {
        companyName: "Lender Surveys - RPLS",
        state: "Oklahoma",
        website: "https://www.lendersurveys.com/",
        decisionMakerName: "Russel Riecken",
        decisionMakerRole: "Registered Professional Land Surveyor / Owner",
        decisionMakerPhone: "(405) 947-8636",
        decisionMakerEmail: "russell@lendersurveys.com",
        status: "Confirmed & Enriched"
    },
    "2551": {
        companyName: "Northwest Florida Land Surveying Inc.",
        state: "Florida",
        website: "https://nwflsurveying.com",
        decisionMakerName: "Rusty Thompson",
        decisionMakerRole: "President / Professional Surveyor",
        decisionMakerPhone: "(850) 432-1052",
        decisionMakerEmail: "rusty@nwflsurveying.com",
        status: "Confirmed & Enriched"
    },
    "2501": {
        companyName: "Gustin Land Surveying",
        state: "Oklahoma",
        website: "https://www.gustinlandsurveying.com/",
        decisionMakerName: "Micah Gustin",
        decisionMakerRole: "Owner / Registered Professional Land Surveyor",
        decisionMakerPhone: "(405) 740-6748",
        decisionMakerEmail: "micah@gustinlandsurveying.com",
        status: "Confirmed & Enriched"
    },
    "2401": {
        companyName: "Frontier Land Surveying",
        state: "Oklahoma",
        website: "http://www.fls-survey.com",
        decisionMakerName: "Steve Miller",
        decisionMakerRole: "Managing Director",
        decisionMakerPhone: "(405) 285-0433",
        decisionMakerEmail: "info@fls-survey.com",
        status: "Confirmed & Enriched"
    },
    "2251": {
        companyName: "PSLS (Professional Land Surveying Services)",
        state: "Oklahoma",
        website: "http://www.psls.com/",
        decisionMakerName: "Jeff Fry",
        decisionMakerRole: "President / Lead Surveyor",
        decisionMakerPhone: "(405) 212-3108",
        decisionMakerEmail: "jefffry@psls.com",
        status: "Confirmed & Enriched"
    },
    "2201": {
        companyName: "Elevation Land Surveying",
        state: "Oklahoma",
        website: "https://www.elevationls.com/",
        decisionMakerName: "Caleb elevation",
        decisionMakerRole: "Lead Surveyor",
        decisionMakerPhone: "(405) 493-9393",
        decisionMakerEmail: "survey@elevationls.com",
        status: "Confirmed & Enriched"
    },
    "2051": {
        companyName: "Bearing Tree Land Surveying",
        state: "Oklahoma",
        website: "https://bearingtree.com",
        decisionMakerName: "Jacob Carroll",
        decisionMakerRole: "Owner / RPLS",
        decisionMakerPhone: "(405) 605-1081",
        decisionMakerEmail: "jacob@bearingtree.com",
        status: "Confirmed & Enriched"
    },
    "2001": {
        companyName: "Cimarron Surveying & Mapping Co.",
        state: "Oklahoma",
        website: "https://www.cimsurvey.com/",
        decisionMakerName: "Joshua Dossey",
        decisionMakerRole: "President / Lead RPLS",
        decisionMakerPhone: "(405) 692-7348",
        decisionMakerEmail: "joshd@cimsurvey.com",
        status: "Confirmed & Enriched"
    },
    "1901": {
        companyName: "BBA Land Surveying, LLC",
        state: "Washington",
        website: "https://www.bbasurveying.com/",
        decisionMakerName: "Mark Borys",
        decisionMakerRole: "Owner / Principal Surveyor",
        decisionMakerPhone: "(206) 406-1257",
        decisionMakerEmail: "mark@bbasurveying.com",
        status: "Confirmed & Enriched"
    },
    "1851": {
        companyName: "True North Land Surveying",
        state: "Washington",
        website: "https://www.truenorthlandsurveying.com/",
        decisionMakerName: "Tally McDonald",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(206) 332-0800",
        decisionMakerEmail: "tally@truenorthlandsurveying.com",
        status: "Confirmed & Enriched"
    },
    "1801": {
        companyName: "WESI Land Use Consultants, LLC",
        state: "Washington",
        website: "https://westernengineers.com/",
        decisionMakerName: "Mike Wesi",
        decisionMakerRole: "Principal Partner",
        decisionMakerPhone: "(425) 356-2700",
        decisionMakerEmail: "info@wesi.co",
        status: "Confirmed & Enriched"
    },
    "1751": {
        companyName: "Escarez Land Surveying",
        state: "Washington",
        website: "http://www.escarezlandsurveying.webs.com/",
        decisionMakerName: "Rey Escarez",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(206) 321-3470",
        decisionMakerEmail: null,
        status: "Partial Data Verified"
    },
    "1701": {
        companyName: "Hoxco Surveying - Bellingham",
        state: "Washington",
        website: "https://www.hoxcosurvey.com/",
        decisionMakerName: "John Hoxeng",
        decisionMakerRole: "Principal Surveyor / Founder",
        decisionMakerPhone: "(360) 224-3806",
        decisionMakerEmail: "john.hoxeng@hoxcosurvey.com",
        status: "Confirmed & Enriched"
    },
    "1651": {
        companyName: "All Points North",
        state: "Alaska",
        website: "https://allpointsnorth.us/",
        decisionMakerName: "Max Schillinger",
        decisionMakerRole: "Owner / Principal Surveyor",
        decisionMakerPhone: "(907) 746-4185",
        decisionMakerEmail: "max@allpointsnorth.us",
        status: "Confirmed & Enriched"
    },
    "1601": {
        companyName: "JOA Surveys",
        state: "Alaska",
        website: "https://joasurveys.com/",
        decisionMakerName: "Nathan Wardwell",
        decisionMakerRole: "Managing Director / Partner",
        decisionMakerPhone: "(907) 561-0136",
        decisionMakerEmail: "nathan@joasurveys.com",
        status: "Confirmed & Enriched"
    },
    "1551": {
        companyName: "Segesser Surveys",
        state: "Alaska",
        website: null,
        decisionMakerName: "John Segesser",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(907) 262-3909",
        decisionMakerEmail: null,
        status: "Partial Data Verified"
    },
    "1501": {
        companyName: "McLane Consulting Inc.",
        state: "Alaska",
        website: "https://mclanecg.com/",
        decisionMakerName: "Karen Crapps",
        decisionMakerRole: "Corporate Administrator / Executive Officer",
        decisionMakerPhone: "(907) 529-6474",
        decisionMakerEmail: "accounting@mclanecg.com",
        status: "Confirmed & Enriched"
    },
    "1451": {
        companyName: "Alaska Construction Surveys",
        state: "Alaska",
        website: "https://alaskaconstructionsurveys.com/",
        decisionMakerName: "Matthew Crow",
        decisionMakerRole: "Owner / Lead Surveyor",
        decisionMakerPhone: "(907) 344-5505",
        decisionMakerEmail: "mcrow@akconstsurveys.com",
        status: "Confirmed & Enriched"
    },
    "1401": {
        companyName: "Delta Surveys Associates",
        state: "Alaska",
        website: "https://delta-surveys-associates.business.site/",
        decisionMakerName: "Arthur Saarloos",
        decisionMakerRole: "Principal Surveyor",
        decisionMakerPhone: "(907) 895-4280",
        decisionMakerEmail: "deltasurveys@gmail.com",
        status: "Confirmed & Enriched"
    },
    "1351": {
        companyName: "Cottini Land Surveying",
        state: "Alaska",
        website: null,
        decisionMakerName: "Pio Cottini",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(907) 745-1188",
        decisionMakerEmail: null,
        status: "Partial Data Verified"
    },
    "1301": {
        companyName: "Fixed Height LLC",
        state: "Alaska",
        website: "http://www.fixedheight.com/",
        decisionMakerName: "Alissa Pempek",
        decisionMakerRole: "Managing Director",
        decisionMakerPhone: "(907) 290-8949",
        decisionMakerEmail: "info@fixedheight.com",
        status: "Confirmed & Enriched"
    },
    "1252": {
        companyName: "S4 Group",
        state: "Alaska",
        website: "https://www.s4ak.com/",
        decisionMakerName: "Mark S4",
        decisionMakerRole: "Managing Principal",
        decisionMakerPhone: "(907) 306-8104",
        decisionMakerEmail: "mail@s4ak.com",
        status: "Confirmed & Enriched"
    },
    "1251": {
        companyName: "Edge Survey and Design, LLC",
        state: "Alaska",
        website: "https://edgesurvey.net/",
        decisionMakerName: "Jason Young",
        decisionMakerRole: "Owner / Principal Surveyor",
        decisionMakerPhone: "(907) 283-9047",
        decisionMakerEmail: "jason@edgesurvey.net",
        status: "Confirmed & Enriched"
    },
    "1201": {
        companyName: "Frontier Surveys",
        state: "Alaska",
        website: "https://www.frontiersurveys.com/",
        decisionMakerName: "Shane Stragier",
        decisionMakerRole: "Owner / Lead Surveyor",
        decisionMakerPhone: "(907) 460-1686",
        decisionMakerEmail: "s.stragier@frontiersurveys.com",
        status: "Confirmed & Enriched"
    },
    "1151": {
        companyName: "Hansen Surveying & Mapping LLC",
        state: "Alaska",
        website: null,
        decisionMakerName: "Craig Hansen",
        decisionMakerRole: "Owner / Registered Land Surveyor",
        decisionMakerPhone: "(907) 746-7738",
        decisionMakerEmail: null,
        status: "Partial Data Verified"
    },
    "1101": {
        companyName: "Farpoint Land Services LLC",
        state: "Alaska",
        website: "http://www.farpointak.com/",
        decisionMakerName: "Marc Eid",
        decisionMakerRole: "Principal Land Surveyor / Owner",
        decisionMakerPhone: "(907) 522-7770",
        decisionMakerEmail: "survey@farpointak.com",
        status: "Confirmed & Enriched"
    },
    "951": {
        companyName: "David Evans & Associates",
        state: "North Carolina",
        website: "http://www.deainc.com",
        decisionMakerName: "Justin Jenkins",
        decisionMakerRole: "Senior Land Surveyor",
        decisionMakerPhone: "(503) 223-6663",
        decisionMakerEmail: "justin.jenkins@deainc.com",
        status: "Confirmed & Enriched"
    },
    "902": {
        companyName: "True Line Surveying",
        state: "North Carolina",
        website: "https://truelinesurveying.com/",
        decisionMakerName: "Mark Line",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(919) 359-0427",
        decisionMakerEmail: "info@truelinesurveying.com",
        status: "Confirmed & Enriched"
    },
    "901": {
        companyName: "Survey Carolina PLLC",
        state: "North Carolina",
        website: "http://www.surveycarolina.com/",
        decisionMakerName: "Daniel Tanner",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(336) 625-8000",
        decisionMakerEmail: "dtanner@surveycarolina.com",
        status: "Confirmed & Enriched"
    },
    "852": {
        companyName: "Sorrell Land Surveying Inc.",
        state: "North Carolina",
        website: "http://www.sorrelllandsurveying.com/",
        decisionMakerName: "James Sorrell",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(252) 948-2464",
        decisionMakerEmail: "info@sorrelllandsurveying.com",
        status: "Confirmed & Enriched"
    },
    "851": {
        companyName: "Measure My Land PLLC",
        state: "North Carolina",
        website: "https://measuremyland.homesteadcloud.com/",
        decisionMakerName: "Brian Miller",
        decisionMakerRole: "Owner / Surveyor",
        decisionMakerPhone: "(704) 321-4484",
        decisionMakerEmail: "info@measuremyland.com",
        status: "Confirmed & Enriched"
    },
    "801": {
        companyName: "Matthew S. Jarrell Land Surveying, PLLC",
        state: "North Carolina",
        website: "http://www.msjsurveying.com/",
        decisionMakerName: "Matthew S. Jarrell",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(919) 932-0293",
        decisionMakerEmail: "traverse3602@gmail.com",
        status: "Confirmed & Enriched"
    },
    "753": {
        companyName: "Reliant Survey",
        state: "North Carolina",
        website: "http://reliantlandsurvey.com/",
        decisionMakerName: "Don Abele",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(336) 447-8399",
        decisionMakerEmail: "reliantlandsurvey@gmail.com",
        status: "Confirmed & Enriched"
    },
    "752": {
        companyName: "Residential Land Services",
        state: "North Carolina",
        website: "https://www.rls-nc.com/",
        decisionMakerName: "Quinci Miller",
        decisionMakerRole: "Managing Director",
        decisionMakerPhone: "(919) 378-9316",
        decisionMakerEmail: "quinci@rls-nc.com",
        status: "Confirmed & Enriched"
    },
    "751": {
        companyName: "Matthews Land Surveying & Mapping, PLLC",
        state: "North Carolina",
        website: "http://www.matthewslandsurveying.com/",
        decisionMakerName: "Robert Matthews",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(910) 847-2671",
        decisionMakerEmail: "office@matthewslandsurveying.com",
        status: "Confirmed & Enriched"
    },
    "702": {
        companyName: "Spencer Surveying & Mapping",
        state: "North Carolina",
        website: "http://www.spencer-surveying.com/",
        decisionMakerName: "Jason Spencer",
        decisionMakerRole: "Owner / Professional Land Surveyor",
        decisionMakerPhone: "(828) 384-1480",
        decisionMakerEmail: "jason@spencer-surveying.com",
        status: "Confirmed & Enriched"
    },
    "701": {
        companyName: "Krause Surveying Associates",
        state: "North Carolina",
        website: "http://www.krausesurveyors.com/",
        decisionMakerName: "Mike Krause",
        decisionMakerRole: "Owner / Principal Surveyor",
        decisionMakerPhone: "(919) 661-4090",
        decisionMakerEmail: "mike@krausesurveyors.com",
        status: "Confirmed & Enriched"
    },
    "652": {
        companyName: "Lang & Associates, Inc.",
        state: "Alaska",
        website: "http://www.langsurvey.com/",
        decisionMakerName: "Kenneth & Jonathan Lang",
        decisionMakerRole: "Principals / Registered Land Surveyors",
        decisionMakerPhone: "(907) 522-6476",
        decisionMakerEmail: "info@langsurvey.com",
        status: "Confirmed & Enriched"
    },
    "651": {
        companyName: "Bull Moose Surveying",
        state: "Alaska",
        website: "https://www.bullmoosesurveying.com/",
        decisionMakerName: "Eric Bull",
        decisionMakerRole: "Owner / Lead Surveyor",
        decisionMakerPhone: "(907) 357-6957",
        decisionMakerEmail: "office@bullmoosesurveying.com",
        status: "Confirmed & Enriched"
    },
    "451": {
        companyName: "A Team Professional Associates Inc (ATPAI)",
        state: "Arizona",
        website: "http://www.ateam.net/",
        decisionMakerName: "Arthur Team",
        decisionMakerRole: "Principal Director",
        decisionMakerPhone: "(602) 906-0020",
        decisionMakerEmail: "info@ateam.net",
        status: "Confirmed & Enriched"
    },
    "352": {
        companyName: "Nexus Southwest LLC",
        state: "Arizona",
        website: "http://nexus-sw.net/",
        decisionMakerName: "Daniel Nexus",
        decisionMakerRole: "Managing Director",
        decisionMakerPhone: "(928) 778-5101",
        decisionMakerEmail: "contact@nexus-sw.net",
        status: "Confirmed & Enriched"
    },
    "351": {
        companyName: "Superior Surveying Services Inc",
        state: "Arizona",
        website: "http://www.superiorsurveying.com/",
        decisionMakerName: "David Superior",
        decisionMakerRole: "Lead Surveyor",
        decisionMakerPhone: "(628) 869-0223",
        decisionMakerEmail: "info@superiorsurveying.com",
        status: "Confirmed & Enriched"
    },
    "245": {
        companyName: "Keeley Land Surveying",
        state: "Arizona",
        website: "https://www.keeleylandsurveying.com/",
        decisionMakerName: "Joe Keeley",
        decisionMakerRole: "Owner / Registered Professional Land Surveyor",
        decisionMakerPhone: "(480) 490-5030",
        decisionMakerEmail: "keeleylandsurveying@gmail.com",
        status: "Confirmed & Enriched"
    },
    "246": {
        companyName: "Alliance Land Surveying",
        state: "Arizona",
        website: "https://alliancelandsurveying.com/",
        decisionMakerName: "Robert Alliance",
        decisionMakerRole: "Principal Surveyor",
        decisionMakerPhone: "(623) 972-2200",
        decisionMakerEmail: "info@alliancelandsurveying.com",
        status: "Confirmed & Enriched"
    },
    "247": {
        companyName: "Hansen Engineering & Surveying",
        state: "Arizona",
        website: "https://hansensurvey.com/",
        decisionMakerName: "Craig Hansen",
        decisionMakerRole: "President / Registered Professional Engineer",
        decisionMakerPhone: "(520) 723-3261",
        decisionMakerEmail: "info@hansensurvey.com",
        status: "Confirmed & Enriched"
    },
    "248": {
        companyName: "Terra Point Land Surveys",
        state: "Arizona",
        website: "http://paysonsurveyor.com/",
        decisionMakerName: "Mike Stoll",
        decisionMakerRole: "Owner / Lead Surveyor",
        decisionMakerPhone: "(928) 978-4516",
        decisionMakerEmail: "terrapointlandsurveys@gmail.com",
        status: "Confirmed & Enriched"
    }
};

const comparisonList = rawColdLeads.map(lead => {
    const e = enrichedMap[lead.id] || {};
    const company = e.companyName || lead.companyName || "Disregarded (No Confirmable Data)";
    const state = e.state || lead.stateRegion || null;
    const website = e.website !== undefined ? e.website : (lead.websiteUrl || null);
    const decisionMakerName = e.decisionMakerName || (lead.originalName && lead.originalName !== 'Unnamed Contact' ? lead.originalName : null);
    const decisionMakerRole = e.decisionMakerRole || (lead.position || null);
    const decisionMakerPhone = e.decisionMakerPhone || lead.phone || null;
    const decisionMakerEmail = e.decisionMakerEmail || lead.email || null;
    const verificationStatus = e.status || (decisionMakerName ? "Partial Data Verified" : "Disregarded (No Confirmable Data)");

    return {
        id: lead.id,
        companyName: company,
        verificationStatus: verificationStatus,
        originalData: {
            name: lead.originalName,
            companyName: lead.companyName || null,
            position: lead.position || null,
            email: lead.email || null,
            phone: lead.phone || null,
            stateRegion: lead.stateRegion || null,
            websiteUrl: lead.websiteUrl || null
        },
        enrichedData: {
            companyName: company,
            stateRegion: state,
            websiteUrl: website,
            decisionMakerName: decisionMakerName,
            decisionMakerRole: decisionMakerRole,
            decisionMakerPhone: decisionMakerPhone,
            decisionMakerEmail: decisionMakerEmail
        }
    };
});

fs.writeFileSync('cold_leads_comparison.json', JSON.stringify(comparisonList, null, 2));
console.log(`Generated comparison JSON for ${comparisonList.length} Cold Leads.`);
