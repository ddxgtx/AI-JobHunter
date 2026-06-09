/**
 * AI-JobHunter v2.6 - Content Script
 * 编码: UTF-8
 * 仅负责：浮动按钮（打开侧边栏）、JD 提取、表单填写
 * 所有 UI 已移至 Chrome 侧边栏 (sidepanel)
 */

(function() {
  'use strict';
  if (window.__aiResumeHelperV2) return;
  window.__aiResumeHelperV2 = true;

  var ACCENT = '#007AFF';
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ====== 浮动按钮（点击打开侧边栏） ======
  (function createFloatingButton() {
    var btn = document.createElement('div');
    btn.id = 'ai-resume-fab';
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h2"/></svg>';
    btn.title = 'AI-JobHunter · 点击打开侧边栏';
    btn.style.cssText = 'position:fixed;right:20px;bottom:80px;width:44px;height:44px;background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:grab;box-shadow:0 2px 12px rgba(0,0,0,0.08);z-index:2147483647;transition:box-shadow 0.2s,transform 0.15s;user-select:none;';
    var dragging = false, startX, startY, startLeft, startBottom, moved = false;
    btn.addEventListener('mousedown', function(e) {
      dragging = true; moved = false; startX = e.clientX; startY = e.clientY;
      var rect = btn.getBoundingClientRect();
      startLeft = rect.left; startBottom = window.innerHeight - rect.bottom;
      btn.style.cursor = 'grabbing'; btn.style.transition = 'none'; e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) moved = true;
      btn.style.right = 'auto'; btn.style.left = (startLeft + e.clientX - startX) + 'px'; btn.style.bottom = (startBottom - (e.clientY - startY)) + 'px';
    });
    document.addEventListener('mouseup', function() {
      if (!dragging) return; dragging = false;
      btn.style.cursor = 'grab'; btn.style.transition = 'box-shadow 0.2s,transform 0.15s';
      if (moved) { try { var r = btn.getBoundingClientRect(); chrome.storage.local.set({ _btnPos: { left: r.left, top: r.top } }); } catch(e) {} }
    });
    try { chrome.storage.local.get(['_btnPos'], function(d) { if (d._btnPos) { btn.style.right = 'auto'; btn.style.left = d._btnPos.left + 'px'; btn.style.top = d._btnPos.top + 'px'; btn.style.bottom = 'auto'; } }); } catch(e) {}
    btn.addEventListener('mouseenter', function() { if (!dragging) { btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; btn.style.transform = 'scale(1.05)'; } });
    btn.addEventListener('mouseleave', function() { btn.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', function() {
      if (!moved) {
        chrome.runtime.sendMessage({ action: 'openSidePanel' }).catch(function() {});
      }
    });
    document.body.appendChild(btn);
  })();
})();
