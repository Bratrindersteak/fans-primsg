/**
 *	粉丝社区V1.4 私信H5页面改版 吴鹏 2017-07-17
 *
 *	依赖: Sea.js Bone.js Zepto.js fox工具库 pgc工具库
 *
 *	功能:
 *
 *		1. 页面初始化加载私信列表.
 *
 *			多贴 (点击跳转);
 *			单贴 (点击跳转);
 *			文字 (完全展示不折行);
 *			图片 (点击查看大图);
 *			视频 (点击拉起客户端播放视频).
 *
 *		2. 页面上拉加载最新十条数据:
 *
 *			多贴 (点击跳转);
 *			单贴 (点击跳转);
 *			文字 (完全展示不折行);
 *			图片 (点击查看大图);
 *			视频 (点击拉起客户端播放视频).
 *
 *		3. 实时交互.
 *
 *			实时消息，过滤无关消息后展示（文字、图片）.
 *			自动回复消息（帖子、文字、图片、视频）.
 *
 *		4. 发送私信:
 *
 *			文字 (完全展示不折行);
 *			图片 (调起系统相册并显示上传进度).
 *
 *		5. 兼容旧帖子接口数据格式.
 *
 *		6. 页面统计.
 *
 *			PV.
 *			发送图片按钮点击.
 *
**/

