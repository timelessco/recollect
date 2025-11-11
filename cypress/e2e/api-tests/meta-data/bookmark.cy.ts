/* eslint-disable @typescript-eslint/no-unused-expressions */
// @ts-nocheck

describe("Meta data testing", () => {
	beforeEach(() => {
		// cy.visit("/all-bookmarks");
		cy.visit("/login");
	});

	it("bookmark meta_data check", async () => {
		cy.login(
			Cypress.env("test_email") as string,
			Cypress.env("test_password") as string,
		);

		cy.request(`/api/bookmark/add-bookmark-min-data`, {
			category_id: 0,
			update_access: true,
			url: "https://unsplash.com/photos/a-city-street-with-a-lot-of-tall-buildings-badrIRxBqmk",
		}).as("addRequest");

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		let bookmarkId;

		cy.get("@addRequest")?.then((addBookmarkData) => {
			bookmarkId = addBookmarkData?.body?.data?.[0]?.id;

			// check meta data

			cy.reload();

			cy.wait(40000);

			cy.request(
				`/api/v1/bookmarks/get/fetch-by-id?id=${addBookmarkData?.body?.data?.[0]?.id}`,
				{},
			).as("fetchRequest");

			cy.get("@fetchRequest").then((data) => {
				expect(data?.body?.data?.[0]?.meta_data).to.not.be.null;
				expect(data?.body?.data?.[0]?.meta_data?.ocr).to.not.be.null;
				expect(data?.body?.data?.[0]?.meta_data?.img_caption).to.not.be.null;
				expect(data?.body?.data?.[0]?.meta_data?.ogImgBlurUrl).to.not.be.null;
			});

			// delete the bookmark
			cy.request(`/api/bookmark/delete-bookmark`, {
				data: {
					deleteData: [
						{
							id: addBookmarkData?.body?.data?.[0]?.id,
							ogImage: addBookmarkData?.body?.data?.[0]?.ogImage,
							title: addBookmarkData?.body?.data?.[0]?.title,
							url: addBookmarkData?.body?.data?.[0]?.url,
						},
					],
				},
			});
		});
	});
});
