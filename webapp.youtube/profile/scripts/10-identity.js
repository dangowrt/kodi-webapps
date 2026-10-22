// SPDX-License-Identifier: GPL-3.0-or-later
// Identify the client to YouTube: the Leanback app is served for the
// Cobalt user agent Kodi sends, and the app's own client context then
// names Kodi as the device, the way VacuumTube names itself.
//
// Derived from VacuumTube (https://github.com/shy1132/VacuumTube),
// Copyright (c) 2025-2026 shy, MIT License.

(function () {
  'use strict';

  const kw = window.__kodiweb;
  if (!kw)
    return;

  const BRAND = 'Kodi';
  const MODEL = '22';

  kw.environmentOverrides.push({
    platform: 'DESKTOP',
    platform_detail: '__DELETE__',
    brand: BRAND,
    model: MODEL,
    feature_switches: {
      mdx_device_label: 'Kodi',
    },
  });

  const client = {
    platform: 'DESKTOP',
    platformDetail: '__DELETE__',
    clientFormFactor: 'UNKNOWN_FORM_FACTOR',
    deviceMake: BRAND,
    deviceModel: MODEL,
    tvAppInfo: {
      releaseVehicle: '__DELETE__',
    },
  };
  const device = {
    platform: 'DESKTOP',
    brand: BRAND,
    model: MODEL,
    cobaltReleaseVehicle: '__DELETE__',
  };

  kw.ytcfgOverrides.push({
    INNERTUBE_CONTEXT: { client: client },
    WEB_PLAYER_CONTEXT_CONFIGS: {
      WEB_PLAYER_CONTEXT_CONFIG_ID_LIVING_ROOM_WATCH: { device: device },
    },
  });

  // a request may leave before the configuration objects exist
  kw.requestModifiers.push(function (path, body) {
    let json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      return undefined;
    }
    if (!json || !json.context || !json.context.client)
      return undefined;
    kw.deepMerge(json.context.client, structuredClone(client));
    return JSON.stringify(json);
  });

  kw.responseModifiers.push(function (path, text) {
    if (!path.startsWith('/tv_config'))
      return undefined;
    const lines = text.split('\n');
    let json;
    try {
      json = JSON.parse(lines[lines.length - 1]);
    } catch (e) {
      return undefined;
    }
    const config = json && json.webPlayerContextConfig &&
        json.webPlayerContextConfig.WEB_PLAYER_CONTEXT_CONFIG_ID_LIVING_ROOM_WATCH;
    if (!config || !config.device)
      return undefined;
    kw.deepMerge(config.device, structuredClone(device));
    lines[lines.length - 1] = JSON.stringify(json);
    return lines.join('\n');
  });
})();
