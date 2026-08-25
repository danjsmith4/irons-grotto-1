describe('Player details', () => {
  it('displays the player name', () => {
    cy.visit('/player/riftletics');
    cy.findByLabelText(/^player name$/i).should('have.text', 'Riftletics');

    cy.visit('/player/cousinofkos');
    cy.findByLabelText(/^player name$/i).should('have.text', 'CousinOfKos');

    cy.visit('/player/clogging');
    cy.findByLabelText(/^player name$/i).should('have.text', 'Clogging');
  });
});
