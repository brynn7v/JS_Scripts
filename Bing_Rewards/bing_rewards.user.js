// ==UserScript==
// @name         Bing Rewards每日脚本
// @namespace    http://tampermonkey.net/
// @version      2.17
// @description  获取自建热词接口并进行搜索
// @author       ぶりん
// @match        https://*.bing.com/*
// @exclude      https://rewards.bing.com/*
// @connect      8.134.117.11
// @connect      bing.by-fire.top
// @icon         https://www.bing.com/favicon.ico
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @downloadURL  https://raw.githubusercontent.com/brynn7v/JS_Scripts/main/Bing_Rewards/bing_rewards.user.js
// @updateURL    https://raw.githubusercontent.com/brynn7v/JS_Scripts/main/Bing_Rewards/bing_rewards.meta.js
// ==/UserScript==

const max_rewards = 35;
const pause_time = 2;
const API = "http://8.134.117.11:8000/api/hot";

let search_words = []
let backup_list = ["维护世界粮食安全的中国行动",
                   "注意！“最疼皮肤病”进入高发期",
                   "辽宁失联4岁女童已找到",
                   "十四五期间这些大国重器出圈了",
                   "80岁诺奖得主去世 晚年在华“敛财”",
                   "王祖贤30年前捐建的路升级改造竣工",
                   "杭州有人600元一克时囤了150万黄金",
                   "人民日报对话郭晶晶：为何巅峰期退役",
                   "500平房子装20余台空调 邻居投诉",
                   "人贩子被判3年后又卖了十余个孩子",
                   "第一个向中国道歉的日本首相去世",
                   "甘肃两主播为卖货演暴力剧本被罚",
                   "夫妻卖辣卤因食客排队太久全部免单",
                   "周杰伦警告好友：再不出现你就完了",
                   "挑手筋剁手指 缅北徐老发案细节曝光",
                   "海南离岛旅客免税购物政策调整",
                   "蒙牛包装“撞脸”伊利 被判赔500万",
                   "“竹裤架”突然翻红",
                   "曹德旺回应退休：我儿子也55岁了",
                   "警方披露台北车站性侵案始末",
                   "“距离下一场战争打响还有0日”",
                   "客人在酒店随手一挂 事后被索赔16万",
                   "美国没收柬电诈头目150亿美元比特币",
                   "爸爸凌晨骑行300公里送女儿出嫁",
                   "云南出现一道圆形彩虹",
                   "男子偷上万辆共享单车 每辆卖105元",
                   "缅北徐老发犯罪集团专案被侦破",
                   "全国将开展1%人口抽样调查",
                   "美国一储藏约816吨大豆粮仓倒塌",
                   "70后夫妻在非洲卖纸尿裤年入32亿",
                   "金饰克价逼近1300元大关",
                   "女子用文身遮住烫伤疤痕重拾自信",
                   "趵突泉再现“趵突腾空”景象",
                   "男子多次急刹致公交撞树 被行拘",
                   "重庆一小学将操场建在楼顶上",
                   "建立新能源车火灾事故企业报告制度",
                   "比亚迪宣布召回部分汽车",
                   "日本一小学课间齐跳科目三",
                   "丰巢80后创始人提出离职",
                   "印尼也要买中国战机了",
                   "牛弹琴：普京三板斧 搞定特朗普",
                   "河南省疾控发布重要提醒",
                   "吴京接棒李连杰成国际武联形象大使",
                   "杨瀚森季前赛收官战3分0篮6犯离场",
                   "电诈分子打死人 反问警察有证据吗",
                   "拒绝录用35岁女子企业去年0人参保",
                   "蒙古国总理赞丹沙塔尔辞职",
                   "洪秀柱挺郑丽文：女人不止撑起半边天",
                   "关键时刻江苏两座城市被“点名”",
                   "张天福之子回应父亲被AI“复活”",
                   "海南华铁深夜公告被立案调查"]

