const MAIN = {
	init: function() {
		const _this = this;
		//是否开启
		chrome.runtime.sendMessage({action: 'getCache', cache_key: 'kaiguan_switch_status'}, function(res){
			if (res.data === '1') {
				//获取页面边距
				chrome.runtime.sendMessage({action: 'getCache', cache_key: 'margin_top'}, function(res){
					if (res.data) {
						_this.margin_top = parseInt(res.data);
					} else {
						_this.margin_top = window.outerHeight - window.innerHeight - 10;
						chrome.runtime.sendMessage({action: 'setCache', cache_key: 'margin_top', value: _this.margin_top});
					}
					const domain = _this.getDomain();
					_this.getExtid();
					//初始化刷新时间
					chrome.runtime.sendMessage({action: 'flush_start'});
					_this.isVerifyPage(domain, function(res, type){
						if (res) {
							// console.log('开始认证')
							_this.windowX = Math.ceil(window.screenX) + 10;//窗口位置x
							_this.windowY = Math.ceil(window.screenY);//窗口位置y
							// console.log('windows', _this.windowX, _this.windowY)
							_this.doVerify(domain, type);
						} else {
							// console.log('结束认证')
							_this.sendToStop();
						}
					});
				});
			}
		});
	},
	//页面刷新方法
	flush: function(callback) {
		const param = {action:'flush', x:this.windowX + 82, y:this.windowY + 50};
		if (Math.random()*5 >= 2) {
			param.nc = 1;
		}
		chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res){
			if (res.code === 0 || res.code === '0') {
				if (callback) {
					callback();
				}
			}
		});
	},
	//滑动方法
	slider: function(param, callback) {
		chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res) {
			if (callback) {
				callback(res);
			}
		});
	},
	//发送停止方法
	sendToStop: function(){
		//是否发送完成验证
		const _this = this;
		chrome.runtime.sendMessage({action: 'getCache', cache_key: 'slider_status'}, function(res) {
			if (res.data && res.data === '1') {
				const param = {extid:_this.extid, action:'end'};
				chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res){
					chrome.runtime.sendMessage({action: 'setCache', cache_key: 'slider_status', value: '0'});
				});
			}
		});
	},
	//生成唯一ID
	getExtid: function(){
		const _this = this;
		chrome.runtime.sendMessage({action:'getCache', cache_key:'my_extid'}, function(res){
			if (res.data) {
				_this.extid = res.data
			} else {
				_this.extid = _this.createId(32);
				chrome.runtime.sendMessage({action:'setCache', cache_key:'my_extid', value: _this.extid});
			}
		});
	},
	//获取domain
	getDomain: function() {
		const host = location.host.split('.');
		const len = host.length;
		return host[len-2]+'.'+host[len-1];
	},
	isVerifyPage: function(domain, callback) {
		const _this = this;
		let timeId;
		switch(domain) {
			case '1688.com':
				//等待页面加载完毕
				timeId = _this.waitTime(function(){
					const title = document.querySelector('title');
					if (title && title.innerText) {
						_this.clearTime(timeId);
						if (title.innerText === '验证码拦截') {
							callback(true, 1);
						} else {
							callback(false);
							// 正常页面内继续检测验证弹窗
							timeId = _this.waitTime(function(){
								const tempObj = document.querySelector('.sufei-dialog-jquery');
								if (tempObj) {
									_this.clearTime(timeId);
									if (tempObj.style && tempObj.style.display === 'block') {
										callback(true, 2);
									}
								}
							}, 1000);
						}
					}
				});
				break
			case 'taobao.com':
				timeId = _this.waitTime(function(){
					const obj = document.querySelector('.baxia-dialog');
					if (obj && obj.style.display === 'block') {
						_this.clearTime(timeId);
						callback(true);
					}
				});
				break;
			default:
				callback(false);
				break;
		}
	},
	waitTime: function(callback, time, noStop){
		var _this = this;
		if (!time) {
			time = 500;
		}
		const id = _this.createId(32);
		let timeCount = 0;
		_this[id] = setInterval(function() {
			++timeCount;
			if (!noStop && timeCount > 10) {
				clearInterval(_this[id]);
			}
			if (callback) {
				callback();
			}
		}, time);
		return id;
	},
	clearTime: function(timeId) {
		return clearInterval(this[timeId]);
	},
	createId: function(len) {
        let arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        let str='';
        for(let i=0;i<len;++i){
            str+=arr[Math.round(Math.random()*(arr.length-1))];
        }
        return str;
    },
	doVerify: function(domain, type) {
		const _this = this;
		let timeId;
		switch(domain) {
			case '1688.com':
				//循环等待页面加载完成
				timeId = _this.waitTime(function(){
					if ((document.getElementById('nc_1_n1z') && document.getElementById('nc_1__scale_text')) || document.getElementById('sufei-dialog-content')) {
						_this.clearTime(timeId);
						_this.verifyCount = 0;
						if (type === 2) {
							_this.do1688Verify2();
						} else {
							_this.do1688Verify1();
						}
					}
				});
				break;
			case 'taobao.com':
				timeId = _this.waitTime(function() {
					const obj = document.querySelector('.baxia-dialog');
					if (obj && obj.style.display === 'block') {
						_this.clearTime(timeId);
						_this.verifyCount = 0;
						_this.do1688Verify2();
					}
				});
				break;
		}
	},
	toScrollDown: function () {
		const body = document.querySelector('body');
		const clientW = body.scrollWidth;
		const clientH = body.scrollHeight;
		body.scrollLeft = clientW;
		body.scrollTop = clientH;
	},
	do1688Verify1: function() {
		const _this = this;
		//页面滚动到最右下
		_this.toScrollDown();
		//滑块位置, 宽高
		const rect = document.getElementById('nc_1_n1z').getBoundingClientRect();
		const x = Math.ceil(rect.left) + _this.windowX;
		const y = Math.ceil(rect.top) + _this.margin_top + _this.windowY;
		const w = Math.ceil(rect.width);
		const h = Math.ceil(rect.height);
		//滑轨长度
		const sliderW = Math.ceil(document.getElementById('nc_1__scale_text').getBoundingClientRect().width);
		// console.log(x, y, w, h)
		//循环请求开始
		let param = {action: 'start', extid: _this.extid};
		let startReturn = true;
		let sliderReturn = true;
		const timeId = _this.waitTime(function(){
			if (startReturn) {
				startReturn = false;
				param.action = 'start';
				chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res) {
					if (res.code === 0 || res.code === '0') {
						startReturn = false;
						_this.clearTime(timeId);
						chrome.runtime.sendMessage({action:'setCache', cache_key:'slider_status', value:'1'});
						sliderTimeId = _this.waitTime(function() {
							if (sliderReturn) {
								sliderReturn = false;
								const fBtn = document.querySelector('#nocaptcha .errloading a');
								if (fBtn) {
									const fBtnRect = fBtn.getBoundingClientRect();
									param.x = Math.ceil(fBtnRect.left) + _this.windowX + 10;
									param.y = Math.ceil(fBtnRect.top) + _this.windowY + _this.margin_top + 3;
									param.action = 'click';
									chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res) {
										if (res.code === 0 || res.code === '0') {
											param.action = 'slider';
											param.x = x + Math.random()*(w - 10) + 5;
											param.y = y + Math.random()*(h - 10) + 5;
											param.w = sliderW -  w/2 + Math.random()*(100);
											_this.slider(param, function(res){
												sliderReturn = true;
												if (res.code === 0 || res.code === '0') {
													_this.verifyCount ++;
													if (_this.verifyCount > parseInt(Math.random()*5 + 3)) {
														_this.clearTime(sliderTimeId);
														_this.flush();
													}
												} else if (res.code === -4 || res.code === '-4') {
													_this.clearTime(sliderTimeId);
												}
											});
										}
									});
								} else {
									param.action = 'slider';
									param.x = x + Math.random()*(w - 10) + 5;
									param.y = y + Math.random()*(h - 10) + 5;
									param.w = sliderW -  w/2 + Math.random()*(100);
									_this.slider(param, function(res){
										sliderReturn = true;
										if (res.code === 0 || res.code === '0') {
											_this.verifyCount ++;
											if (_this.verifyCount > parseInt(Math.random()*5 + 3)) {
												_this.clearTime(sliderTimeId);
												_this.flush();
											}
										} else if (res.code === -4 || res.code === '-4') {
											_this.clearTime(sliderTimeId);
										}
									});
								}
							}
						}, Math.random()*2000 + Math.random()*2000 + 1450, true);
					} else {
						startReturn = true;
					}
				});
			}
		}, 4000, true);
	},
	do1688Verify2: function() {
		const _this = this;
		const x = window.innerWidth / 2 - 210 + _this.windowX + 50;
		const y = window.innerHeight / 2 - 160 + _this.windowY + _this.margin_top + 200;
		const w = 30;
		const h = 20;
		const cx = x + 151;
		const cy = y + 15;
		const sliderW = 300;
		let startReturn = true;
		let sliderReturn = true;

		let param = {action: 'start', extid: _this.extid};
		const timeId = _this.waitTime(function(){
			if (startReturn) {
				startReturn = false;
				param.action = 'start';
				chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res) {
					if (res.code === 0 || res.code === '0') {
						startReturn = false;
						_this.clearTime(timeId);
						chrome.runtime.sendMessage({action:'setCache', cache_key:'slider_status', value:'1'});
						sliderTimeId = _this.waitTime(function() {
							if (sliderReturn) {
								sliderReturn = false;
								param.x = cx;
								param.y = cy;
								param.action = 'click';
								chrome.runtime.sendMessage({action: 'request_py', param: param}, function(res) {
									if (res.code === 0 || res.code === '0') {
										param.action = 'slider';
										param.x = x + Math.random()*(w - 10) + 5;
										param.y = y + Math.random()*(h - 10) + 5;
										param.w = sliderW -  w/2 + Math.random()*(100);
										_this.slider(param, function(res){
											sliderReturn = true;
											if (res.code === 0 || res.code === '0') {
												_this.verifyCount ++;
												if (_this.verifyCount > parseInt(Math.random()*5 + 3)) {
													_this.clearTime(sliderTimeId);
													_this.flush();
												}
											} else if (res.code === -4 || res.code === '-4') {
												_this.clearTime(sliderTimeId);
											}
										});
									}
								});
							}
						}, Math.random()*2000 + Math.random()*2000 + 1450, true);
					} else {
						startReturn = true;
					}
				});
			}
		}, 4000, true);
	}
};
//初始化入口
MAIN.init()