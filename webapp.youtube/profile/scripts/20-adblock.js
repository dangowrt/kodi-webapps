// SPDX-License-Identifier: GPL-3.0-or-later
// No advertisement reaches the screen: ad slots are removed from the home
// and search feeds, ad placements from every player response, and ads from
// the Shorts feed. Request-level blocking is the content filter's job.
//
// Derived from VacuumTube (https://github.com/shy1132/VacuumTube),
// Copyright (c) 2025-2026 shy, MIT License.

(function () {
  'use strict';

  const kw = window.__kodiweb;
  if (!kw)
    return;

  kw.stats.adsRemoved = 0;

  function dropAdItems(items) {
    const kept = items.filter(function (item) {
      return !item.adSlotRenderer;
    });
    kw.stats.adsRemoved += items.length - kept.length;
    return kept;
  }

  function cleanShelves(contents) {
    for (const feed of contents) {
      const horizontal = feed && feed.shelfRenderer && feed.shelfRenderer.content &&
          feed.shelfRenderer.content.horizontalListRenderer;
      if (horizontal && horizontal.items)
        horizontal.items = dropAdItems(horizontal.items);
    }
  }

  kw.responseModifiers.push(function (path, text) {
    const browse = path.startsWith('/youtubei/v1/browse');
    const search = path.startsWith('/youtubei/v1/search');
    if (!browse && !search)
      return undefined;
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return undefined;
    }

    if (browse) {
      const feed = json.contents && json.contents.tvBrowseRenderer &&
          json.contents.tvBrowseRenderer.content &&
          json.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer &&
          json.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content &&
          json.contents.tvBrowseRenderer.content.tvSurfaceContentRenderer.content
              .sectionListRenderer;
      if (!feed || !feed.contents)
        return undefined;
      const before = feed.contents.length;
      feed.contents = feed.contents.filter(function (section) {
        if (section.adSlotRenderer || section.promoShelfRenderer)
          return false;
        // the premium upsell shelf is the only one hiding its logo
        return !(section.shelfRenderer && section.shelfRenderer.tvhtml5Metadata &&
                 section.shelfRenderer.tvhtml5Metadata.hideLogo);
      });
      kw.stats.adsRemoved += before - feed.contents.length;
      cleanShelves(feed.contents);
    } else {
      const feed = json.contents && json.contents.sectionListRenderer;
      if (!feed || !feed.contents)
        return undefined;
      cleanShelves(feed.contents);
    }
    return JSON.stringify(json);
  });

  kw.jsonModifiers.push(function (json) {
    if (json.adPlacements && json.adPlacements.length) {
      kw.stats.adsRemoved += json.adPlacements.length;
      json.adPlacements = [];
    }
    if (json.adSlots && json.adSlots.length) {
      kw.stats.adsRemoved += json.adSlots.length;
      json.adSlots = [];
    }
    if (Array.isArray(json.entries)) {
      const before = json.entries.length;
      json.entries = json.entries.filter(function (entry) {
        const endpoint = entry && entry.command && entry.command.reelWatchEndpoint;
        return !(endpoint && endpoint.adClientParams && endpoint.adClientParams.isAd);
      });
      kw.stats.adsRemoved += before - json.entries.length;
    }
    return json;
  });
})();
