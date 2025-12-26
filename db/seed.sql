/**
 * Seed Data Script for recipes-saas
 * Aligned with: db/schema.sql
 * 
 * ALL FIELDS POPULATED for frontend testing (including optional JSON structures)
 * 
 * Run with: wrangler d1 execute recipes-saas --local --file=db/seed.sql
 */

-- ============================================================================
-- CLEANUP (Order matters due to foreign keys)
-- ============================================================================
DELETE FROM articles_to_tags;
DELETE FROM articles;
DELETE FROM equipment;
DELETE FROM tags;
DELETE FROM authors;
DELETE FROM categories;

-- ============================================================================
-- CATEGORIES (All 21 fields populated)
-- ============================================================================
INSERT INTO categories (
  slug, label, parent_id, depth, headline, collection_title, short_description,
  images_json, color, icon_svg, is_featured, seo_json, config_json, i18n_json,
  sort_order, is_online, cached_post_count, created_at
) VALUES
(
  'breakfast',
  'Breakfast',
  NULL,
  0,
  'Delicious Breakfast Recipes',
  'Start Your Day Right',
  'Start your day right with these delicious breakfast recipes from fluffy pancakes to savory eggs.',
  '{"thumbnail":{"media_id":1,"alt":"Breakfast spread","placeholder":"data:image/webp;base64,UklGR...","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=360","width":360,"height":240}}},"cover":{"media_id":2,"alt":"Morning breakfast table","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=2048","width":2048,"height":1152},"md":{"url":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200","width":1200,"height":675},"sm":{"url":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=720","width":720,"height":405},"xs":{"url":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=360","width":360,"height":203}}}}',
  '#f59e0bff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-1.27 0-2.4.8-2.82 2H3v2h1v11a2 2 0 002 2h12a2 2 0 002-2V7h1V5h-6.18C14.4 3.8 13.27 3 12 3zm0 2a1 1 0 110 2 1 1 0 010-2z"/></svg>',
  1,
  '{"metaTitle":"Breakfast Recipes - Easy Morning Meals | Freecipies","metaDescription":"Discover 50+ delicious breakfast recipes from fluffy pancakes to healthy smoothie bowls.","noIndex":false,"canonical":null,"ogImage":"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200","twitterCard":"summary_large_image"}',
  '{"postsPerPage":12,"layoutMode":"grid","cardStyle":"full","showSidebar":true,"showFilters":true,"sortBy":"publishedAt","sortOrder":"desc","headerStyle":"hero"}',
  '{"fr":{"label":"Petit-déjeuner","headline":"Recettes de petit-déjeuner"},"es":{"label":"Desayuno","headline":"Recetas de desayuno"}}',
  10,
  1,
  15,
  datetime('now')
),
(
  'main-dishes',
  'Main Dishes',
  NULL,
  0,
  'Hearty Main Course Recipes',
  'Satisfying Dinner Ideas',
  'Hearty main courses for lunch and dinner that your whole family will love.',
  '{"thumbnail":{"media_id":3,"alt":"Main dish platter","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=360","width":360,"height":240}}}}',
  '#ef4444ff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7z"/></svg>',
  1,
  '{"metaTitle":"Main Dishes - Dinner Recipes | Freecipies","metaDescription":"Find the perfect main course for dinner. From pasta to grilled meats."}',
  '{"postsPerPage":12,"layoutMode":"grid","cardStyle":"full"}',
  '{"fr":{"label":"Plats principaux"},"es":{"label":"Platos principales"}}',
  20,
  1,
  25,
  datetime('now')
),
(
  'desserts',
  'Desserts',
  NULL,
  0,
  'Sweet Dessert Recipes',
  'Indulgent Treats',
  'Sweet treats and indulgent desserts from cookies to cakes and everything in between.',
  '{"thumbnail":{"media_id":4,"alt":"Chocolate cake slice","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=360","width":360,"height":240}}}}',
  '#ec4899ff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01z"/></svg>',
  1,
  '{"metaTitle":"Dessert Recipes - Cakes, Cookies & More | Freecipies","metaDescription":"Satisfy your sweet tooth with our collection of dessert recipes."}',
  '{"postsPerPage":16,"layoutMode":"masonry","cardStyle":"full"}',
  '{"fr":{"label":"Desserts"},"es":{"label":"Postres"}}',
  30,
  1,
  40,
  datetime('now')
),
(
  'appetizers',
  'Appetizers',
  NULL,
  0,
  'Easy Appetizer Recipes',
  'Party Starters',
  'Perfect starters and party snacks that will impress your guests.',
  '{"thumbnail":{"media_id":5,"alt":"Appetizer platter","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1541014741259-de529411b96a?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1541014741259-de529411b96a?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1541014741259-de529411b96a?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1541014741259-de529411b96a?w=360","width":360,"height":240}}}}',
  '#8b5cf6ff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 3a3 3 0 00-3 3c0 .36.07.71.18 1.03L12 10.21 8.82 7.03C8.93 6.71 9 6.36 9 6a3 3 0 10-4.5 2.6L6 12l-1.5 3.4A3 3 0 109 18c0-.36-.07-.71-.18-1.03L12 13.79l3.18 3.18c-.11.32-.18.67-.18 1.03a3 3 0 104.5-2.6L18 12l1.5-3.4A3 3 0 0018 3z"/></svg>',
  0,
  '{"metaTitle":"Appetizer Recipes - Starters & Snacks | Freecipies"}',
  '{"postsPerPage":12,"layoutMode":"grid"}',
  '{}',
  40,
  1,
  12,
  datetime('now')
),
(
  'salads',
  'Salads',
  NULL,
  0,
  'Fresh Salad Recipes',
  'Healthy Greens',
  'Fresh and healthy salad recipes for every season.',
  '{"thumbnail":{"media_id":6,"alt":"Fresh salad bowl","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=360","width":360,"height":240}}}}',
  '#22c55eff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.75 3c-.69 0-2.13.58-3.96 2.08C12.13 3.58 10.69 3 10 3c-.78 0-2.26.63-4.2 2.29L5.2 4.5l-.7.71 6.5 6.5v7.29h2v-7.29l6.5-6.5-.7-.71-.6.79C16.26 3.63 14.78 3 14 3h3.75z"/></svg>',
  0,
  '{"metaTitle":"Salad Recipes - Fresh & Healthy | Freecipies"}',
  '{"postsPerPage":12,"layoutMode":"grid"}',
  '{}',
  50,
  1,
  18,
  datetime('now')
),
(
  'soups',
  'Soups',
  NULL,
  0,
  'Comforting Soup Recipes',
  'Warm Bowls',
  'Warm and comforting soup recipes perfect for cold days.',
  '{"thumbnail":{"media_id":7,"alt":"Bowl of soup","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=360","width":360,"height":240}}}}',
  '#f97316ff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5c1.38 0 2.5-1.12 2.5-2.5V8c0-.55-.45-1-1-1h-4z"/></svg>',
  0,
  '{"metaTitle":"Soup Recipes - Comfort Food | Freecipies"}',
  '{"postsPerPage":12,"layoutMode":"grid"}',
  '{}',
  60,
  1,
  10,
  datetime('now')
),
(
  'drinks',
  'Drinks',
  NULL,
  0,
  'Refreshing Drink Recipes',
  'Beverages & Cocktails',
  'Refreshing beverages, smoothies, and cocktails for every occasion.',
  '{"thumbnail":{"media_id":8,"alt":"Colorful drinks","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1544145945-f90425340c7e?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1544145945-f90425340c7e?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1544145945-f90425340c7e?w=360","width":360,"height":240}}}}',
  '#06b6d4ff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 14c0 1.3.84 2.4 2 2.82V20H3v2h6v-2H7v-3.18C8.16 16.4 9 15.3 9 14V6H3v8zm2-6h2v3H5V8zm15.64 1L19 4h-4l-1.64 5H12v10h2v3h6v-3h2V9h-1.36zM18 19h-2v-9h2v9z"/></svg>',
  0,
  '{"metaTitle":"Drink Recipes - Smoothies & Cocktails | Freecipies"}',
  '{"postsPerPage":12,"layoutMode":"grid"}',
  '{}',
  70,
  1,
  8,
  datetime('now')
),
(
  'baking',
  'Baking',
  NULL,
  0,
  'Baking Recipes & Techniques',
  'From the Oven',
  'Bread, pastries, and baked goods from beginner to advanced.',
  '{"thumbnail":{"media_id":9,"alt":"Fresh baked bread","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=360","width":360,"height":240}}}}',
  '#a855f7ff',
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.78 3.55 15.57 2 12 2zM7 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm5 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',
  1,
  '{"metaTitle":"Baking Recipes - Bread, Cakes & Pastries | Freecipies"}',
  '{"postsPerPage":12,"layoutMode":"grid"}',
  '{}',
  80,
  1,
  22,
  datetime('now')
);

