-- Additional Sample Data for Testing
-- Run with: npx wrangler d1 execute freecipies-db --local --file=./more-data.sql

-- =============================================
-- Step 1: Ensure Authors exist FIRST
-- =============================================
INSERT OR IGNORE INTO authors (slug, name, email, job, meta_title, meta_description, short_description, tldr, is_online) VALUES
('katt-lawrence', 'Katt Lawrence', 'katt@example.com', 'Head Chef', 'About Katt Lawrence', 'Katt Lawrence is a professional chef.', 'Professional chef with a passion for Italian cuisine.', 'Chef specializing in Italian food.', 1),
('john-doe', 'John Doe', 'john@example.com', 'Food Blogger', 'About John Doe', 'John Doe is a food blogger.', 'Food blogger focused on healthy meals.', 'Healthy food blogger.', 1);

-- =============================================
-- Step 2: Add More Categories
-- =============================================
INSERT OR IGNORE INTO categories (slug, label, headline, meta_title, meta_description, short_description, tldr, collection_title, is_online, sort_order, image_url) VALUES
('appetizers', 'Appetizers', 'Perfect Party Starters', 'Appetizer Recipes - Easy Starters', 'Delicious appetizer recipes for any occasion.', 'Quick and tasty appetizers.', 'Party starters.', 'All Appetizer Recipes', 1, 50, 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400'),
('soups-stews', 'Soups & Stews', 'Comforting Bowls', 'Hearty Soups and Stews', 'Warm and comforting soup recipes.', 'Hearty soups and stews.', 'Comfort in a bowl.', 'All Soup Recipes', 1, 60, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'),
('salads', 'Salads', 'Fresh & Healthy Salads', 'Healthy Salad Recipes', 'Fresh and nutritious salad recipes.', 'Fresh and vibrant salads.', 'Healthy salads.', 'All Salad Recipes', 1, 70, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'),
('snacks', 'Snacks', 'Quick Bites & Snacks', 'Easy Snack Recipes', 'Perfect snacks for any time.', 'Quick and easy snacks.', 'Tasty snacks.', 'All Snack Recipes', 1, 80, 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400'),
('beverages', 'Beverages', 'Refreshing Drinks', 'Drink & Beverage Recipes', 'Refreshing beverages for all seasons.', 'Delicious drinks.', 'Refreshing beverages.', 'All Beverage Recipes', 1, 90, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'),
('grilling', 'Grilling', 'BBQ & Grilling', 'Grilling Recipes - BBQ Ideas', 'Fire up the grill with these recipes.', 'BBQ and grilling favorites.', 'Grill masters.', 'All Grilling Recipes', 1, 100, 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400');

-- Ensure base categories exist
INSERT OR IGNORE INTO categories (slug, label, headline, meta_title, meta_description, short_description, tldr, collection_title, is_online, sort_order, image_url) VALUES
('breakfast', 'Breakfast', 'Start Your Day Right', 'Breakfast Recipes', 'Delicious breakfast recipes.', 'Easy breakfast ideas.', 'Breakfast recipes.', 'All Breakfast Recipes', 1, 10, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400'),
('dinner', 'Dinner', 'Delicious Dinner Ideas', 'Dinner Recipes', 'Quick and easy dinner recipes.', 'Family-friendly dinner ideas.', 'Dinner recipes.', 'All Dinner Recipes', 1, 20, 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?w=400'),
('desserts', 'Desserts', 'Sweet Treats', 'Dessert Recipes', 'Satisfy your sweet tooth.', 'Decadent desserts.', 'Dessert recipes.', 'All Dessert Recipes', 1, 30, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'),
('quick-easy', 'Quick & Easy', '30-Minute Meals', 'Quick Recipes', 'Meals in 30 min or less.', 'Fast and simple meals.', '30-minute meals.', 'All Quick Recipes', 1, 40, 'https://images.unsplash.com/photo-1495546968767-f0573cca821e?w=400');

-- Update existing categories with images
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400' WHERE slug = 'breakfast' AND image_url IS NULL;
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?w=400' WHERE slug = 'dinner' AND image_url IS NULL;
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400' WHERE slug = 'desserts' AND image_url IS NULL;
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1495546968767-f0573cca821e?w=400' WHERE slug = 'quick-easy' AND image_url IS NULL;

-- =============================================
-- Step 3: Add More Tags
-- =============================================
INSERT OR IGNORE INTO tags (slug, label, headline, meta_title, meta_description, short_description, tldr, collection_title, is_online, image_url) VALUES
('chicken', 'Chicken', 'Chicken Recipes', 'Delicious Chicken Recipes', 'All things chicken.', 'Chicken dishes.', 'Chicken recipes.', 'All Chicken Recipes', 1, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400'),
('beef', 'Beef', 'Beef Recipes', 'Hearty Beef Recipes', 'Steaks and roasts.', 'Beef dishes.', 'Beef recipes.', 'All Beef Recipes', 1, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400'),
('vegetarian', 'Vegetarian', 'Vegetarian Dishes', 'Vegetarian Recipes', 'Meatless meals.', 'Vegetarian options.', 'Veggie meals.', 'All Vegetarian Recipes', 1, 'https://images.unsplash.com/photo-1540914124281-342587941389?w=400'),
('low-carb', 'Low Carb', 'Low Carb Cooking', 'Low Carb Recipes', 'Low-carb meal ideas.', 'Low carb options.', 'Low carb.', 'All Low Carb Recipes', 1, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
('comfort-food', 'Comfort Food', 'Comfort Foods', 'Comfort Food Recipes', 'Soul-warming favorites.', 'Comfort classics.', 'Comfort food.', 'All Comfort Food Recipes', 1, 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400'),
('spicy', 'Spicy', 'Spicy Dishes', 'Spicy Food Recipes', 'Bring the heat.', 'Hot and spicy.', 'Spicy food.', 'All Spicy Recipes', 1, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400'),
('healthy', 'Healthy', 'Healthy Eating', 'Healthy Recipes', 'Nutritious recipes.', 'Healthy options.', 'Healthy eating.', 'All Healthy Recipes', 1, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'),
('one-pot', 'One Pot', 'One Pot Meals', 'One Pot Recipes', 'Easy cleanup.', 'One pot wonders.', 'One pot meals.', 'All One Pot Recipes', 1, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400');

-- =============================================
-- Step 4: Add More Recipe Articles
-- =============================================

INSERT OR IGNORE INTO articles (
    slug, type, category_slug, author_slug, label, headline,
    meta_title, meta_description, short_description, tldr, introduction,
    is_online, published_at, recipe_json, keywords_json, image_url, image_alt
) VALUES 
('honey-garlic-chicken', 'recipe', 'dinner', 'katt-lawrence', 'Honey Garlic Chicken', 'Irresistible Honey Garlic Chicken Thighs',
    'Easy Honey Garlic Chicken Recipe', 'Juicy chicken thighs in honey garlic sauce.', 'Crispy chicken with sticky honey garlic glaze.', 'Sweet and savory.', 'This Honey Garlic Chicken is impressive but easy.',
    1, '2024-11-01 12:00:00', '{"prepTime": "15 min", "cookTime": "25 min", "servings": "4", "ingredients": [{"group": "Main", "items": ["8 chicken thighs", "1/4 cup honey", "4 cloves garlic"]}], "instructions": [{"group": "Main", "steps": ["Season chicken", "Cook until golden", "Add sauce"]}]}', '["chicken", "honey", "dinner"]', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 'Honey garlic chicken'),

('classic-caesar-salad', 'recipe', 'salads', 'john-doe', 'Caesar Salad', 'Classic Caesar Salad with Homemade Dressing',
    'Authentic Caesar Salad Recipe', 'Perfect Caesar salad with creamy dressing.', 'Crispy romaine with Caesar dressing.', 'Classic salad done right.', 'A great Caesar salad is all about the dressing.',
    1, '2024-11-03 10:00:00', '{"prepTime": "20 min", "cookTime": "0 min", "servings": "4", "ingredients": [{"group": "Salad", "items": ["2 heads romaine", "1 cup croutons"]}], "instructions": [{"group": "Main", "steps": ["Make dressing", "Toss salad"]}]}', '["salad", "caesar", "healthy"]', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800', 'Caesar salad'),

('creamy-tomato-soup', 'recipe', 'soups-stews', 'katt-lawrence', 'Tomato Soup', 'Creamy Roasted Tomato Soup',
    'Best Creamy Tomato Soup Recipe', 'Rich roasted tomato soup with grilled cheese.', 'Velvety tomato soup with roasted garlic.', 'Comfort in a bowl.', 'Not your average canned tomato soup.',
    1, '2024-11-05 14:00:00', '{"prepTime": "15 min", "cookTime": "45 min", "servings": "6", "ingredients": [{"group": "Main", "items": ["3 lbs Roma tomatoes", "1 head garlic"]}], "instructions": [{"group": "Main", "steps": ["Roast tomatoes", "Blend", "Add cream"]}]}', '["soup", "tomato", "comfort"]', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800', 'Tomato soup'),

('street-style-beef-tacos', 'recipe', 'dinner', 'john-doe', 'Beef Tacos', 'Authentic Street-Style Beef Tacos',
    'Easy Street Tacos Recipe', 'Restaurant-quality beef tacos at home.', 'Seasoned beef in warm corn tortillas.', 'Taco night is better.', 'Simple, fresh, and packed with flavor.',
    1, '2024-11-07 18:00:00', '{"prepTime": "10 min", "cookTime": "15 min", "servings": "4", "ingredients": [{"group": "Meat", "items": ["1 lb ground beef", "1 tsp cumin"]}], "instructions": [{"group": "Main", "steps": ["Brown beef", "Add spices", "Serve"]}]}', '["tacos", "mexican", "beef"]', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800', 'Beef tacos'),

('perfect-avocado-toast', 'recipe', 'breakfast', 'john-doe', 'Avocado Toast', 'Perfect Avocado Toast with Poached Egg',
    'Best Avocado Toast Recipe', 'Elevate your breakfast with perfect avocado toast.', 'Creamy avocado on crispy toast.', 'Breakfast perfection.', 'Simple but details matter.',
    1, '2024-11-09 08:00:00', '{"prepTime": "5 min", "cookTime": "5 min", "servings": "2", "ingredients": [{"group": "Main", "items": ["2 slices sourdough", "1 avocado", "2 eggs"]}], "instructions": [{"group": "Main", "steps": ["Toast bread", "Mash avocado", "Poach egg"]}]}', '["breakfast", "avocado", "eggs"]', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800', 'Avocado toast'),

('grilled-salmon-lemon-herb', 'recipe', 'grilling', 'katt-lawrence', 'Grilled Salmon', 'Grilled Salmon with Lemon Herb Butter',
    'Perfect Grilled Salmon Recipe', 'Flaky grilled salmon with herb butter.', 'Perfectly grilled salmon with zesty butter.', 'Elegant yet easy.', 'Get perfectly flaky fish every time.',
    1, '2024-11-10 19:00:00', '{"prepTime": "10 min", "cookTime": "12 min", "servings": "4", "ingredients": [{"group": "Salmon", "items": ["4 salmon fillets", "2 tbsp olive oil"]}], "instructions": [{"group": "Main", "steps": ["Season salmon", "Grill 5 min per side"]}]}', '["salmon", "grilling", "seafood"]', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800', 'Grilled salmon'),

('fudgy-chocolate-brownies', 'recipe', 'desserts', 'katt-lawrence', 'Chocolate Brownies', 'Fudgy Chocolate Brownies',
    'Best Fudgy Brownie Recipe', 'Rich, fudgy brownies better than box mix.', 'Dense, fudgy brownies with crackly top.', 'Chocolate heaven.', 'The real deal - dense and chocolatey.',
    1, '2024-11-12 15:00:00', '{"prepTime": "15 min", "cookTime": "30 min", "servings": "16", "ingredients": [{"group": "Main", "items": ["1/2 cup butter", "8 oz chocolate", "1 cup sugar"]}], "instructions": [{"group": "Main", "steps": ["Melt butter and chocolate", "Mix and bake"]}]}', '["brownies", "chocolate", "dessert"]', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800', 'Chocolate brownies'),

('spinach-artichoke-dip', 'recipe', 'appetizers', 'john-doe', 'Spinach Artichoke Dip', 'Creamy Baked Spinach Artichoke Dip',
    'Best Spinach Artichoke Dip Recipe', 'Hot, bubbly, and irresistibly creamy dip.', 'Cheesy dip with spinach and artichokes.', 'Party favorite.', 'This dip disappears fast at every party.',
    1, '2024-11-14 17:00:00', '{"prepTime": "15 min", "cookTime": "25 min", "servings": "8", "ingredients": [{"group": "Main", "items": ["8 oz cream cheese", "1 cup Parmesan", "10 oz spinach"]}], "instructions": [{"group": "Main", "steps": ["Mix all ingredients", "Bake 25 min"]}]}', '["dip", "appetizer", "party"]', 'https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=800', 'Spinach artichoke dip');

SELECT 'Additional sample data loaded successfully!' as status;
