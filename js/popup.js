(function() {
  'use strict';

  var STORAGE_KEY = 'popup_dismissed_';
  var popupQueue = [];
  var currentPopupIndex = 0;

  function isDismissedToday(popupId) {
    var dismissed = localStorage.getItem(STORAGE_KEY + popupId);
    if (!dismissed) return false;
    var today = new Date().toDateString();
    return dismissed === today;
  }

  function dismissPopup(popupId) {
    var checkbox = document.getElementById('popup-dismiss-check');
    if (checkbox && checkbox.checked) {
      var today = new Date().toDateString();
      localStorage.setItem(STORAGE_KEY + popupId, today);
    }
  }

  function closePopup() {
    var overlay = document.getElementById('popup-overlay');
    if (currentPopupIndex < popupQueue.length) {
      dismissPopup(popupQueue[currentPopupIndex].id);
    }
    overlay.style.display = 'none';
    document.body.style.overflow = '';

    currentPopupIndex++;
    if (currentPopupIndex < popupQueue.length) {
      setTimeout(function() { showPopup(popupQueue[currentPopupIndex]); }, 300);
    }
  }

  function showPopup(popup) {
    var overlay = document.getElementById('popup-overlay');
    var titleEl = document.getElementById('popup-title');
    var contentEl = document.getElementById('popup-content');
    var imageEl = document.getElementById('popup-image');
    var linkEl = document.getElementById('popup-link');
    var dismissCheck = document.getElementById('popup-dismiss-check');

    titleEl.textContent = popup.title;
    contentEl.textContent = popup.content;

    if (popup.imageUrl) {
      var img = document.createElement('img');
      img.src = popup.imageUrl;
      img.alt = popup.title;
      img.onerror = function() { imageEl.style.display = 'none'; };
      imageEl.innerHTML = '';
      imageEl.appendChild(img);
      imageEl.style.display = 'block';
    } else {
      imageEl.style.display = 'none';
    }

    if (popup.linkUrl) {
      linkEl.href = popup.linkUrl;
      linkEl.textContent = popup.linkText || '자세히 보기';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.style.display = 'inline-block';
    } else {
      linkEl.style.display = 'none';
    }

    dismissCheck.checked = false;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function initPopupEvents() {
    var overlay = document.getElementById('popup-overlay');
    var closeBtn = overlay.querySelector('.popup-close');

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.style.display === 'flex') {
        closePopup();
      }
    });
  }

  async function fetchPopups() {
    try {
      var response = await fetch('/api/popups');
      if (!response.ok) return;

      var data = await response.json();
      if (!data.popups || data.popups.length === 0) return;

      popupQueue = data.popups.filter(function(p) {
        return !isDismissedToday(p.id);
      });

      if (popupQueue.length > 0) {
        currentPopupIndex = 0;
        initPopupEvents();
        setTimeout(function() { showPopup(popupQueue[0]); }, 800);
      }
    } catch (err) {
      console.warn('Popup fetch failed:', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchPopups);
  } else {
    fetchPopups();
  }
})();
