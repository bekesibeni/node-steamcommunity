module.exports = CEconItem;

function CEconItem(item, description, contextID, assetProperties) {
	var thing;
	for (thing in item) {
		if (item.hasOwnProperty(thing)) {
			this[thing] = item[thing];
		}
	}

	// Main asset_properties: 1 = paint_seed, 2 = float_value, 3 = charm_template, 5 = nametag, 6 = item_certificate, 7 = finish_catalog
	// propertyid 4 = sticker_wear lives in asset_accessories[].parent_relationship_properties
	this.asset_properties = {};
	if (assetProperties && assetProperties.asset_properties && Array.isArray(assetProperties.asset_properties)) {
		var props = assetProperties.asset_properties;
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			if (p.propertyid === 1 && p.int_value !== undefined) {
				this.asset_properties.paint_seed = parseInt(p.int_value, 10);
			} else if (p.propertyid === 2 && p.float_value !== undefined) {
				this.asset_properties.float_value = parseFloat(p.float_value);
			} else if (p.propertyid === 3 && (p.int_value !== undefined || p.string_value !== undefined)) {
				this.asset_properties.charm_template = p.int_value !== undefined ? parseInt(p.int_value, 10) : p.string_value;
			} else if (p.propertyid === 5 && p.string_value !== undefined) {
				this.asset_properties.nametag = p.string_value;
			} else if (p.propertyid === 6 && p.string_value !== undefined) {
				this.asset_properties.item_certificate = p.string_value;
			} else if (p.propertyid === 7 && (p.int_value !== undefined || p.string_value !== undefined)) {
				this.asset_properties.finish_catalog = p.int_value !== undefined ? parseInt(p.int_value, 10) : p.string_value;
			}
		}
	}

	// asset_accessories: each has parent_relationship_properties; propertyid 4 = sticker_wear (float)
	this.asset_accessories = [];
	if (assetProperties && assetProperties.asset_accessories && Array.isArray(assetProperties.asset_accessories)) {
		for (var j = 0; j < assetProperties.asset_accessories.length; j++) {
			var acc = assetProperties.asset_accessories[j];
			var parsed = { classid: acc.classid };
			var relProps = acc.parent_relationship_properties;
			if (relProps && Array.isArray(relProps)) {
				for (var k = 0; k < relProps.length; k++) {
					var rp = relProps[k];
					if (rp.propertyid === 4 && rp.float_value !== undefined) {
						parsed.sticker_wear = parseFloat(rp.float_value);
						break;
					}
				}
			}
			this.asset_accessories.push(parsed);
		}
	}

	var isCurrency = !!(this.is_currency || this.currency) || typeof this.currencyid !== 'undefined'; // I don't want to put this on the object yet; it's nice to have the ids at the top of printed output

	if (isCurrency) {
		this.currencyid = this.id = (this.id || this.currencyid);
	} else {
		this.assetid = this.id = (this.id || this.assetid);
	}

	this.instanceid = this.instanceid || '0';
	this.amount = parseInt(this.amount, 10);
	this.contextid = this.contextid || contextID.toString();

	// Merge the description
	if (description) {
		// Is this a listing of descriptions?
		if (description[this.classid + '_' + this.instanceid]) {
			description = description[this.classid + '_' + this.instanceid];
		}

		for (thing in description) {
			if (description.hasOwnProperty(thing) && !this.hasOwnProperty(thing)) {
				this[thing] = description[thing];
			}
		}
	}

	this.is_currency = isCurrency;
	this.tradable = !!this.tradable;
	this.marketable = !!this.marketable;
	this.commodity = !!this.commodity;
	this.market_tradable_restriction = (this.market_tradable_restriction ? parseInt(this.market_tradable_restriction, 10) : 0);
	this.market_marketable_restriction = (this.market_marketable_restriction ? parseInt(this.market_marketable_restriction, 10) : 0);
	this.fraudwarnings = this.fraudwarnings || [];
	this.descriptions = this.descriptions || [];

	if (this.owner && JSON.stringify(this.owner) == '{}') {
		this.owner = null;
	}

	// Restore old property names of tags
	if (this.tags) {
		this.tags = this.tags.map(function(tag) {
			return {
				"internal_name": tag.internal_name,
				"name": tag.localized_tag_name || tag.name,
				"category": tag.category,
				"color": tag.color || "",
				"category_name": tag.localized_category_name || tag.category_name
			};
		});
	}

	// Restore market_fee_app, if applicable
	var match;
	if (this.appid == 753 && this.contextid == 6 && this.market_hash_name && (match = this.market_hash_name.match(/^(\d+)\-/))) {
		this.market_fee_app = parseInt(match[1], 10);
	}

	// Restore cache_expiration, if we can (for CS:GO items)
	if (this.appid == 730 && this.contextid == 2 && this.owner_descriptions) {
		let description = this.owner_descriptions.find(d => d.value && d.value.indexOf('Tradable/Marketable After ') == 0);
		if (description) {
			let date = new Date(description.value.substring(26).replace(/[,()]/g, ''));
			if (date) {
				this.cache_expiration = date.toISOString();
			}
		}
	}

	// If we have item_expiration, also set cache_expiration to the same value
	if (this.item_expiration) {
		this.cache_expiration = this.item_expiration;
	}

	if (this.actions === "") {
		this.actions = [];
	}

	// One wouldn't think that we need this if statement, but apparently v8 has a weird bug/quirk where deleting a
	// property results in greatly increased memory usage. Because that makes sense.
	if (this.currency) {
		delete this.currency;
	}
}

CEconItem.prototype.getImageURL = function() {
	return "https://steamcommunity-a.akamaihd.net/economy/image/" + this.icon_url + "/";
};

CEconItem.prototype.getLargeImageURL = function() {
	if(!this.icon_url_large) {
		return this.getImageURL();
	}

	return "https://steamcommunity-a.akamaihd.net/economy/image/" + this.icon_url_large + "/";
};

CEconItem.prototype.getTag = function(category) {
	if (!this.tags) {
		return null;
	}

	for (var i = 0; i < this.tags.length; i++) {
		if (this.tags[i].category == category) {
			return this.tags[i];
		}
	}

	return null;
};
