(function() {
  'use strict';

  const STORAGE_KEY = 'popup_dismissed_';

  function isDismissedToday(popupId) {
    const dismissed = localStorage.getItem(STORAGE_KEY + popupId);
    if (!dismissed) return false;

    const today = new Date().toDateString();
    return dismissed === today;
  }

  function dismissPopup(popupId) {
    const checkbox = document.getElementById('popup-dismiss-check');
    if (checkbox && checkbox.checked) {
      const today = new Date().toDateString();
      localStorage.setItem(STORAGE_KEY + popupId, today);
    }
  }

  function showPopup(popup) {
    const overlay = document.getElementById('popup-overlay');
    const titleEl = document.getElementById('popup-title');
    const contentEl = document.getElementById('popup-content');
    const imageEl = document.getElementById('popup-image');
    const linkEl = document.getElementById('popup-link');
    const closeBtn = overlay.querySelector('.popup-close');
    const dismissCheck = document.getElementById('popup-dismiss-check');

    // 제목과 내용 설정 (XSS 방지: textContent 사용)
    titleEl.textContent = popup.title;
    contentEl.textContent = popup.content;

    // 이미지 설정
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

    // 링크 설정
    if (popup.linkUrl) {
      linkEl.href = popup.linkUrl;
      linkEl.textContent = popup.linkText || '자세히 보기';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.style.display = 'inline-block';
    } else {
      linkEl.style.display = 'none';
    }

    // 체크박스 초기화
    dismissCheck.checked = false;

    // 팝업 표시
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // 닫기 이벤트
    function closePopup() {
      dismissPopup(popup.id);
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        closePopup();
        document.removeEventListener('keydown', handler);
      }
    });
  }

  async function fetchPopups() {
    try {
      var response = await fetch('/api/popups');
      if (!response.ok) return;

      var data = await response.json();
      if (!data.popups || data.popups.length === 0) return;

      // 이미 dismiss된 팝업 제외, 첫 번째 팝업 표시
      var popup = data.popups.find(function(p) {
        return !isDismissedToday(p.id);
      });

      if (popup) {
        // 약간의 딜레이 후 표시 (UX)
        setTimeout(function() { showPopup(popup); }, 800);
      }
    } catch (err) {
      // API 실패 시 조용히 무시 (랜딩페이지는 정상 작동)
      console.warn('Popup fetch failed:', err.message);
    }
  }

  // DOM 로드 후 팝업 fetch
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchPopups);
  } else {
    fetchPopups();
  }
})();
