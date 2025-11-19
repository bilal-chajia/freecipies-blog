-- Freecipies Blog Platform - Sample Data
-- This script populates the database with sample data for testing.
-- Use `wrangler d1 execute <db-name> --file=./data.sql` to run it.

-- Use INSERT OR IGNORE to prevent errors on re-running the script.

-- =============================================
-- Categories
-- =============================================
INSERT OR IGNORE INTO categories (slug, label, headline, meta_title, meta_description, short_description, tldr, collection_title, is_online, sort_order) VALUES
('breakfast', 'Breakfast', 'Start Your Day Right', 'Delicious Breakfast Recipes', 'Find easy and delicious breakfast recipes to start your day.', 'Easy and delicious breakfast ideas.', 'Breakfast recipes.', 'All Breakfast Recipes', 1, 10),
('dinner', 'Dinner', 'Delicious Dinner Ideas', 'Easy Dinner Recipes for Every Night', 'Quick and easy dinner recipes for your family.', 'Family-friendly dinner ideas.', 'Dinner recipes.', 'All Dinner Recipes', 1, 20),
('desserts', 'Desserts', 'Sweet Treats & Desserts', 'Indulgent Dessert Recipes', 'Satisfy your sweet tooth with these dessert recipes.', 'Decadent and easy desserts.', 'Dessert recipes.', 'All Dessert Recipes', 1, 30),
('quick-easy', 'Quick & Easy', '30-Minute Meals', 'Quick and Easy Recipes', 'Meals on the table in 30 minutes or less.', 'Fast and simple meals.', '30-minute meals.', 'All Quick & Easy Recipes', 1, 40);

-- =============================================
-- Authors
-- =============================================
INSERT OR IGNORE INTO authors (slug, name, email, job, meta_title, meta_description, short_description, tldr, bio_json, is_online) VALUES
('katt-lawrence', 'Katt Lawrence', 'katt@example.com', 'Head Chef', 'About Katt Lawrence', 'Katt Lawrence is a professional chef with over 10 years of experience.', 'Professional chef with a passion for Italian cuisine.', 'Chef specializing in Italian food.', '{"paragraphs": ["Katt has worked in kitchens all over the world, bringing a unique global perspective to her cooking. She believes that good food starts with fresh, simple ingredients."], "networks": [{"name": "twitter", "url": "https://twitter.com/katt"}]}', 1),
('john-doe', 'John Doe', 'john@example.com', 'Food Blogger', 'About John Doe', 'John Doe is a food blogger who loves creating simple, healthy recipes.', 'Food blogger focused on healthy and simple meals.', 'Healthy food blogger.', '{"paragraphs": ["John started his blog to share his journey towards a healthier lifestyle. His recipes are designed to be accessible to everyone, regardless of their cooking skill."], "networks": [{"name": "instagram", "url": "https://instagram.com/johndoe"}]}', 1);

-- =============================================
-- Tags
-- =============================================
INSERT OR IGNORE INTO tags (slug, label, headline, meta_title, meta_description, short_description, tldr, collection_title, is_online) VALUES
('italian', 'Italian', 'Authentic Italian Cuisine', 'Italian Food Recipes', 'Classic Italian recipes from our kitchen to yours.', 'Authentic Italian dishes.', 'Italian food.', 'All Italian Recipes', 1),
('seafood', 'Seafood', 'Fresh Seafood Dishes', 'Delicious Seafood Recipes', 'From shrimp to salmon, find your next favorite seafood dish.', 'Fresh and simple seafood.', 'Seafood dishes.', 'All Seafood Recipes', 1),
('vegan', 'Vegan', 'Plant-Based Recipes', 'Vegan Recipes for Everyone', 'Delicious and easy plant-based recipes.', '100% plant-based meals.', 'Vegan food.', 'All Vegan Recipes', 1),
('gluten-free', 'Gluten-Free', 'Gluten-Free Cooking', 'Tasty Gluten-Free Recipes', 'Enjoy delicious meals without gluten.', 'Gluten-free friendly.', 'Gluten-free recipes.', 'All Gluten-Free Recipes', 1),
('quick-meals', 'Quick Meals', 'Meals in Minutes', 'Quick Meal Recipes', 'Get food on the table in no time.', 'Fast and easy meals.', 'Quick meals.', 'All Quick Meals', 1),
('baking', 'Baking', 'Baking & Pastry', 'Baking Recipes', 'From bread to cakes, master the art of baking.', 'Home baking recipes.', 'Baking from scratch.', 'All Baking Recipes', 1),
('meal-prep', 'Meal Prep', 'Meal Prep Ideas', 'Easy Meal Prep Recipes', 'Plan your week with these easy meal prep ideas.', 'Save time with meal prep.', 'Meal prep.', 'All Meal Prep Recipes', 1);

