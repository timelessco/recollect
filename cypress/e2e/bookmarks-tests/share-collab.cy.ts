import {
	ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	TRASH_URL,
} from "../../../src/utils/constants";

describe("share test", () => {
	beforeEach(() => {
		cy.visit("http://localhost:3000/all-bookmarks");
	});

	it("collab test", () => {
		cy.intercept("/api/share/send-collaboration-email").as("invite");

		// login
		cy.get("#email").type("abhishek@timeless.co");
		cy.get("#password").type("qqqqqq");
		cy.get(":nth-child(4) > .flex").click();
		cy.wait(5000);

		cy.get("#user-name").should("have.text", "Abhishek MG");

		// create category
		cy.get("#add-category-button").click();
		cy.wait(2000);
		cy.get("#add-category-input").type("share-test-cat{enter}");
		// cy.get('#collection-name').should('have.text', 'share-test-cat');

		cy.get("#collections-wrapper a:last-child #collection-name").should(
			"have.text",
			"share-test-cat",
		);

		// send collab invite to new shared category

		cy.get("#share-button").click();
		cy.get("#Collaboration-tab").click();
		cy.get("#collab-email-input").type("test@test.com{enter}");

		// accept invite
		cy.wait("@invite").then((intercept) => {
			// you can now access the request body, response body, status, ...

			cy.request("GET", intercept?.response?.body?.url).then((response) => {
				expect(response).property("status").to.equal(200);
				expect(response).property("body").to.contain({
					success: "User has been added as a colaborator to the category",
				});
			});
		});

		// sign-out and then log-in as invited collab user
		cy.get("body").type("{esc}");
		cy.wait(500);
		cy.get(".user-menu-btn").click();
		cy.wait(1000);
		cy.get(".sign-out").click();
		cy.wait(3000);
		cy.get("#email").type("test@test.com");
		cy.get("#password").type("qqqqqq");
		cy.get(":nth-child(4) > .flex").click();
		cy.wait(5000);

		cy.get("#user-name").should("have.text", "test@test.com");

		// check if collab category is present

		cy.get('[href="/share-test-cat"] #collection-name').should(
			"have.text",
			"share-test-cat",
		);

		// add new bookmark in shared category when collab user does not have access to it

		cy.get('[href="/share-test-cat"] #collection-name').click();
		cy.wait(1000);
		cy.get("body").type("{cmd}k");
		cy.get("#add-url-input").type(
			"https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test#Write-your-first-test{enter}",
		);
		cy.get(".Toastify__toast-body > :nth-child(2)").should(
			"have.text",
			ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
		);

		// log out from collab user acc , then login to admin user acc and then update collab user access
		cy.wait(500);
		cy.get(".user-menu-btn").click();
		cy.wait(1000);
		cy.get(".sign-out").click();
		cy.wait(3000);
		cy.get("#email").type("abhishek@timeless.co");
		cy.get("#password").type("qqqqqq");
		cy.get(":nth-child(4) > .flex").click();
		cy.wait(5000);

		cy.get("#user-name").should("have.text", "Abhishek MG");

		cy.get('[href="/share-test-cat"] #collection-name').click();
		cy.get("#share-button").click();
		cy.get("#Collaboration-tab").click();
		cy.get("#collab-access-select").select("Edit");
		cy.get("body").type("{esc}");

		// log out of admin account , then log into collab user account , then add new bookmark in shared category when collab user does have access to it
		cy.wait(500);
		cy.get(".user-menu-btn").click();
		cy.wait(1000);
		cy.get(".sign-out").click();
		cy.wait(3000);
		cy.get("#email").type("test@test.com");
		cy.get("#password").type("qqqqqq");
		cy.get(":nth-child(4) > .flex").click();
		cy.wait(5000);

		cy.get("#user-name").should("have.text", "test@test.com");

		cy.wait(1000);
		cy.get('[href="/share-test-cat"] #collection-name').click();
		cy.wait(1000);

		cy.get("body").type("{cmd}k");
		cy.get("#add-url-input").type(
			"https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test#Write-your-first-test{enter}",
		);
		cy.wait(2000);
		cy.get(":nth-child(1) > :nth-child(1) > a > .p-4 > .text-base").should(
			"have.text",
			"Writing Your First E2E Test | Cypress Documentation",
		);

		cy.get("body").type("{esc}");

		// del the added bookmark and clear trash
		// click del icon for 1st bookmark in list
		cy.get(
			".my-masonry-grid_column:first-child .single-bookmark:first-child .helper-icons figure:nth-child(2)",
		).click();

		// go to trash page
		cy.get(`[href="/${TRASH_URL}"]`).click();

		// check if del bookmark is there in trash

		// clear the trash
		cy.get("#clear-trash-button").click();
		cy.get("#warning-button").click();

		cy.wait(1000);

		cy.get("#no-bookmarks-text").should("have.text", "No Bookmarks");
	});
});
