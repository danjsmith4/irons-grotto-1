'use client';

import { useEffect, useState } from 'react';

interface FadeInOnScrollProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FadeInOnScroll({ children, style }: FadeInOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Start fading in when user scrolls down 200px or more
      if (scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Check initial position
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0.2,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
