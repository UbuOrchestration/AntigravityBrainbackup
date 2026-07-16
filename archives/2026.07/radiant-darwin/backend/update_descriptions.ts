import { getDb } from './src/db.js';

const descriptions: Record<string, string> = {
  "B0006IX870": "Camco TastePURE RV Water Filter with Flexible Hose Protector\n\n• Reduces bad taste, odor, chlorine, and sediment in drinking water.\n• Includes a flexible hose protector to reduce strain on connections.\n• Brand new retail inventory, sealed in original packaging.",
  "B015Y9A1Z8": "Progressive Industries EMS-PT50X RV Surge Protector\n\n• 50-Amp smart surge protection for your RV electrical system.\n• Weather-resistant design with built-in digital display.\n• Brand new retail inventory, sealed in original packaging.",
  "B000BGHYJ0": "Camco 90 Degree Hose Elbow RV Water Hose Fitting (22505)\n\n• Eliminates stress and strain on RV water hose connections.\n• Made of durable, solid brass for a leak-free seal.\n• Brand new retail inventory, sealed in original packaging.",
  "B00192JG9O": "Camco Wheel Chock With Rope\n\n• Keeps your trailer or RV securely in place on inclines.\n• Includes a convenient rope for easy placement and removal.\n• Brand new retail inventory, sealed in original packaging.",
  "B000EDSSDO": "Camco RV Refrigerator Bars\n\n• Keep food and drinks safe and secure during travel.\n• Spring-loaded bars adjust to fit various refrigerator sizes.\n• Brand new retail inventory, sealed in original packaging.",
  "B00074QWU0": "Camco RhinoFLEX 3ft RV Sewer Hose Extension with Swivel Fittings\n\n• 3-foot extension hose for your existing RV sewer setup.\n• Pre-attached swivel fittings for easy, secure connections.\n• Brand new retail inventory, sealed in original packaging.",
  "B0006JLW34": "Camco RV Screen Door Cross Bar Handle\n\n• Provides easier entry and exit while protecting your screen door.\n• Adjustable design fits most standard RV screen doors.\n• Brand new retail inventory, sealed in original packaging.",
  "B000EDQQJS": "Camco RV Flying Insect Screen for Furnace Vents (2 Pack)\n\n• Protects your RV furnace vents from flying insects and pests.\n• Easy to install with included installation tool.\n• Brand new retail inventory, sealed in original packaging.",
  "B0006JLSPI": "Camco TastePURE 25ft Premium Drinking Water Hose for RVs\n\n• 25-foot hose designed specifically for safe drinking water.\n• Lead-free, BPA-free, and UV-stabilized for long-lasting use.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-001": "Camco RV TST MAX Toilet Treatment Drop-Ins (30 Count)\n\n• Breaks down waste and tissue while eliminating holding tank odors.\n• Ultra-concentrated citrus scent for long-lasting freshness.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-002": "Camco RhinoFLEX 15ft RV Sewer Hose Kit with Swivel Fitting\n\n• Complete 15-foot sewer hose kit for hassle-free RV dumping.\n• Includes 4-in-1 translucent elbow and secure swivel fittings.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-003": "Progressive Industries Water Pressure Regulator Brass Lead-Free\n\n• Protects your RV plumbing from high-pressure water sources.\n• Lead-free brass construction ensures safe drinking water.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-004": "Camco RV Toilet Tissue 1-Ply, 4 Rolls\n\n• Fast-dissolving, 1-ply tissue prevents clogs in RV holding tanks.\n• Biodegradable and safe for all RV and marine sanitation systems.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-007": "Camco RV Brass Inline Water Pressure Regulator\n\n• Helps protect RV plumbing and hoses from high-pressure city water.\n• Durable solid brass construction for years of reliable use.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-008": "Camco RV 15 Amp Male to 30 Amp Female Dogbone Adapter\n\n• Easily connect your 30-Amp RV power cord to a standard 15-Amp outlet.\n• Heavy-duty design with convenient pull handles for easy unplugging.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-010": "Camco FasTen 2x2 Leveling Block For Dual Tires\n\n• Interlocking leveling blocks designed specifically for dual tires.\n• Stackable and customizable for precise leveling on uneven terrain.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-011": "Camco RV Sidewinder Plastic Sewer Hose Support (20ft)\n\n• Cradles your sewer hose to provide a downward slope for better drainage.\n• Flexible, lightweight, and easy to position around obstacles.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-012": "Lippert T-Level Precision Leveling Bubbles\n\n• Two-way bubble level ensures your RV is perfectly leveled front-to-back and side-to-side.\n• Easy to mount on your trailer tongue or pin box.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-013": "Progressive Industries Wheel Chock with Handle (2-Pack)\n\n• Heavy-duty wheel chocks to keep your RV or trailer securely parked.\n• Integrated handles make placement and removal a breeze.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-014": "Curt Slide-Out Stabilizer Jack (Pair)\n\n• Provides essential support to prevent sagging in your RV slide-outs.\n• Adjustable height to fit various ground clearances.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-017": "Aroma RV Leveling Scissor Jack Drill Adapter\n\n• Quickly raise and lower scissor jacks using your power drill.\n• Saves time and effort during RV setup and tear-down.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-020": "Camco Curved Leveler and Chock Kit (Single)\n\n• Innovative curved design allows for precise leveling up to 4 inches.\n• Includes a custom chock to lock the leveler securely in place.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-021": "Valterra 30-Amp Smart Surge Protector\n\n• Comprehensive surge protection for 30-Amp RV electrical systems.\n• Detects faulty wiring and voltage fluctuations instantly.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-022": "Lippert 50-Amp to 30-Amp RV Dogbone Adapter\n\n• Connect your 30-Amp RV to a 50-Amp campground power pedestal.\n• Durable construction with ergonomic handles for easy use.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-032": "Lippert Trailer Hitch Coupler Lock Brass\n\n• Heavy-duty brass lock protects your trailer from theft.\n• Fits most standard trailer hitch couplers.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-035": "BougeRV 7-Way Round RV Trailer Plug Connector\n\n• Reliable 7-way blade to round pin trailer plug adapter.\n• Weather-resistant and built for rugged towing conditions.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-037": "Aroma Trailer Hitch Lock Receiver 5/8 Pin\n\n• Secure your ball mount and towing accessories with this 5/8-inch locking pin.\n• Includes weather-resistant dust cap and two keys.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-038": "Stromberg Carlson Towing Safety Chains 36\" (Pair)\n\n• Essential safety chains for secure towing and peace of mind.\n• 36-inch length with heavy-duty hooks.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-043": "Progressive Industries Eternabond RV Roof Repair Tape 4\"x50'\n\n• Permanently seals leaks on RV roofs, vents, and seams.\n• Highly flexible, waterproof, and UV resistant.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-046": "Eaz-Lift Screen Door Cross Bar Handle\n\n• Sturdy cross bar handle adds stability and protects your screen door.\n• Universal fit for most RV and camper screen doors.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-047": "Aroma Standard RV Entry Door Lock Handle\n\n• Complete replacement lock assembly for standard RV entry doors.\n• Includes deadbolt functionality for enhanced security.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-049": "Dometic Self-Adhesive Slide-Out Slicker Skids\n\n• Reduces friction and prevents wear on your RV slide-out floors.\n• Easy self-adhesive installation for long-lasting protection.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-050": "Camco Bumper Cap Squeeze Plug Replacement (Pair)\n\n• Replaces lost or damaged RV bumper caps.\n• Features a squeeze plug design for easy removal and installation.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-051": "Valterra Portable Propane Buddy Heater 9,000 BTU\n\n• Compact and portable propane heater, perfect for chilly RV nights.\n• Outputs up to 9,000 BTUs of safe, efficient heat.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-052": "Lippert RV Anti-Slip Dash Grip Mat Large\n\n• Keeps your phone, keys, and accessories from sliding off the dashboard.\n• Large size provides ample grip space without messy adhesives.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-053": "Progressive Industries Bamboo RV Step Rug Pad Wrap\n\n• Stylish bamboo step wrap keeps dirt and debris out of your RV.\n• Easy to install with included springs and hooks.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-054": "Curt Collapsible RV Trash Can Hanging\n\n• Space-saving collapsible trash can hangs conveniently in your RV.\n• Spring-loaded design pops up instantly when needed.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-056": "Eaz-Lift Vent Insulator and Skylight Shield Cover\n\n• Insulates your RV vent or skylight to keep temperatures comfortable.\n• Fits standard 14-inch RV roof vents perfectly.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-061": "Valterra RV Awning Shade Screen Netting 10x8'\n\n• Blocks the sun's glare and heat while allowing a cool breeze through.\n• Slides easily into the utility slot of most RV awnings.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-064": "Curt Awning LED Light Strip Kit Waterproof L8\n\n• Illuminates your patio area with bright, waterproof LED lighting.\n• Easy installation under your RV awning.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-065": "BougeRV RV Awning De-Flapper Clamps (Pair)\n\n• Prevents noisy awning flapping and protects fabric from wind damage.\n• Wide grip design ensures a secure hold without tearing.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-066": "Eaz-Lift Awning Travel Lock Aluminum Clamp\n\n• Secures your awning during transit to prevent accidental unfurling.\n• Durable aluminum construction for maximum peace of mind.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-068": "Stromberg Carlson Heavy Duty Ground Anchors Patio Stakes\n\n• Heavy-duty stakes to securely anchor your RV awning or patio mat.\n• Spiral design provides maximum holding power in all soil types.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-070": "Camco Slide-Out Topper Tension Spring Replacement\n\n• Replacement tension spring for keeping your slide-out topper tight.\n• Restores optimal functionality to your awning system.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-071": "Valterra Wireless RV Backup Camera and Monitor Kit\n\n• Provides a clear, wireless view behind your RV for safe reversing.\n• Includes a high-resolution monitor and weather-resistant camera.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-072": "Lippert Propane Gas Leak Detector 12V Flush Mount\n\n• Hardwired 12V detector alerts you instantly to dangerous propane leaks.\n• Flush mount design for a clean, integrated look in your RV.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-073": "Progressive Industries Carbon Monoxide and Smoke Alarm Battery Operated\n\n• Dual sensor alarm detects both smoke and carbon monoxide.\n• Battery-operated for easy installation anywhere in your RV.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-076": "Eaz-Lift Trailer Brake Controller Proportional\n\n• Proportional braking for smooth, safe stops while towing.\n• Digital display makes setup and monitoring simple.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-077": "Aroma RV Tire Pressure Monitoring System TPMS (4 Sensors)\n\n• Real-time monitoring of tire pressure and temperature while driving.\n• Includes 4 wireless sensors and a convenient dashboard display.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-083": "Progressive Industries Nesting Stainless Steel Cookware Set (10-piece)\n\n• Space-saving nesting cookware set designed for RV kitchens.\n• High-quality stainless steel for even heating and durability.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-085": "BougeRV Pop-A-Plate Wall Mount Plate Dispenser\n\n• Keeps paper plates organized and easily accessible in your RV.\n• Mounts securely under cabinets to save counter space.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-090": "Camco 12V High-Output Silent Refrigerator Cooling Fan\n\n• Improves airflow to keep your RV refrigerator consistently cold.\n• Whisper-quiet 12V operation won't disturb your sleep.\n• Brand new retail inventory, sealed in original packaging.",
  "ARB-AMAZON-RV-092": "Lippert Sewer Hose Rinse Cap Adaptor Dual\n\n• Easily flush out your sewer hose and holding tanks.\n• Dual adapter design for versatile and hygienic cleaning.\n• Brand new retail inventory, sealed in original packaging."
};

async function applyDescriptions() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title FROM inventory WHERE status = 'ACTIVE'");
    let count = 0;
    
    for (const row of rows) {
        const desc = descriptions[row.sku];
        if (desc) {
            await db.run("UPDATE inventory SET listing_description = ? WHERE id = ?", [desc, row.id]);
            count++;
        } else {
            console.log("No description mapped for", row.sku);
        }
    }
    
    console.log(`Successfully updated ${count} descriptions.`);
}

applyDescriptions().catch(console.error);
