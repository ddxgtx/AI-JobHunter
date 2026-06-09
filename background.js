/**
 * AI-JobHunter v2.7 - Background Service Worker
 * 编码: UTF-8
 * 处理来自 content script 和 popup 的 API 调用请求
 */

// 点击扩展图标直接打开侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    if (sender.tab && sender.tab.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    }
    return;
  }

  if (request.action === 'autoFillResume') {
    handleAutoFill(request.pageFields, request.resume)
      .then(mappings => sendResponse({ success: true, mappings }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'testConnection') {
    handleTestConnection()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'parseResumeFromText') {
    handleParseResumeFromText(request.text)
      .then(resume => sendResponse({ success: true, resume }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'extractJD') {
    handleExtractJD(request.text)
      .then(jd => sendResponse({ success: true, jd }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'extractKeySkills') {
    handleExtractKeySkills(request.text)
      .then(skills => sendResponse({ success: true, skills }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'analyzeMatch') {
    handleAnalyzeMatch(request.jd, request.resume)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
    }

  if (request.action === 'interviewPrep') {
    handleInterviewPrep(request.jd)
      .then(questions => sendResponse({ success: true, questions }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'keywordOptimize') {
    handleKeywordOptimize(request.jd, request.resume)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'generateCoverLetter') {
    handleGenerateCoverLetter(request.jd, request.tone)
      .then(letter => sendResponse({ success: true, letter }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'salaryAnalysis') {
    handleSalaryAnalysis(request.jd)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function getConfig() {
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

function resolveAPIEndpoint(config) {
  switch (config.model) {
    case 'deepseek':
      return { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' };
    case 'custom': {
      if (!config.apiUrl) throw new Error('请配置自定义 API URL');
      let url = config.apiUrl.replace(/\/+$/, '');
      if (!url.endsWith('/chat/completions')) url += '/chat/completions';
      return { url, model: config.customModel || 'gpt-4o-mini' };
    }
    default:
      return { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' };
  }
}

// ---- 带重试的 API 调用 ----
async function callAPI(config, prompt, retries) {
  retries = retries ?? 2;
  const { url: apiUrl, model } = resolveAPIEndpoint(config);

  for (let attempt = 0; attempt <= retries; attempt++) {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000);
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      clearTimeout(timeoutId);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const errMsg = err.error?.message || 'API 请求失败 (' + resp.status + ')';
        // 429/5xx 可重试
        if ((resp.status === 429 || resp.status >= 500) && attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(errMsg);
      }

      const data = await resp.json();
      if (!data.choices?.[0]?.message?.content) throw new Error('API 返回格式异常');
      return data.choices[0].message.content.trim();
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      const isAbort = e.name === 'AbortError';
      const isFetchErr = e.message && (e.message.includes('fetch') || e.message.includes('Failed') || e.message.includes('network'));
      const retriable = isAbort || isFetchErr;
      if (attempt < retries && retriable) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (isAbort) throw new Error('请求超时（30秒），请检查网络连接');
      if (isFetchErr) throw new Error('网络连接失败，请检查网络或 API 地址');
      if (e.message.includes('401')) throw new Error('API Key 无效或已过期');
      if (e.message.includes('403')) throw new Error('API Key 权限不足');
      if (e.message.includes('429')) throw new Error('请求过于频繁，请稍后重试');
      throw e;
    }
  }
}

// ---- 流式 API 调用（带重试） ----
async function streamAPI(config, prompt, onChunk, onDone, onError, onReset) {
  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await _streamAPIOnce(config, prompt, onChunk, onDone, onError);
      return;
    } catch (e) {
      const retriable = e.name === 'AbortError' || (e.message && (e.message.includes('429') || e.message.includes('过于频繁') || e.message.includes('超时') || e.message.includes('500') || e.message.includes('502') || e.message.includes('503') || e.message.includes('fetch') || e.message.includes('network') || e.message.includes('Failed')));
      if (attempt < maxRetries && retriable) {
        if (onReset) onReset();
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      onError(e);
      return;
    }
  }
}

async function _streamAPIOnce(config, prompt, onChunk, onDone, onError) {
  const { url: apiUrl, model } = resolveAPIEndpoint(config);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      })
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || 'API 请求失败 (' + resp.status + ')');
    }

    if (!resp.body) {
      const data = await resp.json();
      if (data.choices?.[0]?.message?.content) onChunk(data.choices[0].message.content);
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') { try { reader.cancel(); } catch(_){} onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) { /* skip malformed JSON */ }
      }
    }
    try { reader.cancel(); } catch(_){}
    onDone();
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('请求超时，请检查网络连接');
    else if (e.message && e.message.includes('401')) throw new Error('API Key 无效或已过期');
    else if (e.message && e.message.includes('403')) throw new Error('API Key 权限不足');
    else if (e.message && e.message.includes('429')) throw new Error('请求过于频繁，请稍后重试');
    else if (e.message && (e.message.includes('fetch') || e.message.includes('Failed') || e.message.includes('network'))) throw new Error('网络连接失败，请检查网络或 API 地址');
    else throw e;
  }
}

// ---- Port 连接（流式话术生成） ----
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'greeting-stream') {
    port.onMessage.addListener(async (msg) => {
      if (msg.action === 'generateGreetingStream') {
        try {
          const config = await getConfig();
          if (!config.apiKey) { try { port.postMessage({ type: 'error', message: '请先配置 API Key' }); } catch(e) {} return; }
          const prompt = buildGreetingPrompt(msg.jd, msg.tone, config, msg.length);
          await streamAPI(config, prompt,
            (chunk) => { try { port.postMessage({ type: 'chunk', text: chunk }); } catch(e) {} },
            () => { try { port.postMessage({ type: 'done' }); } catch(e) {} },
            (err) => { try { port.postMessage({ type: 'error', message: err.message }); } catch(e) {} },
            () => { try { port.postMessage({ type: 'reset' }); } catch(e) {} }
          );
        } catch (e) {
          try { port.postMessage({ type: 'error', message: e.message }); } catch(err) {}
        }
      }
    });
  }
});

async function handleTestConnection() {
  const config = await getConfig();
  if (!config.apiKey) return { success: false, error: '未配置 API Key' };

  try {
    await callAPI(config, '回复"ok"', 0);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function buildGreetingPrompt(jd, tone, config, length) {
  const toneMap = { professional:'专业、严谨、商务化', friendly:'亲和、友好、轻松自然', confident:'自信、直接、突出实力', concise:'简洁、精炼、重点突出、一两句话说清核心优势', enthusiastic:'热情、积极、充满诚意、表达对岗位的强烈兴趣' };
  const r = config.resume || {};
  const toneLabel = toneMap[tone] || toneMap.professional;

  // 组装完整简历信息
  const resumeLines = [];
  if (r.r_name)     resumeLines.push('姓名：' + r.r_name);
  if (r.r_title)    resumeLines.push('当前职位：' + r.r_title);
  if (r.r_company)  resumeLines.push('当前/最近公司：' + r.r_company);
  if (r.r_exp)      resumeLines.push('工作年限：' + r.r_exp);
  if (r.r_industry) resumeLines.push('所在行业：' + r.r_industry);
  if (r.r_edu)      resumeLines.push('学历：' + r.r_edu);
  if (r.r_school)   resumeLines.push('毕业院校：' + r.r_school);
  if (r.r_major)    resumeLines.push('专业：' + r.r_major);
  if (r.r_salary)   resumeLines.push('期望薪资：' + r.r_salary);
  if (r.r_city)     resumeLines.push('期望城市：' + r.r_city);
  if (r.r_summary)  resumeLines.push('个人优势：' + r.r_summary);

  return `你是一位资深求职顾问。根据以下职位描述（JD）和求职者简历信息，生成一段适合在招聘平台上发送给 HR 的打招呼话术。

要求：
- 风格：${toneLabel}
- 长度要求：
  - short: 30-60 字，极度精炼，一句话说清核心匹配点
  - medium: 60-120 字，简洁有力，直击要点
  - long: 120-200 字，内容丰富，详细展示优势和匹配度
- 当前选择: ${({short:'简短版30-60字',medium:'适中版60-120字',long:'详细版120-200字'}[length] || '适中版60-120字')}
- 从 JD 中直接提取公司名称、岗位名称，在话术中体现
- 根据简历背景判断与 JD 的匹配度，突出最相关的经验/技能
- 如果学历或院校有优势可适当提及，否则省略
- 语气自然，不要用"尊敬的HR"之类的开头
- 不要逐条罗列简历，不要重复 JD 原文

求职者简历：
${resumeLines.join('\n')}

职位描述：
${jd}

请直接输出打招呼话术，不要添加任何解释或前缀。`;
}

async function handleAutoFill(pageFields, resume) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');

  const prompt = `你是一个智能表单填写助手。根据求职者的简历信息，将简历字段匹配到页面表单字段，并生成填写值。

求职者简历信息（JSON）：
${JSON.stringify(resume, null, 2)}

页面表单字段（JSON 数组，每项包含 selector、label、placeholder、tagName、inputType、options）：
${JSON.stringify(pageFields, null, 2)}

请输出一个 JSON 数组，每个元素格式如下：
{
  "selector": "CSS选择器（使用页面提供的selector）",
  "value": "要填入的值",
  "fieldName": "字段中文名"
}

规则：
1. 根据 label / placeholder / name 语义匹配最合适的简历字段
2. 对于选择框(select)，value 必须从其 options 的 text 中选择一个最匹配的值
3. 对于文本域(textarea)，如果简历中有 summary，用 summary 内容；否则根据其他信息组合生成
4. 对于明显不相关的字段(如验证码、图片上传、搜索框)跳过，不要包含在结果中
5. 如果字段 label 含"期望"且涉及薪资，使用 r_salary 值
6. 如果字段 label 含"期望"且涉及城市/地点，使用 r_city 值
7. 只输出 JSON 数组，不要输出任何解释文字`;

  const result = await callAPI(config, prompt + '\n\n注意：如果简历中有 r_industry（行业）字段，请在匹配时也考虑行业相关字段的语义。');
  try {
    const jsonStr = result.match(/\[[\s\S]*\]/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI 返回数据解析失败，请重试');
  }
}

async function handleParseResumeFromText(text) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');

  const prompt = `你是一个智能简历解析助手。请从以下文本中提取简历信息，并返回一个 JSON 对象。

文本内容：
${text.substring(0, 5000)}

请提取以下字段（如果存在）：
{
  "r_name": "姓名",
  "r_phone": "手机号",
  "r_email": "邮箱",
  "r_company": "当前/最近公司",
  "r_title": "当前/最近职位",
  "r_industry": "所在行业",
  "r_exp": "工作年限",
  "r_edu": "学历",
  "r_salary": "期望薪资",
  "r_city": "期望城市",
  "r_school": "毕业院校",
  "r_major": "专业",
  "r_summary": "个人优势摘要"
}

规则：
1. 只提取文本中明确存在的信息
2. 无法确定的字段用空字符串
3. 联系方式请准确提取
4. 只输出 JSON 对象`;

  const result = await callAPI(config, prompt);
  try {
    const jsonStr = result.match(/\{[\s\S]*\}/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI 解析简历失败，请重试');
  }
}

async function handleExtractJD(text) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const prompt = `以下是从招聘页面提取的原始文本，可能包含大量无关内容（导航栏、筛选器、推荐职位列表、广告、页脚等）。

请严格从中提取职位描述（JD）部分，遵守以下规则：
1. 只保留：岗位名称、岗位职责/工作内容、任职要求/岗位要求、福利待遇等核心JD信息
2. 完全去除：导航菜单、筛选条件（如"求职类型 不限 全职 兼职"）、推荐职位列表、公司信息栏、广告、页脚、"收藏"、"立即沟通"、"举报"等操作按钮文字
3. 去除所有非JD文本，包括职位列表条目（如"xxx工程师-xxxK xxx公司 xxx区"）
4. 如果文本中被插入了反爬虫噪声（如中文词中间被插入了"boss直聘"等文字），请修正为正确的中文
5. 如果没有找到明确的JD内容（岗位职责/任职要求），返回空字符串
6. 只输出清理后的纯JD文本，不要添加任何解释、前缀或格式标记

原始文本：
${text.substring(0, 8000)}`;
  const result = await callAPI(config, prompt, 0);
  return (result || '').trim();
}

async function handleExtractKeySkills(jdText) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const prompt = `从以下职位描述中提取关键技能要求，返回一个 JSON 数组，每个元素是一个技能关键词（如 "Python"、"Django"、"3年经验"、"本科"等）。

规则：
1. 提取技术技能、框架、工具、编程语言
2. 提取经验要求（如"3年以上"）
3. 提取学历要求
4. 每个技能尽量简短（2-6个字）
5. 最多提取15个
6. 只输出 JSON 数组，不要其他文字

职位描述：
${jdText.substring(0, 3000)}`;
  const result = await callAPI(config, prompt, 0);
  try {
    const jsonStr = result.match(/\[[\s\S]*\]/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    const skills = result.split(/[,，、\n]/).map(s => s.trim().replace(/^[`"'\-\d.]+\s*/, '')).filter(s => s.length > 1 && s.length < 20);
    return skills.slice(0, 15);
  }
}

async function handleAnalyzeMatch(jdText, resume) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const resumeLines = [];
  if (resume.r_name) resumeLines.push('姓名：' + resume.r_name);
  if (resume.r_title) resumeLines.push('职位：' + resume.r_title);
  if (resume.r_company) resumeLines.push('公司：' + resume.r_company);
  if (resume.r_exp) resumeLines.push('经验：' + resume.r_exp);
  if (resume.r_edu) resumeLines.push('学历：' + resume.r_edu);
  if (resume.r_school) resumeLines.push('院校：' + resume.r_school);
  if (resume.r_major) resumeLines.push('专业：' + resume.r_major);
  if (resume.r_industry) resumeLines.push('行业：' + resume.r_industry);
  if (resume.r_summary) resumeLines.push('优势：' + resume.r_summary);

  const prompt = `分析以下简历与职位描述的匹配度。

简历信息：
${resumeLines.join('\n')}

职位描述：
${jdText.substring(0, 3000)}

请返回一个 JSON 对象：
{
  "score": 75,
  "matchedSkills": ["Python", "Django", "MySQL"],
  "missingSkills": ["Redis", "Docker"],
  "suggestions": "建议补充 Redis 和 Docker 相关经验..."
}

规则：
1. score 是 0-100 的匹配度分数
2. matchedSkills 是简历中已有的匹配技能（最多8个）
3. missingSkills 是 JD 要求但简历中缺少的技能（最多8个）
4. suggestions 是一段简短的优化建议（50-100字）
5. 只输出 JSON 对象，不要其他文字`;
  const result = await callAPI(config, prompt, 0);
  try {
    const jsonStr = result.match(/\{[\s\S]*\}/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    return { score: 0, matchedSkills: [], missingSkills: [], suggestions: '解析失败，请重试' };
  }
}


async function handleInterviewPrep(jdText) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const prompt = `你是一位资深技术面试官。根据以下职位描述（JD），生成该岗位的面试准备问题。

职位描述：
${jdText.substring(0, 3000)}

请返回一个 JSON 数组，每个元素包含：
{
  "category": "问题类别（如：技术基础、项目经验、系统设计、行为面试、场景题）",
  "question": "面试问题",
  "hint": "回答提示或考察要点（30-60字）"
}

规则：
1. 生成 8-12 个有深度的面试问题
2. 覆盖技术能力、项目经验、系统设计、行为面试等维度
3. 问题要针对 JD 中的具体技术栈和要求
4. hint 给出回答思路提示
5. 只输出 JSON 数组，不要其他文字`;
  const result = await callAPI(config, prompt, 0);
  try {
    const jsonStr = result.match(/\[\s\S]*\]/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI 返回数据解析失败，请重试');
  }
}

async function handleKeywordOptimize(jdText, resume) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const resumeLines = [];
  if (resume.r_title) resumeLines.push('职位：' + resume.r_title);
  if (resume.r_exp) resumeLines.push('经验：' + resume.r_exp);
  if (resume.r_edu) resumeLines.push('学历：' + resume.r_edu);
  if (resume.r_summary) resumeLines.push('个人优势：' + resume.r_summary);

  const prompt = `你是一位简历优化专家。分析以下职位描述（JD）和求职者简历，提供关键词优化建议。

简历信息：
${resumeLines.join('\n')}
')}

职位描述：
${jdText.substring(0, 3000)}

请返回一个 JSON 对象：
{
  "missingKeywords": ["JD 中要求但简历中缺少的关键词"],
  "presentKeywords": ["简历中已匹配 JD 的关键词"],
  "suggestedAdditions": [
    {"keyword": "建议添加的关键词", "context": "建议在简历哪个部分如何添加"}
  ],
  "optimizedSummary": "根据 JD 优化后的个人优势摘要（100-150字）"
}

规则：
1. missingKeywords 提取 JD 中重要的技术词、行业词、能力词（最多10个）
2. presentKeywords 列出简历中已有的匹配词（最多10个）
3. suggestedAdditions 给出具体的添加建议（最多5个）
4. optimizedSummary 基于现有简历内容，针对该 JD 优化个人优势
5. 只输出 JSON 对象，不要其他文字`;
  const result = await callAPI(config, prompt, 0);
  try {
    const jsonStr = result.match(/\{[\s\S]*\}/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    return { missingKeywords: [], presentKeywords: [], suggestedAdditions: [], optimizedSummary: '解析失败，请重试' };
  }
}

async function handleGenerateCoverLetter(jdText, tone) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const toneMap = { professional:'正式、专业', friendly:'友好、亲切', confident:'自信、有力' };
  const r = config.resume || {};
  const resumeLines = [];
  if (r.r_name) resumeLines.push('姓名：' + r.r_name);
  if (r.r_title) resumeLines.push('职位：' + r.r_title);
  if (r.r_company) resumeLines.push('公司：' + r.r_company);
  if (r.r_exp) resumeLines.push('经验：' + r.r_exp);
  if (r.r_edu) resumeLines.push('学历：' + r.r_edu);
  if (r.r_school) resumeLines.push('院校：' + r.r_school);
  if (r.r_industry) resumeLines.push('行业：' + r.r_industry);
  if (r.r_summary) resumeLines.push('优势：' + r.r_summary);

  const prompt = `你是一位资深求职顾问。根据以下 JD 和简历，生成一封求职信。

风格：${toneMap[tone] || toneMap.professional}

简历信息：
${resumeLines.join('\n')}

职位描述：
${jdText.substring(0, 3000)}

要求：
1. 300-500 字
2. 开头表明申请意向和来源
3. 中段展示与 JD 的匹配点（技术、经验、项目）
4. 结尾表达期待和联系方式
5. 语气自然真诚，不要模板化
6. 直接输出求职信正文`;
  return await callAPI(config, prompt);
}

async function handleSalaryAnalysis(jdText) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('请先配置 API Key');
  const prompt = `你是一位资深薪酬顾问。根据以下职位描述，分析薪资情况。

职位描述：
${jdText.substring(0, 2000)}

请返回一个 JSON 对象：
{
  "salaryRange": "参考薪资范围（如 15-25K）",
  "factors": ["影响薪资的因素1", "因素2", ...],
  "marketTrend": "市场趋势简述（50字内）",
  "negotiationTips": ["谈判建议1", "建议2", ...]
}

规则：
1. salaryRange 根据技能要求、经验要求、城市推断
2. factors 最多 5 个
3. marketTrend 50 字以内
4. negotiationTips 最多 4 条实用建议
5. 只输出 JSON`;
  const result = await callAPI(config, prompt, 0);
  try {
    const jsonStr = result.match(/\{[\s\S]*\}/)?.[0] || result;
    return JSON.parse(jsonStr);
  } catch (e) {
    return { salaryRange: '无法判断', factors: [], marketTrend: '解析失败', negotiationTips: [] };
  }
}
