$(function(){
	const bg = chrome.extension.getBackgroundPage();
	bg.listener_event({action: 'getCache', cache_key: 'kaiguan_switch_status'}, function(res){
		let status = '0';
		if (res.data === '1') {
			status = '1';
		}
		initSwitch(status);
	});
	//获取缓存初始化数据
	$('#time-content input').each(function(){
		const obj = $(this);
		const name = this.name;
		bg.listener_event({action: 'getCache', cache_key: name}, function(res){
			if (res.data) {
				obj.val(res.data)
			} else {
				//获取上边距
				const value = obj.val();
				if (value !== '') {
					bg.listener_event({action: 'setCache', cache_key: name, value: value});
				}
			}
		});
	});
	//开关点击
	$('#kaiguan-switch').on('click', function(){
		let status = '0';
		if ($(this).hasClass('open')) {
			$(this).removeClass('open').addClass('close').find('.switch-s').removeClass('open').addClass('close');
		} else {
			status = '1';
			$(this).removeClass('close').addClass('open').find('.switch-s').removeClass('close').addClass('open');
		}
		if (status === '1') {
			bg.listener_event({action: 'flush_start'});
		} else {
			bg.listener_event({action: 'flush_stop'});
		}
		initSwitch(status, function(){
			chrome.tabs.reload();
		});
	});
	function initSwitch(status, callback) {
		const obj = $('#kaiguan-switch');
		if (status === '1') {
			obj.removeClass('close').addClass('open').find('.switch-s').removeClass('close').addClass('open');
			$('#time-content').show();
		} else {
			obj.removeClass('open').addClass('close').find('.switch-s').removeClass('open').addClass('close');
			$('#time-content').hide();
		}
		bg.listener_event({action: 'setCache', cache_key: 'kaiguan_switch_status', value: status}, function(){
			if (callback) {
				callback();
			}
		});
	}
	//确认按钮点击
	$('#time-content .btn').on('click', function(){
		$('#time-content input').each(function(){
			//设置缓存 重启定时器
			const name = this.name
			bg.listener_event({action: 'setCache', cache_key: name, value: $(this).val()}, function(){
				if (name === 'fluse_time') {
					//重启定时器
					bg.listener_event({action: 'flush_start'});
				}
			});
		});
	});
});