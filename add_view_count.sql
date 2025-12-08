-- Add view_count column to articles table
ALTER TABLE articles ADD COLUMN view_count INTEGER DEFAULT 0;

-- Drop the existing view
DROP VIEW IF EXISTS v_articles_full;

-- Recreate the view with view_count included
CREATE VIEW v_articles_full AS
SELECT 
    a.*,
    c.label as category_label,
    c.slug as category_slug,
    c.image_url as category_image,
    au.name as author_name,
    au.image_url as author_image,
    
    json_group_array(
        json_object('slug', t.slug, 'label', t.label)
    ) FILTER (WHERE t.id IS NOT NULL) as tags_json
FROM articles a
LEFT JOIN categories c ON a.category_slug = c.slug
LEFT JOIN authors au ON a.author_slug = au.slug
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN tags t ON at.tag_id = t.id
GROUP BY a.id;
