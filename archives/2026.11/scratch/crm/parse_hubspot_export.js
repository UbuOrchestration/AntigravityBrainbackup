const fs = require('fs');

const rawData = `Record ID\tFirst Name\tLast Name\tCompany Name\tEmail\tPhone Number\tState/Region\tLead Status\tAssociated Note\tWebsite URL\tAssociated Note IDs
2.52204E+11\tRyan\t\t\tryan.k@tidalconstructionsgroup.com\t341-238-2067\t\tHot Lead\t\t\t
2.52053E+11\tTrey\tSmith\t\ttsmith.flyingw@gmail.com\t\t\t\t\t\t
2.50688E+11\tlinda\t\t\tcantonlake@hotmail.com\t\t\t\t\t\t
2.50262E+11\tMatt\tNeville\t\tmneville@cbdeng.com\t\t\t\t\t\t
2.50302E+11\tKerry\tBower\t\tkerry@cbdeng.com\t\t\t\t\t\t
2.49818E+11\tMiriam\tDe Anda\t\tmiriam.deanda@misupergo.com\t(405) 509-1940\t\tHot Lead\t\t\t
2.45548E+11\tGreg\t\t\tgreglawlerphilip@gmail.com\t(1980) 892-7141\t\tHot Lead\t\t\t
2.4502E+11\tJeremy\tPowell\t\tvictorymattressokc@gmail.com\t405-881-7231\t\tHot Lead\t\t\t
2.4477E+11\t\t\t\tchrisqusa@gmail.com\t\t\t\t\t\t
2.43319E+11\tIan\tWalsh\t\ti.walsh@heliostechnologies.org\t(941) 328-2446\t\tHot Lead\t\t\t
2.41734E+11\tAmanda\tRenfro\t\tamandarenfro13@gmail.com\t(918) 694-0743\t\tHot Lead\t\t\t
2.36763E+11\tTyler\t\t\ttyler@buildsculpt.com\t(966206) 203-2919\t\tHot Lead\t\t\t
2.31867E+11\tDow McCarty-Architect\t\t\tdomccarty@msn.com\t(1405) 740-2847\t\tHot Lead\t\t\t
2.21609E+11\tLaTia\tGilbert\t\tlatia.gilbert@okc.gov\t\t\t\t\t\t
2.21509E+11\t\t\t\tjenniferwesleymkt27@gmail.com\t\t\t\t\t\t
2.19747E+11\tinfo\t\t\tinfo@kannem.com\t\t\t\t\t\t
2.19814E+11\t\t\t\ttopvisions27@gmail.com\t\t\t\t\t\t
2.19692E+11\t\t\t\tmiareynolds777@gmail.com\t\t\t\t\t\t
2.13447E+11\tAustin Robert\t\t\taustinrobert0002@gmail.com\t +1(718)143-2784\t\tHot Lead\t\t\t
2.12003E+11\tBarron\tSwope\t\tbarronswope@gmail.com\t\t\t\t\t\t
2.12E+11\tLauren\tSwope\t\tlaurencswope@gmail.com\t\t\t\t\t\t
2.12003E+11\tCaleb\tPowell\t\tcaleb.powell@levelonepm.com\t\t\t\t\t\t
2.12E+11\tScott\tEvans\t\tscott.evans@levelonepm.com\t\t\t\t\t\t
2.1155E+11\t\t\t\tcatnetry@gmail.com\t\t\t\t\t\t
2.08097E+11\t\t\t\ttinhmaikoem@gmail.com\t\t\t\t\t\t
2.08105E+11\tD\tT\t\tdtranok1@gmail.com\t\t\t\t\t\t
2.07317E+11\tAustin\tSeltzer\t\taustin@seltzersounds.com\t214-206-7859\t\tHot Lead\t\t\t
1.97255E+11\t\t\t\tmichael.kenna@kimley-horn.com\t\t\t\t\t\t
1.97239E+11\t\t\t\tmichael.kenna@kimley-horm.com\t\t\t\t\t\t
1.95619E+11\t\t\t\tcherokeekid59@yahoo.com\t\t\t\t\t\t
1.95544E+11\t\t\t\tmaryann.britt@ettflorida.com\t\t\t\t\t\t
1.94989E+11\tLuis\tPerez\t\tluis@lrpengineering.com\t\t\t\t\t\t
1.94811E+11\tJohn\tP Darling\t\tdotlessspot@gmail.com\t\t\t\t\t\t
1.94605E+11\t\t\t\tdenniseck@woodsplumbingservice.com\t\t\t\t\t\t
1.94459E+11\tSarah\t\t\tstroutman@stolhand.com\t(580) 762-5935\t\tHot Lead\t\t\t
1.93328E+11\tAshley Wilson\tAshley Wilson\t\tashley@smartassistanthub.com\t(725) 225-1465\t\tHot Lead\t\t\t
1.9103E+11\t\t\t\tmcloreto22@gmail.com\t\t\t\t\t\t
1.90897E+11\t\t\t\ttiredoctor09@gmail.com\t\t\t\t\t\t
1.83039E+11\tCar\tPhysician\t\tcarphysicianllc@gmail.com\t\t\t\t\t\t
1.82361E+11\t\t\t\tmbr.electric@yahoo.com\t\t\t\t\t\t
1.81834E+11\tElena\tListen\t\telisten@360enggroup.com\t\t\t\t\t\t
1.80936E+11\tLisa\tVermillion\t\tlmvermillion@nwosu.edu\t(1580) 327-8535\t\tHot Lead\t\t\t
1.8001E+11\tShannon\tTarkington\t\ttarkengineering@gmail.com\t\t\t\t\t\t
1.78869E+11\tAbigail Gupta\tAbigail Gupta\t\tabigail@vettedvas.com\t(650) 887-7769\t\tHot Lead\t\t\t
1.77068E+11\tChaucey\tPerrotti\t\tchaucey@designassistedco.com\t(443) 632-4899\t\tHot Lead\t\t\t
1.75343E+11\t\t\t\timranrad@gmail.com\t\t\t\t\t\t
1.74276E+11\t\t\t\tsurvey@halesurvey.com\t\t\t\t\t\t
1.71783E+11\tAdán\tGranados\t\tadan.granad1@gmail.com\t\t\t\t\t\t
1.61451E+11\t\t\t\tjsauler@halesurvey.com\t\t\t\t\t\t
1.60223E+11\tSubash\tParajuli\t\tsubash.help@gmail.com\t\t\t\t\t\t
1.59565E+11\tTimothy\tBreslin\t\ttimothyb@airtech-ok.com\t(405) 615-1972\t\tHot Lead\t\t\t
1.59416E+11\tStay\tProperties LLC\t\tstaypropertiesllc@gmail.com\t\t\t\t\t\t
1.1177E+11\t\t\t\tstayproperties@outlook.com\t\t\t\t\t\t
1.56706E+11\tZachary Hernandez\tZachary Hernandez\t\tz.hernandez@trustedsupportteam.com\t(909) 310-2440\t\tHot Lead\t\t\t
1.55027E+11\tRoman Harrison\t\t\troman@campaignpromarketing.com\t999-999-9999\t\tHot Lead\t\t\t
1.54215E+11\t\t\t\thess.paul@yahoo.com\t\t\t\t\t\t
1.50541E+11\tROBERT POPE\t\t\tbarristerrobertpope@gmail.com\t(864) 406-5451\t\tHot Lead\t\t\t
1.30648E+11\tDayla\tWatson\t\taagcincokc@gmail.com\t405-662-1893\t\tHot Lead\t\t\t
1.23617E+11\tWillie\tArmstrong\t\twa.williearmstrong@gmail.com\t(1209) 900-2334\t\tHot Lead\t\t\t
1.19246E+11\tCandace\tCobb\t\tcandace.cobb@srbok.com\t\t\t\t\t\t
1.18583E+11\t\t\t\ththanhle6@yahoo.com\t\t\t\t\t\t
1.17943E+11\t\t\t\tsurveyor@jaokc.com\t\t\t\t\t\t
1.16913E+11\t\t\t\tanthony.reed@fire.ok.gov\t\t\t\t\t\t
1.11751E+11\tJustin\tSmith\t\tjustin.smith@srbok.com\t\t\t\t\t\t
1.11493E+11\t\t\t\tlilibeth@milestonebldg.com\t\t\t\t\t\t
1.10573E+11\t\t\t\trich@thestickyforest.com\t\t\t\t\t\t
1.09325E+11\t\t\t\tnewfield@live.com\t\t\t\t\t\t
1.07938E+11\tTroy Ericson\t\t\ttroye@emaildeliverability.com\t813-328-6874\t\tHot Lead\t\t\t
1.05076E+11\tb.\tWalker\t\tda2ndletter@gmail.com\t\t\t\t\t\t
1.03809E+11\tLance\tPound\t\tlancepound@milestonebldg.com\t\t\t\t\t\t
1.035E+11\t\t\t\tmhensley@ompa.com\t\t\t\t\t\t
1.02051E+11\tElizabeth\tPound\t\telizabethpound@milestonebldg.com\t\t\t\t\t\t
1.01615E+11\t\t\t\tlance@milestonebldg.com\t\t\t\t\t\t
99927442195\t\t\t\tkingwash908@gmail.com\t\t\t\t\t\t
98780766236\t\t\t\trockyflint@yahoo.com\t\t\t\t\t\t
85593901359\t\t\t\tbetty@wilsonsurveyingnc.com\t\t\tCurrent Client\t\t\t
76898642774\tLinda\tHopkins\t\tlindahopkinsmkt@gmail.com\t(201) 201-2012\t\tHot Lead\t\t\t
76174977046\t\t\t\tshebert@mia-gc.com\t\t\t\t\t\t
75446686335\tPaul\tHess\t\tphess@straightupes.com\t +1 (405) 630-8034\t\tCurrent Client\t\t\t
75280495528\t\t\t\tginadooohara@gmail.com\t\t\t\t\t\t
74557808684\tChris\tPapasarantou\t\tevzoneconstruction@gmail.com\t\t\tInactive Client\t\t\t
74386275952\tMichael\tScott\t\tmichaelj.scott@dextergroup.com\t(1405) 306-0236\t\tHot Lead\tGets married this weekend (11/09 or 11/10)\t\t64126273899
74300372761\t\t\t\taburnham@surveyingconsultants.com\t\t\t\t\t\t
73894595076\tJeremy\tBird\t\tjrbird1021@yahoo.com\t\t\tCurrent Client\t\t\t
71253992266\tKelli\tCollins\t\tkelli.collins@happyplaygrounds.com\t\t\t\t\t\t
69408491946\t\t\t\tlilibeth@sourcemgt.com\t +1 (405) 706-1009\t\tCurrent Client\t\t\t
67444952714\t\t\t\tlilibeth@bc-ega.com\t\t\tCurrent Client\t\t\t
67444799127\t\t\t\tlancepound@bc-ega.com\t\t\tCurrent Client\t\t\t
66167614299\t\t\t\tofficialwkrause@gmail.com\t\t\t\t\t\t
65687460976\t\t\t\tramona@wilsonsurveyingnc.com\t\t\tCurrent Client\t\t\t
65378374963\tJeremy\tBird\t\tjeremy@antipollutiontech.com\t +1 (405) 474-2473\t\tCurrent Client\t\t\t
53477398151\t\t\t\ttim.stuever@pourmybeer.com\t\t\t\t\t\t
53470557322\t\t\t\ttim.steuver@pourmybeer.com\t\t\t\t\t\t
51905037998\tBob\tSimon\t\t20bobsimon@gmail.com\t\t\tCurrent Client\t\t\t
49104017520\t\t\t\tabuse@cloudfare.com\t\t\t\t\t\t
47411187511\t\t\t\trkolodzej@gmail.com\t +1 (956) 369-4482\t\tInactive Client\t\t\t
46592423544\t\t\t\tjerry@clement-ec.com\t\t\t\t\t\t
46593135492\t\t\t\tmichaelkenna3@gmail.com\t\t\t\t\t\t
46495343469\t\t\t\tjerradrogers@gmail.com\t\t\t\t\t\t
46099895439\t\t\t\tsnorth@kochcomm.com\t\t\t\t\t\t
45905817399\t\t\t\tlaura@lauraannestone.com\t\t\t\t\t\t
44500298647\tGarrison\tTucker\t\tgarrisonbtucker@gmail.com\t\t\t\t\t\t
43627605161\t\t\t\tsgspma03@sgsbuilder.net\t\t\t\t\t\t
43576851737\tFoster\tSanders\t\tfoster@sgsbuilder.net\t(405) 416-8400\t\tCurrent Client\t\t\t
43303941798\tScott lee\t\t\tscott.tristaterv@gmail.com\t(435) 703-3818\t\tInactive Client\t\t\t
40858255631\t\t\t\tmorgan.lawrence@mercy.net\t\t\t\t\t\t
40321924372\t\t\t\tmatthew.kenna@email.zoominfo.com\t\t\t\t\t\t
39931451814\t\t\t\tb.tabor@lsisurvey.com\t\t\t\t\t\t
35588988761\t\t\t\tjosh@arcokla.com\t\t\t\t\t\t
34430496016\tWilliam Chandler\t\t\twnchandler88@gmail.com\t918-284-5249\t\t\t\t\t
28175008774\t\t\t\tmike@qualityfoodequip.com\t\t\t\t\t\t
25931602031\tDenis Berger\t\t\tdenisberger.web@gmail.com\t(213) 262-0124\t\t\t\t\t
24054610509\t\t\t\twcolburn@surveyingconsultants.com\t\t\tCurrent Client\t\t\t
23146599090\t\t\t\tplanreview@csgengr.com\t\t\t\t\t\t
19718064289\tè§å±±\t\t\txiaoshan1051066166@gmail.com\t\t\t\t\t\t
14317900056\tMatt\tHoward\t\tmhowardsalesokc@gmail.com\t +1 (405) 200-5045\t\tCurrent Client\t\t\t
8998480756\t\t\t\tstacy@aklands.com\t\t\t\t\t\t
8918406058\tRich\tNielson\t\tchicagodreamr@icloud.com\t\t\tCurrent Client\t\t\t
6997764219\tRichard\tNielsen\t\tnielsen@thestickyforest.com\t\t\tCurrent Client\t\t\t
5108021770\tWilliam\tBailey\t\tbill.bailey@apexsealpots.com\t\t\tCurrent Client\t\t\t
10551\tJosh\t\t\tjlsdesign17@gmail.com\t(405) 921-4850\t\t\t\t\t
10151\tAlex\tJohnson\t\tajohnson@surveyingconsultants.com\t\t\tCurrent Client\t\t\t
9601\t\t\t\tmichael@panopservices.com\t\t\t\t\t\t
9551\t\t\t\tjill@mavericklsco.com\t\t\t\t\t\t
9201\tWilliam tetreault\t\t\ttetreaultresearch@gmail.com\t(402) 201-6964\t\tInactive Client\t\t\t
8901\tMaria\tJohnson (Sample Contact)\t\temailmaria@hubspot.com\t\t\t\t\t\t
8701\tTim\tAlspaugh\t\ttimalspaugh01@gmail.com\t\t\tInactive Client\t\t\t
8551\t\t\t\tjeff.h.horton@gmail.com\t\t\t\t\t\t
8451\t\t\t\taaron@cbdeng.com\t\t\tInactive Client\t\t\t
8301\t\t\t\tniquigump@gmail.com\t\t\t\t\t\t
8251\t\t\t\tbarbarasmithstudio@icloud.com\t\t\tInactive Client\t\t\t
7751\t\t\t\ttraverse3692@gmail.com\t\t\t\t\t\t
7701\t\t\t\tdave@boundaryconsultants.biz\t\t\t\t\t\t
7651\t\t\t\tmark@smythsurveyors.com\t\t\t\t\t\t
7551\t\t\t\tgabriel.howard@okc.gov\t\t\t\t\t\t
7501\tContact form follow up auto email test\tKenna\tKannem, LLC\tmichael@kannem.com\t(321) 960-1143\tOklahoma\tHot Lead\t\thttps://kannem.com/\t
7451\tJames Ross\t\t\tj.ross@ngcompanies.com\t(970) 792-6411\t\t\t\t\t
7351\t\t\t\tmaxadu.k@gmail.com\t\t\t\t\t\t
7301\tRobert\t\t\tinfo@citieshonorcompany.com\t(888) 509-9915\t\t\t\t\t
22\t\t\t\tryan@gilbertsurvey.com\t\t\t\tFumbled the bag on this mans first project.\t\t40126563673
6101\tKen\tTimen\t\tktimen@surveyingconsultants.com\t\t\tCurrent Client\t\t\t
6051\tDeAnna\tChristian\tAnathallo Day Spa\tdlchristian60@gmail.com\t(1405) 250-0109\tOklahoma\tInactive Client\t\t\t
5851\t\t\tBill O'Hara Land Surveyor\tb.ohara@lsisurvey.com\t\t\tInactive Client\t\t\t
5251\tBill\tO'Hara\tBill O'Hara  Land Surveyor\tbill@oharalandsurveyor.net\t\t\tInactive Client\t\t\t
5101\t\t\t\tmkenna.cad@gmail.com\t\t\t\t\t\t
5051\tKarie\tColburn\tSurveying Consultants\tkcolburn@surveyingconsultants.com\t(1404) 804-4379\tSouth Carolina\tCurrent Client\t\t\t
5001\tThomas\tSmith\tThomas S. Smith, Land Surveying & Mapping LLC\tsurveysmith@aol.com\t(1603) 838-6494\tNew Hampshire\tUninterested - Follow up\t\thttps://www.surveyorsmith.com/contact-us.html\t
4951\tReed\tDalbrik\tJLD-Engineering\treed@jld-engineering.com\t(1602) 790-7958\tArizona\tInactive Client\t\thttp://JLD-Engineering.com\t
4901\tJill\t\tMaverick Land Survey\tjill@maverickls.com\t(1210) 342-9455\tTexas\tInactive Client\t\thttp://MaverickLS.com\t
4851\tAaron\t\tAlliance Land Surveyors\taaron@alliancelandsurveyors.com\t(1210) 369-9509\tTexas\tInactive Client\t\thttp://AllianceLandSurveyors.com\t
4801\tAndrew\tPowshok\tAAL Survey\tdrew@aalsurvey.com\t(1321) 768-8110\tFlorida\tNo Contact Yet\t\thttp://aalsurvey.com\t
4751\tDave\t\tBoundary Consultants\tdave@boundaryconsultants.com\t(1801) 792-1569\tUtah\tInterested Follow Up\t\thttp://BoundaryConsultants.com\t
4701\tWyatt\t\tRuidoso Land Surveying\truidosolandsurveying@gmail.com\t(1575) 257-2818\tNew Mexico\tInterested Follow Up\t\t\t
4651\tLisa/Jeff\tCraig\tTrinity Land Surveying\tlisa@tlsnv.com\t(1702) 633-4217\tNevada\tInterested Follow Up\t\thttp://tlsnv.com\t
4601\tMike\t\tAlpine Land Surveyors\tmike@alpinelandsurveyors.com\t(1775) 771-1491\tNevada\tInterested Follow Up\t\thttp://AlpineLandSurveyors.com\t
4551\tAmy\tGrier\tClassic Homes\t\t(1719) 592-9333\tColorado\tNo Contact Yet\t\t\t
4502\tJohn\tKeilers\tJohn Keilers & Associates\t\t(1719) 599-5938\tColorado\tNo Contact Yet\t09/29/2022, Was considering retiring but was interested in offer\t\t37654009931
4501\tJason\tMartin\tTo The Point Land Surveying, LLC\tjason@tothepointls.com\t(1541) 855-4280\tOregon\tUninterested - Follow up\t\thttp://ToThePointLS.com\t
4451\tMark\tLogrbrinck\tD.G. Smyth & Co., Inc.\tsmyth@smythsurveyors.com\t(1830) 591-0858\tTexas\tAttempted to Contact\t\thttps://smythsurveyors.com/\t
4401\tRobert\tCoombs\tCoombs Land Surveying\t\t(1817) 920-7600\tTexas\tNo Contact Yet\t\t\t
4351\tDanny\tRodic\tApex Land Surveying\tdrodic@apexsurveyor.com\t(1719) 318-0377\tColorado\tInactive Client\tCalled again, interested in work needs to get projects organized & needs to survey Broadmoor project. Touch base in 1.5-2 weeks to push forward with close.\thttps://www.apexsurveyor.com/\t37657641249
4301\tKenny\tPollack\tB&J Surveying\tkpollach@bjsurvey.net\t +13038500559 ext 106\tColorado\tUninterested - Follow up\t\thttp://bjsurvey.net/\t
4251\tMark\tGiovani\tGiovani Designs LLC\t\t(1719) 510-8775\tColorado\tUninterested - Follow up\t\t\t
4051\t\t\tAltura Land Consultants\tjesse@alturaland.com\t(1303) 902-7791\tColorado\tUninterested - Follow up\tSent email and left VM\t\t37649624884
4001\tScott\tScibetta\tNV5\tscott.scibetta@nv5.com\t(1330) 603-6069\t\tInterested Follow Up\t\thttps://www.nv5.com/\t
3951\tBruce\tPachikara\t3 Consulting Engineers\tbp@3consultingengineers.com\t +19099571998 ext 82\t\tNo Contact Yet\t\thttp://3consultingengineers.com\t
3901\tEd\t\tSchumann Engineering Co.\ted@schumannonline.net\t(1432) 684-5548\tTexas\tUninterested - Follow up\t\t\t
3801\t\t\t\thillengineering@gmail.com\t\tOklahoma\tInterested Follow Up\t\t\t
3701\t\t\t\trusty.grim@haskell.com\t\tOklahoma\tInterested Follow Up\t\t\t
3651\t\t\t\tjohnv@linearsurveys.com\t(1301) 475-9000\tMaryland\tInterested Follow Up\t\t\t
3551\tTroy\tHalliburton\t(205) 730-0801\tthalliburton@gohsm.com\t(1256) 503-4639\tAlabama\tNo Contact Yet\t\thttps://gohsm.com/\t
3501\tJames/Jamie\tWeaver/Monk\tAlabama Land Surveyors\tjames@alsinc.us\t(1334) 264-0266\tAlabama\tNo Contact Yet\t\thttps://alabamalandsurveyorsinc.com/contact-an-alabama-surveyor/\t
3451\tRandy\tPhillips\tAlabama Surveying and Mapping\trandy@alabamamapping.com\t(1205) 688-6656\tAlabama\tNo Contact Yet\t\thttps://alabamamapping.com/about-us\t
3301\t\t\tLinear Surveys Inc\tstakeout@linearsurveys.com\t(1301) 475-9000\tMaryland\tInterested Follow Up\tEmailed back and forth with John, asked me about relocating\thttp://linearsurveys.com\t37170124206
3251\tJames\tBuckley\tScissortail Land Survey, LLC\tjames@scissortailsurvey.com\t(1405) 273-6223\tOklahoma\tUninterested - Follow up\tAfter talking on the phone, James recently hired some CAD techs that he was training and is not interested in services at this time.;Emailed\t\t37727161392;37000868998
3151\tPhil\tFedor\tAlta Southwest\tphil.fedor@altaarizona.com\t(1480) 656-1517\tArizona\tUninterested - Follow up\tNot needed right now;Looking for drafter on facebook page, emailed\thttps://www.altasouthwest.com/\t37009846201;36675261811
3101\tMatt\tTaylor\tLone Wolf Land Surveying\tlonewolflandsurveying@gmail.com\t(1512) 718-5868\tTexas\tInactive Client\t\thttps://www.lonewolflandsurveying.com/\t
3051\tTom\tMarr\tMarr Land Surveying\ttmarr@marrlandsurveying.com\t(1719) 660-8623\tColorado\tUninterested - Follow up\t\thttps://marrlandsurveying.com/\t
3001\tMike\t\tOn Point Land Survey\tmike@onpointsurveyok.com\t(1580) 256-6757\tOklahoma/Texas\tNo Contact Yet\t\thttps://onpointlandsurveyok.com/\t
2951\tN/A\t\tLemke Land Surveying\t\t(1405) 832-9900\tOklahoma\tNo Contact Yet\tCorporate, likely not worth call\thttps://lemke-ls.com/contact/\t38491582243
2901\tN/A\t\tHalff\tinfo@halff.com\t(1405) 546-3820\tOklahoma\t\t\thttp://www.halff.com/\t
2851\tRandy\tMansfield\tDodson Thompson Mansfield PLLC\trandym@dtm-ok.com\t(1405) 601-7402\tOklahoma\tNo Contact Yet\t\thttp://www.dtm-ok.com/\t
2801\tChris\tD'Amico\tRedbud Land Surveying LLC\tredbudsurveying@gmail.com\t(1405) 255-2870\tOklahoma\tInterested Follow Up\tTalked to him, doesnt need help at this time\thttps://www.facebook.com/RedbudLS\t37009937223
2751\tN/A\t\tcec\tinfo@connectcec.com\t(1405) 753-4200\tOklahoma\t\t\thttps://www.connectcec.com/\t
2701\tN/A\t\tRed Plains Surveying Company\t\t(1405) 603-7842\tOklahoma\tNo Contact Yet\t\thttp://www.rpsurveying.com/\t
2651\tCrafton Tull\t\tCrafton Tull\t\t(1479) 636-4838\tOklahoma\t\t\thttps://www.craftontull.com/careers\t
2601\tRussel\tRiecken\tLender Surveys - RPLS\trussell@lendersurveys.com\t(1405) 947-8636\tOklahoma\tNo Contact Yet\t\thttps://www.lendersurveys.com/\t
2551\tRusty\tThompson\tNorthwest Florida Land Surveying Inc.\t\t +1 (850) 432-1052\tFlorida\tNo Contact Yet\t\t\t
2501\tMicah\tGustin\tGustin Land Surveying\tmicah@gustinlandsurveying.com\t(1405) 740-6748\tOklahoma\tNo Contact Yet\tVM;Left VM;Left VM\thttps://www.gustinlandsurveying.com/contact-us/\t38489825051;37010108805;36458875035
2451\tChuck\tReed\tReed's Surveying PLLC\tchuck_reed4@hotmail.com\t(1405) 996-8910\tOklahoma\tIn Progress\tCalled, never received email, resend when home;Sending email, will give me a shot at drawing some things for him. Does need help\t\t36591353389;36457641477
2401\t\t\tFrontier\tinfo@fls-survey.com\t(1405) 285-0433\tOklahoma\tNo Contact Yet\t\t\t
2351\tSpencer\tJividen\tJividen And Company, PLLC\tcramirez@jacsurvey.com\t(1405) 278-7839\tOklahoma\tUninterested - Follow up\tCalled, left message with receptionist\thttps://www.jacsurvey.com/\t37014241794
2301\tKenny\t\tDelta Survey Co.\tkshuford@deltasurveyokc.com\t(1405) 789-5983\tOklahoma\tInterested Follow Up\tKen called me back, sent email;Left note with Pat\t\t36457780122;36454411027
2251\tJeff\tFry\tPSLS\tjefffry@psls.com\t +14052123108 ext 100\tOklahoma\tNo Contact Yet\tCalled, talked to receptionist;Email bounced back, re-call office;Emailed and left message with receptionist, Jeff just had a kid\thttp://www.psls.com/\t37011217727;36454386613;36454354274
2201\t\t\tElevation Land Surveying\tsurvey@elevationls.com\t(1405) 493-9393\tOklahoma\tNo Contact Yet\tLeft VM\thttps://www.elevationls.com/\t36454327049
2151\tJohn\tSauler\tHale & Associates Survey Co.\t\t(1405) 686-0174\tOklahoma\tNo Contact Yet\tReceptionist took info\thttps://www.halesurvey.com/about-us/\t36453631003
2101\tMike\tDawson\tPathfinder Surveying\tmike@pathfindersurvey.com\t(1405) 476-1469\tOklahoma\tInterested Follow Up\tTalked on the phone, says hes very content with wheres hes at. Doesnt particularly enjoy the drafting but has a system down and is happy with that system. Requested my contact info again to save incase he needs help but for now there is no work coming my way.;Responded to email: Received. Â Let me think about it. Â Thank you. Mike Dawson 405-476-1469;Called me back, interested in drafting services, sent email with some information;No contact, left voicemail\thttp://pathfindersurvey.com/\t63452312186;36486366043;36453617240;36452832167
2051\tJacob\tCarroll\tBearing Tree Land Surveying\t\t(1405) 605-1081\tOklahoma\tNo Contact Yet\tNo contact, emailed\t\t36455526547
2001\tJoshua\tDossey\tCimarron Surveying & Mapping Co.\tjoshd@cimsurvey.com\t(1405) 692-7348\tOklahoma\tNo Contact Yet\tCalled, sent email, doesnt need help at this time but if something comes up will reach out.\thttps://www.cimsurvey.com/\t36452767100
1951\tStephen\tQuinalt\tGolden Land Surveying\toffice@goldenls.com\t +1 (405) 849-6010\tOklahoma\tUninterested - Follow up\tGood for now, has 6 drafters - Call back in a few months;Left message with Corey;Michael Anderson recommended I talk to Troy D here, calling back now.\thttp://www.goldenls.com\t37013293922;36454310687;36456383151
1901\tMark\tBorys\tBBA Land Surveying, LLC\t\t(1206) 406-1257\tWashington\tNo Contact Yet\tLeft VM\thttps://www.bbasurveying.com/\t37010114471
1851\tTally\tMcDonald\tTrue North Land Surveying\ttally@truenorthlandsurveying.com\t(1206) 332-0800\tWashington\tNo Contact Yet\t\thttps://www.truenorthlandsurveying.com/contact.php\t
1801\tKen/Mike\t\tWESI Land Use Consultants, LLC\tinfo@wesi.co\t(1425) 356-2700\tWashington\tNo Contact Yet\t\thttps://westernengineers.com/contact/\t
1751\tRey\tEscarez (?)\tEscarez Land Surveying\t\t(1206) 321-3470\tWashington\tNo Contact Yet\t\thttp://www.escarezlandsurveying.webs.com/\t
1701\tJohn\tHoxeng\tHoxco Surveying - Bellingham\tjohn.hoxeng@hoxcosurvey.com\t(1360) 224-3806\tWashington\tNo Contact Yet\t\thttps://www.hoxcosurvey.com/contact\t
1651\tMax\tSchillinger\tAll Points North\tmax@allpointsnorth.us\t(1907) 746-4185\tAlaska\tNo Contact Yet\t\thttps://allpointsnorth.us/contact/\t
1601\tNathan\tWardwell\tJOA Surveys\tnathan@joasurveys.com\t(1907) 561-0136\tAlaska\tNo Contact Yet\t\thttps://joasurveys.com/about-joa/\t
1551\tJohn\tSegresser\tSegesser Surveys\t\t(1907) 262-3909\tAlaska\tNo Contact Yet\t\t\t
1501\tKaren\tCrapps\tMcLane Consulting Inc.\taccounting@mclanecg.com\t(1907) 529-6474\tAlaska\tNo Contact Yet\t\thttps://mclanecg.com/contact-us\t
1451\tMatthew\tCrow\tAlaska Construction Surveys\tmcrow@akconstsurveys.com\t(1907) 344-5505\tAlaska\tNo Contact Yet\t\thttps://alaskaconstructionsurveys.com/\t
1401\tArthur\tSaarloos\tDelta Surveys Associates\tdeltasurveys@gmail.com\t(1907) 895-4280\tAlaska\tNo Contact Yet\t\thttps://delta-surveys-associates.business.site/\t
1351\tPio\tCottini\tCottini Land Surveying\t\t(1907) 745-1188\tAlaska\tNo Contact Yet\t\t\t
1301\tAlissa/Buku\tPempek/Saliz\tFixed Height LLC\tinfo@fixedheight.com\t(1907) 290-8949\tAlaska\tNo Contact Yet\t\thttp://www.fixedheight.com/\t
1252\t\t\tS4 Group\tmail@s4ak.com\t(1907) 306-8104\tAlaska\tNo Contact Yet\t\thttps://www.s4ak.com/\t
1251\tJason\tYoung\tEdge Survey and Design, LLC\tjason@edgesurvey.net\t(1907) 283-9047\tAlaska\tNo Contact Yet\t\thttps://edgesurvey.net/contact\t
1201\tShane\tStragier\tFrontier Surveys\ts.stragier@frontiersurveys.com\t(1907) 460-1686\tAlaska\tNo Contact Yet\tSent email\thttps://www.frontiersurveys.com/\t36407177400
1151\tCraig\t\tHansen Surveying & Mapping LLC\t\t(1907) 746-7738\tAlaska\tNo Contact Yet\tLeft contact info with receptionist\t\t36406424747
1101\tMarc\tEid\tFarpoint Land Services LLC\tsurvey@farpointak.com\t(1907) 522-7770\tAlaska\tNo Contact Yet\t\thttp://www.farpointak.com/\t
951\tJustin\tJenkins\tDavid Evans & Associates\t\t(1503) 223-6663\tNorth Carolina\tNo Contact Yet\tLeft VM (2nd);Referred by Dave @ Boundary Consultants\thttp://www.deainc.com\t37012495279;36331160756
902\tTrue Line Surveying\t\tTrue Line Surveying\t\t(1919) 359-0427\tNorth Carolina\tNo Contact Yet\t\thttps://truelinesurveying.com/\t
901\tDaniel\tTanner\tSurvey Carolina PLLC\t\t(1336) 625-8000\tNorth Carolina\tNo Contact Yet\t\thttp://www.surveycarolina.com/\t
852\tSorrell Land Surveying Inc.\t\tSorrell Land Surveying Inc.\t\t(1252) 948-2464\tNorth Carolina\tNo Contact Yet\t\thttp://www.sorrelllandsurveying.com/\t
851\tMeasure My Land PLLC\t\tMeasure My Land PLLC\t\t(1704) 321-4484\tNorth Carolina\tNo Contact Yet\t\thttps://measuremyland.homesteadcloud.com/\t
802\tAlan\tWilson\tWilson Surveying Inc\talan@wilsonsurveyingnc.com\t(1336) 275-8696\tNorth Carolina\tInterested Follow Up\tEmailed information about the company & work samples, Looking to hear back from drafter Romona\thttps://wilsonsurveyingnc.com/\t36330138629
801\tMatthew\tJarrell\tMatthew S. Jarrell Land Surveying, PLLC\ttraverse3602@gmail.com\t(1919) 932-0293\tNorth Carolina\tNo Contact Yet\t\thttp://www.msjsurveying.com/\t
753\tDon\tAbele\tReliant Survey\treliantlandsurvey@gmail.com\t(1336) 447-8399\tNorth Carolina\tNo Contact Yet\t\thttp://reliantlandsurvey.com/\t
752\tQuinci\t\tResidential Land Services\tquinci@rls-nc.com\t(1919) 378-9316\tNorth Carolina\tNo Contact Yet\t\thttps://www.rls-nc.com/\t
751\t\t\tMatthews Land Surveying & Mapping, PLLC\toffice@matthewslandsurveying.com\t(1910) 847-2671\tNorth Carolina\tNo Contact Yet\t\thttp://www.matthewslandsurveying.com/\t
702\tJason\tSpencer\tSpencer Surveying & Mapping\tjason@spencer-surveying.com\t(1828) 384-1480\tNorth Carolina\tNo Contact Yet\t\thttp://www.spencer-surveying.com/\t
701\tMike\tKrause\tKrause Surveying Associates\t\t(1919) 661-4090\tNorth Carolina\tNo Contact Yet\t\thttp://www.krausesurveyors.com/\t
652\tKenneth & Jonathan\tLang\tLang & Associates, Inc.\t\t(1907) 522-6476\tAlaska\tNo Contact Yet\tEmailed 06/21/2023\thttp://www.langsurvey.com/\t36403280708
651\t\t\tBull Moose Surveying\toffice@bullmoosesurveying.com\t(1907) 357-6957\tAlaska\tNo Contact Yet\tEmailed & Left VM 06/21/2023\thttps://www.bullmoosesurveying.com/\t36404336718
601\tStacy\tWessel\t\taklands@aklands.com\t(1907) 744-5263\tAlaska\tInactive Client\tAt this time decided not to work with her. She requires too much and wants me to pay her credit card fee for payment;Followed up, wants to do teams meeting and send as-builts;Reached out to me inquiring about helping set up templates;Sent email, very interested Follow up\thttps://aklands.com/\t37000641556;36654887511;36453615146;36403322177
551\tGilbert Land Surveying, PLS\t\t\t\t(1480) 275-8020\tArizona\tInterested Follow Up\tCalled & talked to Ryan for a bit, interested in proceeding, sent on-boarding information\thttp://www.gilbertlandsurveying.com/\t38696652288
501\tJulie\tHarris\t\tjulieharris@harveysurveying.com\t(1520) 876-4786\tArizona\tInactive Client\t\thttp://harveysurveying.com/\t
451\tA Team Professional Associates Inc (ATPAI)\t\t\t\t(1602) 906-0020\tArizona\tNo Contact Yet\t\thttp://www.ateam.net/\t
401\t\t\t\tinfo@altasouthwest.com\t(1866) 288-0986\tArizona\tUninterested - Follow up\t\thttp://www.arrowlandsurvey.com/\t
352\tNexus Southwest LLC\t\t\t\t(1928) 778-5101\tArizona\tNo Contact Yet\t\thttp://nexus-sw.net/\t
351\tSuperior Surveying Services Inc\t\t\t\t(1628) 869-0223\tArizona\tNo Contact Yet\t\thttp://www.superiorsurveying.com/\t
302\tDejan\tMiller\t\tdejan@millerls.com\t(1602) 243-7193\tArizona\tInactive Client\t\thttp://millerls.com/\t
301\tJoe\tKeeley?\t\tkeeleylandsurveying@gmail.com\t(1480) 490-5030\tArizona\tNo Contact Yet\t\thttps://www.keeleylandsurveying.com/\t
251\tAlliance Land Surveying\t\t\t\t(1623) 972-2200\tArizona\tNo Contact Yet\t\thttps://hansensurvey.com/\t
201\tHansen Engineering & Surveying\t\t\tinfo@hansensurvey.com\t(1520) 723-3261\tArizona\tNo Contact Yet\t\thttps://hansensurvey.com/\t
151\tMike\tStoll\t\tterrapointlandsurveys@gmail.com\t(1928) 978-4516\tArizona\tNo Contact Yet\t\thttp://paysonsurveyor.com/\t
101\tBrandon\tVan Horn\t\tvhlandsurvey@gmail.com\t(1928) 710-9700\tArizona\tIn Progress\t\thttps://www.vhlandsurvey.com/\t
`;

