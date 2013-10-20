if (typeof NCI === 'undefined')
   NCI = {};

NCI.nciLatestValue = $('#nciLatestValue');
NCI.nepLatestValue = $('#nepLatestValue');
NCI.qpsLatestValue = $('#qpsLatestValue');

NCI.ifMobile = function(){
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
}

NCI.setNciLatestValue = function (newVal) {
	if (NCI.ifMobile ()) {
		NCI.nciLatestValue.html('<h4>' + newVal + ' <small> NCI </small></h4>');
	} else {
		NCI.nciLatestValue.html('<h2>' + newVal + ' <small> NCI </small></h2>');
	};
};

NCI.setNepLatestValue = function (newVal) {
	if (NCI.ifMobile ()) {
		NCI.nepLatestValue.html('<h6>' + newVal + ' <small>endpoints </small></h6>');
	} else {
		NCI.nepLatestValue.html('<h3>' + newVal + ' <small> endpoints </small></h3>');
	};
};

NCI.setQpsLatestValue = function (newVal) {
	if (NCI.ifMobile ()) {
		NCI.qpsLatestValue.html('<h6>' + newVal + ' <small> qps</small></h6>');
	} else {
		NCI.qpsLatestValue.html('<h3>' + newVal + ' <small>  qps</small></h3>');
	};
};

NCI.timePeriod = localStorage.timePeriod;

NCI.getChartData = function(){
    $.ajax({
        type: 'GET',
        url: '/chart',
        dataType: 'json',
		data: {
			timePeriod: NCI.timePeriod,
			updateInterval: NCI.updateInterval
		},
        success: function(data){
			//update ui
        },
        error: function(xhr, type){
			console.log('server log');
        }
    });
};

NCI.settingsPanel = (function(){
	var me =  $('#nciSettingsPanel');
	var saveBtn = me.find('#saveSettings');
	var collector = me.find('#collectorInput');
	var username = me.find('#usernameInput');
	var password = me.find('#passwordInput');
	var auth = me.find('#authOption');
	var makeDefault = me.find('#makeDefault');
	var alertBox = me.find('.alert-box');
	alertBox.css('visibility', 'hidden');
	
	collector.val(localStorage.collector);
	username.val(localStorage.username);
	password.val(localStorage.password);
	auth[0].checked = localStorage.auth;
	
	alertBox.on('click', '.close', function(){
		alertBox.css('visibility', 'hidden');
	});
	
	auth.on('change', function(){
		username.prop('disabled', auth[0].checked);
		password.prop('disabled', auth[0].checked);
	});
	
	var params = {};
	params.collector = collector.val();
	if (auth[0].checked){
		params.username = username.val();
		params.password = password.val();
	};
	
	saveBtn.on('click', function(){
		if (makeDefault[0].checked){
			localStorage.auth = auth[0].checked;
			localStorage.collector = collector.val();
			localStorage.username = username.val();
			localStorage.password = password.val();
		};
		alertBox.css('visibility', 'hidden');
        $.ajax({
            type: 'POST',
            url: '/auth',
            dataType: 'json',
			data: params,
            success: function(data){
				//update ui
            },
            error: function(xhr, type){
				alertBox.css('visibility', 'visible');
                alertBox.html('Server Error<a class="close">&times;</a>');
            }
        });
	});
	
	return me;
}());

NCI.infoBtn  = (function(){
	var me =  $('#nciInfoBtn');
	me.panel = $('#nciInfoPanel');
	return me;
}());		

NCI.settingsBtn = (function(){
	var me =  $('#nciSettingsBtn');
	me.panel = NCI.settingsPanel;
	return me;
}());

NCI.sideMenuBtns = [NCI.infoBtn, NCI.settingsBtn];
NCI.selectedItem;

$.each(NCI.sideMenuBtns, function(index, btn){
	// if (btn.hasClass('active'))
	// 	NCI.selectedItem = btn;
	
	btn.on('click', function(){
		if (NCI.selectedItem){
			if (NCI.selectedItem !== btn){
				NCI.selectedItem.removeClass('active');
				if (NCI.selectedItem.panel){
					NCI.selectedItem.panel.removeClass('show-menupanel');
					NCI.selectedItem.panel.addClass('hide-menupanel');
				};
		    };
		};
		NCI.selectedItem = btn;
		if (btn.hasClass('active')){
			btn.removeClass('active');
			if (btn.panel){
				btn.panel.addClass('hide-menupanel');
				btn.panel.removeClass('show-menupanel');
			}
		} else {
			if (btn.panel){
				btn.addClass('active');
				btn.panel.addClass('show-menupanel');
				btn.panel.removeClass('hide-menupanel');
			};
		};
	});
});	

NCI.periodLabel = $('#periodLabel');

NCI.slider = (function(){
	var me =  $('#slider');
	
	var timeRanges = {
		ranges: [59, 
		59 + 23, 
		59 + 23 + 31, 
		59 + 23 + 31 + 11, 
		59 + 23 + 31 + 11 + 10],
		rangeNames : ['min', 'hours', 'days', 'mnths', 'years']
	};
	var getValueByRange = function(intValue){
		var date, friquent;
		$.each(timeRanges.ranges, function(index, range){
			if (intValue < range){
				var periodData = intValue + 1;
				if ( index !== 0 ){
					periodData -= timeRanges.ranges[index - 1];
				};
				friquent = index === 0;
			    date = periodData + " " + timeRanges.rangeNames[index];
				return false;
		    };
		});
		return {date : date, friquent: friquent};
    };
	
	me.on('change', function(){
		NCI.periodLabel.html("<small> data for last </small> " + getValueByRange(parseInt(me[0].value)).date)
	});
	
	me.on('mouseup', function(){
		NCI.periodLabel.html("<small> data for last </small> " + getValueByRange(parseInt(me[0].value)).date)
	});

	return me;
}());	

