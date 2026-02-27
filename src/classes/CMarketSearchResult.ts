import type { HTMLElement } from 'node-html-parser';

export class CMarketSearchResult {
	readonly appid: number;
	readonly market_hash_name: string;
	readonly image: string | undefined;
	readonly price: number;
	readonly quantity: number;

	constructor(row: HTMLElement) {
		const href = row.getAttribute('href') ?? '';
		const match = href.match(/\/market\/listings\/(\d+)\/([^?/]+)/);

		this.appid = match ? parseInt(match[1]!, 10) : 0;
		this.market_hash_name = match ? decodeURIComponent(match[2]!) : '';

		const imgSrc = row.querySelector('.market_listing_item_img')?.getAttribute('src') ?? '';
		const imgMatch = imgSrc.match(/^https?:\/\/[^/]+\/economy\/image\/[^/]+\//);
		this.image = imgMatch ? imgMatch[0] : undefined;

		this.price = parseInt(
			(row.querySelector('.market_listing_their_price .market_table_value span.normal_price')?.textContent ?? '')
				.replace(/[^\d]+/g, ''),
			10,
		);

		this.quantity = parseInt(
			(row.querySelector('.market_listing_num_listings_qty')?.textContent ?? '').replace(/[^\d]+/g, ''),
			10,
		);
	}
}