-- ============================================================================
-- AUTHORS (All fields populated with full JSON structures)
-- ============================================================================
INSERT INTO authors (
  slug, name, email, job_title, role, headline, subtitle, short_description,
  excerpt, introduction, images_json, bio_json, seo_json, cached_post_count,
  is_featured, sort_order, is_online, created_at
) VALUES
(
  'chef-maria',
  'Chef Maria',
  'maria@recipes-saas.com',
  'Head Chef & Founder',
  'admin',
  'Meet Chef Maria, Our Head Chef & Founder',
  'Bringing Mediterranean flavors to your kitchen since 2010',
  'Professional chef with 15 years of experience in Mediterranean cuisine, specializing in healthy, flavor-forward recipes.',
  'Maria has dedicated her career to making restaurant-quality Mediterranean food accessible to home cooks. Her recipes have been featured in Food & Wine, Bon Appétit, and The New York Times.',
  '## About Chef Maria

Maria grew up in a small coastal town in southern Italy, where she learned to cook from her grandmother. After training at the Culinary Institute of America and working in Michelin-starred restaurants across Europe, she founded Freecipies to share her passion for simple, delicious food.

### Cooking Philosophy
"Great food doesn''t need to be complicated. The best dishes start with quality ingredients and simple techniques."

### Awards & Recognition
- 2023 James Beard Award Nominee
- Featured in Food & Wine Magazine
- Author of "Mediterranean Every Day"',
  '{"avatar":{"media_id":101,"alt":"Chef Maria headshot","placeholder":"data:image/webp;base64,UklGR...","aspectRatio":"1:1","variants":{"original":{"url":"https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=800","width":800,"height":800},"lg":{"url":"https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=400","width":400,"height":400},"md":{"url":"https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200","width":200,"height":200},"sm":{"url":"https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=100","width":100,"height":100},"xs":{"url":"https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=50","width":50,"height":50}}},"cover":{"media_id":102,"alt":"Maria in her kitchen","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2048","width":2048,"height":1152},"md":{"url":"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200","width":1200,"height":675},"sm":{"url":"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=720","width":720,"height":405},"xs":{"url":"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=360","width":360,"height":203}}}}',
  '{"short":"Maria brings 15+ years of Mediterranean culinary expertise to every recipe.","long":"## Background\n\nBorn in coastal Italy, trained at CIA, worked in Michelin restaurants.\n\n## Specialties\n- Mediterranean cuisine\n- Healthy cooking\n- Italian classics","socials":[{"network":"instagram","url":"https://instagram.com/chefmaria","label":"@chefmaria"},{"network":"twitter","url":"https://x.com/chefmaria","label":"@chefmaria"},{"network":"youtube","url":"https://youtube.com/@chefmariacooks"},{"network":"website","url":"https://chefmaria.com","label":"Personal Website"}]}',
  '{"metaTitle":"Chef Maria - Head Chef & Founder | Freecipies","metaDescription":"Meet Chef Maria, our head chef with 15+ years of Mediterranean culinary experience.","noIndex":false,"ogImage":"https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=1200","twitterCard":"summary_large_image"}',
  45,
  1,
  10,
  1,
  datetime('now')
),
(
  'john-baker',
  'John Baker',
  'john@recipes-saas.com',
  'Pastry Chef',
  'writer',
  'Meet John Baker, Our Pastry Expert',
  'Master of French pastry and artisan bread',
  'Specialist in French pastry and artisan bread making with a focus on teaching home bakers.',
  'John trained at Le Cordon Bleu Paris and has worked in some of the world''s finest patisseries. His mission: making French pastry accessible to everyone.',
  '## About John

John discovered his love for baking at age 12 when he made his first croissant. What started as a hobby became a lifelong passion.

### Training
- Le Cordon Bleu, Paris (2008)
- Apprenticeship at Pierre Hermé

### Philosophy
"Baking is science meets art. Precision matters, but so does intuition."',
  '{"avatar":{"media_id":103,"alt":"John Baker portrait","aspectRatio":"1:1","variants":{"lg":{"url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400","width":400,"height":400},"md":{"url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200","width":200,"height":200},"sm":{"url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100","width":100,"height":100},"xs":{"url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50","width":50,"height":50}}}}',
  '{"short":"John is our pastry wizard, trained at Le Cordon Bleu Paris.","long":"French pastry specialist with 12 years of professional experience.","socials":[{"network":"instagram","url":"https://instagram.com/johnbaker","label":"@johnbaker"},{"network":"youtube","url":"https://youtube.com/@johnbakespastry"}]}',
  '{"metaTitle":"John Baker - Pastry Chef | Freecipies","metaDescription":"Meet John, our pastry expert trained at Le Cordon Bleu Paris."}',
  28,
  1,
  20,
  1,
  datetime('now')
),
(
  'sarah-green',
  'Sarah Green',
  'sarah@recipes-saas.com',
  'Nutritionist & Recipe Developer',
  'writer',
  'Meet Sarah Green, Our Nutrition Expert',
  'Making healthy eating delicious and accessible',
  'Registered dietitian creating healthy, delicious recipes for everyday cooking.',
  'Sarah believes healthy eating should never mean sacrificing flavor. Her recipes focus on whole foods and balanced nutrition.',
  '## About Sarah

Sarah is a registered dietitian with a passion for translating nutrition science into practical, delicious meals.

### Credentials
- MS, Nutrition Science, Cornell University
- Registered Dietitian (RD)
- Certified Personal Trainer

### Specialties
- Plant-based cooking
- Meal prep strategies
- Family-friendly healthy meals',
  '{"avatar":{"media_id":104,"alt":"Sarah Green headshot","aspectRatio":"1:1","variants":{"lg":{"url":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400","width":400,"height":400},"md":{"url":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200","width":200,"height":200},"sm":{"url":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100","width":100,"height":100},"xs":{"url":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50","width":50,"height":50}}}}',
  '{"short":"Sarah is our nutrition expert and registered dietitian.","long":"Creating healthy recipes backed by science.","socials":[{"network":"instagram","url":"https://instagram.com/sarahgreenrd","label":"@sarahgreenrd"},{"network":"twitter","url":"https://x.com/sarahgreenrd"}]}',
  '{"metaTitle":"Sarah Green - Nutritionist | Freecipies","metaDescription":"Sarah is our registered dietitian specializing in healthy, delicious recipes."}',
  35,
  0,
  30,
  1,
  datetime('now')
);

