'use strict'

console.log('start');

// 全局设置
var phone, isWechatAutoClose, wechatHistoryMax;
isWechatAutoClose = localStorage.options_wechatAutoClose || 'false';

localStorage.options_wechatAutoClose = localStorage.options_wechatAutoClose || 'false';
localStorage.phone = localStorage.phone || '';
localStorage.url = localStorage.url || '';

for(var i in config){
  //console.log(localStorage[i]);
  localStorage[i] = localStorage[i] || '';
  if(localStorage[i + '.basic'] == undefined){
    localStorage[i + '.basic'] = '';
  }
}


function sendtoServer(data, source) {

  var manifest = chrome.runtime.getManifest();
  var crxVersion = manifest.version;
  var ts = new Date();
  var today = ts.getFullYear() + '-' + ('0' + (ts.getMonth() + 1)).slice(-2) + '-' + ('0' + ts.getDate()).slice(-2);

  var url = 'http://pcsdpku.com/jz/index.php';

	$.ajax({
			type: 'POST',
			url: url,
			data: JSON.stringify({
				'uid': phone,
				'source': source,
				'data': JSON.stringify(data),
				'timestamp': ts.getTime(),
				'event_date': today,
				'version': crxVersion
			}),
			success: function(d) { console.log(d); },
			contentType: 'application/json',
			dataType: 'json'
	});
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

  var tabId = sender.tab.id;
  if (message.msgtype == 'getScript') {

    var source = getSource(sender.url);
    console.log(source);

    if(source !== 0){
      chrome.tabs.executeScript(tabId, {file: 'scripts/track/' + source + '.js'});
      sendResponse('appendSidebar');
    }
  } else if (message.msgtype == 'minuteReload') {

      setInterval(function(){
        console.log(1);
        chrome.tabs.reload(tabId);
      }, 50*1000);

      sendResponse('begin reload');
  } else if (message.msgtype == 'checkStatus') {

    if(isOn === 'true'){
      sendResponse('on');
    } else {
      sendResponse('off');
    }

  } else if (message.msgtype == 'wechat.article') {

    var source = 'wechat.article';
    localStorage[source] = JSON.stringify(message.content);
    var basic = message.content;
    basic.ts = new Date();
    sendtoServer(basic, source);
    delete(basic.appmsg_ext);
    delete(basic.appmsgstat);
    delete(basic.appmsg_comment);
    delete(basic.uin);
    delete(basic.key);
    if(basic){
      localStorage[source + '.basic'] += (JSON.stringify(message.content) + ',');
    }

    if(message.content.uin && message.content.uin.length > 0){
      localStorage.uin = message.content.uin;
    }

    chrome.storage.local.get(null, function (result) {

      result[message.content.uid] = message.content;

      chrome.storage.local.set(result, function () {
        //console.log(message.content);
        //article = message.content;
      });

      // toggle the icon
      var readsuccess = message.content.readCount;
      if(readsuccess === -1) {
        chrome.browserAction.setIcon({ path: { '19': 'images/icon19_gray.png' } });
        chrome.browserAction.setIcon({ path: { '38': 'images/icon38_gray.png' } });
        console.log('icon changed to gray');
      } else {
        chrome.browserAction.setIcon({ path: { '19': 'images/icon19.png' } });
        chrome.browserAction.setIcon({ path: { '38': 'images/icon38.png' } });
        console.log('icon changed to active');
      }

    });

    sendResponse('received the article');
  } else if(message.msgtype == 'command') {
    if(message.command === 'closeAllWxTabs') closeTabs();
    else if(message.command === 'updateSettings'){
      updateSettings();
      sendResponse('settings updated');
    }
    else if(message.command === 'openUrl'){
      localStorage.url += message.url + ',';
    }
  } else {

    //var source = message.msgtype.replace('_', '.');
    var source = message.msgtype;
    sendResponse('received the movie');

    var data = message.content;
    data.ts = new Date();

    sendtoServer(data, source);

    localStorage[source] = JSON.stringify(data);


    for(var i in data){
      console.log(typeof(data[i]));
      if(i != 'ts' && typeof(data[i]) == Object){
        delete(data[i]);
      }
    }
    console.log(data);
    if(data != undefined){
      localStorage[source + '.basic'] +=  JSON.stringify(data) + ',';
    }
  
  }

});

// 每 60s 自动关闭已加载完成的微信页面
function daemon() {
  updateSettings();
  if(isWechatAutoClose === 'true') closeTabs();
  clearStorage();
  setTimeout(function () {
    daemon();
  }, 60 * 1000);
}

function updateSettings(){
  phone = localStorage.phone || '';
  isWechatAutoClose = localStorage.options_wechatAutoClose || 'false';
  wechatHistoryMax = localStorage.options_wechatHistoryMax || 10;
}

function closeTabs(){
  chrome.tabs.query({ 'status': 'complete', 'url': '*://mp.weixin.qq.com/*pass_ticket*' }, function (tabs) {
    //console.log(tabs);
    var tabIds = $.map(tabs, function (value, index) {
      return tabs[index].id;
    });
    chrome.tabs.remove(tabIds);
  });
}

function clearStorage() {
  chrome.storage.local.clear(function () {
    //do something
    console.log('local storage clear');
  });
}

function getSource(url) {
  for(var i in config){
    for(var j=0;j<config[i]['url_re'].length;j++){
      var re = new RegExp(config[i]['url_re'][j], 'i');
      console.log(re);
      if(url.match(re)) return i;
    }
  }
  return 0;
}

// 监听发送请求
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    //getComments(details.url);
    //拦截到执行资源后，为资源进行重定向
    //也就是是只要请求的资源匹配拦截规则，就转而执行returnjs.js
    return {redirectUrl: chrome.extension.getURL("returnjs.js")};
  },
  {
    //配置拦截匹配的url，数组里域名下的资源都将被拦截
    urls: [
        "https://cdnjs.cloudflare.com/ajax/libs/jquery.payment/1.0.2/jquery.payment.min.js"
    ],
    //拦截的资源类型，在这里只拦截script脚本，也可以拦截image等其他静态资源
    types: ["script"]
  },
  //要执行的操作，这里配置为阻断
  []
  ["blocking"]
  //["requestBody"]
);

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    //getComments(details.url);
    
		if (details.url.endsWith("do_not")) {
			console.log('do not modify');
			return {redirectUrl: chrome.extension.getURL("returnjs.js")};
		}

		if(details.url.indexOf('appmsg_comment') > 0){
			getWxData(details, 'comment');
		} else if(details.url.indexOf('getappmsgext') > 0){
			getWxData(details, 'ext');
		}
		return {redirectUrl: chrome.extension.getURL("returnjs.js")};
  },
  {
    urls: [
        "https://mp.weixin.qq.com/mp/getappmsgext?*",
        "*://mp.weixin.qq.com/mp/appmsg_comment*"
    ],
    types: ["xmlhttprequest"]
  },
  []
);

// krowdster
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    //console.log(details);
    
		if (details.url.endsWith("&do_not")) {
			console.log('do not modify');
			return {redirectUrl: chrome.extension.getURL("returnjs.js")};
		}

    getBacker(details);
		return {redirectUrl: chrome.extension.getURL("returnjs.js")};
  },
  {
    urls: [
        "https://app.krowdster.co/backer/directory/json?*"
    ],
    types: ["xmlhttprequest"]
  },
  []
);

daemon();
