/**
 * AI 简历助手 v2.5 - Popup Script
 * 编码: UTF-8
 */

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // DOM
  const tabs = document.querySelectorAll('.seg-item');
  const panels = document.querySelectorAll('.tab-panel');
  const jdInput = $('jdInput');
  const fetchJdBtn = $('fetchJd');
  const generateBtn = $('generateBtn');
  const regenerateBtn = $('regenerateBtn');
  const resultArea = $('resultArea');
  const resultBox = $('result');
  const copyBtn = $('copyBtn');
  const greetStatus = $('greetStatus');
  const toneOptions = document.querySelectorAll('.tone-pill');

  const resumeFields = ['r_name','r_phone','r_email','r_company','r_title','r_industry','r_exp','r_edu','r_salary','r_city','r_school','r_major','r_summary'];
  const saveResumeBtn = $('saveResume');
  const resumeSaveStatus = $('resumeSaveStatus');
  const autoFillBtn = $('autoFillBtn');
  const fillStatus = $('fillStatus');
  const fillStatusBar = $('fillStatusBar');

  const settingsToggle = $('settingsToggle');
  const settingsPanel = $('settingsPanel');
  const modelSelect = $('modelSelect');
  const customModelInput = $('customModel');
  const customModelRow = $('customModelRow');
  const apiKeyInput = $('apiKey');
  const apiUrlInput = $('apiUrl');
  const customApiUrlRow = $('customApiUrlRow');
  const saveApiBtn = $('saveApiBtn');
  const testApiBtn = $('testApiBtn');
  const apiStatus = $('apiStatus');
  const historyList = $('historyList');
  const clearHistoryBtn = $('clearHistory');

  // MD Editor
  const mdEditor = $('mdEditor');
  const generateMdBtn = $('generateMd');
  const saveMdBtn = $('saveMd');
  const copyMdBtn = $('copyMd');
  const mdStatus = $('mdStatus');

  // PDF Import
  const importPdfBtn = $('importPdf');
  const pdfFileInput = $('pdfFile');

  let selectedTone = 'professional';

  // ====== Tabs ======
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $('panel-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'history') loadHistory();
      if (tab.dataset.tab === 'md') loadMd();
    });
  });

  // ====== Tone ======
  toneOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      toneOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedTone = opt.dataset.tone;
    });
  });

  // ====== Settings toggle ======
  const settingsArrow = $('settingsArrow');
  settingsToggle.addEventListener('click', () => {
    const isOpen = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isOpen ? 'none' : 'block';
    if (settingsArrow) settingsArrow.classList.toggle('open', !isOpen);
  });
  modelSelect.addEventListener('change', () => {
    const isCustom = modelSelect.value === 'custom';
    customApiUrlRow.style.display = isCustom ? '' : 'none';
    customModelRow.style.display = isCustom ? '' : 'none';
  });

  // ====== Load saved ======
  chrome.storage.local.get(['apiKey','apiUrl','model','customModel','resume'], data => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    if (data.apiUrl) apiUrlInput.value = data.apiUrl;
    if (data.model) {
      modelSelect.value = data.model;
      if (data.model === 'custom') {
        customApiUrlRow.style.display = '';
        customModelRow.style.display = '';
      }
    }
    if (data.customModel) customModelInput.value = data.customModel;
    // Show model status
    const modelStatus = $('modelStatus');
    if (data.apiKey) {
      const nameMap = { openai: 'OpenAI', deepseek: 'DeepSeek', custom: data.customModel || 'Custom' };
      modelStatus.textContent = (nameMap[data.model] || 'OpenAI') + ' · ';
      modelStatus.style.color = '#8e8e93';
    } else {
      modelStatus.textContent = '未配置 · ';
      modelStatus.style.color = '#ff3b30';
    }
    if (data.resume) {
      resumeFields.forEach(f => {
        const el = $(f);
        if (el && data.resume[f]) el.value = data.resume[f];
      });
    }
  });

  // ====== Save API ======
  saveApiBtn.addEventListener('click', () => {
    const cfg = {
      apiKey: apiKeyInput.value.trim(),
      apiUrl: apiUrlInput.value.trim(),
      model: modelSelect.value,
      customModel: customModelInput.value.trim()
    };
    chrome.storage.local.set(cfg, () => toast(apiStatus, '已保存', 'ok'));
  });

  testApiBtn.addEventListener('click', async () => {
    testApiBtn.disabled = true;
    testApiBtn.textContent = '测试中...';
    try {
      const cfg = {
        apiKey: apiKeyInput.value.trim(),
        apiUrl: apiUrlInput.value.trim(),
        model: modelSelect.value,
        customModel: customModelInput.value.trim()
      };
      await new Promise(r => chrome.storage.local.set(cfg, r));
      const resp = await chrome.runtime.sendMessage({ action: 'testConnection' });
      toast(apiStatus, resp?.success ? '连接成功' : '连接失败: ' + (resp?.error || ''), resp?.success ? 'ok' : 'err');
    } catch (e) {
      toast(apiStatus, '测试失败: ' + e.message, 'err');
    } finally {
      testApiBtn.disabled = false;
      testApiBtn.textContent = '测试连接';
    }
  });

  // ====== Save resume ======
  saveResumeBtn.addEventListener('click', () => {
    const resume = {};
    resumeFields.forEach(f => { const el = $(f); if (el) resume[f] = el.value.trim(); });
    chrome.storage.local.set({ resume }, () => toast(resumeSaveStatus, '已保存', 'ok'));
  });

  // ====== Export resume ======
  const exportBtn = $('exportResume');
  exportBtn.addEventListener('click', () => {
    getConfig().then(config => {
      if (!config.resume || !config.resume.r_name) {
        toast(resumeSaveStatus, '请先保存简历信息', 'err');
        return;
      }
      const blob = new Blob([JSON.stringify(config.resume, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-resume-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast(resumeSaveStatus, '已导出', 'ok');
    });
  });

  // ====== Import resume ======
  const importBtn = $('importResume');
  const importFile = $('importFile');
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.r_name) throw new Error('无效的简历文件');
        chrome.storage.local.set({ resume: data }, () => {
          resumeFields.forEach(f => {
            const el = $(f);
            if (el && data[f]) el.value = data[f];
          });
          toast(resumeSaveStatus, '已导入', 'ok');
        });
      } catch (e) {
        toast(resumeSaveStatus, '导入失败: ' + e.message, 'err');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  // ====== PDF Import ======
  importPdfBtn.addEventListener('click', () => pdfFileInput.click());
  pdfFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    importPdfBtn.disabled = true;
    importPdfBtn.innerHTML = '<span class="spin"></span>解析中...';

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Load pdf.js
      if (typeof pdfjsLib === 'undefined') throw new Error('PDF 解析库加载失败，请刷新页面');
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.js');

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) throw new Error('PDF 中未提取到文本内容');

      // Send to AI for parsing
      const resp = await chrome.runtime.sendMessage({
        action: 'parseResumeFromText',
        text: fullText
      });

      if (resp?.success && resp.resume) {
        chrome.storage.local.set({ resume: resp.resume }, () => {
          resumeFields.forEach(f => {
            const el = $(f);
            if (el && resp.resume[f]) el.value = resp.resume[f];
          });
          toast(resumeSaveStatus, 'PDF 已解析并填充', 'ok');
        });
      } else {
        throw new Error(resp?.error || 'AI 解析失败');
      }
    } catch (e) {
      toast(resumeSaveStatus, 'PDF 导入失败: ' + e.message, 'err');
    } finally {
      importPdfBtn.disabled = false;
      importPdfBtn.textContent = '📄 导入 PDF';
      pdfFileInput.value = '';
    }
  });

  // ====== MD Editor ======
  function loadMd() {
    chrome.storage.local.get(['resumeMD'], data => {
      if (data.resumeMD) mdEditor.value = data.resumeMD;
    });
  }

  generateMdBtn.addEventListener('click', () => {
    getConfig().then(config => {
      if (!config.resume?.r_name) {
        toast(mdStatus, '请先保存简历信息', 'err');
        return;
      }
      const md = generateMarkdown(config.resume);
      mdEditor.value = md;
      chrome.storage.local.set({ resumeMD: md });
      toast(mdStatus, '已生成', 'ok');
    });
  });

  saveMdBtn.addEventListener('click', () => {
    const md = mdEditor.value.trim();
    if (!md) {
      toast(mdStatus, '内容为空', 'err');
      return;
    }
    chrome.storage.local.set({ resumeMD: md });
    toast(mdStatus, '已保存', 'ok');
  });

  copyMdBtn.addEventListener('click', () => {
    if (!mdEditor.value.trim()) return;
    navigator.clipboard.writeText(mdEditor.value).then(() => {
      copyMdBtn.textContent = '已复制';
      setTimeout(() => { copyMdBtn.textContent = '复制'; }, 1500);
    }).catch(() => {});
  });

  function generateMarkdown(resume) {
    const lines = [];
    lines.push('# ' + (resume.r_name || '求职者简历'));
    lines.push('');

    if (resume.r_title || resume.r_company) {
      lines.push('## 基本信息');
      lines.push('');
      if (resume.r_name) lines.push('- **姓名**：' + resume.r_name);
      if (resume.r_phone) lines.push('- **手机**：' + resume.r_phone);
      if (resume.r_email) lines.push('- **邮箱**：' + resume.r_email);
      if (resume.r_city) lines.push('- **所在城市**：' + resume.r_city);
      lines.push('');
    }

    if (resume.r_title || resume.r_company || resume.r_industry) {
      lines.push('## 职业信息');
      lines.push('');
      if (resume.r_title) lines.push('- **当前职位**：' + resume.r_title);
      if (resume.r_company) lines.push('- **当前公司**：' + resume.r_company);
      if (resume.r_industry) lines.push('- **所在行业**：' + resume.r_industry);
      if (resume.r_exp) lines.push('- **工作年限**：' + resume.r_exp);
      if (resume.r_salary) lines.push('- **期望薪资**：' + resume.r_salary);
      lines.push('');
    }

    if (resume.r_edu || resume.r_school || resume.r_major) {
      lines.push('## 教育背景');
      lines.push('');
      if (resume.r_edu) lines.push('- **学历**：' + resume.r_edu);
      if (resume.r_school) lines.push('- **毕业院校**：' + resume.r_school);
      if (resume.r_major) lines.push('- **专业**：' + resume.r_major);
      lines.push('');
    }

    if (resume.r_summary) {
      lines.push('## 个人优势');
      lines.push('');
      lines.push(resume.r_summary);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ====== Fetch JD ======
  fetchJdBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJDFromPage });
      if (results?.[0]?.result) {
        jdInput.value = results[0].result;
        toast(greetStatus, 'JD 已获取', 'ok');
      } else {
        toast(greetStatus, '未提取到 JD，请手动粘贴', 'err');
      }
    } catch (e) {
      toast(greetStatus, '获取失败: ' + e.message, 'err');
    }
  });

  // ====== Paste JD from clipboard ======
  const pasteJdBtn = $('pasteJd');
  pasteJdBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 10) {
        jdInput.value = text.trim();
        toast(greetStatus, '已粘贴', 'ok');
      } else {
        toast(greetStatus, '剪贴板内容过短', 'err');
      }
    } catch (e) {
      toast(greetStatus, '无法读取剪贴板: ' + e.message, 'err');
    }
  });

  // ====== Generate ======
  function doGenerate() {
    const jd = jdInput.value.trim();
    if (!jd) return toast(greetStatus, '请先输入职位描述', 'err');

    getConfig().then(config => {
      if (!config.apiKey) { toast(greetStatus, '请先配置 API Key', 'err'); settingsPanel.style.display = 'block'; if (settingsArrow) settingsArrow.classList.add('open'); return; }

      generateBtn.disabled = true;
      generateBtn.innerHTML = '<span class="spin"></span>生成中...';
      resultArea.style.display = 'block';
      resultBox.textContent = '';
      resultBox.classList.add('streaming');
      copyBtn.style.display = 'none';
      regenerateBtn.style.display = 'none';

      const port = chrome.runtime.connect({ name: 'greeting-stream' });
      let fullText = '';

      port.onMessage.addListener((msg) => {
        if (msg.type === 'chunk') {
          fullText += msg.text;
          resultBox.textContent = fullText;
        } else if (msg.type === 'done') {
          resultBox.classList.remove('streaming');
          copyBtn.style.display = '';
          regenerateBtn.style.display = '';
          if (fullText) {
            toast(greetStatus, '生成成功', 'ok');
            saveToHistory(jd, fullText, selectedTone);
          }
          cleanup();
        } else if (msg.type === 'error') {
          resultBox.classList.remove('streaming');
          if (fullText) {
            copyBtn.style.display = '';
            regenerateBtn.style.display = '';
          } else {
            resultArea.style.display = 'none';
          }
          toast(greetStatus, msg.message || '生成失败', 'err');
          cleanup();
        } else if (msg.type === 'reset') {
          fullText = '';
          resultBox.textContent = '';
        }
      });

      let cleaned = false;
      port.onDisconnect.addListener(() => {
        if (cleaned) return;
        resultBox.classList.remove('streaming');
        if (fullText) {
          toast(greetStatus, '生成中断，已获取部分内容', 'info');
          copyBtn.style.display = '';
          regenerateBtn.style.display = '';
        } else {
          resultArea.style.display = 'none';
          toast(greetStatus, '连接已断开，请重试', 'err');
        }
        cleanup();
      });

      port.postMessage({ action: 'generateGreetingStream', jd, tone: selectedTone });

      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '生成打招呼话术';
        try { port.disconnect(); } catch(e) {}
      }
    });
  }

  generateBtn.addEventListener('click', doGenerate);
  regenerateBtn.addEventListener('click', doGenerate);

  // ====== Copy ======
  copyBtn.addEventListener('click', () => {
    if (!resultBox.textContent) return;
    navigator.clipboard.writeText(resultBox.textContent).then(() => {
      copyBtn.textContent = '已复制';
      setTimeout(() => { copyBtn.textContent = '复制话术'; }, 1500);
    }).catch(() => {});
  });

  // ====== Auto Fill ======
  autoFillBtn.addEventListener('click', async () => {
    const config = await getConfig();
    if (!config.apiKey) { toast(fillStatus, '请先配置 API Key', 'err'); settingsPanel.style.display = 'block'; if (settingsArrow) settingsArrow.classList.add('open'); return; }
    const resume = config.resume;
    if (!resume?.r_name) { toast(fillStatus, '请先保存简历信息', 'err'); return; }

    autoFillBtn.disabled = true;
    autoFillBtn.innerHTML = '<span class="spin"></span>分析中...';
    fillStatusBar.style.display = 'block';
    fillStatusBar.innerHTML = '<div class="ln">扫描表单字段...</div>';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const extractResult = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractPageFormFields });
      const pageFields = extractResult?.[0]?.result;
      if (!pageFields?.length) {
        fillStatusBar.innerHTML += '<div class="ln fail">未检测到可填写字段</div>';
        return;
      }
      fillStatusBar.innerHTML += `<div class="ln">检测到 ${pageFields.length} 个字段</div>`;
      autoFillBtn.innerHTML = '<span class="spin"></span>AI 匹配中...';

      const resp = await chrome.runtime.sendMessage({ action: 'autoFillResume', pageFields, resume });
      if (!resp?.success) {
        fillStatusBar.innerHTML += `<div class="ln fail">${esc(resp?.error || '匹配失败')}</div>`;
        return;
      }
      fillStatusBar.innerHTML += '<div class="ln">匹配完成，填写中...</div>';

      const fillResult = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fillPageFields, args: [resp.mappings] });
      const report = fillResult?.[0]?.result;
      if (report) {
        report.forEach(item => {
          const cls = item.status === 'ok' ? 'ok' : 'fail';
          const icon = item.status === 'ok' ? '✓' : '✗';
          fillStatusBar.innerHTML += `<div class="ln ${cls}">${icon} ${esc(item.field)}: ${esc(item.detail)}</div>`;
        });
      }
      toast(fillStatus, '填写完成', 'ok');
    } catch (e) {
      fillStatusBar.innerHTML += `<div class="ln fail">错误: ${esc(e.message)}</div>`;
      toast(fillStatus, '填写失败', 'err');
    } finally {
      autoFillBtn.disabled = false;
      autoFillBtn.innerHTML = 'AI 智能填写当前页面';
    }
  });

  // ====== History ======
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ greetingHistory: [] }, () => loadHistory());
  });

  function saveToHistory(jd, text, tone) {
    chrome.storage.local.get(['greetingHistory'], data => {
      const history = data.greetingHistory || [];
      const jdShort = jd.substring(0, 80) + (jd.length > 80 ? '...' : '');
      // Dedup: skip if most recent entry has same text
      if (history.length > 0 && history[0].text === text) return;
      history.unshift({ jd: jdShort, text, tone, time: Date.now() });
      chrome.storage.local.set({ greetingHistory: history.slice(0, 20) });
    });
  }

  function loadHistory() {
    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    chrome.storage.local.get(['greetingHistory'], data => {
      const history = data.greetingHistory || [];
      if (!history.length) {
        historyList.innerHTML = '<div class="history-empty">暂无记录</div>';
        return;
      }
      const toneMap = { professional: '专业', friendly: '亲和', confident: '自信' };
      historyList.innerHTML = history.map((item, i) => {
        const d = new Date(item.time);
        const ts = d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        return `<div class="history-item" data-idx="${i}">
          <div class="history-meta">${ts} · ${toneMap[item.tone] || '专业'}</div>
          <div class="history-text">${esc(item.text)}</div>
        </div>`;
      }).join('');

      historyList.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
          const item = history[parseInt(el.dataset.idx)];
          if (item) {
            resultBox.textContent = item.text;
            resultArea.style.display = '';
            copyBtn.style.display = '';
            if (item.tone) {
              selectedTone = item.tone;
              toneOptions.forEach(o => { o.classList.toggle('active', o.dataset.tone === item.tone); });
            }
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tabs[0].classList.add('active');
            $('panel-greeting').classList.add('active');
          }
        });
      });
    });
  }

  // ====== Helpers ======
  function getConfig() {
    return new Promise(resolve => {
      chrome.storage.local.get(['apiKey','apiUrl','model','customModel','resume'], d => {
        resolve({
          apiKey: d.apiKey || '',
          apiUrl: d.apiUrl || '',
          model: d.model || 'openai',
          customModel: d.customModel || 'gpt-4o-mini',
          resume: d.resume || {}
        });
      });
    });
  }

  const _timers = {};
  function toast(el, msg, type) {
    if (!el) return;
    if (_timers[el.id]) clearTimeout(_timers[el.id]);
    el.textContent = msg;
    el.className = 'toast ' + (type || 'info');
    el.style.display = 'block';
    _timers[el.id] = setTimeout(() => { el.style.display = 'none'; }, 3500);
  }

  // ====== Side Panel ======
  const openSidePanel = $('openSidePanel');
  if (openSidePanel) {
    openSidePanel.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      } catch (err) {
        toast(greetStatus, '打开侧边栏失败: ' + err.message, 'err');
      }
    });
  }

  // ======================================================================
  // Injected into page context (must be standalone, no closure vars)
  // ======================================================================

  function extractJDFromPage() {
    const url = window.location.href;
    let jdText = '';
    const platformSelectors = [
      { match: u => u.includes('zhipin.com'), sels: ['.job-detail-section .job-sec-text','.job-detail-bottom .job-sec-text','.detail-content .job-sec-text','.job-desc','[class*="job-detail"] [class*="text"]','[class*="job-detail"]'] },
      { match: u => u.includes('51job.com'), sels: ['.job_msg','.tCompany_main','.job_detail','.j_job_msg'] },
      { match: u => u.includes('zhaopin.com'), sels: ['.describtion','.job-detail','.pos-ul','.describtion-box'] },
      { match: u => u.includes('liepin.com'), sels: ['.job-intro-container','.job-qualifications','.job-intro','.job-require'] },
      { match: u => u.includes('lagou.com'), sels: ['.job_bt','.job_detail','.job-detail','.job-detail-content'] },
      { match: u => u.includes('kanzhun.com'), sels: ['.job-detail','.job-sec','.detail-content','.job-detail-section'] },
      { match: u => u.includes('58.com'), sels: ['.job-detail','.job_desc','.des','.job-description'] }
    ];
    for (const p of platformSelectors) {
      if (p.match(url)) {
        for (const sel of p.sels) {
          const el = document.querySelector(sel);
          if (el && el.textContent.trim().length > 20) {
            const clone = el.cloneNode(true);
            clone.querySelectorAll('style,script,nav,header,footer,.filter,.search,.nav-bar,.sidebar').forEach(r => r.remove());
            jdText = clone.textContent.trim();
            if (jdText.length > 30) break;
            jdText = '';
          }
        }
        if (!jdText) { const d = document.querySelector('.job-detail-section,.detail-content,.job-detail'); if (d) { const c2 = d.cloneNode(true); c2.querySelectorAll('style,script,nav,header,footer,.filter,.search,.nav-bar,.sidebar').forEach(r => r.remove()); jdText = c2.textContent.trim(); } }
        break;
      }
    }
    if (!jdText) {
      let best = null, bestScore = 0;
      for (const el of document.querySelectorAll('[class*="job-detail"],[class*="job_desc"],[class*="job-desc"],[class*="position-detail"],.detail-content,.job-detail')) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('style,script,nav,header,footer,.filter,.search,.nav-bar,.sidebar').forEach(r => r.remove());
        const t = clone.textContent.trim();
        const len = t.length;
        if (len < 50 || len > 8000) continue;
        const chinese = (t.match(/[\u4e00-\u9fff]/g) || []).length;
        if (chinese / len < 0.15) continue;
        const score = chinese + (len > 100 ? 200 : 0) - (len > 5000 ? 500 : 0);
        if (score > bestScore) { bestScore = score; best = t; }
      }
      if (best) jdText = best;
    }
    if (jdText) {
      jdText = jdText.replace(/[\w.-]+\{[^}]*\}/g,'').replace(/\.[A-Za-z][\w-]*\s*\{[^}]*\}/g,'').replace(/var\s+\w+\s*=\s*[^;]+;/g,'').replace(/[A-Za-z_]\w*\{[^}]{0,30}\}/g,'');
      jdText = jdText.replace(/[\u200b\u200c\u200d\ufeff]/g,'');
      jdText = jdText.replace(/\s+/g,' ').replace(/\n{3,}/g,'\n\n').replace(/[\s]{2,}/g,' ').trim();
      if (jdText.length > 3000) jdText = jdText.substring(0,3000)+'...';
    }
    return jdText || null;
  }

  function extractPageFormFields() {
    const fields = [];
    const seen = new Set();
    function extractLabel(el) {
      let label = '';
      if (el.id) { const l = document.querySelector('label[for="'+el.id+'"]'); if (l) label = l.textContent.trim(); }
      if (!label) { const p = el.closest('label'); if (p) label = p.textContent.trim(); }
      if (!label && el.previousElementSibling?.textContent?.trim().length < 30) label = el.previousElementSibling.textContent.trim();
      if (!label) label = el.getAttribute('aria-label') || '';
      return label.replace(/[*:：]/g,'').trim();
    }
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (['hidden','submit','button','file','image','color'].includes(el.type)) return;
      if (el.disabled || el.readOnly) return;
      if (el.type === 'radio' && el.name) {
        if (seen.has('radio:' + el.name)) return;
        seen.add('radio:' + el.name);
        const opts = [];
        document.querySelectorAll('input[type="radio"][name="' + el.name + '"]').forEach(r => opts.push({ value: r.value, id: r.id }));
        fields.push({ selector: 'input[type="radio"][name="' + el.name + '"]', label: extractLabel(el), placeholder: '', tagName: 'input', inputType: 'radio', name: el.name, options: opts });
        return;
      }
      if (el.type === 'checkbox') {
        const key = el.id ? '#'+el.id : (el.name ? 'cb:'+el.name : null);
        if (!key || seen.has(key)) return;
        seen.add(key);
        fields.push({ selector: el.id ? '#'+CSS.escape(el.id) : 'input[type="checkbox"][name="'+el.name+'"]', label: extractLabel(el), placeholder: '', tagName: 'input', inputType: 'checkbox', name: el.name||'', checked: el.checked });
        return;
      }
      let selector;
      if (el.id) selector = '#' + CSS.escape(el.id);
      else if (el.name) selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
      else { const all = Array.from(el.parentElement?.children || []); selector = el.tagName.toLowerCase() + ':nth-child(' + (all.indexOf(el)+1) + ')'; }
      if (seen.has(selector)) return;
      seen.add(selector);
      const info = { selector, label: extractLabel(el), placeholder: el.placeholder||'', tagName: el.tagName.toLowerCase(), inputType: el.type||'text', name: el.name||'' };
      if (el.tagName === 'SELECT') info.options = Array.from(el.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
      fields.push(info);
    });
    return fields.length > 0 ? fields : null;
  }

  function fillPageFields(mappings) {
    const report = [];
    function fireEvents(el) {
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      el.dispatchEvent(new Event('blur',{bubbles:true}));
    }
    function getNativeSetter(el) {
      if (el.tagName === 'TEXTAREA') return Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set;
      return Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
    }
    mappings.forEach(m => {
      try {
        const el = document.querySelector(m.selector);
        if (!el) { report.push({field:m.fieldName||m.selector,status:'fail',detail:'元素未找到'}); return; }
        if (el.tagName === 'SELECT') {
          let matched = false;
          for (const opt of el.options) {
            if (opt.value===m.value || opt.textContent.trim()===m.value || opt.textContent.includes(m.value) || m.value.includes(opt.textContent.trim())) {
              el.value = opt.value; matched = true; break;
            }
          }
          if (!matched && el.options.length > 1) {
            for (const opt of el.options) {
              if (opt.value && (m.value.includes(opt.textContent.trim().substring(0,2)) || opt.textContent.includes(m.value.substring(0,2)))) {
                el.value = opt.value; matched = true; break;
              }
            }
          }
          if (matched) { fireEvents(el); report.push({field:m.fieldName||m.selector,status:'ok',detail:'已选择: '+el.options[el.selectedIndex]?.textContent}); }
          else { report.push({field:m.fieldName||m.selector,status:'fail',detail:'未找到匹配选项'}); }
          return;
        }
        if (el.type === 'radio' || m.inputType === 'radio') {
          const radios = document.querySelectorAll(m.selector);
          let found = false;
          radios.forEach(r => { if (r.value === m.value) { r.checked = true; fireEvents(r); found = true; } });
          report.push({field:m.fieldName||m.selector,status:found?'ok':'fail',detail:found?'已选择: '+m.value:'未找到匹配选项'});
          return;
        }
        if (el.type === 'checkbox' || m.inputType === 'checkbox') {
          const shouldCheck = m.value === 'true' || m.value === '1' || m.value === '是';
          el.checked = shouldCheck; fireEvents(el);
          report.push({field:m.fieldName||m.selector,status:'ok',detail:shouldCheck?'已勾选':'已取消勾选'});
          return;
        }
        const setter = getNativeSetter(el);
        if (setter) setter.call(el, m.value); else el.value = m.value;
        fireEvents(el);
        report.push({field:m.fieldName||m.selector,status:'ok',detail:'已填写'});
      } catch(e) { report.push({field:m.fieldName||m.selector,status:'fail',detail:e.message}); }
    });
    return report;
  }
});
