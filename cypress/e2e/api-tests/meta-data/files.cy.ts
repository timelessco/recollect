/* eslint-disable @typescript-eslint/no-unused-expressions */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Cypress test file lacks full type definitions
// @ts-nocheck

describe("Meta data testing", () => {
  beforeEach(() => {
    // cy.visit("/all-bookmarks");
    cy.visit("/login");
  });

  it("file upload check", () => {
    cy.wait(3000);

    cy.login(Cypress.env("test_email") as string, Cypress.env("test_password") as string);

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    cy.request({
      body: {
        name: "image.png",
        type: "image/png",
        uploadFileNamePath: "m05eqwhx-image.png",
      },
      headers,
      method: "POST",
      // Ensure this URL is correct
      url: "/api/v1/tests/file/post/upload",
    }).as("uploadRequest");

    // eslint-disable-next-line promise/prefer-await-to-then -- Cypress idiomatic .then() chaining
    cy.get("@uploadRequest")?.then((addBookmarkData) => {
      bookmarkId = addBookmarkData?.body?.data?.[0]?.id;

      // check meta data

      cy.reload();

      cy.wait(60_000);

      cy.reload();

      cy.wait(2000);

      cy.request(
        `/api/v1/bookmarks/get/fetch-by-id?id=${addBookmarkData?.body?.data?.[0]?.id}`,
        {},
      ).as("fetchRequest");

      // eslint-disable-next-line promise/no-nesting, promise/prefer-await-to-then -- Cypress idiomatic chaining within .then()
      cy.get("@fetchRequest").then((data) => {
        cy.wait(1000);

        expect(data?.body?.data?.[0]?.meta_data).to.not.be.null;
        expect(data?.body?.data?.[0]?.meta_data?.ocr).to.not.be.null;
        expect(data?.body?.data?.[0]?.meta_data?.img_caption).to.not.be.null;
        expect(data?.body?.data?.[0]?.meta_data?.ogImgBlurUrl).to.not.be.null;
      });

      // delete the bookmark

      cy.request("DELETE", `/api/v1/bookmarks/delete/non-cascade`, {
        data: {
          id: addBookmarkData?.body?.data?.[0]?.id,
        },
      }).as("deleteRequest");

      // eslint-disable-next-line promise/no-nesting, promise/prefer-await-to-then -- Cypress idiomatic chaining within .then()
      cy.get("@deleteRequest").then((data) => {
        cy.wait(1000);

        expect(data.status).to.eq(200);
      });
    });
  });
});
