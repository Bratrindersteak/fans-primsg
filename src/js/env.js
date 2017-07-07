svp.define('env', function(require, exports, module) {
    'use strict';

    var svaUserInfo = require('svaUserInfo');
    var vars = require('base/vars');
    var URL = require('base/url');
    var cookie = require('base/cookie');
    var Action = require('base/action');
    var ls = require("base/localStorage");
    var search = URL.getQueryData(location.search);
    var appUrl = vars.PROTOCOL + 'm.tv.sohu.com/upload/clientapp/personal/bind.html';
    var h5Url = '//passport.sohu.com/security/bind_mobile';

    window.pmallPvExt = {};

    //获取客户端用户信息
    function getAppUser(cb) {
        function callback(userInfo) {
            userInfo = userInfo || {};
            //alert(userInfo.passport)
            cb && cb(userInfo);
        }
        if (vars.IsSohuVideoClient) {
            //alert(ls.get('vstar_user_info'))
            //alert(JSON.stringify(window.SohuAppPrivates))
            try {
                if (vars.IsAndroid) {
                    try {
                        console.log("handler.appCallback");
                        handler && handler.appCallback && handler.appCallback(3, 1, '{}');
                    } catch (e) {}
                } else if (vars.IsIOS) {
                    var t1 = setTimeout(function() {
                        console.log("js://jsLoadFinish");
                        window.location.href = 'js://jsLoadFinish';
                        clearTimeout(t1);
                    }, 200);
                }
                var t2 = setTimeout(function() {
                    svaUserInfo.getUserData(function(userData) {
                        cb && cb(userData);
                    });
                    clearTimeout(t2);
                }, 400);
                // svaUserInfo.getUserData(function(userData) {
                //     callback(userData);
                // });
            } catch (e) {
                callback();
            }
        } else {
            callback();
        }
    }

    //app login
    function appLogin(url, share, open) {
        //用户没有登录，Action登录
        var actionUrl = Action.makeActionUrl({
            action: '1.18',
            urls: url || window.location.href,
            ex1: 2,
            share: share == undefined ? '1' : share,
            open: open == undefined ? '0' : open,
            more: {
                sourcedata: {
                    params: 'uid&passport&plat&token&clientVer&clientType'
                }
            }
        });
        var option = {
            action: '2.6',
            more: {
                sourcedata: {
                    loginFrom: 17,
                    callbackAction: actionUrl,
                    closeWebView: 1
                }
            }
        };
        Action.sendAction(option);
    }

    //检查是否登录
    function checkLogin(passport, cb, appCb, url, share, open) {
        url = url || location.href;
        if (vars.IsSohuVideoClient) {
            if (passport) {
                if (appCb) { appCb(); } else if (cb) { cb(); }
            } else {
                appLogin(url, share, open);
            }
        } else {
            var ppinf = cookie.get('ppinf');
            if (ppinf) {
                cb && cb();
            } else {
                window.location.href = addParamToUrl('//fans.tv.sohu.com/h5/vstar/login.html', { ref: url });
            }
        }
    }

    //url中加参数
    //params - {a: 1, b: 2}
    function addParamToUrl(url, params) {
        params = $.param(params || {});
        if (params) {
            var hash = '',
                hashIdx = url.indexOf('#');
            if (hashIdx > -1) {
                hash = url.substring(hashIdx);
                url = url.substring(0, hashIdx)
            }
            url = url + (url.indexOf('?') > -1 ? '&' : '?') + params + hash;
        }
        return url;
    }

    //获取每个接口都要传的公共参数
    function getCommonParams(userData) {
        var r = _.pick(userData, 'passport', 'token', 'plat', 'uid', 'sver');
        r.valid = (vars.IsSohuVideoClient ? 0 : 1);
        r.starfrom = 2;
        return r;
    }

    //修复图片http地址，做兼容
    function fixImgHttp(img) {
        if (img) {
            img = $.trim(img);
            img = img.replace(/^http(s)*:\/\//i, vars.PROTOCOL);
            img = img.replace(/^\/\//i, vars.PROTOCOL);
        }
        return img;
    }
    //拉起绑定手机号页面
    function pullBindMobilePage() {
        if (vars.IsSohuVideoClient) {
            var actionUrl = {
                action: '1.18',
                urls: appUrl,
                ex1: 2,
                share: 1,
                open: '1',
                more: {
                    sourcedata: {
                        params: 'uid&passport&plat&token&clientVer&clientType&gid'
                    }
                }
            }
            location.href = Action.makeActionUrl(actionUrl);
        } else {
            location.href = h5Url;
        }
    }
    // 是否绑定手机号
    function isBind(data, cb, url) {
        var rst = data;
        rst['page'] = 1;
        var baseUrl = '//api.tv.sohu.com/'; //(/t\.m\.tv\.sohu\.com|my\.test\.sohu\.com/i.test(window.location.host)) ? '//t.m.tv.sohu.com/pxy1/' :
        var isBindUrl = baseUrl + 'star/h5/fans/personal/info.do';
        $.ajax({
            url: isBindUrl,
            data: rst,
            dataType: 'jsonp',
            success: function(json) {
                // console.log(json)
                if (json.status == 200 && json.message) {
                    var bind = json.message.isbind;
                    if (bind) {
                        if (url) {
                            location.href = url;
                        } else {
                            cb && cb();
                        }

                    } else {
                        pullBindMobilePage();
                    }
                }
            },
            error: function(json) {
                console.log(json)
            }
        })
    }

    //设置title，包括客户端内
    function setPageTitle(title) {
        if (!title) return;
        var ifr, body;
        document.title = title;
        if (vars.IsSohuVideoClient && vars.IsIOS) {
            ifr = document.createElement('iframe');
            ifr.style.display = 'none';
            body = document.body;
            ifr.src = 'js://updateTitle?title=' + encodeURIComponent(title);
            body.appendChild(ifr);
            setTimeout(function() {
                body.removeChild(ifr);
            }, 2000);
        } else if (vars.IsSohuVideoClient && vars.IsAndroid) {
            try {
                handler.appCallback(4, 1, '{"title":"' + title + '"}');
            } catch (e) {}
        }
    }

    function indentifyCheck(userData, fn, _url) {
        var ppinf = cookie.get('ppinf');
        fn = typeof fn === 'function' ? fn : function() {};
        function checkBindMobile(userData) {
            var isWXAccount = userData.passport.indexOf('@wechat.sohu.com') > -1 ? true : false;
            var isQQAccount = userData.passport.indexOf('@qq.sohu.com') > -1 ? true : false;
            var isSinaAccount = userData.passport.indexOf('@sina.sohu.com') > -1 ? true : false;
            //检查是否绑定手机(微信、qq、新浪账号登录无需手机绑定)
            if (isWXAccount || isQQAccount || isSinaAccount) {
                fn();
            } else {
                isBind(userData, fn, _url);
                // if (userData.mobile !== '' || isWXAccount || isQQAccount || isSinaAccount) {
                //     fn();
                //     return;
                //     //没绑定手机号，拉起绑定手机号页面
                // } else {
                //     location.href = appUrl;
            }
        }
        //客户端下
        if (vars.IsSohuVideoClient) { //vars.IsSohuVideoClient
            //已经登录
            getAppUser(function(userData) {
                if (userData.passport !== '' && userData.token !== '') {
                    checkBindMobile(userData);
                    //尚未登录, 拉起app登录
                } else {
                    login();
                }
            });
            //非客户端
        } else {
            //实时获取用户信息
            if (!ppinf || ppinf.length < 5) {
                login();
            } else {
                isBind(userData, fn, _url);
            }

        }
    };

    function login() {
        var ref = window.location.href;
        if (vars.IsSohuVideoClient) {
            appLogin();
        } else {
            getAppUser(function() {
                var loginUrl = 'fans.tv.sohu.com/h5/vstar/login.html?ref=';
                location.href = vars.PROTOCOL + loginUrl + encodeURIComponent(ref);
            })
        }
    }
    /**
     * 接口返回数据处理
     * @param  json cbData     返回数据
     * @param  string actionName  处理动作名称
     * @return json 结果
     */
    function responseDataProcess(cbData, actionName) {
        var msg = actionName + '失败，请稍后重试!',
            result = false;
        if (typeof cbData !== 'undefined') {
            var status = cbData.status;
            if (status === 200) {
                result = true;
                msg = actionName + '成功!';
            } else if (status === 101) {
                msg = '为了更有效的保障您账号安全，请立即绑定手机号!';
            } else if (status === 117) {
                msg = '未登录';
            } else if (status === 10001) {
                msg = '帖子不存在!'
            } else if (status === 10002) {
                msg = '回帖不存在!'
            } else if (status === 10003) {
                msg = '父评论不存在!'
            } else if (status === 10004) {
                msg = '回帖评论不存在!'
            } else if (status === 10005) {
                msg = actionName + '失败! 请先关注该出品人，才能发表帖子!'
            } else if (status === 10006) {
                msg = '该出品人不存在!'
            } else if (status === 10007) {
                msg = '帖子已经点赞过了!'
            } else if (status === 10008) {
                msg = '回贴已经点赞过了!'
            } else if (status === 10009) {
                msg = '用户不存在!'
            } else if (status === 10010) {
                msg = '不支持的图片类型!'
            } else if (status === 10011) {
                msg = '无效的图片!'
            } else if (status === 10012) {
                msg = '不支持的附件类型!'
            } else if (status === 10013) {
                msg = '不支持的禁言天数!'
            } else if (status === 10017) {
                msg = '您已被禁言，不能发布内容!'
            } else if (status === 10018) {
                msg = '没有操作权限!'
            } else if (status === 10019) {
                msg = '超过置顶帖子最大数量!'
            } else if (status === 10021) {
                msg = '标题不能为空!'
            } else if (status === 10022) {
                msg = '内容不能为空!'
            } else if (status === 10023) {
                msg = '实名制验证失败，请绑定手机号!';
            }
        }
        return {
            msg: msg,
            result: result
        };
    };

    ! function() {
        //ios safari 下回退后不刷新问题
        $(window).bind("pageshow", function(event) {
            if (event.persisted) {
                window.location.reload()
            }
        });

    }();

    $.fn.scrollBottom = function() {
        var sh = $(this).scrollHeight();
        $(this).scrollTop(sh);
    };

    //获取字符串的长度，汉字算两个字符
    function getStrLength(str) {
        var cArr = str.match(/[^\x00-\xff]/ig);
        return str.length + (cArr == null ? 0 : cArr.length);
    }

    function getCursortPosition (ctrl) {//获取光标位置函数 PS：参数ctrl为input或者textarea对象
        var CaretPos = 0;    // IE Support
        if (document.selection) {
        ctrl.focus ();
            var Sel = document.selection.createRange ();
            Sel.moveStart ('character', -ctrl.value.length);
            CaretPos = Sel.text.length;
        }
        // Firefox support
        else if (ctrl.selectionStart || ctrl.selectionStart == '0')
            CaretPos = ctrl.selectionStart;
        return (CaretPos);
    }
 
    function setCaretPosition(ctrl, posStart, posEnd){//设置光标位置函数 PS：参数ctrl为input或者textarea对象，pos为光标要移动到的位置。
        if(ctrl.setSelectionRange)
        {
            ctrl.setSelectionRange(posStart,posEnd);
            ctrl.focus();
        }
        else if (ctrl.createTextRange) {
            var range = ctrl.createTextRange();
            range.collapse(true);
            range.moveEnd('character', posEnd);
            range.moveStart('character', posStart);
            range.select();
        }
    }
    function formatTime(date,now){
        try{
            var rt = '';
            now = now || new Date();
            var time = new Date(date);
            var year = time.getFullYear();
            var month = time.getMonth() + 1, day = time.getDate();
            var subDate = now.getTime() - time.getTime();  //时间差的毫秒数
            console.log(subDate);
            var years = Math.floor(subDate / (365*24 * 3600 * 1000));
            //计算出相差天数
            var days = Math.floor(subDate / (24 * 3600 * 1000));
            //计算出小时数
            var leave1 = subDate % (24 * 3600 * 1000);   //计算天数后剩余的毫秒数
            var hours = Math.floor(leave1 / (3600 * 1000));
            //计算相差分钟数
            var leave2 = leave1 % (3600 * 1000);       //计算小时数后剩余的毫秒数
            var minutes = Math.floor(leave2 / (60 * 1000));
            //计算相差秒数
            var leave3 = leave2 % (60 * 1000);     //计算分钟数后剩余的毫秒数
            var seconds = Math.round(leave3 / 1000);
            if (month.toString().length < 2) {
                month = '0' + month;
            }

            if (day.toString().length < 2) {
                day = '0' + day;
            }
            if(years>0){
                return year + '-' + month + '-' + day;
            }else if (years<=0 && days > 3) {
                return month + '-' + day;

            } else if (days >= 2 && days <= 3) {
                rt = '2天前'
            } else if (days >= 1 && days < 2) {
                //大于24小时小于48小时显示昨天
                rt = '1天前';
            } else {
                if (hours < 24 && hours >= 1) {
                    //大于1小时小于24小时显示N小时前
                    rt = hours + '小时前';

                } else {
                    if (hours < 1 && minutes >= 1) {
                        //大于1分钟小于1小时显示N分钟前
                        rt = minutes + '分钟前';
                    } else {
                        if(minutes<1 && seconds>=0){
                            rt = seconds+'秒前';
                        }else{
                            rt = '1秒前';
                        }
                    }
                }
            }
            return rt;
        } catch (e) {
        }
    }
    //初始化访问当前页面的用户信息
    function initUserInfo(userData) {
        //初始化访问当前页面的用户信息
        var ud = userData,
            userInfo = {};
        userInfo.clientVer = search.clientVer || ud.sver || '';
        userInfo.uid = search.uid || ud.uid || '';
        userInfo.passport = ud.passport || search.passport || '';
        userInfo.token = search.token || ud.token || '';
        userInfo.plat = search.plat || ud.plat || '6';
        userInfo.poid = ud.poid || '1';
        userInfo.sver = ud.sver || '';
        userInfo.sysver = ud.sysVer || '0';
        userInfo.partner = ud.partner || '1';
        userInfo.mobile = ud.mobile||window.SohuAppUserData.mobile|| '',
        userInfo.api_key = vars.API_KEY || '72761a5115b39df171d6150d2dba2240';
        userInfo.gid = search.gid || ud.gid || '';
        return userInfo;
    }

    module.exports = {
        getAppUser: getAppUser,
        getCommonParams: getCommonParams,
        fixImgHttp: fixImgHttp,
        setPageTitle: setPageTitle,
        isBind: isBind,
        indentifyCheck: indentifyCheck,
        responseDataProcess: responseDataProcess,
        checkLogin: checkLogin,
        getStrLength: getStrLength,
        pullBindMobilePage: pullBindMobilePage,
        getCursortPosition: getCursortPosition,
        initUserInfo:initUserInfo,
        setCaretPosition: setCaretPosition,
        formatTime:formatTime
    };
});
