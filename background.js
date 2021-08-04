console.log('自动认证工作中...')
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        listener_event(request, sendResponse);
        return true;
    }
);
function listener_event(request, sendResponse) {
    switch (request.action) {
        case 'getCache': //获取缓存
            sendResponse({data: localStorage.getItem(request.cache_key)});
            break;
        case 'setCache':
            localStorage.setItem(request.cache_key, request.value);
            if (sendResponse) {
                sendResponse({data: true});
            }
            break;
        case 'delCache':
            localStorage.removeItem(request.cache_key);
            if (sendResponse) {
                sendResponse({data: true});
            }
            break;
        case 'flush_start':
            FLUSHTIME.start(localStorage.getItem('time_flush'));
            break;
        case 'flush_stop':
            FLUSHTIME.stop();
            break;
        case 'clearCookie':
            const name = 'atpsida,tbsa,sca,xlly_s,isg,cna,l,tfstk,cna'.split(',');
            for (let i=0;i<name.length;i++) {
                chrome.cookies.remove({url: request.value, name: name[i]});
            }
            setTimeout(function(){
                sendResponse();
            }, 300);
            break;
        case 'request_py':
            getApi(localStorage.getItem('request_url'), request.param, sendResponse);
            break;
    }
    return true;
}
function getApi(url, param, callback) {
    $.ajax({
        url: url,
        data: param,
        type: 'POST',
        dataType: 'json',
        success: function(res) {
            if (callback) {
                callback(res);
            }
        },
        error: function (jqXHR) {
            if (callback) {
                callback({code: -1, data: false, msg: '请求失败, 请和管理人员联系'});
            }
        }
    });
}
const FLUSHTIME = {
    start: function(time) {
        if (!time) {
            time = 60;
        }
        console.log('定时刷新工作中...')
        FLUSHTIME.stop();
        FLUSHTIME.intervalTime = setInterval(function(){
            //url刷新页面
            chrome.tabs.query({}, function(tabArray){
                if (tabArray[0] && tabArray[0].id) {
                    chrome.tabs.reload(tabArray[0].id);
                }
            });
        }, time * 1000);
    },
    stop: function() {
        console.log('定时刷新已停止')
        clearInterval(FLUSHTIME.intervalTime);
    },
}