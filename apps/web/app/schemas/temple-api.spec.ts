import { TempleOSRSPlayerCollectionLog } from './temple-api';

function buildCollectionLog(items: { id: number; name: string }[]) {
  return {
    data: {
      total_collections_available: 1717,
      total_collections_finished: items.length,
      items: items.map(({ id, name }) => ({
        id,
        name,
        count: 1,
        date: '2026-02-15 03:47:07',
      })),
    },
  };
}

function parseNames(items: { id: number; name: string }[]) {
  return TempleOSRSPlayerCollectionLog.parse(
    buildCollectionLog(items),
  ).data.items.map(({ name }) => name);
}

describe('TempleOSRS collection log item-name canonicalisation', () => {
  it('re-cases drifted title-case Temple names back to the canonical clog name', () => {
    // Observed live 2026-09-09 on two real members' logs. Every one of these
    // was matched by the calculator until Temple title-cased it.
    expect(
      parseNames([
        { id: 22746, name: 'Ikkle Hydra' },
        { id: 12651, name: 'Pet Zilyana' },
        { id: 25521, name: 'Jar of Spirits' },
        { id: 27377, name: 'Remnant of Akkha' },
        { id: 27285, name: 'Eye of the Corruptor' },
        { id: 27667, name: 'Claws of Callisto' },
      ]),
    ).toEqual([
      'Ikkle hydra',
      'Pet zilyana',
      'Jar of spirits',
      'Remnant of akkha',
      'Eye of the corruptor',
      'Claws of callisto',
    ]);
  });

  it('recovers names Temple has also dropped the apostrophe from', () => {
    // `stripEntityName` removes `'` and `.` at every comparison site, so the
    // lookup has to be done on the stripped name or these stay unmatched.
    expect(
      parseNames([
        { id: 27673, name: 'Skull of Vetion' },
        { id: 22473, name: 'Lil Zik' },
      ]),
    ).toEqual(["Skull of vet'ion", "Lil' zik"]);
  });

  it('leaves a name that is already canonical alone', () => {
    expect(parseNames([{ id: 22746, name: 'Ikkle hydra' }])).toEqual([
      'Ikkle hydra',
    ]);
  });

  it('passes through an item the calculator has no canonical name for', () => {
    // Temple returns the whole category; most of it is not scored here, and
    // inventing a name for it would be worse than leaving it as sent.
    expect(
      parseNames([{ id: 12345, name: 'Some Unscored Thing' }]),
    ).toEqual(['Some Unscored Thing']);
  });
});
