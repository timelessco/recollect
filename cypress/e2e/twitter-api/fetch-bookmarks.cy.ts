// @ts-nocheck
describe("get folders bookmarks", () => {
	it("fetch bookmarks with cursor", () => {
		cy.request({
			method: "GET",
			url: `https://x.com/i/api/graphql/rJugOZAOCetdHyofJNjgrQ/Bookmarks?&features=%7B%22rweb_video_screen_enabled%22%3Afalse%2C%22payments_enabled%22%3Afalse%2C%22profile_label_improvements_pcf_label_in_post_enabled%22%3Atrue%2C%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22premium_content_api_read_enabled%22%3Afalse%2C%22communities_web_enable_tweet_community_results_fetch%22%3Atrue%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22responsive_web_grok_analyze_button_fetch_trends_enabled%22%3Afalse%2C%22responsive_web_grok_analyze_post_followups_enabled%22%3Atrue%2C%22responsive_web_jetfuel_frame%22%3Atrue%2C%22responsive_web_grok_share_attachment_enabled%22%3Atrue%2C%22articles_preview_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22responsive_web_grok_show_grok_translated_post%22%3Afalse%2C%22responsive_web_grok_analysis_button_from_backend%22%3Atrue%2C%22creator_subscriptions_quote_tweet_preview_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_grok_image_annotation_enabled%22%3Atrue%2C%22responsive_web_grok_imagine_annotation_enabled%22%3Atrue%2C%22responsive_web_grok_community_note_auto_translation_is_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D`,
			headers: {
				accept: "*/*",
				"accept-language": "en-US,en;q=0.9",
				authorization:
					"Bearer // TODO: add token here from recollect extension's local storage",
				"content-type": "application/json",
				"x-csrf-token":
					"// TODO: add csrf token here from recollect extension's local storage",
				"x-twitter-active-user": "yes",
				"x-twitter-auth-type": "OAuth2Session",
				"x-twitter-client-language": "en-us",
				cookie:
					"// TODO: add cookie here from recollect extension's local storage",
				Referer: `https://x.com/i/bookmarks`,
			},
		}).then((res) => {
			console.log(res.body);

			expect(res.status).to.eq(200);
			expect(res.body).to.have.property("data");
			expect(res.body.data).to.have.property("bookmark_timeline_v2");
			expect(res.body.data.bookmark_timeline_v2).to.have.property("timeline");
			expect(res.body.data.bookmark_timeline_v2.timeline).to.have.property(
				"instructions",
			);
			expect(res.body.data.bookmark_timeline_v2.timeline.instructions).to.not.be
				.empty;

			expect(
				res.body.data.bookmark_timeline_v2.timeline.instructions[0],
			).to.have.property("entries");
		});
	});
});
