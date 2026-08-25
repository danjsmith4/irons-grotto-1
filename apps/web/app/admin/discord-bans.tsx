'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { Dialog, Spinner } from '@radix-ui/themes';
import {
  CrossCircledIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { PlayerNameButton } from '@/app/components/player-name-button';
import type { DiscordBanEntry } from '@/app/data-sources/fetch-discord-bans';
import { banDiscordMemberAction } from './actions/ban-discord-member-action';
import { unbanDiscordMemberAction } from './actions/unban-discord-member-action';
import {
  searchDiscordMembersAction,
  type DiscordMemberSearchResult,
} from './actions/search-discord-members-action';
import styles from './admin.module.css';

interface DiscordBansProps {
  bans: DiscordBanEntry[] | null;
  /** Why the ban list could not be read, if it could not. */
  error: string | null;
}

/** A ban the moderator has asked for but not yet confirmed. */
interface PendingBan {
  user: DiscordMemberSearchResult;
}

/** Anything shown in either table, so one row renderer serves both. */
interface DiscordRow {
  id: string;
  displayName: string;
  handle: string;
  playerNames: string[];
}

/**
 * Discord ban administration.
 *
 * Mirrors the staff pane deliberately: the same outranking rule decides who
 * may act, the same "Outranks you" affordance explains a missing button, and
 * every control is enforced again server-side. Bans themselves live in
 * Discord — there is no table here — so the reason recorded against each one
 * is both the audit trail and what this list shows.
 */
export function DiscordBans({ bans, error }: DiscordBansProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscordMemberSearchResult[]>([]);
  const [pending, setPending] = useState<PendingBan | null>(null);
  const [reason, setReason] = useState('');
  const [liftingId, setLiftingId] = useState<string | null>(null);

  // A reply for an earlier, shorter query can land after the finished one.
  // Only the newest may answer — same guard as the signup name probe.
  const latestQuery = useRef('');

  const { execute: search, isExecuting: isSearching } = useAction(
    searchDiscordMembersAction,
    {
      onSuccess({ data }) {
        if (!data || data.query !== latestQuery.current) {
          return;
        }

        setResults(data.results);
      },
      onError({ error: actionError }) {
        toast.error(actionError.serverError ?? 'Could not search Discord.');
        setResults([]);
      },
    },
  );

  // `debounce` has to outlive a render to debounce anything — built inline it
  // produces a fresh timer per keystroke and every keystroke hits Discord.
  const debouncedSearch = useMemo(
    () =>
      debounce((input: string) => {
        if (input.trim().length < 2) {
          setResults([]);

          return;
        }

        search({ query: input.trim() });
      }, 400),
    [search],
  );

  const { execute: ban, isExecuting: isBanning } = useAction(
    banDiscordMemberAction,
    {
      onSuccess() {
        toast.success(
          `${pending?.user.displayName ?? 'That account'} is banned from the Discord.`,
        );
        setPending(null);
        setReason('');
        setQuery('');
        setResults([]);
        latestQuery.current = '';
        router.refresh();
      },
      onError({ error: actionError }) {
        toast.error(actionError.serverError ?? 'Could not place that ban.');
      },
    },
  );

  const { execute: unban } = useAction(unbanDiscordMemberAction, {
    onSuccess({ data }) {
      toast.success(
        data?.alreadyLifted
          ? 'That ban had already been lifted.'
          : 'Ban lifted. They can rejoin the server.',
      );
      setLiftingId(null);
      router.refresh();
    },
    onError({ error: actionError }) {
      toast.error(actionError.serverError ?? 'Could not lift that ban.');
      setLiftingId(null);
    },
  });

  const bannedIds = useMemo(
    () => new Set((bans ?? []).map((entry) => entry.id)),
    [bans],
  );

  function renderIdentity(row: DiscordRow) {
    return (
      <div className={styles.discordIdentity}>
        <span className={styles.name}>{row.displayName}</span>
        <span className={styles.discordHandle}>{row.handle}</span>
        {row.playerNames.length > 0 && (
          <span className={styles.discordClanNames}>
            {row.playerNames.map((playerName, index) => (
              <span key={playerName}>
                {index > 0 && ', '}
                <PlayerNameButton name={playerName} className={styles.name} />
              </span>
            ))}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <section className={styles.panel} aria-labelledby="bans-heading">
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle} id="bans-heading">
            Discord bans
          </h3>
          <span className={styles.panelMeta}>
            {error
              ? 'Unavailable'
              : `${bans?.length ?? 0} ${bans?.length === 1 ? 'ban' : 'bans'}`}
          </span>
        </div>
        {error ? (
          <p className={styles.errorNote}>
            <ExclamationTriangleIcon />
            Discord’s ban list could not be read. This is usually the bot
            missing the Ban Members permission in the server.
          </p>
        ) : !bans || bans.length === 0 ? (
          <p className={styles.empty}>Nobody is banned from the Discord.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Account</th>
                  <th className={styles.thLeft}>Reason</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {bans.map((entry) => (
                  <tr key={entry.id}>
                    <td>{renderIdentity(entry)}</td>
                    <td className={styles.reasonCell}>
                      {entry.reason?.trim()
                        ? entry.reason
                        : 'No reason recorded'}
                    </td>
                    <td className={styles.actionCell}>
                      {entry.canManage ? (
                        <button
                          type="button"
                          className={styles.manageButton}
                          aria-label={`Lift the ban on ${entry.displayName}`}
                          disabled={liftingId !== null}
                          onClick={() => {
                            setLiftingId(entry.id);
                            unban({ discordUserId: entry.id });
                          }}
                        >
                          {liftingId === entry.id && <Spinner size="1" />}
                          Lift ban
                        </button>
                      ) : (
                        <span className={styles.noAction}>Outranks you</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="ban-search-heading">
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle} id="ban-search-heading">
            Ban an account
          </h3>
          <label className={styles.search}>
            {isSearching ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
            <input
              type="search"
              value={query}
              placeholder="Discord name or user id"
              aria-label="Search Discord members"
              onChange={(event) => {
                const input = event.target.value;

                setQuery(input);
                latestQuery.current = input.trim();
                debouncedSearch(input);
              }}
            />
          </label>
        </div>
        {query.trim().length < 2 ? (
          <p className={styles.empty}>
            Search the server by Discord name, or paste a user id to ban someone
            who has already left.
          </p>
        ) : results.length === 0 ? (
          <p className={styles.empty}>
            {isSearching
              ? 'Searching Discord…'
              : `Nobody in the server matches “${query.trim()}”.`}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Account</th>
                  <th className={styles.thLeft}>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {results.map((user) => {
                  const alreadyBanned = bannedIds.has(user.id);

                  return (
                    <tr key={user.id}>
                      <td>{renderIdentity(user)}</td>
                      <td className={styles.roleCell}>
                        {alreadyBanned
                          ? 'Already banned'
                          : user.isInServer
                            ? 'In the server'
                            : 'Not in the server'}
                      </td>
                      <td className={styles.actionCell}>
                        {alreadyBanned ? (
                          <span className={styles.noAction}>Banned</span>
                        ) : user.canManage ? (
                          <button
                            type="button"
                            className={styles.dangerButton}
                            aria-label={`Ban ${user.displayName}`}
                            onClick={() => {
                              setReason('');
                              setPending({ user });
                            }}
                          >
                            <CrossCircledIcon />
                            Ban
                          </button>
                        ) : (
                          <span className={styles.noAction}>Outranks you</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !isBanning) {
            setPending(null);
          }
        }}
      >
        <Dialog.Content className={styles.dialog} maxWidth="440px">
          <Dialog.Title className={styles.dialogTitle}>Confirm ban</Dialog.Title>
          <Dialog.Description className={styles.dialogBody}>
            <strong>{pending?.user.displayName}</strong> ({pending?.user.handle})
            will be removed from the Discord server and blocked from rejoining.
            Their clan rank, points and calculator are left alone — this is a
            Discord ban only. No messages are deleted.
          </Dialog.Description>
          <label className={styles.reasonField}>
            <span className={styles.reasonLabel}>Reason</span>
            <textarea
              value={reason}
              rows={3}
              maxLength={300}
              placeholder="Why they are being banned"
              aria-label="Ban reason"
              onChange={(event) => setReason(event.target.value)}
            />
            <span className={styles.reasonHint}>
              Recorded against the ban in Discord, alongside your name. This is
              the only record of why.
            </span>
          </label>
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.ghostButton}
              disabled={isBanning}
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              disabled={isBanning}
              onClick={() => {
                if (!pending) {
                  return;
                }

                ban({
                  discordUserId: pending.user.id,
                  reason: reason.trim() || undefined,
                });
              }}
            >
              {isBanning && <Spinner size="1" />}
              Ban account
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
