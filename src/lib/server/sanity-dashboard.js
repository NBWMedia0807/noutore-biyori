import { client } from '$lib/sanity.server.js';

export async function getTrendingArticles() {
	return client.fetch(
		`*[_type == "quiz" && defined(slug.current) && !(_id in path("drafts.**"))]
		| order(coalesce(publishedAt, _createdAt) desc)[0..19] {
			_id,
			title,
			"slug": slug.current,
			"publishedAt": coalesce(publishedAt, _createdAt),
			"category": categories[0]->title,
			"categorySlug": categories[0]->slug.current,
			"thumbnail": mainImage.asset->url,
			viewCount,
			likeCount,
			popularityScore
		}`
	);
}

export async function getArticleStats() {
	return client.fetch(
		`{
			"total": count(*[_type == "quiz" && !(_id in path("drafts.**"))]),
			"publishedThisMonth": count(*[
				_type == "quiz" &&
				!(_id in path("drafts.**")) &&
				dateTime(coalesce(publishedAt, _createdAt)) >= dateTime(now()) - 60*60*24*30
			]),
			"byCategory": *[_type == "category"] {
				title,
				"slug": slug.current,
				"count": count(*[_type == "quiz" && references(^._id) && !(_id in path("drafts.**"))])
			} | order(count desc)
		}`
	);
}