-- ============================================================================
-- TAGS (All fields populated)
-- ============================================================================
INSERT INTO tags (
  slug, label, description, filter_groups_json, style_json, cached_post_count, created_at
) VALUES
('quick-easy', 'Quick & Easy', 'Recipes ready in 30 minutes or less', '["time","difficulty"]', '{"color":"#22c55e","icon":"clock"}', 42, datetime('now')),
('vegetarian', 'Vegetarian', 'Meat-free recipes for every meal', '["diet"]', '{"color":"#16a34a","icon":"leaf"}', 38, datetime('now')),
('vegan', 'Vegan', 'Plant-based recipes with no animal products', '["diet"]', '{"color":"#15803d","icon":"seedling"}', 25, datetime('now')),
('gluten-free', 'Gluten Free', 'Recipes without gluten for sensitive diets', '["diet","allergy"]', '{"color":"#eab308","icon":"wheat-off"}', 20, datetime('now')),
('healthy', 'Healthy', 'Nutritious and balanced meals for wellness', '["diet","lifestyle"]', '{"color":"#22c55e","icon":"heart"}', 55, datetime('now')),
('comfort-food', 'Comfort Food', 'Hearty and satisfying dishes for the soul', '["mood","cuisine"]', '{"color":"#f97316","icon":"home"}', 30, datetime('now')),
('family-friendly', 'Family Friendly', 'Kid-approved recipes the whole family loves', '["audience"]', '{"color":"#ec4899","icon":"users"}', 28, datetime('now')),
('budget-friendly', 'Budget Friendly', 'Affordable everyday meals under $10', '["cost"]', '{"color":"#84cc16","icon":"dollar"}', 22, datetime('now')),
('meal-prep', 'Meal Prep', 'Great for batch cooking and weekly prep', '["technique","lifestyle"]', '{"color":"#8b5cf6","icon":"calendar"}', 18, datetime('now')),
('one-pot', 'One Pot', 'Minimal cleanup recipes in a single pot or pan', '["technique"]', '{"color":"#06b6d4","icon":"pot"}', 15, datetime('now')),
('summer', 'Summer', 'Perfect recipes for warm weather entertaining', '["season"]', '{"color":"#fbbf24","icon":"sun"}', 20, datetime('now')),
('winter', 'Winter', 'Cozy cold-weather favorites to warm you up', '["season"]', '{"color":"#3b82f6","icon":"snowflake"}', 18, datetime('now')),
('italian', 'Italian', 'Classic and modern Italian-inspired dishes', '["cuisine"]', '{"color":"#dc2626","icon":"flag-it"}', 35, datetime('now')),
('asian', 'Asian', 'Asian fusion and traditional recipes from across Asia', '["cuisine"]', '{"color":"#ea580c","icon":"chopsticks"}', 28, datetime('now')),
('mexican', 'Mexican', 'Mexican and Tex-Mex favorites with bold flavors', '["cuisine"]', '{"color":"#16a34a","icon":"flag-mx"}', 22, datetime('now'));

