/**
 * AI-JobHunter v2.7 - Content Script
 * 编码: UTF-8
 * 浮动窗口：JD 提取、AI 填写、打开侧边栏
 */

(function() {
  'use strict';
  if (window.__aiResumeHelperV2) return;
  window.__aiResumeHelperV2 = true;

  var ACCENT = '#007AFF';
  var widget = null;
  var panel = null;
  var fab = null;
  var isExpanded = false;
  var currentJD = null;
  var currentJobInfo = null;

  // ====== SVG 图标 ======
  var icons = {
    logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h2"/></svg>',
    logoWhite: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h2"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    minus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    extract: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
    fill: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    sidebar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    bookmark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    loading: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
    expand: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
  };

  // ====== 工具函数 ======
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.className = 'ai-jh-toast' + (type ? ' ' + type : '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(function() { toast.remove(); }, 300);
    }, 2500);
  }

  // ====== 创建浮动窗口 ======
  function createWidget() {
    widget = document.createElement('div');
    widget.className = 'ai-jh-widget';

    // 浮动按钮（收起状态）
    fab = document.createElement('div');
    fab.className = 'ai-jh-fab';
    fab.innerHTML = icons.logo;
    fab.title = 'AI-JobHunter · 点击展开';
    widget.appendChild(fab);

    // 浮动窗口（展开状态）
    panel = document.createElement('div');
    panel.className = 'ai-jh-panel';
    panel.style.display = 'none';

    // 标题栏
    var header = document.createElement('div');
    header.className = 'ai-jh-header';
    header.innerHTML = '<div class="ai-jh-header-left">' + icons.logoWhite + '<span class="ai-jh-header-title">AI-JobHunter</span></div>' +
      '<div class="ai-jh-header-actions">' +
      '<button class="ai-jh-header-btn" id="ai-jh-minimize" title="收起">' + icons.minus + '</button>' +
      '</div>';
    panel.appendChild(header);

    // 内容区
    var content = document.createElement('div');
    content.className = 'ai-jh-content';

    // 按钮组
    var btnGroup = document.createElement('div');
    btnGroup.className = 'ai-jh-btn-group';

    // 获取 JD 按钮
    var extractBtn = document.createElement('button');
    extractBtn.className = 'ai-jh-btn';
    extractBtn.id = 'ai-jh-extract';
    extractBtn.innerHTML = '<div class="ai-jh-btn-icon">' + icons.extract + '</div>' +
      '<div class="ai-jh-btn-text"><div class="ai-jh-btn-title">获取当前页面 JD</div>' +
      '<div class="ai-jh-btn-desc">提取职位描述并预览</div></div>';
    btnGroup.appendChild(extractBtn);

    // 收藏职位按钮
    var saveJobBtn = document.createElement('button');
    saveJobBtn.className = 'ai-jh-btn';
    saveJobBtn.id = 'ai-jh-save-job';
    saveJobBtn.innerHTML = '<div class="ai-jh-btn-icon">' + icons.bookmark + '</div>' +
      '<div class="ai-jh-btn-text"><div class="ai-jh-btn-title">收藏当前职位</div>' +
      '<div class="ai-jh-btn-desc">保存到职位管理</div></div>';
    btnGroup.appendChild(saveJobBtn);

    // AI 填写简历按钮
    var fillBtn = document.createElement('button');
    fillBtn.className = 'ai-jh-btn';
    fillBtn.id = 'ai-jh-fill';
    fillBtn.innerHTML = '<div class="ai-jh-btn-icon">' + icons.fill + '</div>' +
      '<div class="ai-jh-btn-text"><div class="ai-jh-btn-title">AI 智能填写简历</div>' +
      '<div class="ai-jh-btn-desc">自动匹配并填写表单</div></div>';
    btnGroup.appendChild(fillBtn);

    // 打开侧边栏按钮
    var sidebarBtn = document.createElement('button');
    sidebarBtn.className = 'ai-jh-btn';
    sidebarBtn.id = 'ai-jh-sidebar';
    sidebarBtn.innerHTML = '<div class="ai-jh-btn-icon">' + icons.sidebar + '</div>' +
      '<div class="ai-jh-btn-text"><div class="ai-jh-btn-title">打开侧边栏</div>' +
      '<div class="ai-jh-btn-desc">更多功能设置</div></div>';
    btnGroup.appendChild(sidebarBtn);

    content.appendChild(btnGroup);

    // JD 预览区（默认隐藏）
    var preview = document.createElement('div');
    preview.className = 'ai-jh-preview';
    preview.id = 'ai-jh-preview';
    preview.style.display = 'none';
    content.appendChild(preview);

    // 填写进度区（默认隐藏）
    var fillProgress = document.createElement('div');
    fillProgress.className = 'ai-jh-fill-progress';
    fillProgress.id = 'ai-jh-fill-progress';
    fillProgress.style.display = 'none';
    content.appendChild(fillProgress);

    panel.appendChild(content);

    // 底部信息
    var footer = document.createElement('div');
    footer.className = 'ai-jh-footer';
    footer.innerHTML = '<span class="ai-jh-footer-text">Powered by <a href="https://github.com/ddxgtx" target="_blank" class="ai-jh-footer-link">ddxgtx</a></span>' +
      '<a href="https://github.com/ddxgtx/AI-JobHunter" target="_blank" class="ai-jh-footer-link">GitHub</a>';
    panel.appendChild(footer);

    widget.appendChild(panel);
    document.body.appendChild(widget);

    // 绑定事件
    bindEvents();
    
    // 恢复位置
    restorePosition();
  }

  // ====== 绑定事件 ======
  function bindEvents() {
    // 浮动按钮拖拽变量
    var fabDragging = false, fabStartX, fabStartY, fabStartLeft, fabStartBottom, fabMoved = false;
    
    // 标题栏拖拽变量
    var headerDragging = false, headerStartX, headerStartY, headerStartLeft, headerStartBottom, headerMoved = false;

    // 浮动按钮点击
    fab.addEventListener('click', function(e) {
      if (!fabMoved) {
        togglePanel();
      }
    });

    // 标题栏拖拽
    var header = panel.querySelector('.ai-jh-header');
    header.addEventListener('mousedown', function(e) {
      if (e.target.closest('.ai-jh-header-btn')) return;
      headerDragging = true;
      headerMoved = false;
      headerStartX = e.clientX;
      headerStartY = e.clientY;
      var rect = widget.getBoundingClientRect();
      headerStartLeft = rect.left;
      headerStartBottom = window.innerHeight - rect.bottom;
      header.classList.add('dragging');
      e.preventDefault();
    });

    // 浮动按钮拖拽
    fab.addEventListener('mousedown', function(e) {
      fabDragging = true;
      fabMoved = false;
      fabStartX = e.clientX;
      fabStartY = e.clientY;
      var rect = widget.getBoundingClientRect();
      fabStartLeft = rect.left;
      fabStartBottom = window.innerHeight - rect.bottom;
      fab.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      // 处理浮动按钮拖拽
      if (fabDragging) {
        if (Math.abs(e.clientX - fabStartX) > 3 || Math.abs(e.clientY - fabStartY) > 3) {
          fabMoved = true;
          var newLeft = fabStartLeft + e.clientX - fabStartX;
          var newBottom = fabStartBottom - (e.clientY - fabStartY);
          widget.style.right = 'auto';
          widget.style.left = newLeft + 'px';
          widget.style.bottom = newBottom + 'px';
        }
      }
      // 处理标题栏拖拽
      if (headerDragging) {
        if (Math.abs(e.clientX - headerStartX) > 3 || Math.abs(e.clientY - headerStartY) > 3) {
          headerMoved = true;
          var newLeft = headerStartLeft + e.clientX - headerStartX;
          var newBottom = headerStartBottom - (e.clientY - headerStartY);
          widget.style.right = 'auto';
          widget.style.left = newLeft + 'px';
          widget.style.bottom = newBottom + 'px';
        }
      }
    });

    document.addEventListener('mouseup', function() {
      // 处理浮动按钮拖拽结束
      if (fabDragging) {
        fabDragging = false;
        fab.classList.remove('dragging');
        if (fabMoved) {
          savePosition();
        }
      }
      // 处理标题栏拖拽结束
      if (headerDragging) {
        headerDragging = false;
        header.classList.remove('dragging');
        if (headerMoved) {
          savePosition();
        }
      }
    });

    // 最小化按钮
    document.getElementById('ai-jh-minimize').addEventListener('click', function() {
      togglePanel();
    });

    // 获取 JD 按钮
    document.getElementById('ai-jh-extract').addEventListener('click', function() {
      extractJD();
    });

    // 收藏职位按钮
    document.getElementById('ai-jh-save-job').addEventListener('click', function() {
      saveCurrentJob();
    });

    // AI 填写按钮
    document.getElementById('ai-jh-fill').addEventListener('click', function() {
      autoFillResume();
    });

    // 打开侧边栏
    document.getElementById('ai-jh-sidebar').addEventListener('click', function() {
      chrome.runtime.sendMessage({ action: 'openSidePanel' }).catch(function() {});
    });
  }

  // ====== 切换面板显示 ======
  function togglePanel() {
    isExpanded = !isExpanded;
    if (isExpanded) {
      fab.style.display = 'none';
      panel.style.display = 'block';
    } else {
      fab.style.display = 'flex';
      panel.style.display = 'none';
    }
  }

  // ====== 保存/恢复位置 ======
  function savePosition() {
    try {
      var rect = widget.getBoundingClientRect();
      chrome.storage.local.set({ _widgetPos: { left: rect.left, top: rect.top } });
    } catch(e) {}
  }

  function restorePosition() {
    try {
      chrome.storage.local.get(['_widgetPos'], function(d) {
        if (d._widgetPos) {
          widget.style.right = 'auto';
          widget.style.left = d._widgetPos.left + 'px';
          widget.style.top = d._widgetPos.top + 'px';
          widget.style.bottom = 'auto';
        }
      });
    } catch(e) {}
  }

  // ====== 提取 JD ======
  function extractJD() {
    var btn = document.getElementById('ai-jh-extract');
    btn.classList.add('loading');
    btn.querySelector('.ai-jh-btn-icon').innerHTML = icons.loading;

    // 获取当前 tab ID
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        showToast('无法获取当前页面', 'error');
        resetExtractBtn();
        return;
      }

      var tabId = tabs[0].id;

      // 并行提取 JD 和职位信息
      Promise.all([
        chrome.scripting.executeScript({ target: { tabId: tabId }, func: extractJDFromPage }),
        chrome.scripting.executeScript({ target: { tabId: tabId }, func: extractJobInfo })
      ]).then(function(results) {
        var jdText = results[0]?.[0]?.result || '';
        var jobInfo = results[1]?.[0]?.result || {};

        if (jdText) {
          currentJD = jdText;
          currentJobInfo = jobInfo;
          showPreview(jdText, jobInfo);
          showToast('JD 提取成功', 'success');
        } else {
          showToast('未提取到 JD，请手动粘贴', 'error');
        }
        resetExtractBtn();
      }).catch(function(err) {
        showToast('提取失败: ' + err.message, 'error');
        resetExtractBtn();
      });
    });
  }

  function resetExtractBtn() {
    var btn = document.getElementById('ai-jh-extract');
    btn.classList.remove('loading');
    btn.querySelector('.ai-jh-btn-icon').innerHTML = icons.extract;
  }

  // ====== 显示 JD 预览 ======
  function showPreview(jdText, jobInfo) {
    var preview = document.getElementById('ai-jh-preview');
    var html = '';

    // 职位信息卡片
    if (jobInfo.position || jobInfo.company) {
      html += '<div class="ai-jh-job-card">';
      if (jobInfo.position) html += '<div class="ai-jh-job-title">' + esc(jobInfo.position) + '</div>';
      if (jobInfo.company) html += '<div class="ai-jh-job-company">' + esc(jobInfo.company) + '</div>';
      var tags = [jobInfo.salary, jobInfo.location, jobInfo.experience, jobInfo.education].filter(Boolean);
      if (tags.length) {
        html += '<div class="ai-jh-job-tags">';
        tags.forEach(function(tag) {
          html += '<span class="ai-jh-job-tag">' + esc(tag) + '</span>';
        });
        html += '</div>';
      }
      html += '</div>';
    }

    // JD 内容
    html += '<div class="ai-jh-preview-header"><span class="ai-jh-preview-title">职位描述</span>';
    html += '<button class="ai-jh-preview-close" id="ai-jh-preview-close">' + icons.close + '</button></div>';
    html += '<div class="ai-jh-jd-content collapsed" id="ai-jh-jd-text">' + esc(jdText) + '</div>';
    html += '<button class="ai-jh-jd-toggle" id="ai-jh-jd-toggle">展开全文</button>';

    preview.innerHTML = html;
    preview.style.display = 'block';

    // 绑定事件
    document.getElementById('ai-jh-preview-close').addEventListener('click', function() {
      preview.style.display = 'none';
    });

    document.getElementById('ai-jh-jd-toggle').addEventListener('click', function() {
      var textEl = document.getElementById('ai-jh-jd-text');
      if (textEl.classList.contains('collapsed')) {
        textEl.classList.remove('collapsed');
        this.textContent = '收起';
      } else {
        textEl.classList.add('collapsed');
        this.textContent = '展开全文';
      }
    });
  }

  // ====== AI 填写简历 ======
  function autoFillResume() {
    var btn = document.getElementById('ai-jh-fill');
    var progress = document.getElementById('ai-jh-fill-progress');
    
    btn.classList.add('loading');
    btn.querySelector('.ai-jh-btn-icon').innerHTML = icons.loading;
    progress.style.display = 'block';
    progress.innerHTML = '<div class="ai-jh-fill-status"><span class="ai-jh-fill-status-icon">' + icons.loading + '</span>正在扫描表单字段...</div>';

    // 获取当前 tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        showFillError('无法获取当前页面');
        return;
      }

      var tabId = tabs[0].id;

      // 扫描表单字段
      chrome.scripting.executeScript({ target: { tabId: tabId }, func: extractPageFormFields }).then(function(results) {
        var pageFields = results?.[0]?.result;
        if (!pageFields?.length) {
          showFillError('未检测到可填写字段');
          return;
        }

        progress.innerHTML = '<div class="ai-jh-fill-status"><span class="ai-jh-fill-status-icon">' + icons.loading + '</span>检测到 ' + pageFields.length + ' 个字段，AI 匹配中...</div>';

        // 获取简历信息
        chrome.storage.local.get(['resume'], function(data) {
          var resume = data.resume || {};
          if (!resume.r_name) {
            showFillError('请先在侧边栏保存简历信息');
            return;
          }

          // 发送给 background 进行 AI 匹配
          chrome.runtime.sendMessage({
            action: 'autoFillResume',
            pageFields: pageFields,
            resume: resume
          }, function(resp) {
            if (!resp?.success) {
              showFillError(resp?.error || 'AI 匹配失败');
              return;
            }

            progress.innerHTML = '<div class="ai-jh-fill-status"><span class="ai-jh-fill-status-icon">' + icons.loading + '</span>匹配完成，正在填写...</div>';

            // 执行填写
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: fillPageFields,
              args: [resp.mappings]
            }).then(function(fillResults) {
              var report = fillResults?.[0]?.result;
              if (report) {
                var successCount = report.filter(function(r) { return r.status === 'ok'; }).length;
                var failCount = report.filter(function(r) { return r.status === 'fail'; }).length;
                
                var html = '';
                report.forEach(function(item) {
                  var icon = item.status === 'ok' ? icons.check : icons.error;
                  var cls = item.status === 'ok' ? 'success' : 'error';
                  html += '<div class="ai-jh-fill-status ' + cls + '"><span class="ai-jh-fill-status-icon">' + icon + '</span>' + 
                    esc(item.field) + ': ' + esc(item.detail) + '</div>';
                });
                progress.innerHTML = html;
                
                showToast('填写完成: ' + successCount + ' 成功, ' + failCount + ' 失败', successCount > 0 ? 'success' : 'error');
              }
              resetFillBtn();
            }).catch(function(err) {
              showFillError('填写失败: ' + err.message);
            });
          });
        });
      }).catch(function(err) {
        showFillError('扫描失败: ' + err.message);
      });
    });
  }

  function showFillError(msg) {
    var progress = document.getElementById('ai-jh-fill-progress');
    progress.innerHTML = '<div class="ai-jh-fill-status error"><span class="ai-jh-fill-status-icon">' + icons.error + '</span>' + esc(msg) + '</div>';
    resetFillBtn();
    showToast(msg, 'error');
  }

  function resetFillBtn() {
    var btn = document.getElementById('ai-jh-fill');
    btn.classList.remove('loading');
    btn.querySelector('.ai-jh-btn-icon').innerHTML = icons.fill;
  }

  // ====== 收藏职位 ======
  function saveCurrentJob() {
    var btn = document.getElementById('ai-jh-save-job');
    btn.classList.add('loading');
    btn.querySelector('.ai-jh-btn-icon').innerHTML = icons.loading;

    // 获取当前 tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        showToast('无法获取当前页面', 'error');
        resetSaveJobBtn();
        return;
      }

      var tabId = tabs[0].id;
      var url = tabs[0].url;

      // 提取职位信息
      chrome.scripting.executeScript({ target: { tabId: tabId }, func: extractJobInfo }).then(function(results) {
        var jobInfo = results?.[0]?.result || {};
        
        if (!jobInfo.position && !jobInfo.company) {
          showToast('未检测到职位信息', 'error');
          resetSaveJobBtn();
          return;
        }

        // 保存到 storage
        chrome.storage.local.get(['savedJobs'], function(data) {
          var jobs = data.savedJobs || [];
          
          // 检查是否已存在
          var exists = jobs.some(function(j) {
            return j.url === url || (j.position === jobInfo.position && j.company === jobInfo.company);
          });
          
          if (exists) {
            showToast('该职位已收藏', 'info');
            resetSaveJobBtn();
            return;
          }

          // 添加新职位
          jobs.unshift({
            position: jobInfo.position || '',
            company: jobInfo.company || '',
            salary: jobInfo.salary || '',
            location: jobInfo.location || '',
            experience: jobInfo.experience || '',
            education: jobInfo.education || '',
            url: url,
            status: 'saved',
            time: Date.now(),
            updatedTime: Date.now()
          });

          // 限制数量
          if (jobs.length > 200) {
            jobs = jobs.slice(0, 200);
          }

          chrome.storage.local.set({ savedJobs: jobs }, function() {
            showToast('已收藏: ' + (jobInfo.position || '未知职位'), 'success');
            resetSaveJobBtn();
          });
        });
      }).catch(function(err) {
        showToast('提取失败: ' + err.message, 'error');
        resetSaveJobBtn();
      });
    });
  }

  function resetSaveJobBtn() {
    var btn = document.getElementById('ai-jh-save-job');
    btn.classList.remove('loading');
    btn.querySelector('.ai-jh-btn-icon').innerHTML = icons.bookmark;
  }

  // ======================================================================
  // 注入到页面的函数（必须独立，无闭包依赖）
  // ======================================================================

  // JD 提取函数（从 sidepanel.js 复制）
  function extractJDFromPage() {
    var url = window.location.href;
    var jdText = '';
    var platform = '';

    // 检测平台
    if (url.includes('zhipin.com')) platform = 'zhipin';
    else if (url.includes('51job.com')) platform = '51job';
    else if (url.includes('zhaopin.com')) platform = 'zhaopin';
    else if (url.includes('liepin.com')) platform = 'liepin';
    else if (url.includes('lagou.com')) platform = 'lagou';
    else if (url.includes('kanzhun.com')) platform = 'kanzhun';
    else if (url.includes('58.com')) platform = '58';
    else if (url.includes('linkedin.com')) platform = 'linkedin';
    else if (url.includes('maimai.cn')) platform = 'maimai';
    else if (url.includes('offercool.com')) platform = 'offercool';

    // 平台特定选择器
    var selectors = {
      zhipin: ['.job-detail-section .job-sec-text', '.job-detail-bottom .job-sec-text', '.detail-content .job-sec-text', '.job-desc'],
      '51job': ['.job_msg', '.j_job_msg', '.tCompany_main .job_detail'],
      zhaopin: ['.describtion', '.describtion-box', '.job-detail .pos-ul'],
      liepin: ['.job-intro-container', '.job-qualifications', '.job-intro'],
      lagou: ['.job_bt', '.job-detail-content', '.job_detail'],
      kanzhun: ['.job-detail .job-sec-text', '.detail-content .job-sec-text'],
      '58': ['.job-detail .job_desc', '.des', '.job-description'],
      linkedin: ['.jobs-description__content', '.jobs-box__html-content', '.job-details'],
      maimai: ['.job-detail-description', '.job-desc'],
      offercool: ['.job-detail-content', '.job-desc']
    };

    var removeTags = 'style,script,nav,header,footer,.filter,.search,.nav-bar,.sidebar,.recommend,.similar-job,.ads';

    // 尝试平台特定选择器
    var sels = selectors[platform] || [];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el && el.textContent.trim().length > 20) {
        var clone = el.cloneNode(true);
        clone.querySelectorAll(removeTags).forEach(function(r) { r.remove(); });
        jdText = clone.textContent.trim();
        if (jdText.length > 30) break;
        jdText = '';
      }
    }

    // 关键词检测
    if (!jdText || jdText.length < 50) {
      var jdKeywords = {
        '岗位职责': 150, '任职要求': 150, '职位描述': 150, '岗位要求': 150,
        '工作职责': 140, '任职资格': 140, '工作内容': 140, '职位要求': 140,
        '我们需要': 120, '我们希望': 120, '你需要': 120, '加分项': 100, '优先': 90, '负责': 80
      };
      var secondaryKeywords = ['技能', '经验', '学历', '专业', '熟悉', '了解', '掌握', '开发', '设计', '管理', '分析', '沟通', '团队'];
      var bestEl = null, bestScore = 0;
      var candidates = document.querySelectorAll('div, section, article, li, p');

      for (var j = 0; j < candidates.length; j++) {
        var el = candidates[j];
        var text = el.textContent || '';
        if (text.length < 30 || text.length > 5000) continue;
        if (el.querySelectorAll('div').length > 10) continue;

        var score = 0;
        // 核心关键词评分（带位置权重）
        for (var kw in jdKeywords) {
          var idx = text.indexOf(kw);
          if (idx >= 0) {
            var positionFactor = idx < text.length * 0.3 ? 1.5 : 1.0;
            score += Math.round(jdKeywords[kw] * positionFactor);
          }
        }
        // 次要关键词评分
        for (var k = 0; k < secondaryKeywords.length; k++) {
          if (text.includes(secondaryKeywords[k])) score += 20;
        }

        var chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        if (chinese / text.length < 0.3) continue;
        score += chinese * 0.5;

        if (text.length >= 100 && text.length <= 2000) score += 50;
        else if (text.length > 2000 && text.length <= 3000) score += 20;
        else if (text.length > 3000) score -= 50;

        var listItems = el.querySelectorAll('li').length;
        if (listItems >= 3 && listItems <= 15) score += 30;

        var hasList = el.querySelector('ul, ol') !== null;
        if (hasList) score += 25;

        if (score > bestScore) { bestScore = score; bestEl = el; }
      }

      if (bestEl && bestScore > 150) {
        var clone = bestEl.cloneNode(true);
        clone.querySelectorAll(removeTags).forEach(function(r) { r.remove(); });
        jdText = clone.textContent.trim();
      }
    }

    if (!jdText) return null;

    // 清理
    jdText = jdText.replace(/[\u200b\u200c\u200d\ufeff]/g, '');
    if (platform === 'zhipin') {
      jdText = jdText.replace(/BOSS直聘/gi, '');
      jdText = jdText.replace(/来自BOSS直聘/g, '');
    }
    jdText = jdText.replace(/(收藏|立即沟通|举报|分享)\s*/g, '');

    // 提取 JD 部分
    var jdMarkers = ['岗位职责', '任职要求', '职位描述', '岗位要求', '职位要求', '工作职责', '任职资格', '工作内容'];
    var jdStart = -1;
    for (var m = 0; m < jdMarkers.length; m++) {
      var idx = jdText.indexOf(jdMarkers[m]);
      if (idx >= 0 && (jdStart < 0 || idx < jdStart)) jdStart = idx;
    }
    if (jdStart > 0) {
      jdText = jdText.substring(jdStart);
    }

    jdText = jdText.replace(/\s+/g, ' ').trim();
    if (jdText.length > 3000) jdText = jdText.substring(0, 3000) + '...';

    return jdText.length > 30 ? jdText : null;
  }

  // 职位信息提取函数（从 sidepanel.js 复制）
  function extractJobInfo() {
    var url = window.location.href;
    var info = { position: '', company: '', salary: '', location: '', experience: '', education: '' };
    
    function q(sels) {
      for (var i = 0; i < sels.length; i++) {
        var el = document.querySelector(sels[i]);
        if (el && el.textContent.trim()) return el.textContent.trim().replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      }
      return '';
    }

    if (url.includes('zhipin.com')) {
      info.position = q(['.job-name', '.info-primary .name']);
      info.company = q(['.company-name a', '.info-company .name']);
      info.salary = q(['.salary', '.info-primary .salary']);
      info.location = q(['.job-area', '.info-primary .job-area']);
      info.experience = q(['.job-limit .text-experience', '.info-primary .text-experience']);
      info.education = q(['.job-limit .text-degree', '.info-primary .text-degree']);
    } else if (url.includes('51job.com')) {
      info.position = q(['.job_msg h1', 'h1']);
      info.company = q(['.tCompany_top .company_name', '.company_name']);
      info.salary = q(['.salary', '.job_msg .salary']);
    } else if (url.includes('zhaopin.com')) {
      info.position = q(['.describtion h1', 'h1']);
      info.company = q(['.company-name']);
      info.salary = q(['.salary']);
    } else if (url.includes('liepin.com')) {
      info.position = q(['.job-intro-container h1', 'h1']);
      info.company = q(['.company-name']);
      info.salary = q(['.job-salary']);
    } else if (url.includes('lagou.com')) {
      info.position = q(['.job-name h1', 'h1']);
      info.company = q(['.company-name']);
      info.salary = q(['.salary']);
    } else if (url.includes('kanzhun.com')) {
      info.position = q(['.job-title', 'h1']);
      info.company = q(['.company-name']);
      info.salary = q(['.salary']);
    } else if (url.includes('58.com')) {
      info.position = q(['.job-title h1', 'h1']);
      info.company = q(['.company-name']);
      info.salary = q(['.salary']);
    } else if (url.includes('linkedin.com')) {
      info.position = q(['.job-details-jobs-unified-top-card__job-title', 'h1']);
      info.company = q(['.job-details-jobs-unified-top-card__company-name']);
      info.salary = q(['.job-details-jobs-unified-top-card__job-insight']);
    }

    return info;
  }

  // 表单字段提取函数（从 sidepanel.js 复制）
  function extractPageFormFields() {
    var fields = [];
    var seen = new Set();
    
    function extractLabel(el) {
      var label = '';
      if (el.id) {
        var l = document.querySelector('label[for="' + el.id + '"]');
        if (l) label = l.textContent.trim();
      }
      if (!label) {
        var p = el.closest('label');
        if (p) label = p.textContent.trim();
      }
      if (!label && el.previousElementSibling && el.previousElementSibling.textContent.trim().length < 30) {
        label = el.previousElementSibling.textContent.trim();
      }
      if (!label) label = el.getAttribute('aria-label') || '';
      return label.replace(/[*:：]/g, '').trim();
    }

    document.querySelectorAll('input, textarea, select').forEach(function(el) {
      if (['hidden', 'submit', 'button', 'file', 'image', 'color'].includes(el.type)) return;
      if (el.disabled || el.readOnly) return;

      if (el.type === 'radio' && el.name) {
        if (seen.has('radio:' + el.name)) return;
        seen.add('radio:' + el.name);
        var opts = [];
        document.querySelectorAll('input[type="radio"][name="' + el.name + '"]').forEach(function(r) {
          opts.push({ value: r.value, id: r.id });
        });
        fields.push({
          selector: 'input[type="radio"][name="' + el.name + '"]',
          label: extractLabel(el),
          placeholder: '',
          tagName: 'input',
          inputType: 'radio',
          name: el.name,
          options: opts
        });
        return;
      }

      if (el.type === 'checkbox') {
        var key = el.id ? '#' + el.id : (el.name ? 'cb:' + el.name : null);
        if (!key || seen.has(key)) return;
        seen.add(key);
        fields.push({
          selector: el.id ? '#' + CSS.escape(el.id) : 'input[type="checkbox"][name="' + el.name + '"]',
          label: extractLabel(el),
          placeholder: '',
          tagName: 'input',
          inputType: 'checkbox',
          name: el.name || '',
          checked: el.checked
        });
        return;
      }

      var selector;
      if (el.id) selector = '#' + CSS.escape(el.id);
      else if (el.name) selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
      else {
        var all = Array.from(el.parentElement ? el.parentElement.children : []);
        selector = el.tagName.toLowerCase() + ':nth-child(' + (all.indexOf(el) + 1) + ')';
      }
      if (seen.has(selector)) return;
      seen.add(selector);

      var info = {
        selector: selector,
        label: extractLabel(el),
        placeholder: el.placeholder || '',
        tagName: el.tagName.toLowerCase(),
        inputType: el.type || 'text',
        name: el.name || ''
      };
      if (el.tagName === 'SELECT') {
        info.options = Array.from(el.options).map(function(o) {
          return { value: o.value, text: o.textContent.trim() };
        });
      }
      fields.push(info);
    });

    return fields.length > 0 ? fields : null;
  }

  // 表单填写函数（从 sidepanel.js 复制）
  function fillPageFields(mappings) {
    var report = [];
    
    function fireEvents(el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    function getNativeSetter(el) {
      if (el.tagName === 'TEXTAREA') return Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      return Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    }

    // 模糊匹配函数
    function fuzzyMatch(text, value) {
      if (!text || !value) return 0;
      text = text.toLowerCase().trim();
      value = value.toLowerCase().trim();
      
      // 完全匹配
      if (text === value) return 100;
      // 包含匹配
      if (text.includes(value) || value.includes(text)) return 80;
      // 前缀匹配
      if (text.startsWith(value) || value.startsWith(text)) return 70;
      
      // 计算共同字符数
      var commonChars = 0;
      var shorter = text.length < value.length ? text : value;
      var longer = text.length < value.length ? value : text;
      for (var i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) commonChars++;
      }
      var similarity = commonChars / longer.length;
      
      // 相似度超过 60% 认为匹配
      if (similarity >= 0.6) return Math.round(similarity * 60);
      
      return 0;
    }

    mappings.forEach(function(m) {
      try {
        var el = document.querySelector(m.selector);
        if (!el) {
          report.push({ field: m.fieldName || m.selector, status: 'fail', detail: '元素未找到' });
          return;
        }

        if (el.tagName === 'SELECT') {
          var bestMatch = null;
          var bestScore = 0;
          
          for (var i = 0; i < el.options.length; i++) {
            var opt = el.options[i];
            var optText = opt.textContent.trim();
            var optValue = opt.value;
            
            // 计算匹配分数
            var textScore = fuzzyMatch(optText, m.value);
            var valueScore = fuzzyMatch(optValue, m.value);
            var maxScore = Math.max(textScore, valueScore);
            
            if (maxScore > bestScore) {
              bestScore = maxScore;
              bestMatch = opt;
            }
          }
          
          if (bestMatch && bestScore >= 50) {
            el.value = bestMatch.value;
            fireEvents(el);
            report.push({ field: m.fieldName || m.selector, status: 'ok', detail: '已选择: ' + bestMatch.textContent.trim() + ' (匹配度:' + bestScore + '%)' });
          } else {
            report.push({ field: m.fieldName || m.selector, status: 'fail', detail: '未找到匹配选项' });
          }
          return;
        }

        if (el.type === 'radio' || m.inputType === 'radio') {
          var radios = document.querySelectorAll(m.selector);
          var found = false;
          radios.forEach(function(r) {
            if (r.value === m.value) { r.checked = true; fireEvents(r); found = true; }
          });
          report.push({ field: m.fieldName || m.selector, status: found ? 'ok' : 'fail', detail: found ? '已选择: ' + m.value : '未找到匹配选项' });
          return;
        }

        if (el.type === 'checkbox' || m.inputType === 'checkbox') {
          var shouldCheck = m.value === 'true' || m.value === '1' || m.value === '是';
          el.checked = shouldCheck;
          fireEvents(el);
          report.push({ field: m.fieldName || m.selector, status: 'ok', detail: shouldCheck ? '已勾选' : '已取消勾选' });
          return;
        }

        var setter = getNativeSetter(el);
        if (setter) setter.call(el, m.value);
        else el.value = m.value;
        fireEvents(el);
        report.push({ field: m.fieldName || m.selector, status: 'ok', detail: '已填写' });
      } catch(e) {
        report.push({ field: m.fieldName || m.selector, status: 'fail', detail: e.message });
      }
    });

    return report;
  }

  // ====== 初始化 ======
  createWidget();
})();
