CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`type` text DEFAULT 'article' NOT NULL,
	`locale` text DEFAULT 'en',
	`category_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`parent_article_id` integer,
	`headline` text NOT NULL,
	`subtitle` text,
	`short_description` text NOT NULL,
	`excerpt` text,
	`introduction` text,
	`images_json` text,
	`content_json` text,
	`recipe_json` text,
	`roundup_json` text,
	`faqs_json` text,
	`cached_tags_json` text,
	`cached_category_json` text,
	`cached_author_json` text,
	`cached_equipment_json` text,
	`cached_comment_count` integer DEFAULT 0,
	`cached_rating_json` text,
	`cached_toc_json` text,
	`cached_recipe_json` text,
	`cached_card_json` text,
	`reading_time_minutes` integer,
	`total_time_minutes` integer,
	`difficulty_label` text,
	`seo_json` text,
	`jsonld_json` text,
	`config_json` text,
	`workflow_status` text DEFAULT 'draft',
	`scheduled_at` text,
	`is_online` integer DEFAULT false,
	`is_favorite` integer DEFAULT false,
	`access_level` integer DEFAULT 0,
	`view_count` integer DEFAULT 0,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_articles_slug` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_articles_type` ON `articles` (`type`);--> statement-breakpoint
CREATE INDEX `idx_articles_category` ON `articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_articles_author` ON `articles` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_articles_online` ON `articles` (`is_online`);--> statement-breakpoint
CREATE INDEX `idx_articles_favorite` ON `articles` (`is_favorite`);--> statement-breakpoint
CREATE INDEX `idx_articles_published` ON `articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_articles_views` ON `articles` (`view_count`);--> statement-breakpoint
CREATE INDEX `idx_articles_workflow` ON `articles` (`workflow_status`);--> statement-breakpoint
CREATE INDEX `idx_articles_time` ON `articles` (`total_time_minutes`);--> statement-breakpoint
CREATE INDEX `idx_articles_difficulty` ON `articles` (`difficulty_label`);--> statement-breakpoint
CREATE INDEX `idx_articles_active` ON `articles` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `articles_to_tags` (
	`article_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`article_id`, `tag_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tag_to_article` ON `articles_to_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`parent_id` integer,
	`depth` integer DEFAULT 0,
	`headline` text,
	`collection_title` text,
	`short_description` text NOT NULL,
	`images_json` text DEFAULT '{}',
	`color` text DEFAULT '#ff6600ff',
	`icon_svg` text,
	`is_featured` integer DEFAULT false,
	`seo_json` text DEFAULT '{}',
	`config_json` text DEFAULT '{}',
	`i18n_json` text DEFAULT '{}',
	`sort_order` integer DEFAULT 0,
	`is_online` integer DEFAULT false,
	`cached_post_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_categories_slug` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_categories_display` ON `categories` (`is_online`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_categories_featured` ON `categories` (`is_featured`);--> statement-breakpoint
CREATE INDEX `idx_categories_active` ON `categories` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `authors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`job_title` text,
	`role` text DEFAULT 'guest',
	`headline` text,
	`subtitle` text,
	`short_description` text NOT NULL,
	`excerpt` text,
	`introduction` text,
	`images_json` text DEFAULT '{}',
	`bio_json` text DEFAULT '{}',
	`seo_json` text DEFAULT '{}',
	`is_online` integer DEFAULT false,
	`is_featured` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`cached_post_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authors_slug_unique` ON `authors` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `authors_email_unique` ON `authors` (`email`);--> statement-breakpoint
CREATE INDEX `idx_authors_slug` ON `authors` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_authors_role` ON `authors` (`role`);--> statement-breakpoint
CREATE INDEX `idx_authors_email` ON `authors` (`email`);--> statement-breakpoint
CREATE INDEX `idx_authors_featured` ON `authors` (`is_featured`);--> statement-breakpoint
CREATE INDEX `idx_authors_display` ON `authors` (`is_online`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_authors_active` ON `authors` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`filter_groups_json` text DEFAULT '[]',
	`style_json` text DEFAULT '{}',
	`cached_post_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_tags_slug` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_tags_popular` ON `tags` (`cached_post_count`);--> statement-breakpoint
CREATE INDEX `idx_tags_label` ON `tags` (`label`);--> statement-breakpoint
CREATE INDEX `idx_tags_active` ON `tags` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`description` text,
	`keywords` text DEFAULT '[]',
	`category` text DEFAULT 'other',
	`image_json` text DEFAULT '{}',
	`affiliate_url` text,
	`affiliate_provider` text,
	`affiliate_note` text,
	`price_display` text,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_slug_unique` ON `equipment` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_equipment_slug` ON `equipment` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_equipment_category` ON `equipment` (`category`);--> statement-breakpoint
CREATE INDEX `idx_equipment_active` ON `equipment` (`is_active`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`alt_text` text NOT NULL,
	`caption` text,
	`credit` text,
	`mime_type` text DEFAULT 'image/webp' NOT NULL,
	`aspect_ratio` text,
	`variants_json` text NOT NULL,
	`focal_point_json` text DEFAULT '{"x": 50, "y": 50}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_media_search` ON `media` (`name`,`alt_text`,`credit`);--> statement-breakpoint
CREATE INDEX `idx_media_date` ON `media` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_media_active` ON `media` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'general',
	`sort_order` integer DEFAULT 0,
	`type` text DEFAULT 'json',
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_site_settings_category` ON `site_settings` (`category`,`sort_order`);--> statement-breakpoint
CREATE TABLE `pin_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'general',
	`background_color` text DEFAULT '#ffffff',
	`thumbnail_url` text,
	`width` integer DEFAULT 1000,
	`height` integer DEFAULT 1500,
	`elements_json` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pin_templates_slug_unique` ON `pin_templates` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pin_templates_slug` ON `pin_templates` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pin_templates_category` ON `pin_templates` (`category`);--> statement-breakpoint
CREATE INDEX `idx_pin_templates_active` ON `pin_templates` (`is_active`);--> statement-breakpoint
CREATE TABLE `pinterest_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`board_url` text,
	`cover_image_url` text,
	`locale` text DEFAULT 'en',
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pinterest_boards_slug_unique` ON `pinterest_boards` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pinterest_boards_active` ON `pinterest_boards` (`is_active`);--> statement-breakpoint
CREATE TABLE `pinterest_pins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer,
	`board_id` integer,
	`section_name` text,
	`image_url` text NOT NULL,
	`destination_url` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`tags_json` text DEFAULT '[]',
	`status` text DEFAULT 'draft',
	`pinterest_pin_id` text,
	`exported_at` text,
	`export_batch_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `pinterest_boards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_pinterest_pins_board` ON `pinterest_pins` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_pinterest_pins_article` ON `pinterest_pins` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_pinterest_pins_status` ON `pinterest_pins` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pinterest_pins_batch` ON `pinterest_pins` (`export_batch_id`);