-- ============================================================================
-- EQUIPMENT (All fields populated)
-- ============================================================================
INSERT INTO equipment (
  slug, name, description, category, image_json, affiliate_url, affiliate_provider, is_active, sort_order, created_at
) VALUES
('stand-mixer', 'Stand Mixer', 'Essential for baking, dough kneading, and mixing. A must-have for serious home bakers.', 'appliances', '{"url":"https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=800","alt":"KitchenAid Stand Mixer","width":800,"height":600}', 'https://amazon.com/dp/B00005UP2P', 'amazon', 1, 10, datetime('now')),
('food-processor', 'Food Processor', 'For chopping, slicing, pureeing, and making dough. Saves hours of prep time.', 'appliances', '{"url":"https://images.unsplash.com/photo-1585515320310-259814833e62?w=800","alt":"Cuisinart Food Processor","width":800,"height":600}', 'https://amazon.com/dp/B01AXM4WV2', 'amazon', 1, 20, datetime('now')),
('cast-iron-skillet', 'Cast Iron Skillet', 'Versatile 12-inch pan for searing, baking, and frying. Develops better flavor over time.', 'cookware', '{"url":"https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=800","alt":"Lodge Cast Iron Skillet","width":800,"height":600}', 'https://amazon.com/dp/B00006JSUB', 'amazon', 1, 30, datetime('now')),
('dutch-oven', 'Dutch Oven', 'Perfect 6-quart enameled pot for soups, stews, braising, and bread.', 'cookware', '{"url":"https://images.unsplash.com/photo-1585237672814-8f85a8118bf6?w=800","alt":"Le Creuset Dutch Oven","width":800,"height":600}', 'https://amazon.com/dp/B000N501BK', 'amazon', 1, 40, datetime('now')),
('instant-pot', 'Instant Pot', '8-quart multi-function pressure cooker, slow cooker, rice cooker, and more.', 'appliances', '{"url":"https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=800","alt":"Instant Pot Duo","width":800,"height":600}', 'https://amazon.com/dp/B06Y1YD5W7', 'amazon', 1, 50, datetime('now')),
('sheet-pan', 'Sheet Pan', 'Heavy-duty 18x13 half sheet pan for roasting vegetables, baking, and more.', 'bakeware', '{"url":"https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800","alt":"Nordic Ware Sheet Pan","width":800,"height":600}', 'https://amazon.com/dp/B0049C2S32', 'amazon', 1, 60, datetime('now')),
('mixing-bowls', 'Mixing Bowls Set', 'Set of 5 stainless steel bowls in various sizes for all prep work.', 'tools', '{"url":"https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800","alt":"Stainless Steel Mixing Bowls","width":800,"height":600}', 'https://amazon.com/dp/B00LGLHUA0', 'amazon', 1, 70, datetime('now')),
('chef-knife', 'Chef Knife', 'Essential 8-inch German steel chef knife for all cutting tasks.', 'tools', '{"url":"https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800","alt":"Wusthof Chef Knife","width":800,"height":600}', 'https://amazon.com/dp/B00009ZK08', 'amazon', 1, 80, datetime('now'));

