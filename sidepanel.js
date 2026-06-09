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
      if (result.suggestions) text += '\n💡 ' + result.suggestions;
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

    // 2. Platform-specific selectors (specific first)
    const selectors = {
      zhipin: ['.job-detail-section .job-sec-text', '.job-detail-bottom .job-sec-text', '.detail-content .job-sec-text', '.job-desc'],
      '51job': ['.job_msg', '.j_job_msg', '.tCompany_main .job_detail'],
      zhaopin: ['.describtion', '.describtion-box', '.job-detail .pos-ul'],
      liepin: ['.job-intro-container', '.job-qualifications', '.job-intro'],
      lagou: ['.job_bt', '.job-detail-content', '.job_detail'],
      kanzhun: ['.job-detail .job-sec-text', '.detail-content .job-sec-text'],
      '58': ['.job-detail .job_desc', '.des', '.job-description']
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

    // Phase B: keyword-based detection
    if (!jdText || jdText.length < 50) {
      const jdKeywords = ['岗位职责', '任职要求', '职位描述', '岗位要求', '职位要求', '工作职责', '任职资格', '工作内容', '我们希望', '你需要', '你需要具备', '加分项'];
      let bestEl = null, bestScore = 0;
      for (const el of document.querySelectorAll('div, section, article')) {
        const text = el.textContent || '';
        if (text.length < 30 || text.length > 5000) continue;
        let score = 0;
        for (const kw of jdKeywords) { if (text.includes(kw)) score += 100; }
        const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        if (chinese / text.length < 0.3) continue;
        score += chinese;
        if (text.length > 2000) score -= 100;
        score -= el.querySelectorAll('div').length * 5;
        if (score > bestScore) { bestScore = score; bestEl = el; }
      }
      if (bestEl && bestScore > 200) {
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