define('privateMessage', function(require, exports, module) {

	// 依赖引入====================================================================================================
	var vars = require('base/vars');
    var util = require('base/util');
    var url = require('base/url');
    var action = require('base/action');
    var scroll = require('base/scroll');
	var tracePv = require('trace/pv');
	var traceClick = require('trace/click');
	var upload = require('upload');
	var tip = require('tip');
	var env = require('env');
	var message = require('message');
    var iscrollZoom = require('iscroll-zoom');

	// 常量声明====================================================================================================
	var UA = vars.UA.toLowerCase();	// 获取浏览器信息(小写).
	var WINDOW_HEIGHT = vars.ScreenSize.split('x')[1]; // 设备可视高度.
    var URL = window.location.href; // URL.
    var URL_HOST = window.location.host; // URL host.
    var LOCATION_PROTOCOL = document.location.protocol; // URL协议.
    var TO_UID = url.getParam('otherUid'); // 对方uid.
    var SCROLL_DISTANCE = -200; // 上拉加载页面触发距离.
    var SIZE = 10;	// "我的私信——详情列表"接口 单次请求数据量.
    var SHOW_DELAY = 0; // 页面加载展示延时.
    var NICK_NAME = '私信会话页'; // 私信页面title默认名称.
    var CURRENT_YEAR = new Date().getFullYear(); // 当前年份.
    var CURRENT_DATE = new Date().getDate(); // 当前日期.

	// 变量声明====================================================================================================
	var devMode = false; //是否是开发模式，上线需要设置为false.
    var haveMoreData = true;	// "我的私信——详情列表"接口是否还有更多数据.
    var isFirstLoad = true; // 是否首次加载私信会话列表.
    var listEmpty = false; // 私信会话列表是否为空.
    var time = 0;	// 页面初始化获取客户端提供的用户信息次数.
    var page = 1;	// "我的私信——详情列表"接口 页码数.
	var userInfo = {};	// app提供的用户信息.
    var messageTime = []; // 私信时间条-时分值数组.
	var nickname = ''; // 私信页面title.
    var picScroll; // 展示大图声明.
    var myScroll = new IScroll('#wrapper', { // 私信列表初始化.
        hScrollbar:false,
        vScrollbar:false,
        checkDOMChanges: true
    });
    var deleteAllView;
    var selfPicUrl;
    var toPicUrl;
    
	// DOM声明====================================================================================================
	var $window = $(window);
	var $document = $(document);
	var $wrapper = $('#wrapper');
	var $messageList = $('#messageList');
	var $contentInput = $('#contentInput');
	var $displayLayer = $('#displayLayer');
	var $bottomModule = $('#bottomModule');
	var $sendBox = $('#sendBox');
	var $menuBox = $('#menuBox');
	var $uploadPic = $('#uploadPic');
	var $trashAll = $('#trashAll');
	var $loading = $('#loading');
	var $sendTemplate = $('#sendTemplate');
	var $listTemplate = $('#listTemplate');
	var $menuTemplate = $('#menuTemplate');
	var $alphaLayer = $('#alphaLayer');
	var $popupBox = $('#popupBox');

	// 接口环境配置====================================================================================================
	var hosts = {
        myHost: vars.PROTOCOL + 'my.tv.sohu.com',
        apiHost: vars.API_URL,
        realTimeRouter: vars.PROTOCOL + 'my.tv.sohu.com/user/private/api/router.do', // 实时通信接口.
        userUrl: vars.H5_URL + 'upload/clientapp/pgc/'
    };

    if (/my\.test\.56\.com|my\.test\.sohu\.com|127\.0\.0\.1|localhost/.test(URL_HOST) || LOCATION_PROTOCOL === 'file:') {
        hosts.myHost = vars.PROTOCOL + 'my.test.sohu.com/pxy2';
        hosts.apiHost = vars.PROTOCOL + 'dev.app.yule.sohu.com/';
        hosts.userUrl = vars.H5_TEST_URL + 'upload/clientapp/pgc/';

        devMode = true;
    } else if (/t\.m\.tv\.sohu\.com|mobile\.m\.56\.com/i.test(URL_HOST)) {
        hosts.myHost = vars.PROTOCOL + '10.16.14.184';
        hosts.apiHost = vars.PROTOCOL + 'dev.app.yule.sohu.com/';
        hosts.userUrl = vars.H5_TEST_URL + 'upload/clientapp/pgc/';
    }

    // 接口列表配置====================================================================================================
    var config = {
        apiUrls: {
        	producerInfo: hosts.apiHost + 'v4/user/info/' + TO_UID + '.json',
         	privateMessage: hosts.myHost + "/user/a/message/"
        },
        query: {
        	valid: 0,
			to_uid: TO_UID,
			size: SIZE
        },
        address: {
            privateletterListV2: 'privateletter_list_v2.do', // 个人中心——私信列表v2
            updateReadall: 'update_readall.do', // 个人中心——私信一键已读（v2新增2017-05-26）
            detailPrivateLetterV2: 'detail_privateletter_v2.do', // 我的私信——详情列表--v2（20170607）
            privateletterUserinfoV2: 'privateletter_userinfo_v2.do', // 我的私信–根据uid获取用户信息（v2 20170607添加）
            sendPrivateLetter: 'send_privateletter.do', // 我的私信——发送私信
            deleteLetterOneV3: 'delete_letter_one_v3.do', // 个人中心——私信删除一条（v3新增2017-07-20，pc和h5都用）
            deleteLettersDoubleV3: 'delete_lettersdouble_v3.do' // 个人中心——私信删除两者之间的全部私信（v3新增2017-07-20，pc和h5都用）
        },
        apiKey: {
            api_key: vars.API_KEY
        }
    };
    
    // common function====================================================================================================
    Function.prototype.addMethod = function(name, func) {
        this.prototype[name] = func;
        return this;
    };
    
    var Check = new Function();
    var check = new Check();
    
    Check.addMethod('checkDigit', function(value) { // 单个数字补零方法(用于时间日期等不足两位数时补0占位).
        
        if (value.toString().length === 1) {
            value = '0' + value;
        }
        
        return value;
    });
    
    // models====================================================================================================
    var ProducerInfo = Bone.Model.extend({ // 获取出品人信息.
        initialize: function(attr, options) {
            options = options || attr || {};

            this.url = options.apiUrls.producerInfo;
            this.urlData = options.apiKey;
            this.fetch();
        },
        parse: function(response, options) {

            if (response && response.status === 200) {

                if (response.data.nickname) {
                    nickname = response.data.nickname;
                } else {
                    nickname = NICK_NAME;
                }
            } else {
                nickname = NICK_NAME;
            }

            env.setPageTitle(nickname); // 添加客户端内H5页面title.
        }
    });

    var ListMessageModel = Bone.Model.extend({ // 获取 '我的私信——详情列表' 接口数据.
        initialize: function(attr, options) {
            options = options || attr || {};

            this.url = options.apiUrls.privateMessage + options.address.detailPrivateLetterV2;
            this.urlData = _.pick(options.query, ['valid', 'to_uid', 'passport', 'token', 'gid', 'size']);
        },
        parse: function(response, options) {
            var self = this;

            if (!response) {
                return;
            }

            if (response.status === 200) {
                self.attributes.data = response.data.reverse();
            }

            self.trigger('response', response);
        }
    });

    var SendMessageModel = Bone.Model.extend({ // 发送私信.
        initialize: function(attr, options) {
            options = options || attr || {};

            this.url = options.apiUrls.privateMessage + options.address.sendPrivateLetter;
            this.urlData = _.pick(options.query, ['valid', 'to_uid', 'passport', 'token', 'gid']);
        },
        parse: function(response, options) {
            var self = this;

            if (!response) {
                return;
            }

            if (response.status === 200) {
                self.attributes.data = response.data;
                self.trigger('response', response.data);
            } else {
                self.trigger('response', response);
            }
        }
    });
    
    var DeleteSingleModel = Bone.Model.extend({ // 删除单条私信.
        initialize: function(attr, options) {
            options = options || attr || {};
            
            this.url = options.apiUrls.privateMessage + options.address.deleteLetterOneV3;
            this.urlData = _.pick(options.query, ['valid', 'to_uid', 'passport', 'token', 'gid']);
        },
        parse: function(response, options) {
            var self = this;
            
            if (!response) {
                return;
            }
            
            self.trigger('response', response);
        }
    });
    
    var TrashAllModel = Bone.Model.extend({ // 清空聊天记录.
        initialize: function(attr, options) {
            options = options || attr || {};
            
            this.url = options.apiUrls.privateMessage + options.address.deleteLettersDoubleV3;
            this.urlData = _.pick(options.query, ['valid', 'to_uid', 'passport', 'token', 'gid']);
        },
        parse: function(response, options) {
            var self = this;
            
            if (!response) {
                return;
            }
            
            self.trigger('response', response);
        }
    });
    
    // views====================================================================================================
    var ListTemplateView = Bone.View.extend({ // 私信列表标签视图.
        template: Handlebars.compile($listTemplate.html()),
        initialize: function() {
            this.listenTo(this.model, 'response', this.render);
        },
        render: function() {
            var template = this.getTemplate();
            var html = Bone.Renderer.render(template, this.model);

            return html;
        }
    });
    
    var MenuView = Bone.View.extend({ // 菜单栏标签视图.
        tagName: 'ul',
        className: 'service',
        template: Handlebars.compile($menuTemplate.html()),
        initialize: function() {
            this.listenTo(this.model, 'response', this.render);
        },
        render: function() {
            var template = this.getTemplate();
            var html = Bone.Renderer.render(template, this.model);

            this.$el.html(html);

            return this;
        }
    });
    
	var ListView = Bone.View.extend({ // 私信列表视图.
		el: $messageList,
        events: {
            // 'longTap .content': 'deleteMessage', // 删除单条私信.
		    'touchstart .text .content a': 'touchStartLink', // 触碰文字私信链接.
            'touchend .text .content a': 'touchEndLink', // 触碰文字私信链接.
            'tap .picture .content .image': 'tapPicture', // 点击图片帖子.
            'tap .video .content': 'tapVideo' // 点击视频帖子.
        },
        initialize: function() {
		    var self = this;
		    
            this.listenTo(this.model, 'response', this.render);
            this.scrollList();

            // if (window.localStorage && localStorage.getItem('primsg-to_uid:' + TO_UID)) {
            //     var data = util.JSONParse(localStorage.getItem('primsg-to_uid:' + TO_UID));
            //
            //     this.render(data);
            //     page = 2;
            //
            //     return;
            // }

            this.model.urlData.page = page;
            this.model.fetch({
                success: function(model, response, options) {

                    if (response.status === 200 && response.data.length === SIZE) {
                        page = page + 1;
    
                        selfPicUrl = response.self.selfPic;
                        toPicUrl = response.touser.toPic;
                        
                        var listMsg = {
                            data: response.data,
                            self: response.self,
                            touser: response.touser
                        };

                        if (window.localStorage && !localStorage.getItem('primsg-to_uid:' + response.touser.toUid)) {
                            localStorage.setItem('primsg-to_uid:' + response.touser.toUid, util.JSONStringify(listMsg));
                        }
                    } else {
                        haveMoreData = false;
                    }
                }
            });
            
            this.modelCopy = new ListMessageModel(config);
            this.modelCopy.urlData.page = 1;
            this.modelCopy.fetch({
                success: function(model, response, options) {
                    
                    if (response.status === 200 && response.touser) {
                        self.menu(response.touser);
                    }
                }
            });
        },
        render: function(data) {
            var self = this;
            
            if (!data.data.length) {
                self.$el.removeClass('list-loading');
                listEmpty = true;
                
                return;
            }
            
            self.listTemplateView = new ListTemplateView({
                model: data
            });
            self.$el.prepend(self.listTemplateView.render());
            
            if (self.$el.find('.picture')) {
                self.checkPic(data.data);
                
                return;
            }
            
            if (isFirstLoad) {
                self.firstLoad();
            } else {
                self.onceAgainLoad(data.data);
            }
        },
        menu: function(data) {
            this.menuView = new MenuView({
                model: data
            });
            
            $trashAll.before(this.menuView.render().el);
        },
        scrollList: function() {
		    var self = this;

            myScroll.on('scrollStart', function () {

                if (this.y === this.maxScrollY && this.distY > 0) {
                    $contentInput.blur();
                }
            });

            myScroll.on('scrollEnd', function () {

                if (this.y >= SCROLL_DISTANCE && this.distY > 0 && haveMoreData) {
                    self.loadingStart();
                    self.model.urlData.page = page;
                    self.model.fetch({
                        success: function(model, response, options) {

                            if (response.status === 200 && response.data.length === SIZE) {
                                page = page + 1;
                            } else {
                                haveMoreData = false;
                            }
                            
                            if (!response.data.length) {
                                self.loadingFinish();
                            }
                        }
                    });
                }
            });
        },
        deleteMessage: function(event) {
            deleteView.dom = event.currentTarget;
            deleteView.render();
        },
        touchStartLink: function(event) {
            $(event.currentTarget).addClass('highlight');
        },
        touchEndLink: function(event) {
            $(event.currentTarget).removeClass('highlight');
        },
        checkPic: function(data) {
            var self = this;
            var data = data;
            
            this.$el.find('.picture .content img').each(function() {
                $(this).on('load', function() {
                    var width = $(this).width();
                    var height = $(this).height();
                    
                    if ((height / width) > 2) {
                        $(this).width('auto').height(150);
                    }
                });
                
            });
            
            var unfinishedTimer = setInterval(function() {
                var imgLoadArr = [];
    
                self.$el.find('.picture .content img').each(function() {
                    imgLoadArr.push( this.complete );
                });
                
                if (!_.contains(imgLoadArr, false)) {

                    if (isFirstLoad) {
                        self.firstLoad();
                    } else {
                        self.onceAgainLoad(data);
                    }

                    clearInterval(unfinishedTimer);
                }
            }, 50);
        },
        tapPicture: function(event) {
		    var src = $(event.currentTarget).find('img').attr('src');

		    this.displayLayerView = new DisplayLayerView({
                model: src
            });
        },
        tapVideo: function() {
            var $video = this.$el.find('.video .content');
            var option = {
                action: '1.1',
                type: 'click',
                cid: $video.data('cid') || '',
                vid: $video.data('vid') || '',
                site: 2,
                channeled: '1000140002',
                more:{
                    sourcedata: {channeled: '1000140002'}
                }
            };

            if (vars.IsIOS) { // 拉起客户端播放视频.
                window.location.href = action.makeActionUrl(option);
            } else {
                action.sendAction(option);
            }
        },
        firstLoad: function() {
		    var self = this;
            var firstLoadTimer = setTimeout(function() {
                myScroll.refresh();
                myScroll.scrollToElement(document.querySelector('#messageList .message-box:last-child'), 100, null, null);
                self.$el.removeClass('list-loading');
            }, SHOW_DELAY);
            
            isFirstLoad = false;
        },
        onceAgainLoad: function(data) {
		    var self = this;
		    var index = data.length + 1;
            var onceAgainLoadTimer = setTimeout(function() {
                myScroll.refresh();
                myScroll.scrollToElement(document.querySelector('#messageList .message-box:nth-child(' + index + ')'), 100, null, null);
                self.loadingFinish();
            }, SHOW_DELAY);
            
        },
        loadingStart: function() {
            $wrapper.css('top', '0.76rem');
            $loading.removeClass('transparent');
        },
        loadingFinish: function() {
            $loading.addClass('transparent');
            $wrapper.css('top', '0');
        }
    });

    var SendTemplateView = Bone.View.extend({ // 发送私信标签视图.
        tagName: 'li',
        className: 'message-box',
        template: Handlebars.compile($sendTemplate.html()),
        initialize: function() {
            this.listenTo(this.model, 'response', this.render);
        },
        render: function() {
            var template = this.getTemplate();
            var html = Bone.Renderer.render(template, this.model);

            this.$el.html(html);

            return this;
        }
    });
    
    var SendView = Bone.View.extend({ // 私信列表视图.
        el: $bottomModule,
        events: {
            'tap .to-menu': 'toMenu', // 切换至菜单.
            'tap .to-send': 'toSend', // 切换至输入框.
            'focus #contentInput': 'writing', // 输入框键盘事件.
            'keyup #contentInput': 'sendText', // 输入框键盘事件.
            'change #uploadPic': 'uploadPic', // 点击传图按钮.
            'tap #trashAll': 'trashAll' // 清空聊天记录.
        },
        initialize: function() {
            this.listenTo(this.model, 'response', this.render);
        },
        render: function(data) {
            var self = this;

            if (data.status && data.status != 200) {
                self.errorHint(data.status);

                return;
            }

            self.sendTemplateView = new SendTemplateView({
                model: data
            });

            $messageList.append(self.sendTemplateView.render().el);
            
            if (/^<img/.test(data.content)) {
                self.checkPic();

                return;
            }
            
            var sendTimer = setTimeout(function() {
                myScroll.refresh();
                myScroll.scrollToElement(document.querySelector('#messageList .message-box:last-child'), 100, null, null);
            }, SHOW_DELAY);
        },
        toMenu: function(event) {
            $bottomModule.addClass('cover');
            
            $sendBox.animate({
                top: '1.12rem'
            }, 150, 'linear');
            
            $menuBox.animate({
                top: '0.1rem'
            }, 150, 'linear', function() {
                $bottomModule.removeClass('cover');
            });
        },
        toSend: function() {
            $bottomModule.addClass('cover');
            
            $menuBox.animate({
                top: '1.12rem'
            }, 150, 'linear');
    
            $sendBox.animate({
                top: '0.1rem'
            }, 150, 'linear', function() {
                $bottomModule.removeClass('cover');
            });
        },
        writing: function(event) {
            var keyBoardTimer = setTimeout(function() { // H5页面弹出软键盘遮挡输入框.
                event.target.scrollIntoViewIfNeeded();
            }, 200);
            
            if (!listEmpty) {
                myScroll.scrollToElement(document.querySelector('#messageList .message-box:last-child'), 100, null, null);
            }
        },
        sendText: function(event) {

            if (event.keyCode !== 13) { // 判断是否按回车键.
                return;
            }

            if (!$contentInput.val()) { // 判断输入框内容是否为空.
                return;
            }

            this.model.urlData.content = $contentInput.val();
            this.model.urlData.content_type = 2;
            this.model.fetch();

            $contentInput.val('');
		},
        uploadPic: function() {
            var self = this;
            var DOM = $uploadPic.get(0);

            if (typeof DOM !== 'undefined' && !$.isUndefined(DOM.files)) {
                upload.uploadImg(DOM, config.query, function(data) {

                    if (data.status != 200) {
                        tip.showTip('上传失败!', 1000);
                        $uploadPic.val('');

                        return;
                    }

                    self.model.urlData.content = env.fixImgHttp(data.data.img);
                    self.model.urlData.content_type = 3;
                    self.model.fetch();

                    $uploadPic.val('');
                }, devMode);
            }

            this.traceClick();
        },
        checkPic: function() {
            $messageList.children('.message-box:last-child').find('.picture .content img').on('load', function() {
                var self = this;
                var width = $(self).width();
                var height = $(self).height();
                
                if ((height / width) > 2) {
                    $(self).width('auto').height(150);
                }
    
                myScroll.refresh();
                myScroll.scrollToElement(document.querySelector('#messageList .message-box:last-child'), 100, null, null);
            });
        },
        errorHint: function(data) {
            var msg = '';

            switch (data) {
                case 1:
                    msg = '未绑定手机号';
                    break;
                case 2:
                    msg = '接收方不存在';
                    break;
                case 3:
                    msg = '发送次数超标';
                    break;
                case 4:
                    msg = '验证码不对';
                    break;
                case 5:
                    msg = '被对方加入了黑名单';
                    break;
                case 6:
                    msg = '只有粉丝才能发送';
                    break;
                case 7:
                    msg = '敏感内容';
                    break;
                case 8:
                    msg = '空内容';
                    break;
                case 9:
                    msg = '发送失败';
                    break;
                case 31:
                    msg = '自己不能给自己发私信';
                    break;
                case 101:
                    msg = '参数错误';
                    break;
                case 117:
                    msg = '没有登录';
                    break;
                case 500:
                    msg = '系统错误';
                    break;
                default:
                    msg = '发送失败';
            }

            tip.showTip(msg, 1000);
        },
        traceClick: function() {
            traceClick.pingback(null, 'sx_chatu_click', {
                remark: '私信页-发送图片'
            },function(){});
        },
        trashAll: function() {
            deleteAllView.render();
        }
    });

    var DisplayLayerView = Bone.View.extend({ // 展示大图视图.
        el: $displayLayer,
        events: {
            'singleTap': 'close',
            'doubleTap': 'zoom'
        },
        initialize: function() {
            this.$el.find('img').attr('src', this.model);
            this.$el.show();
            this.open();
        },
        open: function() {
            var self = this;
            var openTimer = setTimeout(function() {
                var img = self.$el.find('img');
                var height = img.height();

                if (height >= WINDOW_HEIGHT) {
                    img.removeClass('wide').addClass('long');
                    img.css({
                        'margin-left': '-' + img.width() / 2 + 'px'
                    });
                } else {
                    img.removeClass('long').addClass('wide');
                    img.css({
                        'margin-top': '-' + img.height() / 2 + 'px'
                    });
                }

                img.removeClass('reset');
            }, SHOW_DELAY);

            picScroll = new IScroll('#displayLayer', { // 私信展示大图初始化.
                zoom: true,
                zoomStart: 1,
                scrollX: true,
                scrollY: true,
                mouseWheel: true,
                wheelAction: 'zoom',
                click: true
            });
        },
        zoom: function(event) {
            alert( 'dblclick' );
            event.preventDefault();
        },
        close: function() {
            picScroll.destroy();

            this.$el.hide();
            this.$el.find('img').removeClass('long').addClass('wide reset').css({
                'margin-top': '0px',
                'margin-left': '0px'
            });
        }
    });
    
    var DeleteView = Bone.View.extend({ // 删除弹窗视图.
        el: $popupBox,
        events: {
            'tap .button': 'handle',
            'click .confirm': 'confirm'
        },
        render: function() {
            this.$el.addClass('display');
            $alphaLayer.show();
        },
        handle: function() {
            this.$el.removeClass('display');
            $alphaLayer.hide();
        },
        confirm: function() {
            this.model.fetch({
                success: function(model, response, options) {
                    
                    if (response.status === 200) {
                        window.history.go(0);
                    }
                }
            });
        }
    });

    // presents====================================================================================================
    var Presents = Bone.Object.extend({
        initialize: function (config) {
            var self = this;

            this.producerInfo = new ProducerInfo(config);

            this.listMessageModel = new ListMessageModel(config);
            this.listView = new ListView({
                model: this.listMessageModel
            });

            this.sendMessageModel = new SendMessageModel(config);
            this.sendView = new SendView({
                model: this.sendMessageModel
            });

            this.realTimeMessage = new dolphin.MyMessage({
                router: hosts.realTimeRouter,
                channel: '/p/',
                message: self.onMessage,
                error: self.onError,
                passport: config.query.passport,
                token: config.query.token
            });
            
            this.realTimeMessage.start();
            
            this.trashAllModel = new TrashAllModel(config);
            deleteAllView = new DeleteView({
                model: this.trashAllModel
            });
            
            // alert( util.JSONStringify(window.localStorage) );
            // alert( util.JSONStringify(window.sessionStorage) );
            // window.localStorage.removeItem('primsg-to_uid:297839464');
        },
        onMessage: function(data) {
            console.log( data );
        },
        onError: function(data) {
            console.log( data );
        }
    });

// application====================================================================================================
    var WebApp = Bone.Application.extend({
        initialize: function(options) {
            this.getClientInfo(options); // 页面初始化获取客户端提供的用户信息.
            this.sendPV(); // 发送PV统计.
        },
        getClientInfo: function(options) {

            if (devMode) {
                config.query.passport = 'A811C575533EB5EF758B212321B1AFCC@qq.sohu.com';
                config.query.token = '03d2dd4d3b723fdc91f32d1dee7707d1';
                config.query.uid = '6FBF1C2E-1B6B-45EB-81A2-F70D82FA6EC6';
                config.query.gid = '0101011074100058879da55caf2674b74b4706815b7c77';
                config.query.plat = '3';
                config.query.sver = '6.6';
                
                $.extend(config, options || {});
                this.presents = new Presents(config);

                return;
            }

            var appInfoTimer = setInterval(function() {

                if (window.SohuAppPrivates) {
                    userInfo = util.JSONParse(window.SohuAppPrivates);
                    
                    config.query.passport = userInfo.passport;
                    config.query.token = userInfo.token;
                    config.query.uid = userInfo.uid;
                    config.query.gid = userInfo.gid;
                    config.query.plat = userInfo.plat;
                    config.query.sver = userInfo.sver;
                    
                    $.extend(config, options || {});
                    this.presents = new Presents(config);

                    clearInterval(appInfoTimer);
                } else {
                    time += 1;

                    if (time > 50) {
                        tip.showTip('无法获取用户信息', 1000);
                        clearInterval(appInfoTimer);
                    }
                }
            }, 50);
        },
        sendPV: function() {
            tracePv.pv();
        }
    });

	// exports====================================================================================================
    module.exports = {
        init: function (params) {
            var app = new WebApp(params);
            
            app.start(params);
        }
    };

    // helper====================================================================================================
    Handlebars.registerHelper('sender', function (value) { // 判断私信发送方.
    	var sender = '';

        if (value != TO_UID) {
            sender = ' mein';
        }

        return sender;
    });

    Handlebars.registerHelper('messageType', function (value) { // 判断私信消息类型.
    	var messageType;

        if (value == 1) {
            messageType = 'topic';
        } else if (value == 2) {
            messageType = 'text clear';
		} else if (value == 3) {
            messageType = 'picture clear';
        } else if (value == 4) {
            messageType = 'video clear';
        } else if (value == 5) {
            messageType = 'topic';
        }

        return messageType;
    });

    Handlebars.registerHelper('senderMessageType', function (value) { // 判断发送私信消息类型.
        var senderMessageType;

        if (/^<img/.test(value)) {
            senderMessageType = 'picture clear';
        } else {
            senderMessageType = 'text clear';
        }

        return senderMessageType;
    });
    
    Handlebars.registerHelper('portrait', function (value, options) { // 私信头像展示.
        
        if (value.contentType != 1 && value.contentType != 5 ) {
            
            if (value.senderUid == TO_UID) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        }
    });
    
    Handlebars.registerHelper('messageContent', function (value) { // 私信消息内容.
        var messageContent = '';
        var contentType = value.contentType;
        var content = util.JSONParse(value.content);

        if (contentType == 1) {
            messageContent += '<div class="content"><a href="' + content.topic_url_h5 + '" class="link"><h6 class="title">' + content.title + '</h6>';

            if (content.coverUrl) {
                messageContent += '<div class="image"><img src="' + content.coverUrl + '" width="100%"></div>';
			}

            messageContent += '</a></div>';
        } else if (contentType == 2) {
            messageContent += '<div class="content"><p class="info">' + value.content.replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '</p></div>';
        } else if (contentType == 3) {
            var img = new Image();
            
            img.src = value.content.split('"')[1];
            
            messageContent += '<div class="content"><div class="image" data-width="' + img.width + '" data-height="' + img.height + '">' + value.content + '</div></div>';
        } else if (contentType == 4) {
            messageContent += '<div class="content" data-url="' + content.video_url_h5 + '" data-cid="' + content.cid + '" data-vid="' + content.vid + '" data-cateCode="' + content.cate_code + '"><div class="info clear"><h6 class="title">' + content.video_name + '</h6>';

            if (content.cover) {
                messageContent += '<div class="thumbnail image"><img src="' + content.cover + '" width="100%" /></div>';
			}

            messageContent += '</div></div>';
        } else if (contentType == 5) {
            messageContent = '<div class="content"><a href="' + content[0].urlh5 + ( content[0].type == 1 ? '&star_name=' + nickname : '' ) + '" class="link">'
                + '<h6 class="title">' + ( content[0].type == 1 ? '#' + content[0].title + '#' : content[0].title ) + '</h6>'
            	+ '<div class="image"><img src="' + content[0].cover + '" width="100%"></div></a>';

            if (content.length > 1) {
            	var i;

                messageContent += '<ul class="multi-topic">';

                for (i = 1; i < content.length; i += 1) {
                    messageContent += '<li class="clean">'
                        + '<a href="' + content[i].urlh5 + ( content[i].type == 1 ? '&star_name=' + nickname : '' ) + '">'
                        + '<h6 class="title"><span class="span">' + ( content[i].type == 1 ? '#' + content[i].title + '#' : content[i].title ) + '</span></h6>'
                        + ( content[i].cover ? '<div class="image"><img src="' + content[i].cover + '" width="100%"></div>' : '' )
                        + '</a>'
                        + '</li>';
				}
                messageContent += '</ul>';
			}
    
            messageContent += '</div>';
        }
        return messageContent;
    });

    Handlebars.registerHelper('sendMessageContent', function (value) { // 发送私信消息内容.
        var senderMessageContent = '';

        if (/^<img/.test(value)) {
            senderMessageContent += '<div class="content"><div class="image">' + value + '</div></div>';
        } else {
            senderMessageContent += '<div class="content"><p class="info">' + value + '</p></div>';
        }
        return senderMessageContent;
    });
    
    Handlebars.registerHelper('isSameTime', function (value) { // Date日期时间是否为同年同月同日同时的同一分钟判断.
        var dateTime = new Date(value);
        var date = dateTime.getFullYear() + '-' + check.checkDigit(dateTime.getMonth() + 1) + '-' + check.checkDigit(dateTime.getDate());
        var time = check.checkDigit(dateTime.getHours()) + ':' + check.checkDigit(dateTime.getMinutes());
        
        messageTime.push(date + ' ' + time);
        
        if (messageTime.length && messageTime[messageTime.length - 2] === (date + ' ' + time)) {
            return 'name="other" style="display: none"';
        } else {
            return 'name="first"';
        }
    });
    
	Handlebars.registerHelper('dateTime', function (value) { // Date日期时间换算.
		var dateTime = new Date(value);
		var year = dateTime.getFullYear();
		var month = check.checkDigit(dateTime.getMonth() + 1);
		var date = check.checkDigit(dateTime.getDate());
        var time = check.checkDigit(dateTime.getHours()) + ':' + check.checkDigit(dateTime.getMinutes());
		var yearMonthDate = year + '-' + month + '-' + date;
        var monthDate = month + '-' + date;
        
        if (year === CURRENT_YEAR) {
            
            if (date === check.checkDigit(CURRENT_DATE)) {
                return '<span class="time">' + time + '</span>';
            } else {
                return '<span class="date">' + monthDate + '</span><span class="time">' + time + '</span>';
            }
        } else {
            return '<span class="date">' + yearMonthDate + '</span><span class="time">' + time + '</span>';
        }
	});
    
    Handlebars.registerHelper('menuLink', function () { // 菜单栏链接.
        return hosts.userUrl;
    });
});