-- ============================================================================
-- SAMPLE ARTICLES with full JSON structures
-- ============================================================================
INSERT INTO articles (
  slug, type, locale, category_id, author_id,
  headline, subtitle, short_description, excerpt, introduction,
  images_json, content_json, recipe_json, faqs_json,
  related_articles_json, cached_tags_json, cached_category_json, cached_author_json,
  seo_json, config_json,
  workflow_status, is_online, is_favorite, view_count,
  reading_time_minutes, total_time_minutes, difficulty_label,
  published_at, created_at
) VALUES
-- Recipe 1: Chocolate Chip Cookies
(
  'chocolate-chip-cookies',
  'recipe',
  'en',
  (SELECT id FROM categories WHERE slug = 'desserts'),
  (SELECT id FROM authors WHERE slug = 'john-baker'),
  'The Best Chocolate Chip Cookie Recipe Ever',
  'Easy, soft, and chewy chocolate chip cookies that melt in your mouth',
  'The best chocolate chip cookie recipe ever! No weird ingredients, no chilling time, just easy, straightforward, amazingly delicious cookies ready in 30 minutes.',
  'These are the most amazing chocolate chip cookies you will ever taste. Soft, chewy, loaded with chocolate chips, and ready in just 30 minutes with no chilling required.',
  'I have been perfecting this chocolate chip cookie recipe for over 10 years, and I am thrilled to finally share it with you. After testing hundreds of variations, this is THE recipe that produces consistently perfect cookies every single time.',
  '{"hero":{"media_id":201,"alt":"The Best Chocolate Chip Cookies","caption":"Perfectly golden chocolate chip cookies","credit":"© John Baker / Freecipies","placeholder":"data:image/webp;base64,UklGR...","focal_point":{"x":50,"y":40},"aspectRatio":"16:9","variants":{"original":{"url":"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=4000","width":4000,"height":2666},"lg":{"url":"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=360","width":360,"height":240}}},"thumbnail":{"media_id":202,"alt":"Cookie closeup","variants":{"sm":{"url":"https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300","width":300,"height":300}}}}',
  '[{"type":"paragraph","text":"This really is the best chocolate chip cookie recipe ever. I have been making these for years and everyone who tastes them begs for the recipe!"},{"type":"heading","level":2,"text":"Why This Recipe Works"},{"type":"list","items":["No chilling required - cookies ready in 30 minutes","Uses both brown and white sugar for perfect texture","Room temperature butter creates a chewy center","Extra egg yolk adds richness"]},{"type":"paragraph","text":"The secret is in the combination of techniques: creaming the butter properly, using the right ratio of sugars, and knowing exactly when to take them out of the oven."},{"type":"heading","level":2,"text":"Tips for Perfect Cookies"},{"type":"paragraph","text":"**Room Temperature Butter**: This is crucial. Cold butter won''t cream properly, and melted butter will make flat cookies."},{"type":"paragraph","text":"**Don''t Overmix**: Once you add the flour, mix just until combined. Overmixing develops gluten and makes tough cookies."},{"type":"callout","style":"tip","text":"For extra thick cookies, chill the dough balls for 30 minutes before baking."}]',
  '{"prepTime":15,"cookTime":10,"totalTime":30,"servings":36,"servingSize":"1 cookie","difficulty":"Easy","calories":180,"yield":"36 cookies","cuisine":"American","course":"Dessert","keywords":["cookies","chocolate","baking","dessert"],"nutrition":{"calories":180,"fat":"9g","saturatedFat":"5g","carbohydrates":"24g","sugar":"16g","protein":"2g","sodium":"95mg"},"ingredients":[{"group_title":"Wet Ingredients","items":[{"name":"Salted butter (softened)","amount":"1","unit":"cup","notes":"room temperature"},{"name":"Granulated sugar","amount":"1","unit":"cup"},{"name":"Light brown sugar (packed)","amount":"1","unit":"cup"},{"name":"Pure vanilla extract","amount":"2","unit":"tsp"},{"name":"Large eggs","amount":"2","unit":"whole","notes":"room temperature"}]},{"group_title":"Dry Ingredients","items":[{"name":"All-purpose flour","amount":"3","unit":"cups","notes":"spooned and leveled"},{"name":"Baking soda","amount":"1","unit":"tsp"},{"name":"Baking powder","amount":"0.5","unit":"tsp"},{"name":"Sea salt","amount":"1","unit":"tsp"},{"name":"Chocolate chips","amount":"2","unit":"cups","notes":"semi-sweet or dark"}]}],"instructions":[{"section_title":"Preparation","steps":[{"text":"Preheat oven to 375°F (190°C). Line three baking sheets with parchment paper and set aside.","time":2,"image":null}]},{"section_title":"Mix Dry Ingredients","steps":[{"text":"In a medium bowl, whisk together flour, baking soda, baking powder, and salt. Set aside.","time":2}]},{"section_title":"Cream Butter and Sugars","steps":[{"text":"In a large bowl or stand mixer, cream together the softened butter, granulated sugar, and brown sugar until light and fluffy, about 3-4 minutes.","time":4,"tip":"Scrape down the sides of the bowl halfway through."},{"text":"Beat in eggs one at a time, then add vanilla extract. Mix until light and fluffy, about 1 minute.","time":2}]},{"section_title":"Combine and Bake","steps":[{"text":"Add the dry ingredients to the wet ingredients and mix on low speed just until combined. Do not overmix.","time":1},{"text":"Fold in the chocolate chips with a spatula or wooden spoon.","time":1},{"text":"Roll 2-3 tablespoons of dough into balls and place them 2 inches apart on prepared baking sheets.","time":5},{"text":"Bake for 8-10 minutes, until edges are golden but centers look slightly underdone.","time":10,"tip":"They will continue cooking on the hot pan."},{"text":"Let cookies cool on baking sheet for 5 minutes before transferring to a wire rack.","time":5}]}],"equipment":["stand-mixer","sheet-pan","mixing-bowls"],"notes":"Store in an airtight container at room temperature for up to 5 days. Freeze dough balls for up to 3 months.","video":{"url":"https://youtube.com/watch?v=example","duration":"PT8M30S"}}',
  '[{"question":"Can I use margarine instead of butter?","answer":"I don''t recommend it. Butter provides the best flavor and texture. If you must, use a high-quality baking margarine."},{"question":"Why are my cookies flat?","answer":"This usually happens when butter is too soft or melted, or when you don''t measure flour correctly. Always use the spoon-and-level method."},{"question":"Can I freeze the dough?","answer":"Yes! Freeze dough balls on a sheet pan, then transfer to a freezer bag. Bake from frozen, adding 2-3 minutes to baking time."},{"question":"How do I make them crispier?","answer":"Bake for 2-3 minutes longer until edges are more golden. You can also use all granulated sugar instead of brown sugar."}]',
  '[{"slug":"brownie-recipe","headline":"Best Fudgy Brownies"},{"slug":"sugar-cookies","headline":"Soft Sugar Cookies"},{"slug":"peanut-butter-cookies","headline":"Classic Peanut Butter Cookies"}]',
  '[{"id":6,"slug":"comfort-food","label":"Comfort Food"},{"id":7,"slug":"family-friendly","label":"Family Friendly"}]',
  '{"id":3,"slug":"desserts","label":"Desserts"}',
  '{"id":2,"slug":"john-baker","name":"John Baker","jobTitle":"Pastry Chef"}',
  '{"metaTitle":"Best Chocolate Chip Cookies Recipe - Soft & Chewy | Freecipies","metaDescription":"Make the best chocolate chip cookies ever with this easy recipe. Soft, chewy, no chilling required, ready in 30 minutes!","noIndex":false,"ogImage":"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=1200","twitterCard":"summary_large_image","jsonLd":{"@type":"Recipe"}}',
  '{"showNutrition":true,"showVideo":true,"showPrintButton":true,"showJumpToRecipe":true,"enableComments":true,"enableRatings":true}',
  'published',
  1,
  1,
  15420,
  8,
  30,
  'Easy',
  datetime('now', '-7 days'),
  datetime('now', '-14 days')
),
-- Recipe 2: Avocado Toast
(
  'avocado-toast',
  'recipe',
  'en',
  (SELECT id FROM categories WHERE slug = 'breakfast'),
  (SELECT id FROM authors WHERE slug = 'sarah-green'),
  'The Best Avocado Toast Recipe',
  'Simple, healthy, and endlessly customizable',
  'Avocado toast is a delicious and simple breakfast, snack or light meal! Learn how to make the BEST avocado toast with this recipe, plus 10 topping variations.',
  'This is the ultimate guide to avocado toast. Creamy, rich avocado on crispy golden toast, finished with flaky sea salt and your choice of toppings.',
  'Avocado toast became famous for good reason - it''s simple, nutritious, and absolutely delicious. I''m sharing my perfected method plus 10 creative variations.',
  '{"hero":{"media_id":203,"alt":"Perfect avocado toast with poached egg","caption":"Avocado toast with soft poached egg","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=360","width":360,"height":240}}}}',
  '[{"type":"paragraph","text":"Avocado toast is the perfect canvas for creativity. Once you master the basics, the topping possibilities are endless."},{"type":"heading","level":2,"text":"Choosing the Perfect Avocado"},{"type":"paragraph","text":"The key to great avocado toast is a perfectly ripe avocado. It should yield to gentle pressure but not feel mushy."}]',
  '{"prepTime":5,"cookTime":3,"totalTime":8,"servings":1,"difficulty":"Easy","calories":290,"cuisine":"American","course":"Breakfast","nutrition":{"calories":290,"fat":"21g","carbohydrates":"25g","fiber":"7g","protein":"6g"},"ingredients":[{"group_title":"Base","items":[{"name":"Thick-sliced sourdough bread","amount":"1","unit":"slice"},{"name":"Ripe avocado","amount":"0.5","unit":"whole"},{"name":"Fine sea salt","amount":"1","unit":"pinch"},{"name":"Fresh lemon juice","amount":"1","unit":"tsp"}]},{"group_title":"Optional Toppings","items":[{"name":"Red pepper flakes","amount":"1","unit":"pinch"},{"name":"Everything bagel seasoning","amount":"1","unit":"tsp"},{"name":"Soft poached egg","amount":"1","unit":"whole"}]}],"instructions":[{"section_title":"Toast","steps":[{"text":"Toast your bread until golden and crispy.","time":3}]},{"section_title":"Prepare Avocado","steps":[{"text":"Scoop avocado into a bowl, add salt and lemon juice, mash with a fork.","time":2}]},{"section_title":"Assemble","steps":[{"text":"Spread avocado on toast, add your favorite toppings.","time":1}]}],"equipment":["chef-knife"]}',
  '[{"question":"How do I ripen avocados faster?","answer":"Place them in a paper bag with a banana or apple for 1-2 days."},{"question":"Can I make this ahead?","answer":"Avocado browns quickly. Best made fresh, but you can slow browning by adding extra lemon juice."}]',
  '[{"slug":"breakfast-smoothie-bowl","headline":"Green Smoothie Bowl"},{"slug":"soft-scrambled-eggs","headline":"Perfect Soft Scrambled Eggs"}]',
  '[{"id":1,"slug":"quick-easy","label":"Quick & Easy"},{"id":2,"slug":"vegetarian","label":"Vegetarian"},{"id":5,"slug":"healthy","label":"Healthy"}]',
  '{"id":1,"slug":"breakfast","label":"Breakfast"}',
  '{"id":3,"slug":"sarah-green","name":"Sarah Green","jobTitle":"Nutritionist"}',
  '{"metaTitle":"Best Avocado Toast Recipe with Topping Ideas | Freecipies","metaDescription":"Make perfect avocado toast every time with our easy recipe plus 10 creative topping variations."}',
  '{"showNutrition":true,"showPrintButton":true}',
  'published',
  1,
  0,
  8750,
  3,
  8,
  'Easy',
  datetime('now', '-3 days'),
  datetime('now', '-7 days')
),
-- Recipe 3: Pasta Carbonara
(
  'pasta-carbonara',
  'recipe',
  'en',
  (SELECT id FROM categories WHERE slug = 'main-dishes'),
  (SELECT id FROM authors WHERE slug = 'chef-maria'),
  'Authentic Spaghetti alla Carbonara',
  'The real Roman classic - no cream allowed!',
  'Authentic carbonara uses no cream! Just eggs, cheese, guanciale, and pepper create the silky, rich sauce. Learn the proper Italian technique.',
  'This is the real deal Roman carbonara. No cream, no peas, no garlic - just pure, rich flavor from guanciale, Pecorino Romano, and fresh eggs.',
  'As someone who trained in Rome, I take carbonara very seriously. This recipe uses the authentic technique passed down from Roman trattorias for generations.',
  '{"hero":{"media_id":204,"alt":"Authentic pasta carbonara","caption":"Spaghetti alla Carbonara, the Roman way","credit":"© Chef Maria / Freecipies","aspectRatio":"16:9","variants":{"lg":{"url":"https://images.unsplash.com/photo-1612874742237-6526221588e3?w=2048","width":2048,"height":1365},"md":{"url":"https://images.unsplash.com/photo-1612874742237-6526221588e3?w=1200","width":1200,"height":800},"sm":{"url":"https://images.unsplash.com/photo-1612874742237-6526221588e3?w=720","width":720,"height":480},"xs":{"url":"https://images.unsplash.com/photo-1612874742237-6526221588e3?w=360","width":360,"height":240}}}}',
  '[{"type":"paragraph","text":"Authentic carbonara is an art form. The heat of the pasta cooks the eggs to create a creamy sauce without scrambling them."},{"type":"callout","style":"warning","text":"Never add cream! Authentic carbonara gets its creaminess from eggs and cheese only."},{"type":"heading","level":2,"text":"The Key Technique"},{"type":"paragraph","text":"The secret is removing the pan from heat before adding the egg mixture. The residual heat cooks the eggs gently."}]',
  '{"prepTime":10,"cookTime":20,"totalTime":30,"servings":4,"difficulty":"Medium","calories":650,"cuisine":"Italian","course":"Main Course","nutrition":{"calories":650,"fat":"35g","carbohydrates":"55g","protein":"28g"},"ingredients":[{"group_title":"Pasta","items":[{"name":"Spaghetti or Rigatoni","amount":"400","unit":"g","notes":"high quality Italian"},{"name":"Kosher salt for pasta water","amount":"2","unit":"tbsp"}]},{"group_title":"Sauce","items":[{"name":"Guanciale","amount":"200","unit":"g","notes":"or high-quality pancetta"},{"name":"Large egg yolks","amount":"4","unit":"whole"},{"name":"Whole eggs","amount":"2","unit":"whole"},{"name":"Pecorino Romano (finely grated)","amount":"100","unit":"g"},{"name":"Freshly cracked black pepper","amount":"2","unit":"tsp","notes":"plus more for serving"}]}],"instructions":[{"section_title":"Prep","steps":[{"text":"Bring a large pot of heavily salted water to boil.","time":5},{"text":"Cut guanciale into 1/4-inch strips or cubes.","time":3},{"text":"In a bowl, whisk egg yolks, whole eggs, most of the Pecorino, and black pepper.","time":2}]},{"section_title":"Cook Guanciale","steps":[{"text":"Add guanciale to a cold large pan, then turn heat to medium-low. Cook until fat renders and meat is crispy, 8-10 minutes.","time":10,"tip":"Starting in a cold pan prevents the fat from seizing."}]},{"section_title":"Cook Pasta","steps":[{"text":"Cook pasta until 1 minute shy of al dente. Reserve 1 cup pasta water before draining.","time":9}]},{"section_title":"Combine","steps":[{"text":"Remove pan from heat. Add drained pasta to the guanciale and toss.","time":1},{"text":"Wait 30 seconds for pan to cool slightly, then add egg mixture. Toss vigorously, adding pasta water as needed.","time":2,"tip":"The residual heat will cook the eggs into a creamy sauce."},{"text":"Serve immediately with remaining Pecorino and lots of black pepper.","time":1}]}],"equipment":["dutch-oven","chef-knife"],"notes":"Use the best quality guanciale and Pecorino you can find. The dish has few ingredients, so quality matters."}',
  '[{"question":"Can I use bacon instead of guanciale?","answer":"Pancetta is the closest substitute. Bacon works but adds a smoky flavor not traditional to carbonara."},{"question":"Why do my eggs scramble?","answer":"The pan is too hot. Always remove from heat before adding the egg mixture, and toss constantly."},{"question":"Is this safe to eat with raw eggs?","answer":"The residual heat cooks the eggs to a safe temperature. Use fresh, high-quality eggs."}]',
  '[{"slug":"cacio-e-pepe","headline":"Classic Cacio e Pepe"},{"slug":"pasta-amatriciana","headline":"Pasta all Amatriciana"}]',
  '[{"id":13,"slug":"italian","label":"Italian"},{"id":6,"slug":"comfort-food","label":"Comfort Food"}]',
  '{"id":2,"slug":"main-dishes","label":"Main Dishes"}',
  '{"id":1,"slug":"chef-maria","name":"Chef Maria","jobTitle":"Head Chef"}',
  '{"metaTitle":"Authentic Pasta Carbonara Recipe - No Cream! | Freecipies","metaDescription":"Learn the authentic Roman technique for spaghetti carbonara. No cream - just eggs, cheese, guanciale, and pepper."}',
  '{"showNutrition":true,"showVideo":true,"showPrintButton":true}',
  'published',
  1,
  1,
  22350,
  12,
  30,
  'Medium',
  datetime('now', '-5 days'),
  datetime('now', '-10 days')
);

