/**
 * Latest Videos gallery, powered by the YouTube Data API v3.
 *
 * Setup (one-time):
 * 1. Go to https://console.cloud.google.com/apis/credentials, create a project if needed.
 * 2. Enable the "YouTube Data API v3" (APIs & Services -> Library -> search for it -> Enable).
 * 3. Create an API key (Credentials -> Create Credentials -> API key).
 * 4. Restrict the key to your domain: edit the key -> "Application restrictions" ->
 *    "Websites" -> add https://www.sdarlotus.com/* and https://sdarlotus.com/*
 *    (also add http://localhost:5500/* temporarily while testing locally).
 * 5. Under "API restrictions", restrict the key to "YouTube Data API v3" only.
 * 6. Paste the key below as YT_API_KEY.
 *
 * This uses the channel's uploads playlist (1 API unit per pageview) instead of the
 * search endpoint (100 units per pageview), so the free daily quota (10,000 units)
 * comfortably covers thousands of visits per day.
 */
(function () {
  var YT_API_KEY = "AIzaSyCTK2qixY9o-SjJq-KZzBRzM97opF4HWwU";
  var YT_CHANNEL_ID = "UClQKo4fnj7Y4MhoFgXmArqg";
  var YT_UPLOADS_PLAYLIST_ID = "UU" + YT_CHANNEL_ID.slice(2);
  var YT_MAX_RESULTS = 6;
  var YT_CHANNEL_URL = "https://www.youtube.com/@sdarlotus";

  /**
   * Featured videos: paste up to 3 YouTube video IDs here (the part after
   * "watch?v=" in the URL, e.g. for https://youtu.be/dQw4w9WgXcQ the ID is
   * "dQw4w9WgXcQ"). Leave the array empty to hide the Featured section.
   */
  var YT_FEATURED_IDS = [
    // "VIDEO_ID_1",
    // "VIDEO_ID_2",
    // "VIDEO_ID_3",
  ];

  var grid = document.getElementById("yt-gallery-grid");
  if (!grid) return;

  var featuredBlock = document.getElementById("yt-featured");
  var featuredGrid = document.getElementById("yt-featured-grid");

  function renderSkeletons() {
    var html = "";
    for (var i = 0; i < YT_MAX_RESULTS; i++) {
      html +=
        '<div class="yt-gallery-card yt-gallery-skeleton">' +
        '<div class="yt-gallery-thumb-wrap"></div>' +
        "</div>";
    }
    grid.innerHTML = html;
  }

  function renderState(message) {
    grid.innerHTML =
      '<div class="yt-gallery-state">' +
      message +
      ' <a href="' + YT_CHANNEL_URL + '" target="_blank" rel="noopener">Watch on YouTube &rarr;</a>' +
      "</div>";
  }

  function formatDate(isoString) {
    var date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function playVideo(card, videoId) {
    var wrap = card.querySelector(".yt-gallery-thumb-wrap");
    wrap.innerHTML =
      '<iframe src="https://www.youtube.com/embed/' +
      videoId +
      '?autoplay=1&rel=0" title="YouTube video player" frameborder="0" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
      "allowfullscreen></iframe>";
  }

  function pickThumb(thumbnails) {
    return (thumbnails.maxres ||
      thumbnails.standard ||
      thumbnails.high ||
      thumbnails.medium ||
      thumbnails.default).url;
  }

  function buildCard(snippet, videoId, index, extraClass) {
    var card = document.createElement("div");
    card.className = "yt-gallery-card mystic-reveal" + (extraClass ? " " + extraClass : "");
    card.style.setProperty("--reveal-delay", Math.min(index, 5) * 0.08 + "s");
    card.innerHTML =
      '<div class="yt-gallery-thumb-wrap">' +
      '<img src="' + pickThumb(snippet.thumbnails) + '" alt="' + escapeHtml(snippet.title) + '" loading="lazy">' +
      '<div class="yt-gallery-play"></div>' +
      "</div>" +
      '<div class="yt-gallery-info">' +
      '<p class="yt-gallery-video-title">' + escapeHtml(snippet.title) + "</p>" +
      '<p class="yt-gallery-video-date">' + formatDate(snippet.publishedAt) + "</p>" +
      "</div>";

    card
      .querySelector(".yt-gallery-thumb-wrap")
      .addEventListener("click", function () {
        playVideo(card, videoId);
      });

    if (typeof window.mysticObserveReveal === "function") {
      window.mysticObserveReveal(card);
    }
    return card;
  }

  function renderVideos(items) {
    grid.innerHTML = "";
    items.forEach(function (item, index) {
      var snippet = item.snippet;
      var videoId = snippet.resourceId && snippet.resourceId.videoId;
      if (!videoId) return;
      grid.appendChild(buildCard(snippet, videoId, index));
    });
  }

  function renderFeatured(items) {
    if (!featuredGrid || !featuredBlock) return;
    // Preserve the order the IDs were listed in the config.
    var byId = {};
    items.forEach(function (item) { byId[item.id] = item; });

    featuredGrid.innerHTML = "";
    var rendered = 0;
    YT_FEATURED_IDS.forEach(function (id, index) {
      var item = byId[id];
      if (!item) return;
      featuredGrid.appendChild(buildCard(item.snippet, item.id, index, "yt-featured-card"));
      rendered++;
    });

    if (rendered > 0) featuredBlock.hidden = false;
  }

  function loadLatestVideos() {
    if (!YT_API_KEY || YT_API_KEY === "YOUR_YOUTUBE_API_KEY_HERE") {
      renderState("Video gallery isn't configured yet.");
      return;
    }

    renderSkeletons();

    var url =
      "https://www.googleapis.com/youtube/v3/playlistItems" +
      "?part=snippet&maxResults=" + YT_MAX_RESULTS +
      "&playlistId=" + YT_UPLOADS_PLAYLIST_ID +
      "&key=" + YT_API_KEY;

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("YouTube API error " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.items || !data.items.length) {
          renderState("No videos found yet.");
          return;
        }
        renderVideos(data.items);
      })
      .catch(function (err) {
        console.error("Failed to load latest YouTube videos:", err);
        renderState("Couldn't load the latest videos right now.");
      });
  }

  function loadFeaturedVideos() {
    var ids = (YT_FEATURED_IDS || []).filter(Boolean).slice(0, 3);
    if (!ids.length || !featuredGrid) return;
    if (!YT_API_KEY || YT_API_KEY === "YOUR_YOUTUBE_API_KEY_HERE") return;

    var url =
      "https://www.googleapis.com/youtube/v3/videos" +
      "?part=snippet&id=" + encodeURIComponent(ids.join(",")) +
      "&key=" + YT_API_KEY;

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("YouTube API error " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.items && data.items.length) renderFeatured(data.items);
      })
      .catch(function (err) {
        console.error("Failed to load featured YouTube videos:", err);
      });
  }

  loadFeaturedVideos();
  loadLatestVideos();
})();
