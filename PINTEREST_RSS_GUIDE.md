# Pinterest RSS Feeds - Complete Guide

## 🎯 Overview

This system automatically generates RSS feeds for Pinterest pins created in the last 24 hours. Perfect for automated Pinterest posting services like IFTTT, Zapier, or Pinterest's own RSS board feature.

---

## 📋 Features

✅ **Board-specific RSS feeds** - Separate feed for each Pinterest board  
✅ **24-hour window** - Only includes pins created in last 24 hours  
✅ **Media RSS support** - Full image metadata for Pinterest  
✅ **Auto-refresh** - Feeds update every 5 minutes  
✅ **Multiple boards** - Organize pins by topic/category  
✅ **Master feed** - All pins across all boards  

---

## 🗄️ Database Structure

### Pinterest Boards Table

```sql
CREATE TABLE pinterest_boards (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,        -- URL-friendly identifier
    name TEXT NOT NULL,                -- Display name
    description TEXT,                  -- Board description
    board_url TEXT,                    -- Pinterest board URL
    is_active BOOLEAN DEFAULT 1,       -- Enable/disable board
    created_at DATETIME,
    updated_at DATETIME
);
```

### Pinterest Pins Table (Updated)

```sql
CREATE TABLE pinterest_pins (
    id INTEGER PRIMARY KEY,
    article_id INTEGER NOT NULL,
    board_id INTEGER,                  -- NEW: Board assignment
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_alt TEXT,
    image_width INTEGER DEFAULT 1000,
    image_height INTEGER DEFAULT 1500,
    pin_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME,               -- Used for 24h filter
    updated_at DATETIME,
    FOREIGN KEY (article_id) REFERENCES articles(id),
    FOREIGN KEY (board_id) REFERENCES pinterest_boards(id)
);
```

---

## 🔗 RSS Feed URLs

### Master Feed (All Boards)
```
https://freecipies.com/rss/pinterest.xml
```
Returns all pins from all active boards created in last 24 hours.

### Board-Specific Feeds
```
https://freecipies.com/rss/pinterest/{board-slug}.xml
```

**Examples:**
- `https://freecipies.com/rss/pinterest/dinner-recipes.xml`
- `https://freecipies.com/rss/pinterest/desserts.xml`
- `https://freecipies.com/rss/pinterest/healthy-meals.xml`

---

## 📝 RSS Feed Format

### Sample RSS Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Dinner Recipes - Freecipies Pinterest</title>
    <description>Latest pins for Dinner Recipes</description>
    <link>https://freecipies.com/rss/pinterest/dinner-recipes.xml</link>
    <lastBuildDate>Thu, 17 Oct 2024 21:00:00 GMT</lastBuildDate>
    <ttl>60</ttl>
    
    <item>
      <title>Easy Baked Cod with Coconut Lemon Cream</title>
      <link>https://freecipies.com/recipes/baked-cod-coconut-lemon#pin-123</link>
      <guid>https://freecipies.com/recipes/baked-cod-coconut-lemon#pin-123</guid>
      <description>Flaky cod baked in creamy coconut-lemon sauce. Ready in 30 minutes!</description>
      <pubDate>Thu, 17 Oct 2024 20:30:00 GMT</pubDate>
      
      <!-- Media RSS for Pinterest -->
      <media:content 
        url="https://images.freecipies.com/cod-pin-1.jpg" 
        type="image/jpeg" 
        width="1000" 
        height="1500">
        <media:title>Easy Baked Cod with Coconut Lemon Cream</media:title>
        <media:description>Flaky cod baked in creamy coconut-lemon sauce</media:description>
      </media:content>
      
      <enclosure url="https://images.freecipies.com/cod-pin-1.jpg" type="image/jpeg"/>
      <category>Dinner Recipes</category>
    </item>
    
    <!-- More items... -->
  </channel>
</rss>
```

---

## 🚀 Setup Guide

### 1. Create Pinterest Boards

Using the API:

```bash
curl -X POST https://freecipies.com/api/pinterest-boards \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "dinner-recipes",
    "name": "Dinner Recipes",
    "description": "Quick and easy dinner ideas",
    "board_url": "https://pinterest.com/freecipies/dinner-recipes"
  }'
