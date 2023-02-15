describe("optimistic tests", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000/all-bookmarks");
  });

  it("add and del bookmark optimistically test ", () => {
    cy.login(
      Cypress.env("test_email") as string,
      Cypress.env("test_password") as string,
    );
    cy.addBookmark("https://www.nike.com/");
    cy.wait(1000);
    cy.addBookmark("https://www.adidas.co.in/");
    cy.wait(1000);
    cy.addBookmark("https://www.apple.com/in/");
    cy.wait(1000);

    // check first bookmark search

    cy.get("#bookmarks-search-input").type("nik");

    cy.wait(500);

    cy.checkFistBookmarkUrl("https://www.nike.com");

    cy.get("#bookmarks-search-input").type("{selectall}{backspace}");

    // check 2nd bookmark search

    cy.get("#bookmarks-search-input").type("adid");

    cy.wait(500);

    cy.checkFistBookmarkUrl("https://www.adidas.co.in");

    cy.get("#bookmarks-search-input").type("{selectall}{backspace}");

    // check 3rd bookmark search

    cy.get("#bookmarks-search-input").type("appl");

    cy.wait(500);

    cy.checkFistBookmarkUrl("https://www.apple.com");
  });
});
