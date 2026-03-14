(function(){
  var BLOG_LIKE_CONFIG = {
  "enable": true,
  "Backend": "Cloudflare",
  "CloudflareBackend": "/api/like",
  "PHPBackend": "",
  "AppID": "",
  "AppKEY": "",
  "GoogleAnalytics": false,
  "GAEventCategory": "Engagement",
  "GAEventAction": "Like",
  "AutoInjectLike": false
};
  var alertBox = null;
  var alertTimer = null;
  function showAlert(msg) {
    if (!alertBox) {
      alertBox = document.createElement("div");
      alertBox.style.position = "fixed";
      alertBox.style.top = "20%";
      alertBox.style.left = "50%";
      alertBox.style.transform = "translate(-50%, -50%)";
      alertBox.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
      alertBox.style.color = "white";
      alertBox.style.padding = "15px 30px";
      alertBox.style.borderRadius = "8px";
      alertBox.style.zIndex = "1000";
      alertBox.style.fontSize = "16px";
      alertBox.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.2)";
      document.body.appendChild(alertBox);
    }
    alertBox.innerText = msg;
    if (alertTimer) clearTimeout(alertTimer);
    alertTimer = setTimeout(function () {
      if (alertBox && alertBox.parentNode) {
        alertBox.parentNode.removeChild(alertBox);
      }
      alertBox = null;
      alertTimer = null;
    }, 1800);
  }
  function heartAnimation() {
    var heart = document.querySelector('.heart');
    if (!heart) return;
    heart.classList.remove('heartAnimation');
    void heart.offsetWidth;
    heart.classList.add('heartAnimation');
    setTimeout(function(){
      heart.classList.remove('heartAnimation');
    },800);
  }
  function getCookie(name) {
    var cookieArr = document.cookie.split(";");
    for (var i = 0; i < cookieArr.length; i++) {
      var cookie = cookieArr[i].trim();
      if (cookie.startsWith(name + "=")) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  }
  function setCookie(name, value, days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    var expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }
  function deleteCookie(name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
  }
  function getVisitorLiked(url) {
    var liked = getCookie("likes_" + url);
    return liked === "1";
  }
  function setVisitorLiked(url, liked) {
    if (liked) {
      setCookie("likes_" + url, "1", 30);
    } else {
      deleteCookie("likes_" + url);
    }
  }
  function setHeartLiked(liked) {
    var heart = document.querySelector('.heart');
    if (!heart) return;
    if (liked) {
      heart.classList.add('liked');
    } else {
      heart.classList.remove('liked');
      heart.classList.remove('heartAnimation');
    }
  }
  function updateZanText(num) {
    var el = document.getElementById("zan_text");
    if (el) el.innerHTML = num;
  }
  function sendGAEvent() {
    if (BLOG_LIKE_CONFIG.GoogleAnalytics && typeof window.gtag === 'function') {
      gtag('event', BLOG_LIKE_CONFIG.GAEventAction || 'Like', {
        'event_category': BLOG_LIKE_CONFIG.GAEventCategory || 'Engagement',
        'event_label': window.url
      });
    }
  }
  function mainCloudflare() {
    window.flag = 0;
    window.url = location.host + location.pathname;
    var url = window.url;
    var flag = window.flag;
    var isRequesting = false;

    function getCloudflareApiUrl() {
      var backend = BLOG_LIKE_CONFIG.CloudflareBackend;
      if (!backend) return null;
      return /^https?:\/\//.test(backend) ? backend.replace(/\/$/, '') : backend;
    }

    function cloudflareLike(delta, done) {
      var apiUrl = getCloudflareApiUrl();
      if (!apiUrl) {
        showAlert("Cloudflare 后端未配置");
        console.error('Cloudflare 后端未配置');
        if (done) done();
        return;
      }

      var bodyData = {
        Url: url,
        Add: delta
      };

      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        if (done) done();
      }

      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })
      .then(function(resp){
        if (resp.status === 429) {
          showAlert("您已达到速率限制");
          throw new Error("429");
        }
        return resp.json();
      })
      .then(function(d){
        if (typeof d['likes'] !== "undefined") {
          updateZanText(d['likes']);
          if (delta > 0) {
            setVisitorLiked(url, true);
            setHeartLiked(true);
            heartAnimation();
            showAlert("点赞成功");
          } else if (delta < 0) {
            setVisitorLiked(url, false);
            setHeartLiked(false);
            showAlert("取消点赞");
          }
        } else {
          showAlert("Failed to get likes");
        }
        finish();
      })
      .catch(function(e){
        if(e && e.message === "429") return;
        showAlert("后端请求失败, 请检查Cloudflare配置");
        console.error("Cloudflare 请求失败：", e);
        finish();
      });
    }
    function likeBackend(delta, done) {
      cloudflareLike(delta, done);
    }
    window.goodplus = function(u, f) {
      if (isRequesting) return;
      var targetLiked = !getVisitorLiked(url);
      var delta = targetLiked ? 1 : -1;
      if (targetLiked) sendGAEvent();
      isRequesting = true;
      likeBackend(delta, function(){
        isRequesting = false;
      });
    };

    document.addEventListener('DOMContentLoaded', function() {
      setHeartLiked(getVisitorLiked(url));
      likeBackend(0);
    });
  }
  mainCloudflare();
})();