-- =============================================
-- Articles
-- =============================================

-- Article 1: Recipe
INSERT OR IGNORE INTO articles (
    slug, type, category_slug, author_slug, label, headline,
    meta_title, meta_description, short_description, tldr, introduction,
    is_online, published_at, recipe_json, faqs_json, keywords_json
) VALUES (
    'spaghetti-puttanesca', 'recipe', 'dinner', 'katt-lawrence', 'Spaghetti Puttanesca', 'A Taste of Naples: Classic Spaghetti Puttanesca',
    'Classic Spaghetti Puttanesca Recipe', 'An easy and flavorful Spaghetti Puttanesca recipe with anchovies, olives, and capers. A perfect weeknight dinner.',
    'A classic Italian pasta dish from Naples, made with tomatoes, olive oil, anchovies, olives, and capers.', 'Classic, salty, and savory Italian pasta.',
    'Spaghetti alla Puttanesca is a classic Italian pasta dish believed to have originated in Naples. Its name is famously colorful, but the dish itself is a testament to the power of pantry staples. This is a quick, fragrant, and intensely flavorful meal that you can whip up any night of the week.',
    1, '2024-10-20 10:00:00',
    '{
        "prepTime": "10 min",
        "cookTime": "20 min",
        "servings": "4",
        "ingredients": [
            {"group": "Main", "items": ["1 lb spaghetti", "4 tbsp olive oil", "4 cloves garlic, minced", "6 anchovy fillets, chopped", "1 (28-ounce) can crushed tomatoes", "1/2 cup Kalamata olives, halved", "3 tbsp capers, rinsed", "1/2 tsp red pepper flakes", "Salt and black pepper to taste", "1/4 cup fresh parsley, chopped"]}
        ],
        "instructions": [
            {"group": "Main", "steps": ["Cook spaghetti according to package directions.", "In a large skillet, heat olive oil over medium heat. Add garlic and anchovies and cook until fragrant, about 1-2 minutes.", "Add crushed tomatoes, olives, capers, and red pepper flakes. Simmer for 15-20 minutes.", "Drain spaghetti and add to the skillet with the sauce. Toss to combine.", "Serve immediately, garnished with fresh parsley."]}
        ],
        "nutrition": {"calories": "450", "protein": "15g", "carbs": "70g", "fat": "12g"}
    }',
    '[
        {"question": "Can I make this without anchovies?", "answer": "Yes, for a vegetarian version, you can omit the anchovies. The flavor will be different but still delicious."}
    ]',
    '["pasta", "italian", "puttanesca", "dinner"]'
);

-- Article 2: Recipe
INSERT OR IGNORE INTO articles (
    slug, type, category_slug, author_slug, label, headline,
    meta_title, meta_description, short_description, tldr, introduction,
    is_online, published_at, recipe_json, keywords_json
) VALUES (
    'fluffy-vegan-pancakes', 'recipe', 'breakfast', 'john-doe', 'Fluffy Vegan Pancakes', 'The Best Fluffy Vegan Pancakes You''ll Ever Make',
    'Easy Fluffy Vegan Pancakes Recipe', 'A simple recipe for light, fluffy, and delicious vegan pancakes. Perfect for a weekend breakfast!',
    'A foolproof recipe for making the fluffiest vegan pancakes from scratch. No eggs, no dairy, all delicious.', 'Easy, fluffy, dairy-free pancakes.',
    'Who says you need eggs and dairy for fluffy pancakes? This recipe proves that plant-based pancakes can be just as light, airy, and delicious as their traditional counterparts. Get ready for your new favorite breakfast!',
    1, '2024-10-22 09:00:00',
    '{
        "prepTime": "5 min",
        "cookTime": "15 min",
        "servings": "8 pancakes",
        "ingredients": [
            {"group": "Main", "items": ["1 1/2 cups all-purpose flour", "2 tbsp granulated sugar", "1 tbsp baking powder", "1/2 tsp salt", "1 1/4 cups unsweetened almond milk", "1 tbsp apple cider vinegar", "1 tsp vanilla extract"]}
        ],
        "instructions": [
            {"group": "Main", "steps": ["In a small bowl, mix almond milk and apple cider vinegar. Let sit for 5 minutes to create a ''buttermilk''.", "In a large bowl, whisk together flour, sugar, baking powder, and salt.", "Pour the vegan buttermilk and vanilla into the dry ingredients and mix until just combined. Do not overmix.", "Heat a lightly oiled griddle or frying pan over medium-high heat. Pour 1/4 cup of batter for each pancake.", "Cook until bubbles appear on the surface, then flip and cook until golden brown."]}
        ]
    }',
    '["pancakes", "vegan", "breakfast", "dairy-free"]'
);

