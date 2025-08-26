import css from './homepage.module.css';
import { Cinzel, Open_Sans } from 'next/font/google';
import backgroundImage from './images/homepage-background.png';

import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';

const cinzel = Cinzel({
  weight: ['400', '700'],
  subsets: ['latin'],
});

const openSans = Open_Sans({
  weight: ['300', '400', '600'],
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
    <div
      className={`${css['outer-container']} ${cinzel.className} ${openSans.className}`}
      style={{
        backgroundImage: `url(${backgroundImage.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className={css.container}>
        <h1 className={css['heading-1']}>Welcome to Irons Grotto</h1>
        <p className={css.paragraph}>
          A thriving Old School RuneScape community for Ironman accounts.
        </p>

        <div className={css['button-container']}>
          <a
            href="https://discord.gg/sUT4Xx9zag"
            target="_blank"
            className={css.button}
          >
            Join Discord
          </a>
          <a
            href="https://templeosrs.com/groups/overview.php?id=241"
            target="_blank"
            className={css.button}
          >
            Visit TempleOSRS
          </a>
        </div>

        <div className={css['apply-section']}>
          <h2 className={css['heading-2']}>Apply for Rank</h2>
          <p className={css.paragraph}>
            Ready to take the next step in the Irons Grotto community? Apply for
            a higher rank by clicking the button below. You'll need to log in
            via Discord, and **you must be a member of our Discord server** to
            complete the application process.
          </p>
          <div className={css['button-container']}>
            <form action={handleSubmit}>
              <button
                type="submit"
                className={`${css.button} ${css['apply-here']}`}
              >
                Apply Here
              </button>
            </form>
          </div>
        </div>

        <div className={css['about-section']}>
          <h2 className={css['heading-2']}>About Us</h2>
          <p className={css.paragraph}>
            We are a social Ironman clan dedicated to creating a vibrant
            community within the OSRS universe. Our clan organizes various
            events including bingo, boss of the week challenges, skill of the
            week competitions, and weekly group activities such as Tempoross and
            Wilderness Prayer sessions. Join us to find a supportive and active
            community!
          </p>
        </div>

        <div className={css.leadership}>
          <h2 className={css['heading-2']}>Leadership</h2>
          <ul>
            <li>
              <strong>Owners:</strong> Avios & Tyluh
            </li>
            <li>
              <strong>Deputies:</strong> RodneyMullen, Claytonaa, Aceriwyn
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
