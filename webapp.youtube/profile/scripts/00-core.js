// SPDX-License-Identifier: GPL-3.0-or-later
// Core hooks for the YouTube TV app inside Kodi's web view: a modifier
// chain on JSON.parse, XMLHttpRequest and fetch, and overrides for the
// app's configuration objects. Runs at document start in the main world.
//
// Derived from VacuumTube (https://github.com/shy1132/VacuumTube),
// Copyright (c) 2025-2026 shy, MIT License.

(function () {
  'use strict';

  if (window.__kodiweb)
    return;

  const kw = {
    jsonModifiers: [],
    responseModifiers: [],
    requestModifiers: [],
    ytcfgOverrides: [],
    environmentOverrides: [],
    stats: { json: 0, xhr: 0, fetch: 0, requests: 0 },
  };
  Object.defineProperty(window, '__kodiweb', { value: kw });

  function deepMerge(current, updates) {
    for (const key of Object.keys(updates)) {
      const update = updates[key];
      if (update === '__DELETE__') {
        delete current[key];
      } else if (update && typeof update === 'object' && current[key] &&
                 typeof current[key] === 'object') {
        deepMerge(current[key], update);
      } else {
        current[key] = update;
      }
    }
    return current;
  }
  kw.deepMerge = deepMerge;

  function pathOf(url) {
    try {
      return new URL(String(url), location.href).pathname;
    } catch (e) {
      return '';
    }
  }
  kw.pathOf = pathOf;

  function runModifiers(list, ...args) {
    let value = args[args.length - 1];
    for (const modifier of list) {
      try {
        const result = modifier(...args.slice(0, -1), value);
        if (result !== undefined)
          value = result;
      } catch (e) {
        console.error('kodiweb: modifier failed', e);
      }
    }
    return value;
  }

  const jsonParse = JSON.parse;
  JSON.parse = function (...args) {
    const json = jsonParse.apply(JSON, args);
    if (!json || typeof json !== 'object')
      return json;
    kw.stats.json++;
    return runModifiers(kw.jsonModifiers, json);
  };

  const OriginalXHR = window.XMLHttpRequest;
  const responseTextGetter =
      Object.getOwnPropertyDescriptor(OriginalXHR.prototype, 'responseText').get;
  const responseGetter = Object.getOwnPropertyDescriptor(OriginalXHR.prototype, 'response').get;

  function KodiXHR() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    let path = '';
    let modified = null;

    xhr.open = function (method, url, ...rest) {
      path = pathOf(url);
      modified = null;
      return originalOpen.call(this, method, url, ...rest);
    };
    xhr.send = function (body) {
      if (typeof body === 'string' && path.startsWith('/youtubei/')) {
        kw.stats.requests++;
        body = runModifiers(kw.requestModifiers, path, body);
      }
      return originalSend.call(this, body);
    };

    function text() {
      if (modified !== null)
        return modified;
      const original = responseTextGetter.call(xhr);
      if (xhr.readyState !== 4 || !kw.responseModifiers.length)
        return original;
      kw.stats.xhr++;
      modified = runModifiers(kw.responseModifiers, path, original);
      return modified;
    }

    Object.defineProperty(xhr, 'responseText', {
      get() {
        if (xhr.responseType !== '' && xhr.responseType !== 'text')
          return responseTextGetter.call(xhr);
        return text();
      },
    });
    Object.defineProperty(xhr, 'response', {
      get() {
        if (xhr.responseType !== '' && xhr.responseType !== 'text')
          return responseGetter.call(xhr);
        return text();
      },
    });
    return xhr;
  }
  KodiXHR.prototype = OriginalXHR.prototype;
  Object.setPrototypeOf(KodiXHR, OriginalXHR);
  window.XMLHttpRequest = KodiXHR;

  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const path = pathOf(url);
    if (init && typeof init.body === 'string' && path.startsWith('/youtubei/')) {
      kw.stats.requests++;
      init = Object.assign({}, init, { body: runModifiers(kw.requestModifiers, path, init.body) });
    }
    const response = await originalFetch.call(this, input, init);
    if (!kw.responseModifiers.length || !path.startsWith('/youtubei/'))
      return response;
    const original = await response.clone().text();
    kw.stats.fetch++;
    const modified = runModifiers(kw.responseModifiers, path, original);
    if (modified === original)
      return response;
    return new Response(modified, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };

  // the app assigns these globals once; a setter on the window applies the
  // overrides at that moment, and ytcfg.set() carries them into later data
  function hookGlobal(name, overrides, onSet) {
    let value = window[name];
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: true,
      get() {
        return value;
      },
      set(next) {
        value = next;
        if (next && typeof next === 'object')
          onSet(next, overrides);
      },
    });
  }

  function applyAll(target, overrides) {
    for (const override of overrides)
      deepMerge(target, structuredClone(override));
  }

  hookGlobal('environment', kw.environmentOverrides, applyAll);
  hookGlobal('ytcfg', kw.ytcfgOverrides, function (cfg, overrides) {
    if (cfg.data_ && typeof cfg.data_ === 'object')
      applyAll(cfg.data_, overrides);
    if (typeof cfg.set !== 'function')
      return;
    const originalSet = cfg.set;
    cfg.set = function (data, ...rest) {
      if (data && typeof data === 'object')
        applyAll(data, overrides);
      return originalSet.call(this, data, ...rest);
    };
  });
})();