-- Article 3: Blog Post
INSERT OR IGNORE INTO articles (
    slug, type, category_slug, author_slug, label, headline,
    meta_title, meta_description, short_description, tldr, introduction,
    is_online, published_at, content_json, keywords_json
) VALUES (
    '10-tips-for-meal-prep', 'article', 'quick-easy', 'john-doe', '10 Tips for Meal Prep', 'Master Your Week: 10 Essential Meal Prep Tips',
    '10 Essential Meal Prep Tips for Beginners', 'Save time, eat healthier, and reduce stress with these 10 essential meal prep tips for beginners.',
    'Learn how to meal prep effectively with these 10 simple tips. Perfect for anyone looking to save time and eat better.', 'Plan, prep, and save time.',
    'Meal prepping can feel overwhelming, but it doesn''t have to be. With a few simple strategies, you can set yourself up for a week of healthy, delicious, and stress-free meals. Here are our top 10 tips to get you started.',
    1, '2024-10-25 11:00:00',
    '{
        "sections": [
            {"type": "h2", "content": "1. Start Small"},
            {"type": "p", "content": "Don''t try to prep every meal for the entire week. Start with just lunches or breakfasts."},
            {"type": "h2", "content": "2. Make a Plan"},
            {"type": "p", "content": "Write down what you''re going to make before you go to the store. This prevents overbuying and food waste."},
            {"type": "h2", "content": "3. Invest in Good Containers"},
            {"type": "p", "content": "Airtight, microwave-safe containers are your best friend. Glass containers are a great option."}
        ]
    }',
    '["meal prep", "planning", "healthy eating", "tips"]'
);

-- Article 4: Recipe
INSERT OR IGNORE INTO articles (
    slug, type, category_slug, author_slug, label, headline,
    meta_title, meta_description, short_description, tldr, introduction,
    is_online, published_at, recipe_json, keywords_json
) VALUES (
    'gluten-free-chocolate-cake', 'recipe', 'desserts', 'katt-lawrence', 'Gluten-Free Chocolate Cake', 'The Ultimate Fudgy Gluten-Free Chocolate Cake',
    'Ultimate Gluten-Free Chocolate Cake Recipe', 'A rich, fudgy, and intensely chocolatey gluten-free cake that no one will guess is gluten-free.',
    'A decadent and moist chocolate cake made with gluten-free flour. The perfect dessert for any occasion.', 'Rich, fudgy, gluten-free cake.',
    'Finding a truly great gluten-free chocolate cake can be a challenge. Many are dry or have a strange texture. This recipe, however, is a game-changer. It''s rich, moist, and has a deep chocolate flavor that will satisfy any chocoholic.',
    1, '2024-10-28 15:00:00',
    '{
        "prepTime": "20 min",
        "cookTime": "35 min",
        "servings": "12",
        "ingredients": [
            {"group": "Cake", "items": ["1 1/2 cups gluten-free all-purpose flour blend", "1 1/2 cups granulated sugar", "3/4 cup unsweetened cocoa powder", "1 1/2 tsp baking soda", "3/4 tsp salt", "2 large eggs", "3/4 cup buttermilk", "1/2 cup vegetable oil", "1 tsp vanilla extract", "3/4 cup hot coffee"]},
            {"group": "Frosting", "items": ["1/2 cup unsalted butter, softened", "2/3 cup unsweetened cocoa powder", "3 cups powdered sugar", "1/3 cup milk", "1 tsp vanilla extract"]}
        ],
        "instructions": [
            {"group": "Cake", "steps": ["Preheat oven to 350°F (175°C). Grease and flour two 9-inch round cake pans.", "In a large bowl, whisk together flour, sugar, cocoa, baking soda, and salt.", "Add eggs, buttermilk, oil, and vanilla. Beat on medium speed for 2 minutes.", "Stir in hot coffee. Batter will be thin.", "Pour evenly into prepared pans.", "Bake for 30-35 minutes or until a wooden pick inserted in the center comes out clean."]},
            {"group": "Frosting", "steps": ["Beat softened butter until creamy. Sift in cocoa powder and powdered sugar, alternating with milk.", "Beat until smooth and creamy. Stir in vanilla."]}
        ]
    }',
    '["chocolate", "cake", "gluten-free", "baking", "dessert"]'
);

-- =============================================
-- Article Tags (Junction Table)
-- =============================================
-- Note: This assumes the article and tag IDs are sequential starting from 1.
-- If you have existing data, you'll need to use the correct IDs.