let keywords_source = ['baidu_hot', 'zhihu_hot', 'weibo_hot', 'hot_news', 'toutiao_hot', 'bing_hot', 'china_news_dwq'];
let random_keywords_source = keywords_source[Math.floor(Math.random() * keywords_source.length)];
let current_source_index = 0;

function get_keywords_list(callback) {
    // 安全解析 GM_getValue 的值
    let gm_word_list_str = GM_getValue('word_list');
    let gm_word_list;
    try {
        gm_word_list = JSON.parse(gm_word_list_str || '[]');
    } catch (e) {
        gm_word_list = [];
    }

    function make_request(){
        GM_xmlhttpRequest({
            method: 'GET',
            url: API,
            timeout: 100000,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    const combined = [
                        ...(data.baidu_hot || []),
                        ...(data.zhihu_hot || []),
                        ...(data.weibo_hot || []),
                        ...(data.hot_news || []),
                        ...(data.toutiao_hot || []),
                        ...(data.bing_hot || []),
                        ...(data.china_news_dwq || []),
                    ];
                    const uniqueSet = new Set(combined);
                    search_words = Array.from(uniqueSet).filter(item => item);
                    console.log('热词解析成功', search_words);
                    GM_setValue('word_list', JSON.stringify(search_words));
                    if (callback) callback();
                } catch (e) {
                    console.error('数据解析失败:', e);
                    // 不要显示alert，只记录错误
                    console.warn('API数据格式异常，使用备选数据');
                    // 使用缓存数据或默认关键词作为备选
                    if (gm_word_list.length > 0) {
                        search_words = gm_word_list;
                        console.log('使用缓存数据作为备选');
                        if (callback) callback();
                    } else {
                        // 使用默认关键词
                        search_words = backup_list;
                        console.log('使用默认关键词');
                        if (callback) callback();
                    }
                }
            },
            onerror: function(error) {
                console.error('API请求失败:', error);
                // 不要显示alert，只记录错误
                console.warn('无法连接到热点数据接口，使用备选数据');
                // 使用缓存数据作为备选
                if (gm_word_list.length > 0) {
                    search_words = gm_word_list;
                    console.log('API失败，使用缓存数据');
                    if (callback) callback();
                } else {
                    // 如果没有缓存，使用默认关键词
                    search_words = backup_list;
                    console.log('使用默认关键词');
                    if (callback) callback();
                }
            }
        });
    }

    if (Array.isArray(gm_word_list) && gm_word_list.length === 0) {
        make_request();
    } else {
        search_words = gm_word_list;
        console.log('使用缓存热词');
        if (callback) callback();
    }
}

// 初始化热词列表，完成后执行主逻辑
get_keywords_list(exec);

// 注册右键菜单命令
// 开始普通模式搜索
let startMenu = GM_registerMenuCommand('Start', async function(){
    GM_setValue('currentIndex', 0);
    GM_setValue('cd', 0); // 确保清除CD标志
    // 清除之前的初始积分缓存，强制重新获取
    GM_setValue('initRewardPoint', null);
    try {
        let init_reward_point = await getRewardPoint();
        if(init_reward_point !== -1){
            GM_setValue('initRewardPoint', init_reward_point);
            console.log('Start - 重新设置初始分值为：', init_reward_point)
        } else {
            console.log('Start - 无法获取当前积分，将在页面加载后重新尝试');
        }
    } catch (error) {
        console.error('Start - 获取积分时发生错误:', error);
    }
    location.href = 'https://www.bing.com/?br_msg=Please-Wait';
}, 'o');


// 开始CD模式搜索（间隔更长时间）
let startCDMenu = GM_registerMenuCommand('Start_CD', async function(){
    GM_setValue('currentIndex', 0);
    GM_setValue('cd', 1);
    // 清除之前的初始积分缓存，强制重新获取
    GM_setValue('initRewardPoint', null);
    try {
        let init_reward_point = await getRewardPoint();
        if(init_reward_point !== -1){
            GM_setValue('initRewardPoint', init_reward_point);
            console.log('Start_CD - 重新设置初始分值为：', init_reward_point)
        } else {
            console.log('Start_CD - 无法获取当前积分，将在页面加载后重新尝试');
        }
    } catch (error) {
        console.error('Start_CD - 获取积分时发生错误:', error);
    }
    location.href = 'https://www.bing.com/?br_msg=Please-Wait';
}, 'c');

