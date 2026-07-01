const fs = require('fs');
const path = require('path');

const prefPath = path.join(__dirname, 'preferences.json');
const menuStatusPath = path.join(__dirname, 'menu_status.json');

// Load preferences
let preferences = {
  favoriteCuisine: "Mediterranean",
  avoidFoods: [],
  allergies: [],
  dietaryPreference: "Balanced"
};

if (fs.existsSync(prefPath)) {
  try {
    preferences = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
  } catch (e) {
    console.error('Error reading preferences:', e.message);
  }
}

// Define some seasonal ingredients based on month
const month = new Date().getMonth() + 1; // 1-12
let season = "Summer";
let seasonalVeggies = "Zucchini, Bell Peppers, Tomatoes, Sweet Corn, Cucumbers";
if (month >= 9 && month <= 11) {
  season = "Fall";
  seasonalVeggies = "Sweet Potatoes, Squash, Brussels Sprouts, Spinach";
} else if (month === 12 || month <= 2) {
  season = "Winter";
  seasonalVeggies = "Kale, Carrots, Broccoli, Cauliflower";
} else if (month >= 3 && month <= 5) {
  season = "Spring";
  seasonalVeggies = "Asparagus, Peas, Radishes, Baby Spinach";
}

// Load previous menu to ensure variety
let lastBreakfast = "";
let lastLunch = "";
let lastDinners = [];

if (fs.existsSync(menuStatusPath)) {
  try {
    const content = fs.readFileSync(menuStatusPath, 'utf8').replace(/^\uFEFF/, '');
    const prevStatus = JSON.parse(content);
    if (prevStatus.menu) {
      if (prevStatus.menu.breakfast) lastBreakfast = prevStatus.menu.breakfast.name;
      if (prevStatus.menu.lunch) lastLunch = prevStatus.menu.lunch.name;
      if (prevStatus.menu.dinners) lastDinners = prevStatus.menu.dinners.map(d => d.name);
    }
  } catch (e) {
    console.error('Error reading previous menu_status:', e.message);
  }
}