-- Spaghetti Puttanesca (Article ID: 1) -> Italian (Tag ID: 1), Seafood (Tag ID: 2)
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (1, 1);
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (1, 2);

-- Fluffy Vegan Pancakes (Article ID: 2) -> Vegan (Tag ID: 3), Quick Meals (Tag ID: 5)
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (2, 3);
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (2, 5);

-- 10 Tips for Meal Prep (Article ID: 3) -> Meal Prep (Tag ID: 7), Quick Meals (Tag ID: 5)
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (3, 7);
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (3, 5);

-- Gluten-Free Chocolate Cake (Article ID: 4) -> Gluten-Free (Tag ID: 4), Baking (Tag ID: 6)
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (4, 4);
INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (4, 6);

-- =============================================
-- Pinterest Boards
-- =============================================
INSERT OR IGNORE INTO pinterest_boards (slug, name, description, board_url, is_active) VALUES
('main-recipes', 'Main Recipe Board', 'Our collection of delicious recipes.', 'https://pinterest.com/freecipies/main-recipes', 1),
('vegan-delights', 'Vegan Delights', 'The best plant-based recipes for a healthy lifestyle.', 'https://pinterest.com/freecipies/vegan-delights', 1),
('baking-creations', 'Baking Creations', 'Cakes, cookies, and all things baked!', 'https://pinterest.com/freecipies/baking-creations', 1);

-- =============================================
-- Pinterest Pins
-- =============================================
-- Note: This assumes article and board IDs are sequential starting from 1.

-- Pin for Spaghetti Puttanesca (Article ID: 1) on Main Recipes board (Board ID: 1)
INSERT OR IGNORE INTO pinterest_pins (article_id, board_id, title, description, image_url, is_primary) VALUES
(
    1, 1,
    'Easy Spaghetti Puttanesca - A 30-Minute Meal!',
    'Whip up this classic Italian pasta dish in just 30 minutes. Packed with flavor from olives, capers, and anchovies. The perfect weeknight dinner! #puttanesca #italianfood #pastarecipe',
    'https://example.com/images/puttanesca-pin.jpg', 1
);

-- Pin for Vegan Pancakes (Article ID: 2) on Vegan Delights board (Board ID: 2)
INSERT OR IGNORE INTO pinterest_pins (article_id, board_id, title, description, image_url, is_primary) VALUES
(
    2, 2,
    'Fluffy Vegan Pancakes (No Eggs, No Dairy)',
    'You won''t believe these light and fluffy pancakes are 100% vegan! The perfect weekend breakfast treat. #veganpancakes #veganbreakfast #plantbased',
    'https://example.com/images/vegan-pancakes-pin.jpg', 1
);

-- Second pin for Vegan Pancakes (Article ID: 2) on Main Recipes board (Board ID: 1)
INSERT OR IGNORE INTO pinterest_pins (article_id, board_id, title, description, image_url, is_primary) VALUES
(
    2, 1,
    'Easy Weekend Breakfast: Fluffy Pancakes',
    'Start your weekend off right with a stack of these delicious, fluffy pancakes. A family favorite!',
    'https://example.com/images/vegan-pancakes-pin-2.jpg', 0
);

-- Pin for Gluten-Free Chocolate Cake (Article ID: 4) on Baking Creations board (Board ID: 3)
INSERT OR IGNORE INTO pinterest_pins (article_id, board_id, title, description, image_url, is_primary) VALUES
(
    4, 3,
    'The Ultimate Fudgy Gluten-Free Chocolate Cake',
    'The only gluten-free chocolate cake recipe you''ll ever need. It''s rich, moist, and so easy to make! #glutenfree #chocolatecake #baking',
    'https://example.com/images/gf-cake-pin.jpg', 1
);


-- =============================================
-- Media (Example)
-- =============================================
INSERT OR IGNORE INTO media (filename, r2_key, url, mime_type, size_bytes, width, height, alt_text, uploaded_by) VALUES
('puttanesca-pin.jpg', 'pins/puttanesca-pin.jpg', 'https://r2.example.com/pins/puttanesca-pin.jpg', 'image/jpeg', 123456, 1000, 1500, 'A bowl of spaghetti puttanesca', 'katt-lawrence'),
('vegan-pancakes-pin.jpg', 'pins/vegan-pancakes-pin.jpg', 'https://r2.example.com/pins/vegan-pancakes-pin.jpg', 'image/jpeg', 234567, 1000, 1500, 'A stack of fluffy vegan pancakes with syrup', 'john-doe');


SELECT 'Sample data loaded successfully!' as status;