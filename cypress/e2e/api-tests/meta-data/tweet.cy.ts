/* eslint-disable @typescript-eslint/no-unused-expressions */
// @ts-nocheck

describe("Meta data testing", () => {
	beforeEach(() => {
		// cy.visit(`/${EVERYTHING_URL}`);
		cy.visit("/login");
	});

	it("tweet upload check", async () => {
		cy.wait(3000);

		cy.login(
			Cypress.env("test_email") as string,
			Cypress.env("test_password") as string,
		);

		// add the tweet
		cy.request("POST", `/api/v1/twitter/sync`, {
			data: [
				{
					description: "test tweet description",
					ogImage: "https://pbs.twimg.com/media/GVRv2bGWcAA--aC.jpg",
					title: "test title",
					type: "tweet",
					// we are generating random number , as the duplicates are removed in the sync api
					url: `https://x.com/passportprofit/status/${Math.floor(
						Math.random() * 1000000000,
					)}`,
					meta_data: {
						twitter_avatar_url: "test url",
					},
					inserted_at: "2024-08-22T14:30:00Z",
					sort_index: "89",
				},
			],
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