// 开始加倍模式（原 max_rewards + 30）
let startX2Menu = GM_registerMenuCommand('Start_X2', async function(){
    // 将最大值扩展
    const overrideValue = max_rewards + 30;
    GM_setValue('maxRewardsOverride', overrideValue);
    GM_setValue('currentIndex', 0);
    GM_setValue('cd', 0);
    // 清除之前的初始积分缓存，强制重新获取
    GM_setValue('initRewardPoint', null);
    try {
        let init_reward_point = await getRewardPoint();
        if(init_reward_point !== -1){
            GM_setValue('initRewardPoint', init_reward_point);
            console.log('Start_X2 - 重新设置初始分值为：', init_reward_point)
        } else {
            console.log('Start_X2 - 无法获取当前积分，将在页面加载后重新尝试');
        }
    } catch (error) {
        console.error('Start_X2 - 获取积分时发生错误:', error);
    }
    console.log(`Start_X2 - 将 max_rewards 覆盖为 ${overrideValue}`);
    location.href = 'https://www.bing.com/?br_msg=Please-Wait';
}, 'z');

// 停止搜索
let stopMenu = GM_registerMenuCommand('Stop', function(){
    GM_setValue('currentIndex', 999); // 设置为一个远大于max_rewards的值来确保停止
    GM_setValue('cd', 0);
    GM_setValue('word_list', null);
    GM_setValue('initRewardPoint', null); // 清除初始积分缓存
    GM_setValue('maxRewardsOverride', null);
    console.log('Stop - 脚本已停止，清除所有缓存');
}, 'x');

// 完全重置所有状态
let resetMenu = GM_registerMenuCommand('Reset', function(){
    GM_setValue('currentIndex', 0);
    GM_setValue('cd', 0);
    GM_setValue('word_list', null);
    GM_setValue('initRewardPoint', null);
    GM_setValue('maxRewardsOverride', null);
    console.log('Reset - 所有状态已重置');
    alert('脚本状态已完全重置！');
}, 'r');

