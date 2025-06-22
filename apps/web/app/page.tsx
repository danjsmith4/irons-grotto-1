import { Cinzel, Open_Sans } from 'next/font/google';
import './homepage.css';
import backgroundImage from './images/homepage-background.png';

import { signIn } from '@/auth';

const cinzel = Cinzel({
  weight: ['400', '700'],
  subsets: ['latin'],
});

const openSans = Open_Sans({
  weight: ['300', '400', '600'],
  subsets: ['latin'],
  display: 'swap',
});

// eslint-disable-next-line @typescript-eslint/require-await
export default async function HomePage() {
  const handleSubmit = async () => {
    'use server';

    await signIn('discord', { redirectTo: '/rank-calculator' });
  };

  return (
    <div
      className={`outer-container ${cinzel.className} ${openSans.className}`}
      style={{
        backgroundImage: `url(${backgroundImage.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="container">
        <h1 style={{ fontWeight: 700 }}>Welcome to Irons Grotto</h1>
        <p>A thriving Old School RuneScape community for Ironman accounts.</p>

        <div className="button-container">
          <a
            href="https://discord.gg/sUT4Xx9zag"
            target="_blank"
            className="button"
          >
            Join Discord
          </a>
          <a
            href="https://templeosrs.com/groups/overview.php?id=241"
            target="_blank"
            className="button"
          >
            Visit TempleOSRS
          </a>
        </div>

        <div className="apply-section">
          <h2 style={{ fontWeight: 700 }}>Apply for Rank</h2>
          <p>
            Ready to take the next step in the Irons Grotto community? Apply for
            a higher rank by clicking the button below. You'll need to log in
            via Discord, and **you must be a member of our Discord server** to
            complete the application process.
          </p>
          <div className="button-container">
            <form action={handleSubmit}>
              <button type="submit" className="button apply-here">
                Apply Here
              </button>
            </form>
          </div>
        </div>

        <div className="about-section">
          <h2 style={{ fontWeight: 700 }}>About Us</h2>
          <p>
            We are a social Ironman clan dedicated to creating a vibrant
            community within the OSRS universe. Our clan organizes various
            events including bingo, boss of the week challenges, skill of the
            week competitions, and weekly group activities such as Tempoross and
            Wilderness Prayer sessions. Join us to find a supportive and active
            community!
          </p>
        </div>

        <div className="leadership">
          <h2 style={{ fontWeight: 700 }}>Leadership</h2>
          <ul>
            <li>
              <strong>Owners:</strong> Avios & Tyluh
            </li>
            <li>
              <strong>Deputies:</strong> RodneyMullen, 41ex, Claytonaa
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
