import { TRASH_URL } from '../../../utils/constants';

describe('optimistic tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/all-bookmarks');
  });

  it('add and del bookmark optimistically test ', () => {
    cy.login(Cypress.env('test_email'), Cypress.env('test_password'));
    cy.addBookmark('https://en.wikipedia.org/wiki/Cristiano_Ronaldo');

    cy.checkFistBookmarkUrl('https://en.wikipedia.org');

    cy.wait(5000);

    // click del icon for 1st bookmark in list
    cy.get(
      '.my-masonry-grid_column:first-child .single-bookmark:first-child .helper-icons figure:nth-child(2)'
    ).click();

    cy.checkNotFistBookmarkUrl('https://en.wikipedia.org');

    cy.wait(5000);

    // go to trash page
    cy.get(`[href="/${TRASH_URL}"]`).click();

    // check if del bookmark is there in trash

    cy.checkFistBookmarkUrl('https://en.wikipedia.org');

    // clear the trash
    cy.get('#clear-trash-button').click();
    cy.get('#warning-button').click();

    cy.wait(1000);

    cy.get('#no-bookmarks-text').should('have.text', 'No Bookmarks');
  });
});
