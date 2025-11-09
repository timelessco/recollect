/* eslint-disable @typescript-eslint/no-unused-expressions */
// @ts-nocheck

describe("Meta data testing", () => {
	beforeEach(() => {
		// cy.visit("/all-bookmarks");
		cy.visit("/login");
	});

	it("file upload check", async () => {
		cy.wait(3000);

		cy.login(
			Cypress.env("test_email") as string,
			Cypress.env("test_password") as string,
		);

		const headers = {
			Accept: "application/json",
			"Content-Type": "application/json",
		};
		cy.request({
			method: "POST",
			// Ensure this URL is correct
			url: "/api/v1/tests/file/post/upload",
			body: {
				name: "image.png",
				type: "image/png",
				uploadFileNamePath: "m05eqwhx-image.png",
			},
			headers,
		}).as("uploadRequest");

		cy.get("@uploadRequest")?.then((addBookmarkData) => {
			bookmarkId = addBookmarkData?.body?.data?.[0]?.id;

			// check meta data

			cy.reload();

			cy.wait(60000);

			cy.reload();

			cy.wait(2000);

			cy.request(
				`/api/v1/bookmarks/get/fetch-by-id?id=${addBookmarkData?.body?.data?.[0]?.id}`,
				{},
			).as("fetchRequest");

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

			cy.get("@deleteRequest").then((data) => {
				cy.wait(1000);

				expect(data.status).to.eq(200);
			});
		});
	});
});