-- ============================================================================
-- ARTICLE-TAG RELATIONSHIPS
-- ============================================================================
INSERT INTO articles_to_tags (article_id, tag_id) VALUES
-- Chocolate Chip Cookies
((SELECT id FROM articles WHERE slug = 'chocolate-chip-cookies'), (SELECT id FROM tags WHERE slug = 'comfort-food')),
((SELECT id FROM articles WHERE slug = 'chocolate-chip-cookies'), (SELECT id FROM tags WHERE slug = 'family-friendly')),
-- Avocado Toast
((SELECT id FROM articles WHERE slug = 'avocado-toast'), (SELECT id FROM tags WHERE slug = 'quick-easy')),
((SELECT id FROM articles WHERE slug = 'avocado-toast'), (SELECT id FROM tags WHERE slug = 'vegetarian')),
((SELECT id FROM articles WHERE slug = 'avocado-toast'), (SELECT id FROM tags WHERE slug = 'healthy')),
((SELECT id FROM articles WHERE slug = 'avocado-toast'), (SELECT id FROM tags WHERE slug = 'vegan')),
-- Pasta Carbonara
((SELECT id FROM articles WHERE slug = 'pasta-carbonara'), (SELECT id FROM tags WHERE slug = 'italian')),
((SELECT id FROM articles WHERE slug = 'pasta-carbonara'), (SELECT id FROM tags WHERE slug = 'comfort-food'));
