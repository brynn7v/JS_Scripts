// ==UserScript==
// @name         Bing Rewards每日脚本
// @namespace    http://tampermonkey.net/
// @version      2.7
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
// @downloadURL  https://github.com/brynn7v/JS_Scripts/blob/main/Bing_Rewards/bing_rewards.user.js
// @updateURL    https://raw.githubusercontent.com/brynn7v/JS_Scripts/blob/main/Bing_Rewards/bing_rewards.user.js
// ==/UserScript==

const max_rewards = 35;
const pause_time = 2;
const API = "http://8.134.117.11:8000/api/hot";
// const API = "https://bing.by-fire.top/api/hot"

let search_words = []

let keywords_source = ['baidu_hot', 'zhihu_hot', 'weibo_hot', 'hot_news', 'toutiao_hot', 'bing_hot'];
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
                    console.error('数据解析失败:', e.message);
                    alert('API数据格式异常，请检查接口');
                    // 使用缓存数据或默认关键词作为备选
                    if (gm_word_list.length > 0) {
                        search_words = gm_word_list;
                        console.log('使用缓存数据作为备选');
                        if (callback) callback();
                    }
                }
            },
            onerror: function(error) {
                console.error('API请求失败:', error.message);
                alert('无法连接到热点数据接口');
                // 使用缓存数据作为备选
                if (gm_word_list.length > 0) {
                    search_words = gm_word_list;
                    console.log('API失败，使用缓存数据');
                    if (callback) callback();
                } else {
                    // 如果没有缓存，使用默认关键词
                    search_words = ['新闻', '科技', '体育', '娱乐', '财经'];
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
let startMenu = GM_registerMenuCommand('Start', function(){
    GM_setValue('currentIndex', 0);
    GM_setValue('cd', 0); // 确保清除CD标志
    // 清除之前的初始积分缓存，强制重新获取
    GM_setValue('initRewardPoint', null);
    let init_reward_point = getRewardPoint();
    if(init_reward_point !== -1){
        GM_setValue('initRewardPoint', init_reward_point);
        console.log('Start - 重新设置初始分值为：', init_reward_point)
    } else {
        console.log('Start - 无法获取当前积分，将在页面加载后重新尝试');
    }
    location.href = 'https://www.bing.com/?br_msg=Please-Wait';
}, 'o');

// 开始CD模式搜索（间隔更长时间）
let startCDMenu = GM_registerMenuCommand('Start_CD', function(){
    GM_setValue('currentIndex', 0);
    GM_setValue('cd', 1);
    // 清除之前的初始积分缓存，强制重新获取
    GM_setValue('initRewardPoint', null);
    let init_reward_point = getRewardPoint();
    if(init_reward_point !== -1){
        GM_setValue('initRewardPoint', init_reward_point);
        console.log('Start_CD - 重新设置初始分值为：', init_reward_point)
    } else {
        console.log('Start_CD - 无法获取当前积分，将在页面加载后重新尝试');
    }
    location.href = 'https://www.bing.com/?br_msg=Please-Wait';
}, 'c');

// 停止搜索
let stopMenu = GM_registerMenuCommand('Stop', function(){
    GM_setValue('currentIndex', max_rewards + 10);
    GM_setValue('cd', 0);
    GM_setValue('word_list', null);
}, 'x');

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

// 获取当前的积分数量
function getRewardPoint() {
    const element = document.querySelector('.points-container[data-tag="RewardsHeader.Counter"]');

    if (!element) {
        console.warn('未找到积分容器元素 .points-container[data-tag="RewardsHeader.Counter"]');
        // 作为备选，尝试只使用 class
        const fallbackElement = document.querySelector('.points-container');
        if (!fallbackElement) {
            console.warn('备选选择器 .points-container 也未找到');
            return -1;
        }
        console.log('使用备选选择器 .points-container');
        const fallbackText = fallbackElement.textContent.trim();
        const fallbackNum = parseInt(fallbackText, 10);
        if (!isNaN(fallbackNum)) {
            console.log(`备选方式解析得到积分: ${fallbackNum}`);
            return fallbackNum;
        }
        return -1;
    }

    const text = element.textContent.trim();
    console.log(`积分元素文本内容: "${text}"`);

    // 解析数字，去除可能的空白字符
    const num = parseInt(text.replace(/\s+/g, ''), 10);

    if (isNaN(num)) {
        console.warn(`无法将 "${text}" 转换为整数`);
        return -1;
    }

    console.log(`解析得到积分: ${num}`);
    return num;
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
    parentDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">🎯 Bing Rewards 自动脚本</div>
        <div>📊 模式: <span style="color: #FFD700;">${mode}</span></div>
        <div>📈 进度: <span style="color: #87CEEB;">${currentIndex} / ${maxRewards}</span></div>
        <div>⏰ 休眠: <span style="color: #FFA500;">${sleepTime}</span></div>
        <div>💰 已获得: <span style="color: #90EE90;">${earnedPoints || 0} 分</span></div>
    `;
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

    function smoothScrollToBottom() {
        document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    let init_reward_point = GM_getValue('initRewardPoint');
    console.log(`当前模式：${cdFlag ? 'CD模式' : '普通模式'}`);  // 添加调试信息
    
    // 初始化悬浮窗
    let modeText = cdFlag ? 'CD模式' : '普通模式';
    let maxRewardsForMode = cdFlag ? (max_rewards - 5) : max_rewards;
    updateFloatDiv(modeText, currentIndex, maxRewardsForMode, '初始化中...', 0);
    
    // 延迟获取当前积分，确保页面加载完成
    setTimeout(function() {
        let current_reward_point = getRewardPoint();
        
        // 如果没有有效的初始积分，或者初始积分为null，则重新设置
        if (!init_reward_point || init_reward_point === null || init_reward_point === -1) {
            init_reward_point = current_reward_point;
            GM_setValue('initRewardPoint', init_reward_point);
            console.log(`重新设置初始分值为：${init_reward_point}`);
        }
        
        let diff = current_reward_point - init_reward_point;
        console.log(`初始分值为：${init_reward_point}， 当前分值为：${current_reward_point}，当前已挣得${diff};`);

        // 更新悬浮窗显示获得的积分
        let sleepTimeText = currentIndex === 0 ? '准备开始...' : document.querySelector('#rewards-float-div span[style*="#FFA500"]')?.textContent || '未知';
        updateFloatDiv(modeText, currentIndex, maxRewardsForMode, sleepTimeText, diff);
    }, 2000);

    function commonProcess(){
        if (currentIndex <= max_rewards){
            let tabTitle = document.getElementsByTagName("title")[0];
            smoothScrollToBottom();
            GM_setValue('currentIndex', currentIndex + 1);

            // 获取当前积分差值
            let current_reward_point = getRewardPoint();
            let diff = current_reward_point - init_reward_point;
            if (diff < 0) diff = 0; // 防止负数

            // 立即更新标题和悬浮窗显示当前状态
            if (sleepMap.includes(currentIndex)) {
                tabTitle.innerHTML = `[开始休眠：${currentIndex} / ${max_rewards}] ${tabTitle.innerHTML}`;
                updateFloatDiv('普通模式', currentIndex, max_rewards, `${pause_time} 分钟`, diff);
            } else {
                tabTitle.innerHTML = `[${currentIndex} / ${max_rewards}] ${tabTitle.innerHTML}`;
                updateFloatDiv('普通模式', currentIndex, max_rewards, `${Math.round(randomDelay / 1000)} 秒`, diff);
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

    function cdProcess(){
        let max_rewards_cd = max_rewards - 5;
        if(currentIndex <= max_rewards_cd){
            let tabTitle = document.getElementsByTagName("title")[0];
            smoothScrollToBottom();
            GM_setValue('currentIndex', currentIndex + 1);
            
            // 获取当前积分差值
            let current_reward_point = getRewardPoint();
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

    cdFlag ? cdProcess() : commonProcess()

}