'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { DropdownMenu, Flex, IconButton } from '@radix-ui/themes';
import { IronsButton } from '@/app/rank-calculator/components/irons-button';

interface NavBarProps {
  currentPage?: 'dashboard' | 'player';
  playerName?: string;
  showSaveActions?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  userCalculators?: Record<
    string,
    {
      rsn: string;
      rank?: string;
      joinDate: Date;
    }
  >;
}

export function NavBar({
  currentPage = 'dashboard',
  playerName,
  showSaveActions = false,
  onSave,
  isSaving = false,
  canSave = false,
  userCalculators = {},
}: NavBarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(26, 13, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(206, 147, 216, 0.2)',
        padding: '1rem 2rem',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Flex justify="between" align="center">
          {/* Left side - Logo and Navigation */}
          <Flex align="center" gap="4">
            {/* Logo */}
            <Link href="/rank-calculator/dashboard">
              <Image
                src="/L2.png"
                alt="Irons Grotto Logo"
                width={70}
                height={70}
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(233, 30, 99, 0.3))',
                  cursor: 'pointer',
                }}
              />
            </Link>

            {/* Dashboard Button */}
            <IronsButton
              asChild
              variant={currentPage === 'dashboard' ? 'primary' : 'ghost'}
              size="2"
            >
              <Link href="/rank-calculator/dashboard">Dashboard</Link>
            </IronsButton>

            {/* Rank Calculator Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IronsButton
                  variant={currentPage === 'player' ? 'primary' : 'ghost'}
                  size="2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  Accounts
                  <ChevronDownIcon />
                </IronsButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item asChild>
                  <Link href="/rank-calculator/players/add">New Account</Link>
                </DropdownMenu.Item>
                {Object.keys(userCalculators).length > 0 && (
                  <>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Label>Your Accounts</DropdownMenu.Label>
                    {Object.values(userCalculators).map((player) => (
                      <DropdownMenu.Item key={player.rsn} asChild>
                        <Link
                          href={`/rank-calculator/${encodeURIComponent(player.rsn)}`}
                        >
                          {player.rsn}
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.6)',
                            }}
                          >
                            ({player.rank ?? 'Unranked'})
                          </span>
                        </Link>
                      </DropdownMenu.Item>
                    ))}
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>

          {/* Right side - Actions */}
          <Flex
            align="center"
            gap="3"
            style={{ justifyContent: 'space-around' }}
          >
            {/* Help Button */}
            <IronsButton asChild variant="ghost" size="2">
              <Link
                href="https://discord.com/channels/697877518455144468/1385071226837274808"
                target="_blank"
              >
                Help
              </Link>
            </IronsButton>

            {/* Sign Out Button */}
            <IronsButton variant="secondary" size="2" onClick={handleSignOut}>
              Sign Out
            </IronsButton>

            {/* Save Actions (only on player pages) - moved to the right */}
            {showSaveActions && (
              <Flex gap="1">
                <IronsButton
                  loading={isSaving}
                  disabled={!canSave || isSaving}
                  variant="primary"
                  onClick={onSave}
                  size="2"
                >
                  Save
                </IronsButton>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger disabled={isSaving}>
                    <IconButton
                      variant="soft"
                      type="button"
                      style={{
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        transition: 'none',
                        transform: 'none',
                      }}
                    >
                      <ChevronDownIcon
                        style={{ transition: 'none', transform: 'none' }}
                      />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content color="gray" variant="soft">
                    <DropdownMenu.Item>Apply for promotion</DropdownMenu.Item>
                    <DropdownMenu.Item>Reset form defaults</DropdownMenu.Item>
                    {playerName && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/rank-calculator/players/edit/${playerName.toLowerCase()}`}
                        >
                          Edit player
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red">
                      Delete data
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Flex>
            )}
          </Flex>
        </Flex>
      </div>
    </nav>
  );
}
