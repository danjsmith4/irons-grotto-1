import css from './homepage.module.css';
import { Cinzel, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';

const cinzel = Cinzel({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
});

const inter = Inter({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

export default async function HomePage() {
  // Check auth on page load and redirect if authed
  const session = await auth();
  const rankCalculatorUrl = '/rank-calculator';
  if (session) {
    redirect(rankCalculatorUrl);
  }

  const handleSubmit = async () => {
    'use server';

    const session = await auth();
    const rankCalculatorUrl = '/rank-calculator';

    if (!session) {
      await signIn('discord', { redirectTo: rankCalculatorUrl });
    }

    redirect(rankCalculatorUrl);
  };

  return (
    <div className={`${css['page-container']} ${inter.className}`}>
      {/* Animated rays background */}
      <div className={css['rays-container']}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`${css.ray} ${css[`ray-${i + 1}`]}`} />
        ))}
      </div>

      {/* Main content */}
      <div className={css['main-content']}>
        {/* Logo section */}
        <div className={css['logo-section']}>
          <div className={css['logo-container']}>
            <Image
              src="/L2.png"
              alt="Irons Grotto Logo"
              width={160}
              height={160}
              className={css.logo}
              priority
            />
            <div className={css['logo-glow']} />
          </div>
          <h1 className={`${css['main-title']} ${cinzel.className}`}>
            Irons Grotto
          </h1>
          <p className={css.subtitle}>
            A thriving Old School RuneScape community for Ironman accounts
          </p>
        </div>

        {/* Action buttons */}
        <div className={css['action-buttons']}>
          <form action={handleSubmit}>
            <button
              type="submit"
              className={`${css.button} ${css['primary-button']}`}
            >
              Apply for Rank
            </button>
          </form>
          <a
            href="https://discord.gg/sUT4Xx9zag"
            target="_blank"
            className={`${css.button} ${css['secondary-button']}`}
          >
            Join Discord
          </a>
          <Link
            href="/bingo"
            className={`${css.button} ${css['secondary-button']}`}
          >
            Bingo Events
          </Link>
        </div>

        {/* Quick info cards */}
        <div className={css['info-cards']}>
          <div className={css.card}>
            <h3 className={cinzel.className}>Community Events</h3>
            <p>
              Weekly boss challenges, seasonal bingo events, and group
              activities
            </p>
          </div>
          <div className={css.card}>
            <h3 className={cinzel.className}>Active Leadership</h3>
            <p>
              Owners: Avios & Tyluh
              <br />
              Deputies: Claytonaa, Aceriwyn, Dead Player, The Victory
            </p>
          </div>
          <div className={css.card}>
            <h3 className={cinzel.className}>Temple OSRS</h3>
            <p>
              <a
                href="https://templeosrs.com/groups/overview.php?id=241"
                target="_blank"
                className={css['card-link']}
              >
                View our clan stats →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
