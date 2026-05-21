import React, { useState, useEffect, useRef } from 'react';

interface RatingSystemProps {
  articleId: number;
  initialValue: number;
  initialCount: number;
  size?: 'sm' | 'md' | 'lg';
}

const RatingSystem: React.FC<RatingSystemProps> = ({ 
  articleId, 
  initialValue, 
  initialCount,
  size = 'md' 
}) => {
  const [rating, setRating] = useState(initialValue);
  const [count, setCount] = useState(initialCount);
  const [hoverValue, setHoverValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [message, setMessage] = useState('');

  const starColor = "var(--accent-sage)"; // Sage Green
  const emptyColor = "var(--border)"; // Gray 200

  const sizes = {
    sm: { star: 14, font: '0.8rem', gap: '0.5rem' },
    md: { star: 18, font: '0.95rem', gap: '0.5rem' },
    lg: { star: 24, font: '1.1rem', gap: '0.5rem' }
  };

  useEffect(() => {
    const votedArticles = JSON.parse(localStorage.getItem('voted_recipes') || '[]');
    if (votedArticles.includes(articleId)) {
      setHasVoted(true);
    }
  }, [articleId]);

  const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
    if (hasVoted || isSubmitting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverValue(starIndex + (isHalf ? 0.5 : 1));
  };

  const handleMouseLeave = () => {
    setHoverValue(0);
  };

  const handleVote = async (value: number) => {
    if (hasVoted || isSubmitting) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/recipes/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: articleId, rating: value })
      });

      const data = await response.json();

      if (data.success) {
        const newRating = data.data.ratingValue;
        const newCount = data.data.ratingCount;

        setRating(newRating);
        setCount(newCount);
        setHasVoted(true);
        setMessage('Thank you for your rating!');
        
        // Synchronize other instances on the same page
        window.dispatchEvent(new CustomEvent('recipe-rated', {
          detail: { articleId, rating: newRating, count: newCount }
        }));
        
        const votedArticles = JSON.parse(localStorage.getItem('voted_recipes') || '[]');
        if (!votedArticles.includes(articleId)) {
          votedArticles.push(articleId);
          localStorage.setItem('voted_recipes', JSON.stringify(votedArticles));
        }
      } else {
        setMessage('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Listen for ratings from other components on the same page
  useEffect(() => {
    const handleGlobalRating = (e: Event) => {
      const customEvent = e as CustomEvent<{ articleId: number; rating: number; count: number }>;
      const { articleId: id, rating: newRating, count: newCount } = customEvent.detail;
      if (id === articleId) {
        setRating(newRating);
        setCount(newCount);
        setHasVoted(true);
      }
    };

    window.addEventListener('recipe-rated', handleGlobalRating);
    return () => window.removeEventListener('recipe-rated', handleGlobalRating);
  }, [articleId]);

  // Helper to calculate fill percentage for each star
  const getStarFillPercentage = (starIndex: number) => {
    // If hovering, use 0.5 steps for the voting UX
    if (hoverValue > 0) {
      if (hoverValue >= starIndex + 1) return 100;
      if (hoverValue >= starIndex + 0.5) return 50;
      return 0;
    }

    // Otherwise, use exact decimal precision (e.g., 3.8 fills 80% of the 4th star)
    const diff = rating - starIndex;
    if (diff >= 1) return 100;
    if (diff <= 0) return 0;
    return Math.round(diff * 100);
  };

  return (
    <div className="star-rating-container" style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div className="stars-wrapper" style={{ display: 'flex', alignItems: 'center', gap: sizes[size].gap }}>
        <div 
          className="stars-row" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}
          onMouseLeave={handleMouseLeave}
        >
          {[0, 1, 2, 3, 4].map((index) => {
            const fillPercent = getStarFillPercentage(index);
            const gradId = `star-grad-${articleId}-${index}`;
            
            return (
              <div
                key={index}
                style={{
                  position: 'relative',
                  width: sizes[size].star,
                  height: sizes[size].star,
                  cursor: (hasVoted || isSubmitting) ? 'default' : 'pointer',
                  transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: (hoverValue > index && hoverValue <= index + 1) ? 'scale(1.2)' : 'scale(1)',
                }}
                onMouseMove={(e) => handleMouseMove(e, index)}
                onClick={() => {
                  const val = index + (hoverValue % 1 === 0.5 ? 0.5 : 1);
                  handleVote(val);
                }}
              >
                <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id={gradId}>
                      <stop offset={`${fillPercent}%`} stopColor={starColor} />
                      <stop offset={`${fillPercent}%`} stopColor={emptyColor} />
                    </linearGradient>
                  </defs>
                  <path 
                    fill={`url(#${gradId})`}
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                  />
                </svg>
              </div>
            );
          })}
        </div>

        <div 
          className="rating-info" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            color: 'var(--text-secondary)', 
            fontWeight: 500,
            fontSize: sizes[size].font 
          }}
        >
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>
            {rating.toFixed(1)}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9em', fontWeight: 400 }}>
            ({count} {count === 1 ? 'Review' : 'Reviews'})
          </span>
        </div>
      </div>

      {message && (
        <span style={{ 
          fontSize: '0.8rem', 
          fontWeight: 600, 
          color: message.includes('Error') ? '#e11d48' : starColor
        }}>
          {message}
        </span>
      )}
    </div>
  );
};

export default RatingSystem;
