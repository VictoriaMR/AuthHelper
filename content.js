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
						_this.margin_top = window.outerHeight - window.innerHeight;
						chrome.runtime.sendMessage({action: 'setCache', cache_key: 'margin_top', value: _this.margin_top});
					}
					_this.windowX = Math.ceil(window.screenX) + 8;//窗口位置x
					_this.windowY = Math.ceil(window.screenY);//窗口位置y
					console.log(_this.windowX, _this.windowY, '窗口位置')
					_this.getDomain();
					_this.getExtid();
					//初始化刷新时间 后台设置一个刷新页面定时器, 页面正常进入时重新启动定时器刷新页面.
					chrome.runtime.sendMessage({action: 'flush_start'});
					//是登录页面
					if (_this.isLoginPage()) {
						//获取自动助手中储存的账号数据
						let configData = localStorage.getItem('local_set_account');
						//输入账号密码登录
						if (configData) {
							_this.start(function(){
								_this.login(JSON.parse(configData), 1);
							});
						}
					} else {
						_this.isVerifyPage(function(res, type) {
							if (res) {
								//拖动认证
								_this.start(function(){
									_this.doVerify(type);
								});
							} else {
								// console.log('结束认证')
								_this.stop();
							}
						});
					}
				});
			}
		});
	},
	//获取目标元素的x,y,w,h 数值
	getRect: function(id, callback) {
		const _this = this;
		const timeId = _this.waitTime(function(){
			let obj = document.querySelector(id);
			if (obj) {
				_this.clearTime(timeId);
				const rect = obj.getBoundingClientRect();
				const x = Math.ceil(rect.left) + _this.windowX;
				const y = Math.ceil(rect.top) + _this.margin_top + _this.windowY;
				const w = Math.ceil(rect.width);
				const h = Math.ceil(rect.height);
				callback({x:x, y:y, w:w, h:h});
			}
		});
	},
	//请求方法
	request: function(callback) {
		this.param.extid = this.extid;
		chrome.runtime.sendMessage({action: 'request_py', param: this.param}, function(res) {
			if (callback) {
				callback(res);
			}
		});
	},
	//请求开始方法,类似获取唯一锁, 成功获取时执行回调方法
	start: function(callback) {
		const _this = this;
		_this.param = {action: 'start'};
		let startReturn = true;
		let sliderReturn = true;
		const timeId = _this.waitTime(function(){
			_this.request(function(res){
				if (res.code === 0) {
					//页面缓存启动认证状态
					chrome.runtime.sendMessage({action:'setCache', cache_key:'verify_status', value:'1'});
					_this.clearTime(timeId);
					callback();
				}
			});
		}, 4000, true);
	},
	//释放锁方法, 页面正常进入时调用一次
	stop: function(callback) {
		//是否发送完成验证
		const _this = this;
		chrome.runtime.sendMessage({action: 'getCache', cache_key: 'verify_status'}, function(res) {
			if (res.data && res.data === '1') {
				_this.param = {extid:_this.extid, action:'end'};
				_this.request(function(res){
					chrome.runtime.sendMessage({action: 'setCache', cache_key: 'verify_status', value: '0'});
				});
			}
		});
	},
	//输入方法 
	input: function(callback) {
		this.param['action'] = 'input';
		this.request(callback);
	},
	click: function(callback) {
		this.param['action'] = 'click';
		this.request(callback);
	},
	//页面刷新方法
	flush: function(callback) {
		this.param = {action:'flush', x:this.windowX + 82, y:this.windowY + 50};
		if (Math.random()*5 >= 2) {
			this.param.nc = 1;
		}
		this.request(callback);
	},
	//滑动方法
	slider: function(callback) {
		this.param['action'] = 'slider';
		this.request(callback);
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
	waitTime: function(callback, time, noStop){
		const _this = this;
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
		for (let i=0; i<len; ++i) {
			str += arr[Math.round(Math.random()*(arr.length-1))];
		}
		return str;
	},
	//获取domain
	getDomain: function() {
		const host = location.host.split('.');
		const len = host.length;
		this.domain = host[len-2]+'.'+host[len-1];
		return this.domain;
	},
	isLoginPage: function() {
		return location.href.indexOf('login') >= 0;
	},
	isVerifyPage: function(callback) {
		const _this = this;
		let timeId;
		switch(_this.domain) {
			case '1688.com':
				//等待页面加载完毕
				timeId = _this.waitTime(function(){
					const title = document.querySelector('title');
					if (title && title.innerText) {
						_this.clearTime(timeId);
						if (title.innerText === '验证码拦截') {
							callback(true, 1);
						} else {
							// 正常页面内继续检测验证弹窗
							timeId = _this.waitTime(function(){
								const obj = document.querySelector('.sufei-dialog-jquery');
								if (obj && obj.style.display === 'block') {
									//todo 认证弹窗的区分, 是登录 | 滚动条认证
									_this.clearTime(timeId);
									callback(true, 2);
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
						//todo 认证弹窗的区分, 是登录 | 滚动条认证
						_this.clearTime(timeId);
						callback(true, 2);
					}
				});
				break;
			default:
				callback(false);
				break;
		}
	},
	//页面输入登录
	login: function(config, type) {
		const _this = this;
		switch (_this.domain) {
			case 'taobao.com':
				// 获取名称输入框位置
				_this.getRect('#fm-login-id', function(rect) {
					_this.param = {
						x: rect.x + rect.w - 20,
						y: rect.y + 20,
						value: config.account,
					}
					//输入账号
					_this.input(function(res){
						if (res.code === 0) {
							//输入密码
							_this.getRect('#fm-login-password', function(rect) {
								_this.param = {
									x: rect.x + rect.w - 20,
									y: rect.y + 20,
									value: config.password,
								}
								//输入密码
								_this.input(function(res){
									if (res.code === 0) {
										_this.getRect('.password-login', function(rect) {
											_this.param = {
												x: rect.x + rect.w / 2,
												y: rect.y + 20,
											}
											_this.click();
										});
										//点击登录
									}
								});
							});
						}
					});
				});
				break;
		}
	},
	doVerify: function(type) {
		const _this = this;
		let timeId;
		switch(_this.domain) {
			case '1688.com':
				//循环等待页面加载完成
				if (type === 2) {
					_this.doVerify2();
				} else {
					_this.doVerify1();
				}
				return false;

				timeId = _this.waitTime(function(){
					if ((document.getElementById('nc_1_n1z') && document.getElementById('nc_1__scale_text')) || document.getElementById('sufei-dialog-content')) {
						_this.clearTime(timeId);
						_this.verifyCount = 0;
						if (type === 2) {
							_this.doVerify2();
						} else {
							_this.doVerify1();
						}
					}
				});
				break;
			case 'taobao.com':
				_this.doVerify2();
				break;
		}
	},
	//页面向右下调整, 露出拖动条界面
	toScrollDown: function () {
		const body = document.querySelector('body');
		body.scrollLeft = body.scrollWidth;
		body.scrollTop = body.scrollHeight;
	},
	doVerify1: function() {
		const _this = this;
		//页面滚动到最右下
		_this.toScrollDown();
		//滑块位置, 宽高
		console.log('doVerify1')
		let x = y = sliderW = 0;
		_this.getRect('#nc_1__scale_text', function(rect){
			console.log(rect, 'res')
			const x = rect.x;
			const y = rect.y;
			const sliderW = rect.w;
			let sliderReturn = true;
			let count = 0;
			const stopCount = Math.random()*10 + 6;

			const sliderTimeId = _this.waitTime(function() {
				if (sliderReturn) {
					count ++;
					if (count > stopCount) {
						_this.clearTime(sliderTimeId);
						_this.flush();
						return;
					}
					sliderReturn = false;
					console.log(document.querySelector('#nocaptcha .errloading a'))
					if (document.querySelector('#nocaptcha .errloading a')) {
						_this.getRect('#nocaptcha .errloading a', function(res){
							_this.param = {x: res.x + 10, y: res.y+10};
							_this.click(function(){
								if (res.code === 0) {
									_this.param = {x:x + 5 + Math.random()*32, y:y + 5 + Math.random()*24, w: sliderW};
									_this.slider(function(){
										sliderReturn = true;
									});
								} else {
									sliderReturn = true;
								}
							});
						});
					} else {
						console.log(x, x + 5 + Math.random()*32)
						_this.param = {x: x + 5 + Math.random()*32, y: y + 5 + Math.random()*24, w: sliderW};
						console.log(_this.param)
						_this.slider(function(){
							sliderReturn = true;
						});
					}
				}
			}, Math.random()*2000 + Math.random()*2000 + 1450, true);
		});
	},
	doVerify2: function() {
		const _this = this;
		//计算滚动条在页面位置
		const x = window.innerWidth / 2 - 210 + _this.windowX + 36 ;
		const y = window.innerHeight / 2 - 160 + _this.windowY + _this.margin_top + 195;
		let sliderReturn = true;
		const sliderW = 300;
		let count = 0;
		const stopCount = Math.random()*10 + 6;

		//循环拖动, 嵌入式页面无发验证是否拖动成功, 只能每次循环之前判断弹窗是否还存在
		const sliderTimeId = _this.waitTime(function() {
			if (sliderReturn) {
				count ++;
				if (count > stopCount) {
					_this.clearTime(sliderTimeId);
					return;
				}
				_this.isVerifyPage(function(res){
					if (res) {
						sliderReturn = false;
						_this.param = {x:x + 151, y: y + 15};
						_this.click(function(res){
							_this.param = {x:x + 192, y: y + 20};
							_this.click(function(res){
								if (res.code === 0) {
									_this.param = {x:x + 5 + Math.random()*32, y:y + 5 + Math.random()*24, w: sliderW};
									_this.slider(function(){
										sliderReturn = true;
									});
								} else {
									sliderReturn = true;
								}
							});
						})
					} else {
						_this.clearTime(sliderTimeId);
					}
				});
			}
		}, Math.random()*2000 + Math.random()*2000 + 1450, true);
	}
};
//初始化入口
MAIN.init()