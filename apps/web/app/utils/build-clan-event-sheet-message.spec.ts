import { buildClanEventSheetMessage } from './build-clan-event-sheet-message';

const base = {
  eventName: 'Zulrah Botw',
  competitionUrl: 'https://templeosrs.com/competitions/standings.php?id=39036',
  staffRoleId: '829386451624001539',
};

describe('buildClanEventSheetMessage', () => {
  it('pings the staff role', () => {
    const message = buildClanEventSheetMessage({
      ...base,
      type: 'botw',
      sheetUpdated: true,
    });

    expect(message).toContain('<@&829386451624001539>');
  });

  it('names the event and the cell a boss week was written to', () => {
    const message = buildClanEventSheetMessage({
      ...base,
      type: 'botw',
      sheetUpdated: true,
    });

    expect(message).toContain('Boss of the Week');
    expect(message).toContain('**Zulrah Botw**');
    expect(message).toContain('`Links!B9`');
  });

  it('names the skill-week cell for a skill week', () => {
    const message = buildClanEventSheetMessage({
      ...base,
      type: 'sotw',
      eventName: 'Thieving Sotw',
      sheetUpdated: true,
    });

    expect(message).toContain('Skill of the Week');
    expect(message).toContain('`Links!B10`');
  });

  it('links the competition without letting Discord unfurl it', () => {
    const message = buildClanEventSheetMessage({
      ...base,
      type: 'botw',
      sheetUpdated: true,
    });

    expect(message).toContain(`<${base.competitionUrl}>`);
  });

  it('says when the sheet was not updated, and gives the command that does it by hand', () => {
    const message = buildClanEventSheetMessage({
      ...base,
      type: 'botw',
      sheetUpdated: false,
    });

    expect(message).toContain('could not be updated');
    expect(message).toContain(`\`.botw ${base.competitionUrl}\``);
    expect(message).not.toContain('has been added');
  });
});