// Recipe Pools (Mediterranean & Balanced)
const breakfastPool = [
  {
    name: "Spinach & Feta Egg Scramble",
    image: "spinach_feta_scramble.png",
    prepTime: "5 mins",
    cookTime: "10 mins",
    ingredients: [
      { name: "Large Brown Eggs", amount: 3, unit: "eggs", key: "eggs" },
      { name: "Fresh Baby Spinach", amount: 2, unit: "oz", key: "baby_spinach" },
      { name: "Feta Cheese", amount: 1, unit: "oz", key: "feta_cheese" },
      { name: "Olive Oil", amount: 0.5, unit: "tbsp", key: "olive_oil", isStaple: true },
      { name: "Pre-peeled Garlic cloves", amount: 1, unit: "clove", key: "garlic_cloves", isStaple: true }
    ],
    instructions: "Whisk eggs. Sauté garlic and spinach in olive oil. Pour in eggs, stir, fold in feta cheese until melted."
  },
  {
    name: "Mediterranean Spinach & Feta Omelet",
    image: "spinach_feta_scramble.png",
    prepTime: "5 mins",
    cookTime: "10 mins",
    ingredients: [
      { name: "Large Brown Eggs", amount: 3, unit: "eggs", key: "eggs" },
      { name: "Fresh Baby Spinach", amount: 2, unit: "oz", key: "baby_spinach" },
      { name: "Feta Cheese", amount: 1, unit: "oz", key: "feta_cheese" },
      { name: "Vine-Ripened Tomatoes", amount: 2, unit: "oz", key: "tomatoes" },
      { name: "Olive Oil", amount: 0.5, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Whisk eggs. Cook tomatoes and spinach in olive oil, pour eggs over, cook through, fold in feta cheese."
  },
  {
    name: "Scrambled Eggs with Feta and Tomatoes",
    image: "spinach_feta_scramble.png",
    prepTime: "5 mins",
    cookTime: "10 mins",
    ingredients: [
      { name: "Large Brown Eggs", amount: 3, unit: "eggs", key: "eggs" },
      { name: "Feta Cheese", amount: 1.5, unit: "oz", key: "feta_cheese" },
      { name: "Vine-Ripened Tomatoes", amount: 3, unit: "oz", key: "tomatoes" },
      { name: "Olive Oil", amount: 0.5, unit: "tbsp", key: "olive_oil", isStaple: true },
      { name: "Pre-peeled Garlic cloves", amount: 1, unit: "clove", key: "garlic_cloves", isStaple: true }
    ],
    instructions: "Whisk eggs. Sauté garlic and chopped tomatoes in olive oil, scramble with eggs and crumbled feta."
  }
];

const lunchPool = [
  {
    name: "Grilled Chicken & Spinach Wrap",
    image: "chicken_spinach_wrap.png",
    prepTime: "10 mins",
    cookTime: "0 mins",
    ingredients: [
      { name: "Chicken Breast", amount: 6, unit: "oz", key: "chicken_breast" },
      { name: "Flour Tortillas", amount: 1, unit: "wrap", key: "tortillas" },
      { name: "Fresh Baby Spinach", amount: 1, unit: "oz", key: "baby_spinach" },
      { name: "Vine-Ripened Tomatoes", amount: 2, unit: "oz", key: "tomatoes" },
      { name: "Plain Greek Yogurt", amount: 2, unit: "tbsp", key: "greek_yogurt" }
    ],
    instructions: "Season and grill chicken breast. Assemble wrap with spinach, tomato slices, yogurt, and grilled chicken slices."
  },
  {
    name: "Turkey, Hummus & Spinach Wrap",
    image: "chicken_spinach_wrap.png",
    prepTime: "5 mins",
    cookTime: "0 mins",
    ingredients: [
      { name: "Sliced Turkey Breast", amount: 6, unit: "oz", key: "turkey_breast" },
      { name: "Flour Tortillas", amount: 1, unit: "wrap", key: "tortillas" },
      { name: "Fresh Baby Spinach", amount: 1, unit: "oz", key: "baby_spinach" },
      { name: "Classic Hummus", amount: 2, unit: "oz", key: "hummus" },
      { name: "Vine-Ripened Tomatoes", amount: 2, unit: "oz", key: "tomatoes" }
    ],
    instructions: "Spread hummus on tortilla. Assemble wrap with baby spinach, tomatoes, and turkey slices."
  },
  {
    name: "Mediterranean Chickpea & Spinach Wrap",
    image: "chicken_spinach_wrap.png",
    prepTime: "10 mins",
    cookTime: "0 mins",
    ingredients: [
      { name: "Garbanzo Beans", amount: 6, unit: "oz", key: "chickpeas" },
      { name: "Flour Tortillas", amount: 1, unit: "wrap", key: "tortillas" },
      { name: "Fresh Baby Spinach", amount: 1, unit: "oz", key: "baby_spinach" },
      { name: "Feta Cheese", amount: 1, unit: "oz", key: "feta_cheese" },
      { name: "Plain Greek Yogurt", amount: 2, unit: "tbsp", key: "greek_yogurt" }
    ],
    instructions: "Mash garbanzo beans. Mix with greek yogurt, spinach, feta cheese, and wrap in tortilla."
  }
];

const dinnerPool = [
  {
    name: "Garlic-Herb Grilled Chicken with Roasted Tomatoes and Zucchini",
    image: "grilled_chicken_zucchini.png",
    prepTime: "15 mins",
    cookTime: "20 mins",
    ingredients: [
      { name: "Chicken Breast", amount: 12, unit: "oz", key: "chicken_breast" },
      { name: "Vine-Ripened Tomatoes", amount: 6, unit: "oz", key: "tomatoes" },
      { name: "Zucchini Squash", amount: 8, unit: "oz", key: "zucchini" },
      { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
      { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Marinate chicken in garlic and herbs. Toss chopped zucchini and tomatoes in olive oil, roast in oven at 400F for 20 mins while grilling chicken."
  },
  {
    name: "Baked Wild Cod with Roasted Zucchini and Tomatoes",
    image: "grilled_chicken_zucchini.png",
    prepTime: "10 mins",
    cookTime: "15 mins",
    ingredients: [
      { name: "Wild Cod Fillets", amount: 12, unit: "oz", key: "cod" },
      { name: "Zucchini Squash", amount: 8, unit: "oz", key: "zucchini" },
      { name: "Vine-Ripened Tomatoes", amount: 6, unit: "oz", key: "tomatoes" },
      { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
      { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Lay cod fillets in baking dish. Surround with zucchini, tomatoes, garlic, drizzle with olive oil, bake at 400F for 15 mins."
  },
  {
    name: "Sautéed Chicken Breast over Wilted Garlic Spinach with Roasted Zucchini",
    image: "sauteed_chicken_spinach.png",
    prepTime: "15 mins",
    cookTime: "15 mins",
    ingredients: [
      { name: "Chicken Breast", amount: 12, unit: "oz", key: "chicken_breast" },
      { name: "Fresh Baby Spinach", amount: 4, unit: "oz", key: "baby_spinach" },
      { name: "Zucchini Squash", amount: 8, unit: "oz", key: "zucchini" },
      { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
      { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Pan-sear chicken breasts. Sauté spinach and garlic in olive oil until wilted. Serve chicken over spinach alongside roasted zucchini."
  },
  {
    name: "Pan-seared Salmon Fillet over Sautéed Garlic Spinach",
    image: "sauteed_chicken_spinach.png",
    prepTime: "10 mins",
    cookTime: "10 mins",
    ingredients: [
      { name: "Salmon Fillets", amount: 12, unit: "oz", key: "salmon" },
      { name: "Fresh Baby Spinach", amount: 4, unit: "oz", key: "baby_spinach" },
      { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
      { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Sear salmon fillets skin-side down for 5 mins, flip and sear 3 mins. Sauté spinach and garlic in olive oil, serve salmon on top."
  },
  {
    name: "Mediterranean Tomato & Bell Pepper Chicken Stir-fry",
    image: "mediterranean_chicken_stir_fry.png",
    prepTime: "15 mins",
    cookTime: "15 mins",
    ingredients: [
      { name: "Chicken Breast", amount: 18, unit: "oz", key: "chicken_breast" },
      { name: "Vine-Ripened Tomatoes", amount: 8, unit: "oz", key: "tomatoes" },
      { name: "Green Bell Peppers", amount: 2, unit: "peppers", key: "bell_peppers" },
      { name: "Zucchini Squash", amount: 8, unit: "oz", key: "zucchini" },
      { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
      { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Sauté chicken strips with garlic in olive oil. Add sliced bell peppers, zucchini, and tomatoes. Cook until tender."
  },
  {
    name: "Lemon Garlic Shrimp and Vegetable Stir-fry",
    image: "mediterranean_chicken_stir_fry.png",
    prepTime: "10 mins",
    cookTime: "10 mins",
    ingredients: [
      { name: "Shrimp", amount: 18, unit: "oz", key: "shrimp" },
      { name: "Vine-Ripened Tomatoes", amount: 8, unit: "oz", key: "tomatoes" },
      { name: "Green Bell Peppers", amount: 2, unit: "peppers", key: "bell_peppers" },
      { name: "Zucchini Squash", amount: 8, unit: "oz", key: "zucchini" },
      { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
      { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
    ],
    instructions: "Stir-fry shrimp with garlic in olive oil. Stir in sliced bell peppers, zucchini, and tomatoes until tender-crisp. Splash with lemon juice."
  }
];

// Master shopping database with unit sizes and store allocations
const masterShoppingDatabase = {
  chicken_breast: { name: "Perdue Chicken Breast", unitSize: 16, unitType: "oz", store: "Publix", price: 4.99, category: "Proteins", bogo: true },
  eggs: { name: "Large Brown Eggs (18-ct)", unitSize: 18, unitType: "eggs", store: "Aldi", price: 2.49, category: "Proteins" },
  tomatoes: { name: "Vine-Ripened Tomatoes (1 lb)", unitSize: 16, unitType: "oz", store: "Publix", price: 1.99, category: "Produce", bogo: false },
  zucchini: { name: "Zucchini Squash (1 lb)", unitSize: 16, unitType: "oz", store: "Aldi", price: 1.29, category: "Produce" },
  bell_peppers: { name: "Green Bell Peppers (3-pack)", unitSize: 3, unitType: "pack", store: "Aldi", price: 1.49, category: "Produce" },
  baby_spinach: { name: "Fresh Baby Spinach (16 oz container)", unitSize: 16, unitType: "oz", store: "Walmart", price: 3.48, category: "Produce" },
  feta_cheese: { name: "Athenos Crumbled Feta (8 oz block)", unitSize: 8, unitType: "oz", store: "Publix", price: 4.98, category: "Dairy & Deli", bogo: true },
  greek_yogurt: { name: "Plain Greek Yogurt (32 oz)", unitSize: 32, unitType: "oz", store: "Walmart", price: 3.42, category: "Dairy & Deli" },
  tortillas: { name: "Flour Tortillas (10-ct)", unitSize: 10, unitType: "wrap", store: "Walmart", price: 1.98, category: "Pantry Staples" },
  olive_oil: { name: "Extra Virgin Olive Oil (17 oz)", unitSize: 17, unitType: "oz", store: "Aldi", price: 4.89, category: "Pantry Staples", isStaple: true },
  garlic_cloves: { name: "Pre-peeled Garlic cloves (6 oz bag)", unitSize: 6, unitType: "oz", store: "Key Food", price: 1.69, category: "Pantry Staples", isStaple: true },
  turkey_breast: { name: "Sliced Turkey Breast (16 oz)", unitSize: 16, unitType: "oz", store: "Key Food", price: 4.99, category: "Dairy & Deli" },
  hummus: { name: "Sabra Hummus (8 oz)", unitSize: 8, unitType: "oz", store: "Publix", price: 3.98, category: "Dairy & Deli", bogo: true },
  chickpeas: { name: "Garbanzo Beans (15 oz can)", unitSize: 15, unitType: "oz", store: "Aldi", price: 0.89, category: "Pantry Staples" },
  cod: { name: "Frozen Wild Cod Fillets (1 lb)", unitSize: 16, unitType: "oz", store: "Aldi", price: 6.49, category: "Proteins" },
  salmon: { name: "Fresh Salmon Fillets (1 lb)", unitSize: 16, unitType: "oz", store: "Publix", price: 9.99, category: "Proteins" },
  shrimp: { name: "Frozen Large Shrimp (1 lb)", unitSize: 16, unitType: "oz", store: "Aldi", price: 5.99, category: "Proteins" }
};

// Filter out previously used options to ensure weekly variety
const availableBreakfasts = breakfastPool.filter(b => b.name !== lastBreakfast);
const availableLunches = lunchPool.filter(l => l.name !== lastLunch);
const availableDinners = dinnerPool.filter(d => !lastDinners.includes(d.name));

const selectedBreakfast = availableBreakfasts.length > 0 
  ? availableBreakfasts[Math.floor(Math.random() * availableBreakfasts.length)]
  : breakfastPool[Math.floor(Math.random() * breakfastPool.length)];

const selectedLunch = availableLunches.length > 0 
  ? availableLunches[Math.floor(Math.random() * availableLunches.length)]
  : lunchPool[Math.floor(Math.random() * lunchPool.length)];

const selectedDinners = [];
const dinnerOptions = availableDinners.length >= 3 ? availableDinners : dinnerPool;
const shuffledDinners = [...dinnerOptions].sort(() => 0.5 - Math.random());
selectedDinners.push({ ...shuffledDinners[0], day: "Monday / Tuesday" });
selectedDinners.push({ ...shuffledDinners[1], day: "Wednesday / Thursday" });
selectedDinners.push({ ...shuffledDinners[2], day: "Friday / Saturday / Sunday" });

// Aggregate required ingredients from selected recipes
const requiredIngredients = {};
const selectedRecipes = [selectedBreakfast, selectedLunch, ...selectedDinners];
selectedRecipes.forEach((recipe) => {
  recipe.ingredients.forEach((ing) => {
    const key = ing.key;
    if (!requiredIngredients[key]) {
      requiredIngredients[key] = 0;
    }
    requiredIngredients[key] += ing.amount;
  });
});

// Build shopping list
const activeShoppingList = {};
Object.keys(requiredIngredients).forEach((key) => {
  const amountNeeded = requiredIngredients[key];
  const itemDef = masterShoppingDatabase[key];
  
  if (!itemDef) {
    console.error(`Ingredient def not found in database: ${key}`);
    return;
  }
  
  // Apply allergy/exclusion check
  let skip = false;
  preferences.allergies.forEach((allergy) => {
    if (itemDef.name.toLowerCase().includes(allergy.toLowerCase())) skip = true;
  });
  preferences.avoidFoods.forEach((avoid) => {
    if (itemDef.name.toLowerCase().includes(avoid.toLowerCase())) skip = true;
  });
  
  if (skip) return;
  
  // Calculate quantity to purchase
  let unitsToBuy = 1;
  if (itemDef.unitType === "eggs" || itemDef.unitType === "wrap" || itemDef.unitType === "pack" || itemDef.unitType === "oz") {
    unitsToBuy = Math.ceil(amountNeeded / itemDef.unitSize);
  }
  
  const totalCost = itemDef.bogo ? (Math.ceil(unitsToBuy / 2) * itemDef.price) : (unitsToBuy * itemDef.price);
  
  // Determine standard units text for nice output
  let unitText = "unit";
  if (itemDef.unitType === "eggs") {
    unitText = "carton";
  } else if (itemDef.unitType === "wrap") {
    unitText = "pack";
  } else if (itemDef.unitType === "pack") {
    unitText = "pack";
  } else if (key === "chicken_breast" || key === "cod" || key === "salmon" || key === "shrimp") {
    unitText = "pack";
  } else if (key === "tomatoes" || key === "zucchini") {
    unitText = "lbs";
  } else if (key === "baby_spinach" || key === "feta_cheese" || key === "greek_yogurt" || key === "turkey_breast" || key === "hummus" || key === "chickpeas") {
    unitText = "pkg/can";
  } else if (key === "olive_oil") {
    unitText = "bottle";
  } else if (key === "garlic_cloves") {
    unitText = "bag";
  }
  
  activeShoppingList[key] = {
    name: itemDef.name,
    amount: unitsToBuy,
    unit: unitText,
    store: itemDef.store,
    price: itemDef.price,
    total: totalCost,
    category: itemDef.category,
    isStaple: itemDef.isStaple || false,
    bogo: itemDef.bogo || false
  };
});

const generatedMenu = {
  cuisine: preferences.favoriteCuisine,
  dietaryPreference: preferences.dietaryPreference,
  season: season,
  generatedAt: new Date().toISOString(),
  breakfast: selectedBreakfast,
  lunch: selectedLunch,
  dinners: selectedDinners,
  shoppingList: activeShoppingList
};

// Save menu to menu_status.json
let menuStatus = {
  weekEnding: new Date(Date.now() + (7 - new Date().getDay()) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next Sunday
  status: "pending",
  lastUpdated: new Date().toISOString(),
  menu: generatedMenu
};

try {
  fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');
  console.log('Successfully generated weekly menu and saved to menu_status.json.');
} catch (e) {
  console.error('Failed to write menu_status.json:', e.message);
  process.exit(1);
}