const lines = rawData.trim().split('\n');
const headers = lines[0].split('\t').map(h => h.trim());

const contacts = [];

for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    while (parts.length < headers.length) parts.push('');
    
    const recordId = parts[0];
    const firstName = parts[1];
    const lastName = parts[2];
    const companyName = parts[3];
    const email = parts[4];
    const phone = parts[5];
    const stateRegion = parts[6];
    const leadStatus = parts[7];
    const associatedNote = parts[8];
    const websiteUrl = parts[9];
    const associatedNoteIds = parts[10];

    const nameParts = [firstName, lastName].filter(Boolean);
    let fullName = nameParts.join(' ').trim();
    if (!fullName) {
        if (companyName) fullName = companyName;
        else if (email) fullName = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        else fullName = `Contact #${recordId}`;
    }

    let stage = "Lead";
    if (leadStatus.includes("Current Client")) stage = "Won";
    else if (leadStatus.includes("Inactive Client")) stage = "Lost";
    else if (leadStatus.includes("Hot Lead")) stage = "In Negotiation";
    else if (leadStatus.includes("Interested") || leadStatus.includes("In Progress")) stage = "Proposal Sent";
    else if (leadStatus.includes("Attempted") || leadStatus.includes("Follow up")) stage = "Contacted";
    else stage = "Lead";

    let val = 0;
    if (stage === "Won") val = 5000;
    else if (stage === "In Negotiation") val = 7500;
    else if (stage === "Proposal Sent") val = 4000;
    else if (stage === "Contacted") val = 2500;
    else val = 1500;

    contacts.push({
        id: `k_${recordId}`,
        recordId,
        firstName,
        lastName,
        name: fullName,
        businessName: companyName,
        companyName,
        position: companyName ? "Client / Partner" : "Lead Contact",
        email,
        phone,
        stateRegion,
        address: stateRegion ? `${stateRegion}` : "",
        leadStatus: leadStatus || "No Contact Yet",
        associatedNote,
        websiteUrl,
        associatedNoteIds,
        stage,
        value: val,
        isPresentation: false
    });
}

const jsContent = `// KANNEM CRM - Exported HubSpot Client Records Data Store\nwindow.KANNEM_EXPORT_DATA = ${JSON.stringify(contacts, null, 2)};\n`;
fs.writeFileSync('js/kannem_data.js', jsContent, 'utf8');
console.log(`Successfully generated js/kannem_data.js with ${contacts.length} real contact records!`);
