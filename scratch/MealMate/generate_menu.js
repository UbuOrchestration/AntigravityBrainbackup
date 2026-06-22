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

// Recipe Database matching Mediterranean + Balanced style
const recipeDatabase = {
  breakfast: {
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
  lunch: {
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
  dinners: [
    {
      day: "Monday / Tuesday",
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
      day: "Wednesday / Thursday",
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
      day: "Friday / Saturday / Sunday",
      name: "Mediterranean Tomato & Bell Pepper Chicken Stir-fry",
      image: "mediterranean_chicken_stir_fry.png",
      prepTime: "15 mins",
      cookTime: "15 mins",
      ingredients: [
        { name: "Chicken Breast", amount: 18, unit: "oz", key: "chicken_breast" },
        { name: "Vine-Ripened Tomatoes", amount: 8, unit: "oz", key: "tomatoes" },
        { name: "Green Bell Peppers", amount: 6, unit: "oz", key: "bell_peppers" },
        { name: "Zucchini Squash", amount: 8, unit: "oz", key: "zucchini" },
        { name: "Pre-peeled Garlic cloves", amount: 2, unit: "cloves", key: "garlic_cloves", isStaple: true },
        { name: "Olive Oil", amount: 1, unit: "tbsp", key: "olive_oil", isStaple: true }
      ],
      instructions: "Sauté chicken strips with garlic in olive oil. Add sliced bell peppers, zucchini, and tomatoes. Cook until tender."
    }
  ]
};

// Aggregated Grocery Shopping List with Price Comparison
// Optimized for Delivery (Zip 32825) across stores
const shoppingDatabase = {
  chicken_breast: { name: "Chicken Breast (Bulk Pack)", amount: 4.5, unit: "lbs", store: "Aldi", price: 2.29, total: 10.31, category: "Proteins" },
  eggs: { name: "Large Brown Eggs (18-ct)", amount: 1, unit: "carton", store: "Aldi", price: 2.49, total: 2.49, category: "Proteins" },
  tomatoes: { name: "Vine-Ripened Tomatoes", amount: 2, unit: "lbs", store: "Publix", price: 1.99, total: 3.98, category: "Produce", bogo: true },
  zucchini: { name: "Zucchini Squash", amount: 3, unit: "lbs", store: "Aldi", price: 1.29, total: 3.87, category: "Produce" },
  bell_peppers: { name: "Green Bell Peppers (3-pack)", amount: 1, unit: "pack", store: "Aldi", price: 1.49, total: 1.49, category: "Produce" },
  baby_spinach: { name: "Fresh Baby Spinach (16 oz container)", amount: 1, unit: "tub", store: "Walmart", price: 3.48, total: 3.48, category: "Produce" },
  feta_cheese: { name: "Feta Cheese (8 oz block)", amount: 1, unit: "block", store: "Key Food", price: 3.99, total: 3.99, category: "Dairy & Deli" },
  greek_yogurt: { name: "Plain Greek Yogurt (32 oz)", amount: 1, unit: "tub", store: "Walmart", price: 3.42, total: 3.42, category: "Dairy & Deli" },
  tortillas: { name: "Flour Tortillas (10-ct)", amount: 1, unit: "pack", store: "Walmart", price: 1.98, total: 1.98, category: "Pantry Staples" },
  olive_oil: { name: "Extra Virgin Olive Oil (17 oz)", amount: 1, unit: "bottle", store: "Aldi", price: 4.89, total: 4.89, category: "Pantry Staples", isStaple: true },
  garlic_cloves: { name: "Pre-peeled Garlic cloves (6 oz bag)", amount: 1, unit: "bag", store: "Key Food", price: 1.69, total: 1.69, category: "Pantry Staples", isStaple: true }
};

// Adjust quantities or filter based on exclusions/allergies
const activeShoppingList = {};
Object.keys(shoppingDatabase).forEach((key) => {
  const item = shoppingDatabase[key];
  
  // Basic allergy check
  let skip = false;
  preferences.allergies.forEach((allergy) => {
    if (item.name.toLowerCase().includes(allergy.toLowerCase())) {
      skip = true;
    }
  });
  preferences.avoidFoods.forEach((avoid) => {
    if (item.name.toLowerCase().includes(avoid.toLowerCase())) {
      skip = true;
    }
  });

  if (!skip) {
    activeShoppingList[key] = item;
  }
});

const generatedMenu = {
  cuisine: preferences.favoriteCuisine,
  dietaryPreference: preferences.dietaryPreference,
  season: season,
  generatedAt: new Date().toISOString(),
  breakfast: recipeDatabase.breakfast,
  lunch: recipeDatabase.lunch,
  dinners: recipeDatabase.dinners,
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