```

Or via Admin Panel:
1. Login to admin panel
2. Navigate to "Pinterest Boards"
3. Click "Add New Board"
4. Fill in details and save

### 2. Assign Pins to Boards

When creating a pin, include `board_id`:

```javascript
{
  "article_id": 123,
  "board_id": 5,              // Assign to board
  "title": "Easy Baked Cod",
  "description": "Flaky cod in 30 minutes",
  "image_url": "https://...",
  "image_width": 1000,
  "image_height": 1500
}
```

### 3. Connect to Pinterest

#### Option A: IFTTT
1. Create IFTTT account
2. New Applet: RSS Feed → Pinterest
3. RSS Feed URL: `https://freecipies.com/rss/pinterest/dinner-recipes.xml`
4. Pinterest Board: Select your board
5. Activate applet

#### Option B: Zapier
1. Create Zapier account
2. New Zap: RSS by Zapier → Pinterest
3. RSS Feed URL: `https://freecipies.com/rss/pinterest/dinner-recipes.xml`
4. Pinterest Board: Select your board
5. Map fields: Title, Description, Image URL
6. Turn on Zap

#### Option C: Pinterest Native (if available)
1. Go to Pinterest Board settings
2. Add RSS feed URL
3. Pinterest will auto-post new items

---

## 🎨 Admin Panel Integration

### Board Management UI

```jsx
import React, { useState, useEffect } from 'react';

const PinterestBoardManager = () => {
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    fetch('/api/pinterest-boards')
      .then(res => res.json())
      .then(data => setBoards(data.boards));
  }, []);

  return (
    <div>
      <h2>Pinterest Boards</h2>
      {boards.map(board => (
        <div key={board.id}>
          <h3>{board.name}</h3>
          <p>{board.description}</p>
          <a href={`/rss/pinterest/${board.slug}.xml`} target="_blank">
            RSS Feed
          </a>
        </div>
      ))}
    </div>
  );
};
```

### Pin Editor with Board Selection

Update `PinterestPinManager.jsx`:

```jsx
// Add board selection dropdown
const [boards, setBoards] = useState([]);

useEffect(() => {
  fetch('/api/pinterest-boards')
    .then(res => res.json())
    .then(data => setBoards(data.boards));
}, []);

// In form:
<select 
  value={formData.board_id} 
  onChange={(e) => setFormData({...formData, board_id: e.target.value})}
>
  <option value="">No Board</option>
  {boards.map(board => (
    <option key={board.id} value={board.id}>{board.name}</option>
  ))}
</select>
```

---

## ⏰ How the 24-Hour Filter Works

### SQL Query

```sql
SELECT * FROM pinterest_pins
WHERE created_at >= datetime('now', '-24 hours')
ORDER BY created_at DESC
```

### Behavior

- **Pin created at 10:00 AM** → Appears in RSS feed until 10:00 AM next day
- **Pin created at 11:30 PM** → Appears in RSS feed until 11:30 PM next day
- **Automatic removal** → Pins older than 24 hours don't appear

### Why 24 Hours?

- Prevents duplicate pins on Pinterest
- Fresh content only
- Matches Pinterest's recommendation
- Works with most automation tools

---

## 🔄 Feed Update Frequency

- **Cache**: 5 minutes (`max-age=300`)
- **TTL**: 60 minutes (RSS standard)
- **Recommendation**: Check feed every 30-60 minutes

### IFTTT/Zapier Settings

- **Check frequency**: Every 15-60 minutes
- **Deduplication**: Enabled (prevents re-posting)
- **Filter**: New items only

---

## 📊 Example Workflow

### Daily Pinterest Posting

1. **Morning (9:00 AM)**
   - Create 3 new pins for "Breakfast Recipes" board
   - Pins appear in `/rss/pinterest/breakfast-recipes.xml`

2. **Automation (9:15 AM)**
   - IFTTT checks RSS feed
   - Finds 3 new pins
   - Posts to Pinterest "Breakfast Recipes" board

3. **Afternoon (2:00 PM)**
   - Create 2 new pins for "Lunch Ideas" board
   - Pins appear in `/rss/pinterest/lunch-ideas.xml`

4. **Automation (2:15 PM)**
   - IFTTT checks RSS feed
   - Finds 2 new pins
   - Posts to Pinterest "Lunch Ideas" board

5. **Next Day (9:00 AM)**
   - Yesterday's 9:00 AM pins removed from feed
   - Only new pins appear

---

## 🎯 Best Practices

### Pin Creation

1. **Vertical images**: 1000x1500px (2:3 ratio)
2. **Compelling titles**: 40-100 characters
3. **Detailed descriptions**: 100-500 characters
4. **Keywords**: Include in title and description
5. **Board assignment**: Always assign to a board

