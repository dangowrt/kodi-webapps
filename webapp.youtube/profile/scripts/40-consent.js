// SPDX-License-Identifier: GPL-3.0-or-later
// The EU consent page lives in a cross-origin frame the TV app cannot
// dismiss from a remote. The cookie records the rejection of everything
// optional, the same choice yt-dlp makes.

(function () {
  'use strict';

  if (!location.hostname.endsWith('.youtube.com'))
    return;
  if (/(^|; )SOCS=/.test(document.cookie))
    return;
  document.cookie = 'SOCS=CAI; domain=.youtube.com; path=/; max-age=31536000; secure; samesite=lax';
})();