// 查看当前状态
let statusMenu = GM_registerMenuCommand('Status', function(){
    let currentIndex = GM_getValue('currentIndex');
    let cdFlag = GM_getValue('cd');
    let initRewardPoint = GM_getValue('initRewardPoint');
    let wordList = GM_getValue('word_list');
    let maxOverride = GM_getValue('maxRewardsOverride');

    let status = `当前脚本状态：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 当前进度: ${currentIndex || 0}
🔄 模式: ${cdFlag ? 'CD模式' : '普通模式'}
💰 初始积分: ${initRewardPoint || '未设置'}
📝 热词缓存: ${wordList ? '有缓存' : '无缓存'}
🎯 最大搜索次数: ${max_rewards}
🧭 覆盖最大值: ${maxOverride || '无'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    console.log(status);
    alert(status);
}, 's');

// 生成随机字符串，用于模拟不同的搜索请求参数
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        // 从字符集中随机选择字符，并拼接到结果字符串中
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// 获取当前的积分数量（异步版本，等待滚动动画完成）
async function getRewardPoint() {
    try {
        // 等待积分滚动动画完成并获取稳定值
        const waitForStablePoints = (element, maxAttempts = 10, stabilityDelay = 300) => {
            return new Promise((resolve) => {
                let attempts = 0;
                let lastValue = null;
                let stableCount = 0;
                const requiredStableCount = 3; // 需要连续3次获取相同值才认为稳定

                const checkStability = () => {
                    attempts++;
                    const text = element.textContent.trim();
                    const cleanText = text.replace(/[^\d]/g, '');
                    const currentValue = parseInt(cleanText, 10);

                    console.log(`积分检查第${attempts}次: "${text}" -> ${currentValue}`);

                    if (currentValue === lastValue && !isNaN(currentValue)) {
                        stableCount++;
                        console.log(`积分值稳定计数: ${stableCount}/${requiredStableCount}`);

                        if (stableCount >= requiredStableCount) {
                            console.log(`积分值已稳定: ${currentValue}`);
                            resolve(currentValue);
                            return;
                        }
                    } else {
                        stableCount = 0; // 重置稳定计数
                    }

                    lastValue = currentValue;

                    if (attempts >= maxAttempts) {
                        console.warn(`达到最大尝试次数，返回最后获取的值: ${currentValue}`);
                        resolve(isNaN(currentValue) ? -1 : currentValue);
                        return;
                    }

                    setTimeout(checkStability, stabilityDelay);
                };

                checkStability();
            });
        };

        // 等待元素加载
        const waitForElement = (selector, timeout = 5000) => {
            return new Promise((resolve) => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }

                const observer = new MutationObserver((mutations, obs) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        obs.disconnect();
                        resolve(element);
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    resolve(null);
                }, timeout);
            });
        };

        const element = document.querySelector('.points-container[data-tag="RewardsHeader.Counter"]');

        if (!element) {
            console.warn('未找到积分容器元素 .points-container[data-tag="RewardsHeader.Counter"]');

            // 尝试更多备选选择器
            const selectors = [
                '.points-container',
                '[data-tag*="RewardsHeader"]',
            ];

            let fallbackElement = null;
            for (const selector of selectors) {
                fallbackElement = document.querySelector(selector);
                if (fallbackElement && fallbackElement.textContent.trim()) {
                    console.log(`使用备选选择器: ${selector}`);
                    break;
                }
            }

            if (!fallbackElement) {
                console.warn('所有备选选择器都未找到有效元素');
                return -1;
            }

            // 对备选元素也使用稳定值检测
            return await waitForStablePoints(fallbackElement);
        }

        // 对主要元素使用稳定值检测
        return await waitForStablePoints(element);

    } catch (error) {
        console.error('获取积分时发生错误:', error);
        return -1;
    }
}

function generateSleepMap(n){
    let arr = new Set();
    while (arr.size < 3) {
        arr.add(Math.floor(Math.random() * (n + 1)));
    }
    return Array.from(arr);
}

// 创建悬浮窗容器
function createFloatDiv() {
    let parentDiv = document.getElementById('rewards-float-div');
    if (!parentDiv) {
        parentDiv = document.createElement('div');
        parentDiv.id = 'rewards-float-div';
        parentDiv.style.position = 'fixed';
        parentDiv.style.top = '100px';
        parentDiv.style.right = '30px';
        parentDiv.style.zIndex = '9999';
        parentDiv.style.background = 'rgba(0,0,0,0.8)';
        parentDiv.style.color = '#fff';
        parentDiv.style.padding = '15px 20px';
        parentDiv.style.borderRadius = '10px';
        parentDiv.style.fontSize = '14px';
        parentDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        parentDiv.style.pointerEvents = 'none';
        parentDiv.style.fontFamily = 'Arial, sans-serif';
        parentDiv.style.lineHeight = '1.5';
        parentDiv.style.minWidth = '200px';
        document.body.appendChild(parentDiv);
    }
    return parentDiv;
}

// 更新悬浮窗内容
function updateFloatDiv(mode, currentIndex, maxRewards, sleepTime, earnedPoints) {
    let parentDiv = createFloatDiv();

    // 获取之前的休眠时间值（如果存在）
    let previousSleepTime = null;
    const existingSleepElement = parentDiv.querySelector('.sleep-time');
    if (existingSleepElement) {
        previousSleepTime = existingSleepElement.textContent;
    }

    // 如果没有提供新的睡眠时间或传入null，且存在之前的值，则使用之前的值
    if ((sleepTime === null || sleepTime === undefined || sleepTime === '') && previousSleepTime) {
        console.log(`继承之前的休眠时间: ${previousSleepTime}`);
        sleepTime = previousSleepTime;
    }

    // 如果仍然没有睡眠时间，设置默认值
    if (!sleepTime) {
        sleepTime = '等待中...';
    }

    // Clear existing content safely
    while (parentDiv.firstChild) {
        parentDiv.removeChild(parentDiv.firstChild);
    }

    // Create elements safely without innerHTML
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.marginBottom = '8px';
    titleDiv.style.color = '#4CAF50';
    titleDiv.textContent = '🎯 Bing Rewards 自动脚本';

    const modeDiv = document.createElement('div');
    modeDiv.style.display = 'flex';
    modeDiv.style.justifyContent = 'space-between';
    const modeLabel = document.createElement('span');
    modeLabel.textContent = '📊 模式:';
    const modeValue = document.createElement('span');
    modeValue.style.color = '#FFD700';
    modeValue.textContent = mode;
    modeDiv.appendChild(modeLabel);
    modeDiv.appendChild(modeValue);

    const progressDiv = document.createElement('div');
    progressDiv.style.display = 'flex';
    progressDiv.style.justifyContent = 'space-between';
    const progressLabel = document.createElement('span');
    progressLabel.textContent = '📈 进度:';
    const progressValue = document.createElement('span');
    progressValue.style.color = '#87CEEB';
    progressValue.textContent = `${currentIndex} / ${maxRewards}`;
    progressDiv.appendChild(progressLabel);
    progressDiv.appendChild(progressValue);

    const sleepDiv = document.createElement('div');
    sleepDiv.style.display = 'flex';
    sleepDiv.style.justifyContent = 'space-between';
    const sleepLabel = document.createElement('span');
    sleepLabel.textContent = '⏰ 休眠:';
    const sleepValue = document.createElement('span');
    sleepValue.style.color = '#FFA500';
    sleepValue.className = 'sleep-time';
    sleepValue.textContent = sleepTime;
    sleepDiv.appendChild(sleepLabel);
    sleepDiv.appendChild(sleepValue);

    const pointsDiv = document.createElement('div');
    pointsDiv.style.display = 'flex';
    pointsDiv.style.justifyContent = 'space-between';
    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = '💰 已获得:';
    const pointsValue = document.createElement('span');
    pointsValue.style.color = '#90EE90';
    pointsValue.textContent = `${earnedPoints || 0} 分`;
    pointsDiv.appendChild(pointsLabel);
    pointsDiv.appendChild(pointsValue);

    // Append all elements
    parentDiv.appendChild(titleDiv);
    parentDiv.appendChild(modeDiv);
    parentDiv.appendChild(progressDiv);
    parentDiv.appendChild(sleepDiv);
    parentDiv.appendChild(pointsDiv);
}

function exec(){
    let randomDelay = (Math.floor(Math.random() * 25) + 5) * 1000;
    let randomForm = generateRandomString(4);
    let sleepMap = generateSleepMap(max_rewards);
    let randomCvid = generateRandomString(32);

    'use strict';
    if(GM_getValue('currentIndex') == null) {
        GM_setValue('currentIndex', 0)
    }

    let currentIndex = GM_getValue('currentIndex');
    let cdFlag = GM_getValue('cd') ? GM_getValue('cd') : 0;


    // 检查是否存在异常的currentIndex值
    if (currentIndex > max_rewards + 10) { // 如果currentIndex异常大，可能是之前的bug或停止命令
        console.warn(`检测到异常的currentIndex值: ${currentIndex}，可能是停止状态或异常，跳过执行`);
        return;
    }

    // 添加调试信息
    console.log(`exec() 执行 - currentIndex: ${currentIndex}, cdFlag: ${cdFlag}, max_rewards: ${max_rewards}`);

    function smoothScrollToBottom() {
        document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    let init_reward_point = GM_getValue('initRewardPoint');
    console.log(`当前模式：${cdFlag ? 'CD模式' : '普通模式'}`); // 添加调试信息

    // 初始化悬浮窗
    let modeText = cdFlag ? 'CD模式' : '普通模式';
    // 支持通过 GM_setValue('maxRewardsOverride', n) 覆盖默认最大值（用于 Start_X2）
    const overrideMax = GM_getValue('maxRewardsOverride');
    let baseMax = cdFlag ? (max_rewards - 5) : max_rewards;
    let maxRewardsForMode = (overrideMax !== null && overrideMax !== undefined && overrideMax !== '') ? Number(overrideMax) : baseMax;
    if (isNaN(maxRewardsForMode) || maxRewardsForMode <= 0) {
        maxRewardsForMode = baseMax;
    }
    console.log(`exec() 使用的 maxRewardsForMode: ${maxRewardsForMode} (override: ${overrideMax})`);

    // 检查是否已经完成所有搜索
    if (currentIndex > maxRewardsForMode) {
        console.log('已完成所有搜索，停止执行');
        updateFloatDiv(modeText, currentIndex, maxRewardsForMode, '已完成', 0);
        return;
    }
    updateFloatDiv(modeText, currentIndex, maxRewardsForMode, '初始化中...', 0);

    // 延迟获取当前积分，确保页面加载完成
    const initializePoints = () => {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            const attemptInterval = 1000;

            const tryGetPoints = async () => {
                attempts++;
                try {
                    let current_reward_point = await getRewardPoint();

                    if (current_reward_point !== -1) {
                        // 如果没有有效的初始积分，或者初始积分为null，则重新设置
                        if (!init_reward_point || init_reward_point === null || init_reward_point === -1) {
                            init_reward_point = current_reward_point;
                            GM_setValue('initRewardPoint', init_reward_point);
                            console.log(`重新设置初始分值为：${init_reward_point}`);
                        }

                        let diff = current_reward_point - init_reward_point;
                        if (diff < 0) diff = 0;
                        console.log(`初始分值为：${init_reward_point}， 当前分值为：${current_reward_point}，当前已挣得${diff};`);

                        // 更新悬浮窗显示获得的积分
                        let sleepTimeText = currentIndex === 0 ? '准备开始...' : null; // 非首次时继承之前的休眠时间
                        updateFloatDiv(modeText, currentIndex, maxRewardsForMode, sleepTimeText, diff);
                        resolve(init_reward_point);
                    } else if (attempts < maxAttempts) {
                        console.log(`第 ${attempts} 次尝试获取积分失败，${attemptInterval}ms 后重试`);
                        setTimeout(tryGetPoints, attemptInterval);
                    } else {
                        console.warn('多次尝试后仍无法获取积分，继续执行');
                        let sleepTimeText = currentIndex === 0 ? '准备开始...' : null; // 非首次时继承之前的休眠时间
                        updateFloatDiv(modeText, currentIndex, maxRewardsForMode, sleepTimeText, 0);
                        resolve(init_reward_point || 0);
                    }
                } catch (error) {
                    console.error(`第 ${attempts} 次获取积分时发生错误:`, error);
                    if (attempts < maxAttempts) {
                        setTimeout(tryGetPoints, attemptInterval);
                    } else {
                        resolve(init_reward_point || 0);
                    }
                }
            };

            tryGetPoints();
        });
    };

    // 等待初始化完成后再执行主逻辑
    initializePoints().then(async (initializedPoints) => {
        // 更新init_reward_point到正确的值
        init_reward_point = initializedPoints || init_reward_point || 0;
        cdFlag ? await cdProcess() : await commonProcess();
    });

    // 从这里返回，不再执行底部的逻辑
    return;

    async function commonProcess(){
        if (currentIndex < maxRewardsForMode){ // 使用可能的 override 限制
            let tabTitle = document.getElementsByTagName("title")[0];
            smoothScrollToBottom();
            GM_setValue('currentIndex', currentIndex + 1);

            // 获取当前积分差值
            let current_reward_point = await getRewardPoint();
            let diff = current_reward_point - init_reward_point;
            if (diff < 0) diff = 0; // 防止负数

            // 立即更新标题和悬浮窗显示当前状态
            if (sleepMap.includes(currentIndex)) {
                tabTitle.innerHTML = `[开始休眠：${currentIndex} / ${maxRewardsForMode}] ${tabTitle.innerHTML}`;
                updateFloatDiv('普通模式', currentIndex, maxRewardsForMode, `${pause_time} 分钟`, diff);
            } else {
                tabTitle.innerHTML = `[${currentIndex} / ${maxRewardsForMode}] ${tabTitle.innerHTML}`;
                updateFloatDiv('普通模式', currentIndex, maxRewardsForMode, `${Math.round(randomDelay / 1000)} 秒`, diff);
            }

            setTimeout(function(){
                // 检查是否有可用的搜索词
                if (!search_words || search_words.length === 0) {
                    console.error('没有可用的搜索词');
                    return;
                }
                let randomIndex = Math.floor(Math.random() * search_words.length);
                let current_hot = search_words[randomIndex];
                if (sleepMap.includes(currentIndex)) {
                    setTimeout(function(){
                        location.href = "https://www.bing.com/search?q=" + encodeURI(current_hot) + "&form=" + randomForm + "&cvid=" + randomCvid;
                    }, pause_time * 1000 * 60);
                } else {
                    location.href = "https://www.bing.com/search?q=" + encodeURI(current_hot) + "&form=" + randomForm + "&cvid=" + randomCvid;
                }
            }, randomDelay)
        } else {
            GM_setValue('word_list', null);
        }
    }

    async function cdProcess(){
        // cd 模式的基准最大值为当前使用的 maxRewardsForMode - 5
        let max_rewards_cd = Math.max(0, maxRewardsForMode - 5);
        if(currentIndex < max_rewards_cd){ // 使用可能的 override 限制
            let tabTitle = document.getElementsByTagName("title")[0];
            smoothScrollToBottom();
            GM_setValue('currentIndex', currentIndex + 1);

            // 获取当前积分差值
            let current_reward_point = await getRewardPoint();
            let diff = current_reward_point - init_reward_point;
            if (diff < 0) diff = 0; // 防止负数

            // 立即更新标题和悬浮窗显示当前状态
            if((currentIndex - 1) % 3 === 0 && currentIndex > 1){
                tabTitle.innerHTML = `[cd mode: ${currentIndex} - 开始休眠CD] ${tabTitle.innerHTML}`;
                updateFloatDiv('CD模式', currentIndex, max_rewards_cd, `${pause_time * 8} 分钟`, diff);
            } else {
                tabTitle.innerHTML = `[cd mode: ${currentIndex} / ${max_rewards_cd}] ${tabTitle.innerHTML}`;
                updateFloatDiv('CD模式', currentIndex, max_rewards_cd, `${Math.round(randomDelay / 1000)} 秒`, diff);
            }

            setTimeout(function(){
                // 检查是否有可用的搜索词
                if (!search_words || search_words.length === 0) {
                    console.error('没有可用的搜索词');
                    return;
                }
                let randomIndex = Math.floor(Math.random() * search_words.length);
                let current_hot = search_words[randomIndex];
                if((currentIndex - 1) % 3 === 0 && currentIndex > 1){
                    setTimeout(function(){
                        location.href = "https://www.bing.com/search?q=" + encodeURI(current_hot) + "&form=" + randomForm + "&cvid=" + randomCvid;
                    }, pause_time * 1000 * 60 * 8)
                } else {
                    location.href = "https://www.bing.com/search?q=" + encodeURI(current_hot) + "&form=" + randomForm + "&cvid=" + randomCvid;
                }
            }, randomDelay)
        } else {
            GM_setValue('word_list', null);
            GM_setValue('cd', 0);
        }
    }

}