### Board Organization

1. **Specific boards**: "Dinner Recipes" not "Recipes"
2. **5-10 boards**: Don't over-segment
3. **Clear descriptions**: Help users find content
4. **Active boards**: Disable unused boards

### Posting Schedule

1. **Consistent timing**: Same time each day
2. **3-5 pins per board per day**: Don't spam
3. **Spread throughout day**: Morning, afternoon, evening
4. **Weekend posts**: Don't forget weekends

---

## 🔍 Monitoring & Analytics

### Check Feed Health

```bash
# Test feed
curl https://freecipies.com/rss/pinterest/dinner-recipes.xml

# Count items
curl -s https://freecipies.com/rss/pinterest/dinner-recipes.xml | grep -c "<item>"

# Check last update
curl -s https://freecipies.com/rss/pinterest/dinner-recipes.xml | grep "lastBuildDate"
```

### Database Queries

```sql
-- Pins created in last 24 hours
SELECT COUNT(*) FROM pinterest_pins 
WHERE created_at >= datetime('now', '-24 hours');

-- Pins per board (last 24h)
SELECT b.name, COUNT(p.id) as pin_count
FROM pinterest_boards b
LEFT JOIN pinterest_pins p ON b.id = p.board_id 
  AND p.created_at >= datetime('now', '-24 hours')
GROUP BY b.id;

-- Recent pins
SELECT title, created_at, 
  ROUND((julianday('now') - julianday(created_at)) * 24, 1) as hours_ago
FROM pinterest_pins
WHERE created_at >= datetime('now', '-24 hours')
ORDER BY created_at DESC;
```

---

## 🚨 Troubleshooting

### Feed Not Updating

1. **Check cache**: Wait 5 minutes for cache to expire
2. **Check database**: Verify pins exist with recent `created_at`
3. **Check board**: Ensure `is_active = 1`
4. **Check timezone**: Database uses UTC

### Pins Not Appearing

1. **Check timestamp**: Must be within 24 hours
2. **Check board_id**: Must match active board
3. **Check SQL**: Run query manually in D1

### Duplicate Pins on Pinterest

1. **Check automation tool**: Enable deduplication
2. **Check feed**: Ensure 24-hour filter working
3. **Check GUID**: Each pin should have unique GUID

---

## 📚 API Reference

### Get All Boards

```
GET /api/pinterest-boards
```

Response:
```json
{
  "boards": [
    {
      "id": 1,
      "slug": "dinner-recipes",
      "name": "Dinner Recipes",
      "description": "Quick dinner ideas",
      "board_url": "https://pinterest.com/...",
      "is_active": 1
    }
  ]
}
```

### Create Board

```
POST /api/pinterest-boards
Content-Type: application/json

{
  "slug": "breakfast-ideas",
  "name": "Breakfast Ideas",
  "description": "Morning meal inspiration",
  "board_url": "https://pinterest.com/..."
}
```

### Create Pin with Board

```
POST /api/pins
Content-Type: application/json

{
  "article_id": 123,
  "board_id": 5,
  "title": "Easy Pancakes",
  "description": "Fluffy pancakes in 15 minutes",
  "image_url": "https://...",
  "image_width": 1000,
  "image_height": 1500
}
```

---

## 🎉 Success Metrics

### Track These KPIs

1. **Pins created per day**: Target 10-20
2. **Boards with activity**: Target 80%+
3. **RSS feed items**: Should match pins created
4. **Pinterest impressions**: Monitor growth
5. **Click-through rate**: From Pinterest to site

---

## 💡 Advanced Tips

### Multiple Pins Per Article

Create variations for different boards:

```javascript
// Pin 1: Dinner Recipes board
{
  article_id: 123,
  board_id: 1,
  title: "Quick Weeknight Dinner: Baked Cod",
  description: "30-minute seafood dinner..."
}

// Pin 2: Healthy Meals board
{
  article_id: 123,
  board_id: 2,
  title: "Healthy Baked Cod Recipe",
  description: "Low-carb, high-protein meal..."
}
```

### Seasonal Boards

Create temporary boards for holidays:

```sql
INSERT INTO pinterest_boards (slug, name, description, is_active)
VALUES ('thanksgiving-2024', 'Thanksgiving 2024', 'Holiday recipes', 1);

-- After holiday
UPDATE pinterest_boards SET is_active = 0 WHERE slug = 'thanksgiving-2024';
```

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-17  
**Related**: COMPLETE_PROJECT_GUIDE.md

