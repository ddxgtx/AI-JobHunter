/**
 * AI-JobHunter v2.7 - Side Panel Script
 * 编码: UTF-8
 * 侧边栏版本，功能与 popup.js 一致
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
  const exportHistoryBtn = $('exportHistory');

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
  let selectedLength = 'medium';

  // ====== Tabs ======
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $('panel-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'history') loadHistory();
      if (tab.dataset.tab === 'md') loadMd();
      // pipeline and search merged into jobs tab
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
  // ====== Length pills ======
  const lenOptions = document.querySelectorAll('[data-len]');
  lenOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      lenOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedLength = opt.dataset.len;
    });
  });

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
  // ====== Dark Mode ======
  const darkModeToggle = $('darkModeToggle');
  if (darkModeToggle) {
    chrome.storage.local.get(['darkMode'], dm => {
      if (dm.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.checked = true;
        const icon = $('themeIcon'); if (icon) icon.textContent = '☀️';
      }
    });
    darkModeToggle.addEventListener('change', () => {
      const isDark = darkModeToggle.checked;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
      chrome.storage.local.set({ darkMode: isDark });
      const icon = $('themeIcon'); if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    });
  }

  chrome.storage.local.get(['apiKey','apiUrl','model','customModel','resume','resumeMD','useApiExtract'], data => {
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
    if (data.useApiExtract) { const el = $('useApiExtract'); if (el) el.checked = true; }
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
    if (data.resumeMD) mdEditor.value = data.resumeMD;
  });

  // ====== Save API ======
  saveApiBtn.addEventListener('click', () => {
    const cfg = {
      apiKey: apiKeyInput.value.trim(),
      apiUrl: apiUrlInput.value.trim(),
      model: modelSelect.value,
      customModel: customModelInput.value.trim()
    };
    chrome.storage.local.set(cfg, () => {
      toast(apiStatus, '已保存', 'ok');
      const ms = $('modelStatus');
      if (ms && cfg.apiKey) {
        const nm = { openai: 'OpenAI', deepseek: 'DeepSeek', custom: cfg.customModel || 'Custom' };
        ms.textContent = (nm[cfg.model] || 'OpenAI') + ' · ';
        ms.style.color = '#8e8e93';
      } else if (ms) {
        ms.textContent = '未配置 · ';
        ms.style.color = '#ff3b30';
      }
    });
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
    const useApiEl = $('useApiExtract');
    const useApi = useApiEl && useApiEl.checked;
    fetchJdBtn.disabled = true;
    fetchJdBtn.textContent = useApi ? '提取中 (API 清洗)...' : '提取中...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // Extract JD and job info in parallel
      const [jdResult, jobResult] = await Promise.all([
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJDFromPage }),
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJobInfo })
      ]);
      let raw = jdResult?.[0]?.result || '';
      const jobInfo = jobResult?.[0]?.result || {};

      // Display job info card
      displayJobInfo(jobInfo);

      if (!raw) {
        toast(greetStatus, '未提取到 JD，请手动粘贴', 'err');
        return;
      }
      if (useApi) {
        try {
          const resp = await chrome.runtime.sendMessage({ action: 'extractJD', text: raw });
          if (resp?.success && resp.jd) {
            jdInput.value = resp.jd;
            toast(greetStatus, 'JD 已通过 API 清洗获取', 'ok');
          } else {
            jdInput.value = raw;
            toast(greetStatus, 'API 清洗失败，已使用本地结果', 'info');
          }
        } catch (apiErr) {
          jdInput.value = raw;
          toast(greetStatus, 'API 调用失败，已使用本地结果', 'info');
        }
      } else {
        jdInput.value = raw;
        toast(greetStatus, 'JD 已获取', 'ok');
      }
      // Show skill/match buttons
      const smb = $('skillMatchBtns');
      if (smb) smb.style.display = '';
    } catch (e) {
      toast(greetStatus, '获取失败: ' + e.message, 'err');
    } finally {
      fetchJdBtn.disabled = false;
      fetchJdBtn.textContent = '从当前页面获取 JD';
    }
  });

  // ====== Display job info card ======
  function displayJobInfo(info) {
    const card = $('jobCard');
    if (!card || !info) return;
    const hasInfo = info.position || info.company || info.salary;
    if (!hasInfo) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    const titleEl = $('jobTitle');
    const companyEl = $('jobCompany');
    const tagsEl = $('jobTags');
    if (titleEl) titleEl.textContent = info.position || '';
    if (companyEl) companyEl.textContent = info.company || '';
    if (tagsEl) {
      tagsEl.innerHTML = '';
      [info.salary, info.location, info.experience, info.education].forEach(tag => {
        if (tag) {
          const span = document.createElement('span');
          span.className = 'job-card-tag';
          span.textContent = tag;
          tagsEl.appendChild(span);
        }
      });
    }
  }

  // ====== Extract Key Skills ======
  const extractSkillsBtn = $('extractSkillsBtn');
  if (extractSkillsBtn) {
    extractSkillsBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      extractSkillsBtn.disabled = true;
      extractSkillsBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>分析中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'extractKeySkills', text: jd });
        if (resp?.success && resp.skills?.length) {
          displaySkills(resp.skills);
          toast(greetStatus, '关键技能已提取', 'ok');
        } else {
          toast(greetStatus, resp?.error || '提取失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '提取失败: ' + e.message, 'err');
      } finally {
        extractSkillsBtn.disabled = false;
        extractSkillsBtn.textContent = '🏷️ 提取关键技能';
      }
    });
  }

  function displaySkills(skills) {
    const section = $('skillSection');
    const container = $('skillTags');
    if (!section || !container) return;
    section.style.display = 'block';
    container.innerHTML = '';
    skills.forEach(skill => {
      const span = document.createElement('span');
      span.className = 'skill-tag';
      span.textContent = skill;
      container.appendChild(span);
    });
  }

  // ====== Match Analysis ======
  const analyzeMatchBtn = $('analyzeMatchBtn');
  if (analyzeMatchBtn) {
    analyzeMatchBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      const config = await getConfig();
      if (!config.resume?.r_name) return toast(greetStatus, '请先保存简历信息', 'err');
      analyzeMatchBtn.disabled = true;
      analyzeMatchBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>分析中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'analyzeMatch', jd, resume: config.resume });
        if (resp?.success) {
          displayMatch(resp);
          toast(greetStatus, '匹配分析完成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '分析失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '分析失败: ' + e.message, 'err');
      } finally {
        analyzeMatchBtn.disabled = false;
        analyzeMatchBtn.textContent = '📊 匹配分析';
      }
    });
  }

  function displayMatch(result) {
    const section = $('matchSection');
    if (!section) return;
    section.style.display = 'block';
    const score = Math.max(0, Math.min(100, result.score || 0));
    const scoreEl = $('matchScoreText');
    const barEl = $('matchBarFill');
    const sugEl = $('matchSuggestions');
    if (scoreEl) {
      scoreEl.textContent = score + '%';
      scoreEl.style.color = score >= 70 ? 'var(--green)' : score >= 40 ? '#ff9500' : 'var(--red)';
    }
    if (barEl) {
      barEl.style.width = score + '%';
      barEl.style.background = score >= 70 ? 'var(--green)' : score >= 40 ? '#ff9500' : 'var(--red)';
    }
    if (sugEl) {
      let text = '';
      if (result.matchedSkills?.length) text += '✅ 匹配技能: ' + result.matchedSkills.join('、') + '\n';
      if (result.missingSkills?.length) text += '❌ 缺少技能: ' + result.missingSkills.join('、') + '\n';
      if (result.strengths?.length) text += '💪 优势亮点: ' + result.strengths.join('、') + '\n';
      if (result.weaknesses?.length) text += '⚠️ 不足之处: ' + result.weaknesses.join('、') + '\n';
      if (result.suggestions) text += '\n💡 优化建议: ' + result.suggestions;
      sugEl.textContent = text.trim();
    }
  }

  // ====== Paste JD ======
  // ====== API Extract Toggle persistence ======
  const useApiToggle = $('useApiExtract');
  if (useApiToggle) {
    useApiToggle.addEventListener('change', () => {
      chrome.storage.local.set({ useApiExtract: useApiToggle.checked });
    });
  }

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
            saveToHistory(jd, fullText, selectedTone, selectedLength);
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

      port.postMessage({ action: 'generateGreetingStream', jd, tone: selectedTone, length: selectedLength });

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

  // ====== Interview Prep ======
  const interviewPrepBtn = $('interviewPrepBtn');
  if (interviewPrepBtn) {
    interviewPrepBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      interviewPrepBtn.disabled = true;
      interviewPrepBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>分析中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'interviewPrep', jd });
        if (resp?.success && resp.questions?.length) {
          displayInterviewQuestions(resp.questions);
          toast(greetStatus, '面试问题已生成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '生成失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '生成失败: ' + e.message, 'err');
      } finally {
        interviewPrepBtn.disabled = false;
        interviewPrepBtn.textContent = '🎤 面试准备';
      }
    });
  }

  function displayInterviewQuestions(questions) {
    const section = $('interviewSection');
    const container = $('interviewQuestions');
    if (!section || !container) return;
    section.style.display = 'block';
    const catIcons = { '技术基础': '💻', '项目经验': '📁', '系统设计': '🏗️', '行为面试': '🗣️', '场景题': '🎯' };
    container.innerHTML = questions.map((q, i) => {
      const icon = catIcons[q.category] || '❓';
      return '<div style="margin-bottom:12px;padding:10px 12px;background:var(--fill);border-radius:8px;">' +
        '<div style="font-size:11px;color:var(--accent);margin-bottom:4px;">' + icon + ' ' + esc(q.category || '') + '</div>' +
        '<div style="font-weight:500;margin-bottom:4px;">' + (i+1) + '. ' + esc(q.question || '') + '</div>' +
        (q.hint ? '<div style="font-size:12px;color:var(--text-secondary);">💡 ' + esc(q.hint) + '</div>' : '') +
        '</div>';
    }).join('');
  }

  // ====== Keyword Optimize ======
  const keywordOptimizeBtn = $('keywordOptimizeBtn');
  if (keywordOptimizeBtn) {
    keywordOptimizeBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      const config = await getConfig();
      if (!config.resume?.r_name) return toast(greetStatus, '请先保存简历信息', 'err');
      keywordOptimizeBtn.disabled = true;
      keywordOptimizeBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>分析中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'keywordOptimize', jd, resume: config.resume });
        if (resp?.success) {
          displayKeywordResults(resp);
          toast(greetStatus, '关键词分析完成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '分析失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '分析失败: ' + e.message, 'err');
      } finally {
        keywordOptimizeBtn.disabled = false;
        keywordOptimizeBtn.textContent = '🔑 关键词优化';
      }
    });
  }

  function displayKeywordResults(result) {
    const section = $('keywordSection');
    const container = $('keywordResults');
    if (!section || !container) return;
    section.style.display = 'block';
    let html = '';
    if (result.presentKeywords?.length) {
      html += '<div style="margin-bottom:8px;"><span style="color:var(--green);font-weight:500;">✅ 已匹配关键词</span></div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">';
      result.presentKeywords.forEach(kw => { html += '<span class="skill-tag" style="background:var(--green-soft);color:#1b7a35;">' + esc(kw) + '</span>'; });
      html += '</div>';
    }
    if (result.missingKeywords?.length) {
      html += '<div style="margin-bottom:8px;"><span style="color:var(--red);font-weight:500;">❌ 缺少关键词</span></div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">';
      result.missingKeywords.forEach(kw => { html += '<span class="skill-tag" style="background:var(--red-soft);color:#c41e00;">' + esc(kw) + '</span>'; });
      html += '</div>';
    }
    if (result.suggestedAdditions?.length) {
      html += '<div style="margin-bottom:8px;"><span style="font-weight:500;">💡 优化建议</span></div>';
      result.suggestedAdditions.forEach(s => {
        html += '<div style="margin-bottom:6px;padding:8px;background:var(--accent-soft);border-radius:6px;font-size:12px;">';
        html += '<span style="color:var(--accent);font-weight:500;">' + esc(s.keyword || '') + '</span>：' + esc(s.context || '');
        html += '</div>';
      });
    }
    if (result.optimizedSummary) {
      html += '<div style="margin-top:10px;"><span style="font-weight:500;">📝 优化后的个人优势</span></div>';
      html += '<div style="margin-top:6px;padding:10px;background:var(--fill);border-radius:8px;font-size:12px;line-height:1.6;white-space:pre-wrap;">' + esc(result.optimizedSummary) + '</div>';
    }
    container.innerHTML = html;
  }

    // ====== Cover Letter ======
  const coverLetterBtn = $('coverLetterBtn');
  if (coverLetterBtn) {
    coverLetterBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      coverLetterBtn.disabled = true;
      coverLetterBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>生成中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'generateCoverLetter', jd, tone: selectedTone });
        if (resp?.success && resp.letter) {
          const section = $('coverLetterSection');
          const content = $('coverLetterContent');
          if (section && content) {
            section.style.display = 'block';
            content.textContent = resp.letter;
          }
          toast(greetStatus, '求职信已生成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '生成失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '生成失败: ' + e.message, 'err');
      } finally {
        coverLetterBtn.disabled = false;
        coverLetterBtn.textContent = '✉️ 求职信';
      }
    });
  }

  const copyCoverLetter = $('copyCoverLetter');
  if (copyCoverLetter) {
    copyCoverLetter.addEventListener('click', () => {
      const content = $('coverLetterContent');
      if (!content?.textContent) return;
      navigator.clipboard.writeText(content.textContent).then(() => {
        copyCoverLetter.textContent = '已复制';
        setTimeout(() => { copyCoverLetter.textContent = '复制'; }, 1500);
      });
    });
  }

  // ====== Salary Analysis ======
  const salaryAnalysisBtn = $('salaryAnalysisBtn');
  if (salaryAnalysisBtn) {
    salaryAnalysisBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      salaryAnalysisBtn.disabled = true;
      salaryAnalysisBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>分析中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'salaryAnalysis', jd });
        if (resp?.success) {
          displaySalaryResults(resp);
          toast(greetStatus, '薪资分析完成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '分析失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '分析失败: ' + e.message, 'err');
      } finally {
        salaryAnalysisBtn.disabled = false;
        salaryAnalysisBtn.textContent = '💰 薪资分析';
      }
    });
  }

  function displaySalaryResults(result) {
    const section = $('salarySection');
    const container = $('salaryResults');
    if (!section || !container) return;
    section.style.display = 'block';
    let html = '';
    if (result.salaryRange) {
      html += '<div style="text-align:center;padding:8px 0;margin-bottom:10px;">';
      html += '<span style="font-size:24px;font-weight:700;color:var(--accent);">' + esc(result.salaryRange) + '</span>';
      html += '<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">参考薪资范围</div></div>';
    }
    if (result.marketTrend) {
      html += '<div style="padding:8px 10px;background:var(--accent-soft);border-radius:8px;margin-bottom:10px;font-size:12px;">📈 ' + esc(result.marketTrend) + '</div>';
    }
    if (result.factors?.length) {
      html += '<div style="margin-bottom:8px;font-weight:500;font-size:12px;">影响因素</div>';
      result.factors.forEach(f => { html += '<div style="font-size:12px;padding:3px 0;color:var(--text-secondary);">• ' + esc(f) + '</div>'; });
    }
    if (result.negotiationTips?.length) {
      html += '<div style="margin-top:10px;margin-bottom:8px;font-weight:500;font-size:12px;">💡 谈判建议</div>';
      result.negotiationTips.forEach(t => { html += '<div style="font-size:12px;padding:3px 0;color:var(--text-secondary);">• ' + esc(t) + '</div>'; });
    }
    container.innerHTML = html;
  }

    // ====== LinkedIn Outreach ======
  const linkedinBtn = $('linkedinBtn');
  if (linkedinBtn) {
    linkedinBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      linkedinBtn.disabled = true;
      linkedinBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>生成中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'linkedinOutreach', jd, tone: selectedTone });
        if (resp?.success && resp.message) {
          const section = $('linkedinSection');
          const content = $('linkedinContent');
          if (section && content) {
            section.style.display = 'block';
            content.textContent = resp.message;
          }
          toast(greetStatus, 'LinkedIn 消息已生成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '生成失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '生成失败: ' + e.message, 'err');
      } finally {
        linkedinBtn.disabled = false;
        linkedinBtn.textContent = '💼 LinkedIn';
      }
    });
  }

  const copyLinkedin = $('copyLinkedin');
  if (copyLinkedin) {
    copyLinkedin.addEventListener('click', () => {
      const content = $('linkedinContent');
      if (!content?.textContent) return;
      navigator.clipboard.writeText(content.textContent).then(() => {
        copyLinkedin.textContent = '已复制';
        setTimeout(() => { copyLinkedin.textContent = '复制'; }, 1500);
      });
    });
  }

  // ====== Company Research ======
  const companyResearchBtn = $('companyResearchBtn');
  if (companyResearchBtn) {
    companyResearchBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      companyResearchBtn.disabled = true;
      companyResearchBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>研究中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'companyResearch', jd });
        if (resp?.success) {
          displayCompanyResults(resp);
          toast(greetStatus, '公司研究完成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '研究失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '研究失败: ' + e.message, 'err');
      } finally {
        companyResearchBtn.disabled = false;
        companyResearchBtn.textContent = '🏢 公司研究';
      }
    });
  }

  function displayCompanyResults(result) {
    const section = $('companySection');
    const container = $('companyResults');
    if (!section || !container) return;
    section.style.display = 'block';
    let html = '';
    if (result.companyName) html += '<div style="font-weight:600;font-size:15px;margin-bottom:6px;">' + esc(result.companyName) + '</div>';
    const tags = [result.industry, result.size].filter(Boolean);
    if (tags.length) {
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">';
      tags.forEach(t => { html += '<span class="job-card-tag">' + esc(t) + '</span>'; });
      html += '</div>';
    }
    if (result.techStack?.length) {
      html += '<div style="margin-bottom:8px;"><span style="font-weight:500;">技术栈</span></div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">';
      result.techStack.forEach(t => { html += '<span class="skill-tag">' + esc(t) + '</span>'; });
      html += '</div>';
    }
    if (result.culture) html += '<div style="margin-bottom:8px;"><span style="font-weight:500;">文化特点：</span>' + esc(result.culture) + '</div>';
    if (result.pros?.length) {
      html += '<div style="margin-bottom:8px;"><span style="font-weight:500;color:var(--green);">✅ 优势</span></div>';
      result.pros.forEach(p => { html += '<div style="font-size:12px;padding:2px 0;">• ' + esc(p) + '</div>'; });
    }
    if (result.cons?.length) {
      html += '<div style="margin-top:8px;margin-bottom:8px;"><span style="font-weight:500;color:var(--red);">⚠️ 风险</span></div>';
      result.cons.forEach(c => { html += '<div style="font-size:12px;padding:2px 0;">• ' + esc(c) + '</div>'; });
    }
    if (result.interviewTips) {
      html += '<div style="margin-top:10px;padding:8px 10px;background:var(--accent-soft);border-radius:8px;font-size:12px;">💡 <span style="font-weight:500;">面试建议：</span>' + esc(result.interviewTips) + '</div>';
    }
    container.innerHTML = html;
  }

  // ====== Job Evaluation ======
  const jobEvalBtn = $('jobEvalBtn');
  if (jobEvalBtn) {
    jobEvalBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      const config = await getConfig();
      if (!config.resume?.r_name) return toast(greetStatus, '请先保存简历信息', 'err');
      jobEvalBtn.disabled = true;
      jobEvalBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>评估中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'jobEvaluation', jd, resume: config.resume });
        if (resp?.success) {
          displayEvalResults(resp);
          toast(greetStatus, '职位评估完成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '评估失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '评估失败: ' + e.message, 'err');
      } finally {
        jobEvalBtn.disabled = false;
        jobEvalBtn.textContent = '📋 职位评估';
      }
    });
  }

  function displayEvalResults(result) {
    const section = $('evalSection');
    const container = $('evalResults');
    if (!section || !container) return;
    section.style.display = 'block';
    const score = result.overallScore || 0;
    const grade = result.overallGrade || '-';
    const color = score >= 80 ? 'var(--green)' : score >= 60 ? '#ff9500' : 'var(--red)';
    let html = '<div style="text-align:center;padding:8px 0;margin-bottom:10px;">';
    html += '<span style="font-size:32px;font-weight:700;color:' + color + ';">' + esc(grade) + '</span>';
    html += '<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">综合评分 ' + score + '/100</div></div>';
    if (result.dimensions?.length) {
      result.dimensions.forEach(d => {
        const dColor = d.score >= 80 ? 'var(--green)' : d.score >= 60 ? '#ff9500' : 'var(--red)';
        html += '<div style="margin-bottom:8px;">';
        html += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">';
        html += '<span>' + esc(d.name) + ' <span style="color:var(--text-tertiary);">(' + d.weight + '%)</span></span>';
        html += '<span style="font-weight:600;color:' + dColor + ';">' + d.score + '</span></div>';
        html += '<div style="height:4px;background:var(--fill);border-radius:2px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + d.score + '%;background:' + dColor + ';border-radius:2px;"></div></div>';
        if (d.comment) html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(d.comment) + '</div>';
        html += '</div>';
      });
    }
    if (result.recommendation) {
      const recColor = score >= 60 ? 'var(--green-soft)' : 'var(--red-soft)';
      html += '<div style="margin-top:10px;padding:10px;background:' + recColor + ';border-radius:8px;font-size:12px;line-height:1.6;">' + esc(result.recommendation) + '</div>';
    }
    container.innerHTML = html;
  }

  // ====== Pipeline Tracking ======
  const addToPipelineBtn = $('addToPipeline');
  if (addToPipelineBtn) {
    addToPipelineBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast($('pipelineStatus'), '请先获取 JD', 'err');
      const jobInfo = {};
      let pageUrl = '';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        pageUrl = tab.url || '';
        const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJobInfo });
        Object.assign(jobInfo, result?.[0]?.result || {});
      } catch (e) {}
      chrome.storage.local.get(['pipeline'], data => {
        const pipeline = data.pipeline || [];
        const entry = {
          id: Date.now(),
          position: jobInfo.position || jd.substring(0, 30),
          company: jobInfo.company || '',
          salary: jobInfo.salary || '',
          url: pageUrl,
          status: 'interested',
          jd: jd.substring(0, 200),
          time: Date.now()
        };
        pipeline.unshift(entry);
        chrome.storage.local.set({ pipeline: pipeline.slice(0, 100) }, () => {
          toast($('pipelineStatus'), '已添加到求职管道', 'ok');
          loadPipeline();
        });
      });
    });
  }

  const pipelineFilter = $('pipelineFilter');
  if (pipelineFilter) {
    pipelineFilter.addEventListener('change', loadPipeline);
  }

  function loadPipeline() {
    const container = $('pipelineList');
    const filter = $('pipelineFilter');
    if (!container) return;
    chrome.storage.local.get(['pipeline'], data => {
      const pipeline = data.pipeline || [];
      const filterVal = filter?.value || 'all';
      const filtered = filterVal === 'all' ? pipeline : pipeline.filter(p => p.status === filterVal);
      if (!filtered.length) {
        container.innerHTML = '<div class="history-empty">暂无' + (filterVal === 'all' ? '' : '该状态的') + '求职记录</div>';
        return;
      }
      const statusMap = { interested: '感兴趣', applied: '已投递', interview: '面试中', offer: '已录取', rejected: '已拒绝' };
      const statusColor = { interested: 'var(--accent)', applied: '#ff9500', interview: 'var(--green)', offer: '#34c759', rejected: 'var(--red)' };
      container.innerHTML = filtered.map(item => {
        const d = new Date(item.time);
        const ts = d.toLocaleDateString('zh-CN');
        const sc = statusColor[item.status] || 'var(--accent)';
        return '<div class="history-item" data-id="' + item.id + '" style="cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span style="font-weight:500;font-size:13px;">' + esc(item.position || '') + '</span>' +
          '<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:' + sc + '22;color:' + sc + ';">' + (statusMap[item.status] || item.status) + '</span></div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">' + esc(item.company || '') + (item.salary ? ' · ' + esc(item.salary) : '') + ' · ' + ts + '</div>' +
          '</div>';
      }).join('');

      container.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = parseInt(el.dataset.id);
          chrome.storage.local.get(['pipeline'], d => {
            const p = d.pipeline || [];
            const item = p.find(x => x.id === id);
            if (!item) return;
            const nextStatus = { interested: 'applied', applied: 'interview', interview: 'offer', offer: 'rejected', rejected: 'interested' };
            const statusLabels = { interested: '感兴趣', applied: '已投递', interview: '面试中', offer: '已录取', rejected: '已拒绝' };
            const next = nextStatus[item.status] || 'interested';
            const label = statusLabels[next] || next;
            if (confirm('将状态更改为「' + label + '」？')) {
              item.status = next;
              chrome.storage.local.set({ pipeline: p }, loadPipeline);
            }
          });
        });
      });
    });
  }

  // Clear pipeline
  const clearPipelineBtn = $('clearPipeline');
  if (clearPipelineBtn) {
    clearPipelineBtn.addEventListener('click', () => {
      if (confirm('确定清空所有求职记录？')) {
        chrome.storage.local.set({ pipeline: [] }, loadPipeline);
      }
    });
  }

  // Export pipeline
  const exportPipelineBtn = $('exportPipeline');
  if (exportPipelineBtn) {
    exportPipelineBtn.addEventListener('click', () => {
      chrome.storage.local.get(['pipeline'], data => {
        const pipeline = data.pipeline || [];
        if (!pipeline.length) { toast($('pipelineStatus'), '没有可导出的记录', 'err'); return; }
        const statusMap = { interested: '感兴趣', applied: '已投递', interview: '面试中', offer: '已录取', rejected: '已拒绝' };
        const lines = pipeline.map(item => {
          const d = new Date(item.time);
          return d.toLocaleDateString('zh-CN') + ' | ' + (statusMap[item.status] || item.status) + ' | ' + (item.company || '-') + ' | ' + (item.position || '-') + ' | ' + (item.salary || '-');
        });
        const blob = new Blob(['AI-JobHunter 求职管道\n' + '='.repeat(50) + '\n\n' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pipeline-' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        toast($('pipelineStatus'), '已导出 ' + pipeline.length + ' 条记录', 'ok');
      });
    });
  }

    // ====== Job Search ======
  // Job listing extraction function (injected into page via executeScript)
  function extractJobListings() {
    const url = window.location.href;
    const listings = [];
    const seen = new Set();

    // Boss直聘
    if (url.includes('zhipin.com')) {
      document.querySelectorAll('.job-card-wrapper, .search-job-result li').forEach(el => {
        const title = el.querySelector('.job-name, .job-title')?.textContent?.trim();
        const company = el.querySelector('.company-name a, .company-name')?.textContent?.trim();
        const salary = el.querySelector('.salary, .job-limit .red')?.textContent?.trim();
        const location = el.querySelector('.job-area')?.textContent?.trim();
        const link = el.querySelector('a[href*="/job_detail"]')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location, url: link || '' });
        }
      });
    }

    // 猎聘
    if (url.includes('liepin.com')) {
      document.querySelectorAll('.job-list-item, .job-card-pc-container').forEach(el => {
        const title = el.querySelector('.job-title-box .ellipsis-1, .job-title')?.textContent?.trim();
        const company = el.querySelector('.company-name, .company-title')?.textContent?.trim();
        const salary = el.querySelector('.job-salary, .salary')?.textContent?.trim();
        const link = el.querySelector('a')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location: '', url: link || '' });
        }
      });
    }

    // 前程无忧
    if (url.includes('51job.com')) {
      document.querySelectorAll('.j_joblist .e, .joblist-box__item').forEach(el => {
        const title = el.querySelector('.jname .job_name, .t a')?.textContent?.trim();
        const company = el.querySelector('.cname, .company_name a')?.textContent?.trim();
        const salary = el.querySelector('.sal, .job_sar')?.textContent?.trim();
        const link = el.querySelector('.jname a, .t a')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location: '', url: link || '' });
        }
      });
    }

    // 智联招聘
    if (url.includes('zhaopin.com')) {
      document.querySelectorAll('.positionlist .positionlist-item, .joblist-box__item, .soujob-list .clearfix').forEach(el => {
        const title = el.querySelector('.nameinfo a, .job_name, a.iteminfo__line1__jobname')?.textContent?.trim();
        const company = el.querySelector('.company_name a, .comp_name, a.iteminfo__line1__compname')?.textContent?.trim();
        const salary = el.querySelector('.salary_info, .job_sar, p.iteminfo__line2__jobdesc__salary')?.textContent?.trim();
        const link = el.querySelector('.nameinfo a, a.iteminfo__line1__jobname')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location: '', url: link || '' });
        }
      });
    }

    // 拉勾
    if (url.includes('lagou.com')) {
      document.querySelectorAll('.list_item_top, .job-list li').forEach(el => {
        const title = el.querySelector('.position_name, .job_name')?.textContent?.trim();
        const company = el.querySelector('.company_name, .company')?.textContent?.trim();
        const salary = el.querySelector('.position_salary, .salary')?.textContent?.trim();
        const link = el.querySelector('a')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location: '', url: link || '' });
        }
      });
    }

    // 看准网
    if (url.includes('kanzhun.com')) {
      document.querySelectorAll('.search-result-item, .job-card').forEach(el => {
        const title = el.querySelector('.job-name, .job-title')?.textContent?.trim();
        const company = el.querySelector('.company-name')?.textContent?.trim();
        const salary = el.querySelector('.salary')?.textContent?.trim();
        const link = el.querySelector('a')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location: '', url: link || '' });
        }
      });
    }

    // 58同城
    if (url.includes('58.com')) {
      document.querySelectorAll('.job_item, .list_item').forEach(el => {
        const title = el.querySelector('.job_name, .item_con .job_title')?.textContent?.trim();
        const company = el.querySelector('.comp_name, .comp_name_item')?.textContent?.trim();
        const salary = el.querySelector('.job_salary, .salary')?.textContent?.trim();
        const link = el.querySelector('a')?.href;
        if (title && !seen.has(title + company)) {
          seen.add(title + company);
          listings.push({ title, company, salary, location: '', url: link || '' });
        }
      });
    }

    return listings.length > 0 ? listings.slice(0, 50) : null;
  }

  function loadSearchDefaults() {
    chrome.storage.local.get(['searchKeyword', 'searchCity'], data => {
      const kw = $('searchKeyword');
      const ct = $('searchCity');
      if (kw && data.searchKeyword) kw.value = data.searchKeyword;
      if (ct && data.searchCity) ct.value = data.searchCity;
    });
  }

  const searchJobsBtn = $('searchJobsBtn');
  if (searchJobsBtn) {
    searchJobsBtn.addEventListener('click', async () => {
      const keyword = $('searchKeyword')?.value?.trim();
      const city = $('searchCity')?.value?.trim();
      if (!keyword) return toast($('searchStatus'), '请输入搜索关键词', 'err');

      // Save search preferences
      chrome.storage.local.set({ searchKeyword: keyword, searchCity: city });

      // Get selected platforms
      const platforms = [];
      document.querySelectorAll('#platformChecks input[type="checkbox"]:checked').forEach(cb => {
        platforms.push(cb.dataset.platform);
      });
      if (!platforms.length) return toast($('searchStatus'), '请选择至少一个平台', 'err');

      // Generate search URLs
      const urls = generateSearchUrls(keyword, city, platforms);
      displaySearchLinks(urls);

      // Extract job listings from current page if on a search results page
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab.url || '';
        const isSearchPage = platforms.some(p => url.includes(p));
        if (isSearchPage) {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractJobListings
          });
          const listings = result?.[0]?.result;
          if (listings?.length) {
            displaySearchResults(listings);
            toast($('searchStatus'), '从当前页面提取到 ' + listings.length + ' 个职位', 'ok');
          } else {
            toast($('searchStatus'), '已生成搜索链接，请点击打开', 'ok');
          }
        } else {
          toast($('searchStatus'), '已生成搜索链接，请点击打开', 'ok');
        }
      } catch (e) {
        toast($('searchStatus'), '已生成搜索链接', 'ok');
      }
    });
  }

  function generateSearchUrls(keyword, city, platforms) {
    const kw = encodeURIComponent(keyword);
    const ct = encodeURIComponent(city || '');
    const urls = [];
    const platformDefs = {
      zhipin: {
        name: 'Boss直聘',
        url: 'https://www.zhipin.com/web/geek/job?query=' + kw + (city ? '&city=' + ct : ''),
        icon: '💼'
      },
      liepin: {
        name: '猎聘',
        url: 'https://www.liepin.com/zhaopin/?key=' + kw + (city ? '&dq=' + ct : ''),
        icon: '🦁'
      },
      '51job': {
        name: '前程无忧',
        url: 'https://we.51job.com/pc/search?searchKey=' + kw + (city ? '&searchType=2&jobArea=' + ct : ''),
        icon: '📋'
      },
      zhaopin: {
        name: '智联招聘',
        url: 'https://sou.zhaopin.com/?jl=&kw=' + kw + (city ? '&city=' + ct : ''),
        icon: '🔗'
      },
      lagou: {
        name: '拉勾',
        url: 'https://www.lagou.com/wn/jobs?kd=' + kw + (city ? '&city=' + ct : ''),
        icon: '🚀'
      },
      kanzhun: {
        name: '看准网',
        url: 'https://www.kanzhun.com/search/?query=' + kw + (city ? '&city=' + ct : ''),
        icon: '👀'
      },
      '58': {
        name: '58同城',
        url: 'https://search.58.com/?key=' + kw + (city ? '&claession=' + ct : ''),
        icon: '🏠'
      }
    };
    platforms.forEach(p => {
      if (platformDefs[p]) urls.push(platformDefs[p]);
    });
    return urls;
  }

  function displaySearchLinks(urls) {
    const container = $('searchLinksList');
    const section = $('searchLinks');
    if (!container || !section) return;
    section.style.display = 'block';
    container.innerHTML = urls.map(u => {
      return '<div class="search-link-item">' +
        '<span>' + u.icon + '</span>' +
        '<a href="' + u.url + '" target="_blank" rel="noopener">' + u.name + '</a>' +
        '</div>';
    }).join('');
  }

  function displaySearchResults(listings) {
    const container = $('searchResultsList');
    const section = $('searchResults');
    if (!container || !section) return;
    section.style.display = 'block';
    container.innerHTML = listings.map((item, i) => {
      return '<div class="search-job-item" data-idx="' + i + '">' +
        '<div class="search-job-title">' + esc(item.title || '') + '</div>' +
        '<div class="search-job-company">' + esc(item.company || '') + '</div>' +
        '<div class="search-job-meta">' + [item.salary, item.location, item.experience].filter(Boolean).join(' · ') + '</div>' +
        '</div>';
    }).join('');

    container.querySelectorAll('.search-job-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = listings[parseInt(el.dataset.idx)];
        if (item?.url) chrome.tabs.create({ url: item.url });
      });
    });
  }

    // ====== Negotiation Scripts ======
  const negotiationBtn = $('negotiationBtn');
  if (negotiationBtn) {
    negotiationBtn.addEventListener('click', async () => {
      const jd = jdInput.value.trim();
      if (!jd) return toast(greetStatus, '请先获取 JD', 'err');
      negotiationBtn.disabled = true;
      negotiationBtn.innerHTML = '<span class="spin" style="border-top-color:var(--accent);"></span>生成中...';
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'negotiationScripts', jd });
        if (resp?.success) {
          displayNegotiationResults(resp);
          toast(greetStatus, '谈判脚本已生成', 'ok');
        } else {
          toast(greetStatus, resp?.error || '生成失败', 'err');
        }
      } catch (e) {
        toast(greetStatus, '生成失败: ' + e.message, 'err');
      } finally {
        negotiationBtn.disabled = false;
        negotiationBtn.textContent = '🤝 谈判脚本';
      }
    });
  }

  function displayNegotiationResults(result) {
    const section = $('negotiationSection');
    const container = $('negotiationResults');
    if (!section || !container) return;
    section.style.display = 'block';
    let html = '';
    if (result.framework) html += '<div style="padding:10px;background:var(--accent-soft);border-radius:8px;margin-bottom:10px;font-size:12px;line-height:1.6;">' + esc(result.framework) + '</div>';
    if (result.counterOffer) html += '<div style="margin-bottom:10px;"><div style="font-weight:500;margin-bottom:4px;">💬 还价话术</div><div style="font-size:12px;padding:8px;background:var(--fill);border-radius:6px;white-space:pre-wrap;">' + esc(result.counterOffer) + '</div></div>';
    if (result.leverage) html += '<div style="margin-bottom:10px;"><div style="font-weight:500;margin-bottom:4px;">🎯 谈判筹码</div><div style="font-size:12px;line-height:1.6;">' + esc(result.leverage) + '</div></div>';
    if (result.tips?.length) {
      html += '<div style="margin-bottom:8px;"><div style="font-weight:500;">💡 注意事项</div></div>';
      result.tips.forEach(t => { html += '<div style="font-size:12px;padding:2px 0;">• ' + esc(t) + '</div>'; });
    }
    container.innerHTML = html;
  }

    // ====== History ======
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ greetingHistory: [] }, () => loadHistory());
  });

  exportHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.get(['greetingHistory'], data => {
      const history = data.greetingHistory || [];
      if (!history.length) { toast(greetStatus, '没有可导出的历史', 'err'); return; }
      const toneMap = { professional: '专业', friendly: '亲和', confident: '自信', concise: '简洁', enthusiastic: '热情' };
      const lenMap = { short: '简短', medium: '适中', long: '详细' };
      const lines = history.map(item => {
        const d = new Date(item.time);
        const ts = d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        return `【${toneMap[item.tone] || '专业'}】${ts}\nJD: ${item.jd}\n话术: ${item.text}\n`;
      });
      const blob = new Blob(['AI-JobHunter - 话术历史\n' + '='.repeat(40) + '\n\n' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'greeting-history-' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast(greetStatus, '已导出 ' + history.length + ' 条记录', 'ok');
    });
  });

  function saveToHistory(jd, text, tone, length) {
    chrome.storage.local.get(['greetingHistory'], data => {
      const history = data.greetingHistory || [];
      const jdShort = jd.substring(0, 80) + (jd.length > 80 ? '...' : '');
      if (history.length > 0 && history[0].text === text) return;
      history.unshift({ jd: jdShort, text, tone, length: length || 'medium', time: Date.now() });
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
      const toneMap = { professional: '专业', friendly: '亲和', confident: '自信', concise: '简洁', enthusiastic: '热情' };
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

  // ====== Jobs Management ======
  const jobsList = $('jobsList');
  const jobsCount = $('jobsCount');
  const jobsFilterToggle = $('jobsFilterToggle');
  const jobsFilterPanel = $('jobsFilterPanel');
  const jobsFilterArrow = $('jobsFilterArrow');
  const exportJobsBtn = $('exportJobs');
  const clearJobsBtn = $('clearJobs');
  let currentFilter = 'all';

  // 初始化职位管理
  function initJobs() {
    // 筛选面板切换
    if (jobsFilterToggle) {
      jobsFilterToggle.addEventListener('click', () => {
        const isOpen = jobsFilterPanel.style.display !== 'none';
        jobsFilterPanel.style.display = isOpen ? 'none' : 'block';
        if (jobsFilterArrow) jobsFilterArrow.classList.toggle('open', !isOpen);
      });
    }

    // 筛选标签点击
    document.querySelectorAll('.jobs-filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        document.querySelectorAll('.jobs-filter-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        currentFilter = tag.dataset.status;
        loadJobs();
      });
    });

    // 导出按钮
    if (exportJobsBtn) {
      exportJobsBtn.addEventListener('click', exportJobs);
    }

    // 清空按钮
    if (clearJobsBtn) {
      clearJobsBtn.addEventListener('click', clearJobs);
    }

    // 加载职位列表
    loadJobs();
  }

  // 加载职位列表
  function loadJobs() {
    chrome.storage.local.get(['savedJobs'], data => {
      const jobs = data.savedJobs || [];
      
      // 更新计数
      if (jobsCount) {
        jobsCount.textContent = jobs.length + ' 条记录';
      }

      // 筛选
      const filtered = currentFilter === 'all' ? jobs : jobs.filter(j => j.status === currentFilter);

      if (!filtered.length) {
        jobsList.innerHTML = '<div class="jobs-empty">' + (jobs.length ? '当前筛选无结果' : '暂无收藏职位') + '</div>';
        return;
      }

      const statusMap = {
        saved: '待投递',
        applied: '已投递',
        interview: '面试中',
        offer: '已录取',
        rejected: '已拒绝'
      };

      jobsList.innerHTML = filtered.map((job, i) => {
        const d = new Date(job.time);
        const ts = d.toLocaleDateString('zh-CN');
        return `<div class="job-item" data-idx="${i}">
          <div class="job-item-header">
            <div class="job-item-title">${esc(job.position || '未知职位')}</div>
            <span class="job-item-status ${job.status}">${statusMap[job.status] || '待投递'}</span>
          </div>
          <div class="job-item-company">${esc(job.company || '未知公司')}</div>
          <div class="job-item-info">
            ${job.salary ? '<span>' + esc(job.salary) + '</span>' : ''}
            ${job.location ? '<span>' + esc(job.location) + '</span>' : ''}
            <span>${ts}</span>
          </div>
          <div class="job-item-actions">
            <button class="status-btn" data-status="applied">已投递</button>
            <button class="status-btn" data-status="interview">面试中</button>
            <button class="status-btn" data-status="offer">已录取</button>
            <button class="delete" data-action="delete">删除</button>
          </div>
        </div>`;
      }).join('');

      // 绑定事件
      jobsList.querySelectorAll('.job-item').forEach(el => {
        const idx = parseInt(el.dataset.idx);
        
        // 状态按钮
        el.querySelectorAll('.status-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateJobStatus(idx, btn.dataset.status);
          });
        });

        // 删除按钮
        el.querySelector('.delete').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteJob(idx);
        });

        // 点击查看详情
        el.addEventListener('click', () => {
          const job = filtered[idx];
          if (job?.url) {
            chrome.tabs.create({ url: job.url });
          }
        });
      });
    });
  }

  // 更新职位状态
  function updateJobStatus(index, status) {
    chrome.storage.local.get(['savedJobs'], data => {
      const jobs = data.savedJobs || [];
      if (jobs[index]) {
        jobs[index].status = status;
        jobs[index].updatedTime = Date.now();
        chrome.storage.local.set({ savedJobs: jobs }, () => {
          loadJobs();
          toast($('greetStatus'), '状态已更新', 'ok');
        });
      }
    });
  }

  // 删除职位
  function deleteJob(index) {
    chrome.storage.local.get(['savedJobs'], data => {
      const jobs = data.savedJobs || [];
      jobs.splice(index, 1);
      chrome.storage.local.set({ savedJobs: jobs }, () => {
        loadJobs();
        toast($('greetStatus'), '已删除', 'ok');
      });
    });
  }

  // 导出职位数据
  function exportJobs() {
    chrome.storage.local.get(['savedJobs'], data => {
      const jobs = data.savedJobs || [];
      if (!jobs.length) {
        toast($('greetStatus'), '没有可导出的数据', 'err');
        return;
      }
      const statusMap = { saved: '待投递', applied: '已投递', interview: '面试中', offer: '已录取', rejected: '已拒绝' };
      const lines = jobs.map(job => {
        const d = new Date(job.time);
        const ts = d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        return `【${statusMap[job.status] || '待投递'}】${ts}\n职位: ${job.position || ''}\n公司: ${job.company || ''}\n薪资: ${job.salary || ''}\n地点: ${job.location || ''}\n链接: ${job.url || ''}\n`;
      });
      const blob = new Blob(['AI-JobHunter - 职位收藏\n' + '='.repeat(40) + '\n\n' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jobs-' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast($('greetStatus'), '已导出 ' + jobs.length + ' 条记录', 'ok');
    });
  }

  // 清空职位数据
  function clearJobs() {
    if (confirm('确定要清空所有收藏的职位吗？此操作不可撤销。')) {
      chrome.storage.local.set({ savedJobs: [] }, () => {
        loadJobs();
        toast($('greetStatus'), '已清空', 'ok');
      });
    }
  }

  // 保存职位（供 content.js 调用）
  function saveJob(jobInfo) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['savedJobs'], data => {
        const jobs = data.savedJobs || [];
        
        // 检查是否已存在
        const exists = jobs.some(j => j.url === jobInfo.url || (j.position === jobInfo.position && j.company === jobInfo.company));
        if (exists) {
          reject(new Error('该职位已收藏'));
          return;
        }

        // 添加新职位
        jobs.unshift({
          ...jobInfo,
          status: 'saved',
          time: Date.now(),
          updatedTime: Date.now()
        });

        // 限制数量
        const limitedJobs = jobs.slice(0, 200);
        
        chrome.storage.local.set({ savedJobs: limitedJobs }, () => {
          loadJobs();
          resolve();
        });
      });
    });
  }

  // 初始化
  initJobs();

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

  // ======================================================================
  // Injected into page context (must be standalone, no closure vars)
  // ======================================================================

  function extractJDFromPage() {
    const url = window.location.href;
    let jdText = '';
    let platform = '';

    // 1. Detect platform
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

    // 2. Platform-specific selectors (specific first)
    const selectors = {
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

    // Aggressive remove list for cloned elements
    const removeTags = 'style,script,nav,header,footer,.filter,.search,.nav-bar,.sidebar,.recommend,.similar-job,.ads,[class*="filter"],[class*="search"],[class*="nav-bar"],[class*="side-bar"],[class*="recommend"],[class*="similar"],[class*="tag-list"],[class*="job-list"],[class*="card"]';

    // Phase A: try platform-specific selectors
    const sels = selectors[platform] || [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 20) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll(removeTags).forEach(r => r.remove());
        jdText = clone.textContent.trim();
        if (jdText.length > 30) break;
        jdText = '';
      }
    }

    // Phase B: keyword-based detection with improved scoring
    if (!jdText || jdText.length < 50) {
      // Core JD keywords with weights
      const coreKeywords = {
        '岗位职责': 150, '任职要求': 150, '职位描述': 150, '岗位要求': 150,
        '工作职责': 140, '任职资格': 140, '工作内容': 140, '职位要求': 140,
        '我们需要': 120, '我们希望': 120, '你需要': 120, '你能': 110,
        '加分项': 100, '优先': 90, '具备': 80, '负责': 80
      };
      // Secondary keywords (lower weight)
      const secondaryKeywords = ['技能', '经验', '学历', '专业', '语言', '熟悉', '了解', '掌握', '开发', '设计', '管理', '分析', '沟通', '团队'];

      let bestEl = null, bestScore = 0;
      const candidates = document.querySelectorAll('div, section, article, li, p');

      for (const el of candidates) {
        const text = el.textContent || '';
        if (text.length < 30 || text.length > 5000) continue;

        // Skip if too many nested divs (likely container)
        const divCount = el.querySelectorAll('div').length;
        if (divCount > 10) continue;

        let score = 0;

        // Score based on core keywords with position weight
        // Keywords appearing earlier in the text get higher weight
        for (const [kw, weight] of Object.entries(coreKeywords)) {
          const idx = text.indexOf(kw);
          if (idx >= 0) {
            // Position weight: keywords in first 30% get 1.5x boost
            const positionFactor = idx < text.length * 0.3 ? 1.5 : 1.0;
            score += Math.round(weight * positionFactor);
          }
        }

        // Score based on secondary keywords (lower weight)
        for (const kw of secondaryKeywords) {
          if (text.includes(kw)) score += 20;
        }

        // Chinese character ratio (prefer Chinese content)
        const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const chineseRatio = chinese / text.length;
        if (chineseRatio < 0.3) continue;
        score += chinese * 0.5;

        // Prefer moderate length (not too short, not too long)
        if (text.length >= 100 && text.length <= 2000) score += 50;
        else if (text.length > 2000 && text.length <= 3000) score += 20;
        else if (text.length > 3000) score -= 50;

        // Penalty for too many divs (likely navigation/container)
        score -= divCount * 3;

        // Bonus for containing list items (typical in JD)
        const listItems = el.querySelectorAll('li').length;
        if (listItems >= 3 && listItems <= 15) score += 30;

        // Bonus for containing numbers (requirements often have numbers)
        const numbers = text.match(/\d+[\s]*[年月天Kk]/g);
        if (numbers && numbers.length >= 1 && numbers.length <= 5) score += 20;

        // Bonus for structured content (ordered/unordered lists)
        const hasList = el.querySelector('ul, ol') !== null;
        if (hasList) score += 25;

        if (score > bestScore) { bestScore = score; bestEl = el; }
      }

      if (bestEl && bestScore > 150) {
        const clone = bestEl.cloneNode(true);
        clone.querySelectorAll(removeTags).forEach(r => r.remove());
        jdText = clone.textContent.trim();
      }
    }

    if (!jdText) return null;

    // 3. Aggressive cleaning: remove CSS/JS artifacts
    jdText = jdText.replace(/[\w.-]+\{[^}]*\}/g, '');
    jdText = jdText.replace(/\.[A-Za-z][\w-]*\s*\{[^}]*\}/g, '');
    jdText = jdText.replace(/var\s+\w+\s*=\s*[^;]+;/g, '');
    jdText = jdText.replace(/[A-Za-z_]\w*\{[^}]{0,30}\}/g, '');
    jdText = jdText.replace(/display:\s*none\s*!important;?/g, '');
    jdText = jdText.replace(/font-(style|weight):\s*normal;?/g, '');
    jdText = jdText.replace(/visibility:\s*hidden;?/g, '');

    // 4. Remove zero-width characters
    jdText = jdText.replace(/[\u200b\u200c\u200d\ufeff]/g, '');

    // 5. Platform-specific cleaning (zhipin is the worst offender)
    if (platform === 'zhipin') {
      // Fix anti-scraping noise
      jdText = jdText.replace(/BOSS直聘/gi, '');
      jdText = jdText.replace(/来自BOSS直聘/g, '');
      jdText = jdText.replace(/([\u4e00-\u9fff])直聘([\u4e00-\u9fff])/g, '$1$2');
      jdText = jdText.replace(/([\u4e00-\u9fff])BOSS([\u4e00-\u9fff])/gi, '$1$2');

      // Remove recommendation tags like "推荐机器学习(西宁)Python(西宁)..."
      jdText = jdText.replace(/推荐[\u4e00-\u9fff\w\s·（）()]+?\([\u4e00-\u9fff]+\)/g, '');
      jdText = jdText.replace(/更多[\u4e00-\u9fff\w（）()\s]+/g, '');
      jdText = jdText.replace(/地图搜索[\u4e00-\u9fff]*/g, '');

      // Remove entire filter/menu blocks
      jdText = jdText.replace(/(求职类型|薪资待遇|工作经验|学历要求|公司行业|公司规模)[\s\S]*?(?=(?:岗位职责|任职要求|职位描述|岗位要求|职位要求|工作职责|任职资格|工作内容|1\.|一、))/g, '');

      // Remove filter option values
      jdText = jdText.replace(/不限\s*(全职|兼职|实习|在校生|应届生|经验不限|\d+年|[\u4e00-\u9fff]+)\s*/g, '');
      jdText = jdText.replace(/(不限|清空|全职|兼职|实习)\s*/g, '');
      jdText = jdText.replace(/(3K以下|3-5K|5-10K|10-20K|20-50K|50K以上)\s*/g, '');
      jdText = jdText.replace(/(初中及以下|中专\/中技|高中|大专|本科|硕士|博士)\s*/g, '');
      jdText = jdText.replace(/(0-20人|20-99人|100-499人|500-999人|1000-9999人|10000人以上)\s*/g, '');

      // Remove industry category listings (long blocks of categories separated by /)
      jdText = jdText.replace(/互联网\/AI[\u4e00-\u9fff\/（）]+?(?=清空|岗位|职位|工作|$)/g, '');
      jdText = jdText.replace(/(互联网|电子商务|计算机软件|生活服务|企业服务|医疗健康|游戏|社交网络)[\u4e00-\u9fff\/（）]*(O2O)?[\s]*/g, '');

      // Remove job listing cards: "职位名---XXK学历经验公司名 地区"
      jdText = jdText.replace(/[\u4e00-\u9fff\w｜|（）()]+\s*[\u200b\u200c\u200d]*[—\-–]\s*[\u200b\u200c\u200d]*[\d.]+K[\s\S]{0,300}?(科技|公司|集团|有限|china|China)[\u4e00-\u9fff·\s]*/g, '');
      jdText = jdText.replace(/[\u4e00-\u9fff\w]+\s*[\u200b\u200c\u200d]*[—\-–]\s*[\u200b\u200c\u200d]*[\d.]+元\/时[\s\S]{0,100}/g, '');

      // Remove "职位描述boss责" style corrupted text
      jdText = jdText.replace(/职位描述[\u4e00-\u9fff]*责/g, '岗位职责');
    }

    // 6. Common cleaning
    jdText = jdText.replace(/(收藏|立即沟通|举报|微信扫码分享|职位描述|分享)\s*/g, '');
    // Remove company recommendation sections
    jdText = jdText.replace(/(该公司其他职位|相似职位|附近职位|推荐职位)[\s\S]*$/g, '');

    // 7. Extract JD section by keyword markers
    const jdMarkers = ['岗位职责', '任职要求', '职位描述', '岗位要求', '职位要求', '工作职责', '任职资格', '工作内容'];
    let jdStart = -1;
    for (const marker of jdMarkers) {
      const idx = jdText.indexOf(marker);
      if (idx >= 0 && (jdStart < 0 || idx < jdStart)) jdStart = idx;
    }
    if (jdStart > 0) {
      jdText = jdText.substring(jdStart);
      const endMarkers = ['相似职位', '公司信息', '公司介绍', '工商信息', '推荐职位', '面试评价', '公司地址', '附近职位', '该公司其他职位'];
      for (const em of endMarkers) {
        const endIdx = jdText.indexOf(em);
        if (endIdx > 50) { jdText = jdText.substring(0, endIdx); break; }
      }
    }

    // 8. Normalize whitespace
    jdText = jdText.replace(/\s+/g, ' ').replace(/  +/g, ' ').trim();
    if (jdText.length > 3000) jdText = jdText.substring(0, 3000) + '...';

    // 9. Validate
    const hasContent = jdMarkers.some(kw => jdText.includes(kw)) || jdText.length > 100;
    return hasContent ? jdText : (jdText.length > 30 ? jdText : null);
  }
  // ====== 职位信息提取（注入页面） ======
  function extractJobInfo() {
    const url = window.location.href;
    const info = { position: '', company: '', salary: '', location: '', experience: '', education: '' };
    function q(sels) {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el && el.textContent.trim()) return el.textContent.trim().replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      }
      return '';
    }
    if (url.includes('zhipin.com')) {
      info.position = q(['.job-name', '.info-primary .name']);
      info.company = q(['.company-name a', '.info-company .name', '.sider-company .company-name']);
      info.salary = q(['.salary', '.info-primary .salary']);
      info.location = q(['.job-area', '.info-primary .job-area']);
      info.experience = q(['.job-limit .text-experience', '.info-primary .text-experience']);
      info.education = q(['.job-limit .text-degree', '.info-primary .text-degree']);
    } else if (url.includes('51job.com')) {
      info.position = q(['.job_msg h1', '.tCompany_main h1', 'h1']);
      info.company = q(['.tCompany_top .company_name', '.company_name', '.cname']);
      info.salary = q(['.salary', '.job_msg .salary']);
    } else if (url.includes('zhaopin.com')) {
      info.position = q(['.describtion h1', '.info-h3 h1', 'h1']);
      info.company = q(['.company-name', '.company_name']);
      info.salary = q(['.salary', '.info-primary .salary']);
    } else if (url.includes('liepin.com')) {
      info.position = q(['.job-intro-container h1', '.job-title h1', 'h1']);
      info.company = q(['.company-name', '.company-intro-container .name']);
      info.salary = q(['.job-salary', '.salary']);
    } else if (url.includes('lagou.com')) {
      info.position = q(['.job-name h1', '.job-name', 'h1']);
      info.company = q(['.company-name', '.company_name']);
      info.salary = q(['.salary', '.job-salary']);
    } else if (url.includes('kanzhun.com')) {
      info.position = q(['.job-title', '.job-name', 'h1']);
      info.company = q(['.company-name', '.company_name']);
      info.salary = q(['.salary', '.job-salary']);
    } else if (url.includes('58.com')) {
      info.position = q(['.job-title h1', '.job-name', 'h1']);
      info.company = q(['.company-name', '.company_name']);
      info.salary = q(['.salary', '.job-salary']);
    }
    return info;
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
