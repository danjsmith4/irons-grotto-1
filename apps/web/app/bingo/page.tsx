'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
});

export default function BingoPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at center, #2d1b4e 0%, #1a0d2e 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated rays background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100vw',
          height: '100vw',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '2px',
              height: '50vw',
              background:
                'linear-gradient(transparent 0%, rgba(233, 30, 99, 0.1) 40%, rgba(156, 39, 176, 0.15) 50%, rgba(233, 30, 99, 0.1) 60%, transparent 100%)',
              transformOrigin: 'bottom center',
              opacity: 0.6,
              transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
              animation: 'rotateRays 20s linear infinite',
            }}
          />
        ))}
      </div>

      <div
        style={{
          textAlign: 'center',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
        }}
      >
        {/* Logo */}
        <Image
          src="/L2.png"
          alt="Irons Grotto Logo"
          width={200}
          height={200}
          style={{
            filter: 'drop-shadow(0 0 20px rgba(233, 30, 99, 0.5))',
          }}
        />

        {/* Coming Soon Text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <h1
            className={cinzel.className}
            style={{
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              fontWeight: '700',
              background:
                'linear-gradient(135deg, #e91e63 0%, #9c27b0 50%, #ce93d8 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 4px 20px rgba(233, 30, 99, 0.3)',
              margin: 0,
            }}
          >
            Bingo Events
          </h1>

          <h2
            style={{
              fontSize: '2.5rem',
              color: '#ce93d8',
              fontWeight: '300',
              margin: 0,
            }}
          >
            Coming Soon...
          </h2>

          <p
            style={{
              fontSize: '1.2rem',
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: '600px',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            We're crafting an exciting bingo experience for the Irons Grotto
            community. Stay tuned for challenges, rewards, and clan-wide
            competitions!
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'white',
            background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 8px 25px rgba(233, 30, 99, 0.4)',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow =
              '0 12px 35px rgba(233, 30, 99, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              '0 8px 25px rgba(233, 30, 99, 0.4)';
          }}
        >
          Return to Grotto
        </Link>
      </div>

      <style jsx>{`
        @keyframes rotateRays {
          from {
            transform: translate(-50%, -100%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -100%) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
