/**
 *
 *   @description: 该文件用于上传业务
 *   @version    : 1.0.1
 *
 *   @interface  :
 *                 1) uploadImg(param, fn)   //上传图片, 在fn的回调中返回userData
 *                    参数说明:
 *                       param: (documentNode) type=file 的input dom对象
 *                       fn   : (function)     回调函数, 并把结果返回
 *
 *   @example    :
 *                 var upload = require('upload');
 *
 *                 upload.uploadImg(dom, function (cbData) {
 *                   console.log(cbData);
 *                 });
 *
 *   @update-log :
 *                 1.0.1 - 20151019 陈  龙 上传业务
 *                 1.0.2 - 20160511 陈  龙 在判断文件类型时加入了toLowerCase处理
 *                 1.0.3 - 20170223 王宏光 增加开发模式
 *
 */
svp.define('upload', function (require, exports, module) {

  'use strict';

  var $ = svp.$;
  var vars = require('base/vars');
  var pxyUrl = vars.VSTAR_PXY_URL;
  var uploadErrorTypes = {600:"上传失败! fileInput参数错误",601:"上传失败! 上传内容不符合要求！",602:"上传失败! 图片格式不符合要求！",603:"上传失败! 服务器错误！",604:"上传失败! 用户数据错误！"};
  // var host = '//my.test.sohu.com/pxy1/';
  // var host = '//127.0.0.1/pxy1/star/'
    if (/t\.m\.tv\.sohu\.com|my\.test\.sohu\.com/i.test(window.location.host)) {
        pxyUrl = '//t.m.tv.sohu.com/pxy1/';
    }
  var config = {
    urls: {
      //上传图片
      uploadImg: 'star/h5/topic/uploadPic.json'
    }
  };

  var upload = {
    //ajax上传图片
    uploadImageByAjax: function (param, fn, devMode) {
      $.ajax({
        url: (devMode?'//fans.tv.sohu.com/':pxyUrl)+config.urls.uploadImg,
        data: param,
        type: 'post',
        success: fn,
        error: fn
      });
    },

    //上传图片结果处理
    uploadImageProcess: function (cbData) {
      var rst = {
        result: false,
        msg: '上传失败',
        img: '',
        type: 'img'
      };

      if (typeof cbData !== 'undefined' && cbData.status === 200 && !$.isUndefined(cbData.message)) {
        rst = {
          result: true,
          msg: '上传成功',
          img: cbData.message.picUrl,
          type: 'img'
        };

      } else if (typeof cbData !== 'undefined' && cbData.status === 10010) {
        rst.msg = '不支持的图片类型';
      
      } else if (typeof cbData !== 'undefined' && cbData.status === 10011) {
        rst.msg = '无效的图片';
      
      } else if (typeof cbData !== 'undefined' && cbData.status === 10012) {
        rst.msg = '不支持的附件类型';
      }

      return rst;
    },

    //添加公共参数
    addCommonParam: function (param, userInfo) {
      $.extend(param, _.pick(userInfo, 'passport', 'token', 'plat', 'uid', 'sver', 'valid', 'starfrom'));
      return param;
    },

    //上传图片
    uploadImg: function (fileInput, userInfo, fn, devMode) {
      var oriRst = {
        status: 600,
        message: uploadErrorTypes['600'],  //fileInput参数错误
        data: null
      };

      if (typeof userInfo === 'undefined' || userInfo === null) {
        oriRst = {
          status: 604,
          message: uploadErrorTypes['604'],  //用户数据错误
          data: null
        };

      } else if (typeof fileInput !== 'undefined' && !$.isUndefined(fileInput.files)) {
        
        $.each(fileInput.files, function (index, file) {
          var rst = $.extend({}, oriRst, {index: index});
           
          var name = file.name;
          var arr = name.split('.');
          var fileType = arr.length > 1 ? arr[arr.length - 1] : '';
          fileType = fileType.toLowerCase();

          var reader = new FileReader();

          reader.onload = function (e) {
            var _file = e.target.result;
            // 判断图片格式 (有的手机file.type为undefined)
            if (!(!$.isUndefined(_file.type) && _file.type.indexOf('image') === 0) || $.isUndefined(_file.type)) {
              //为空是因为file.type为undefined时，拿不到文件后缀，直接通过js验证，走接口校验
              var allowTypes = ['png', 'jpg', 'jpeg', 'gif', ''];

              if (allowTypes.indexOf(fileType) > -1) {
                var param = {};
                param = upload.addCommonParam(param, userInfo);
                param.file = e.target.result;
                param.name = name;
                //上传图片
                upload.uploadImageByAjax(param, function (cbData) {
                  console.log('上传图片:', cbData);
                  //返回结果处理
                  var data = upload.uploadImageProcess(cbData);

                  if (data.result) {
                    rst.status = 200;
                    rst.message = '上传成功!';
                    rst.data = data;
                    fn(rst);

                  } else {
                    rst.status = 603;
                    rst.message = data.msg;  //来自服务器的错误
                    fn(rst);
                  }
                }, devMode);
              
              } else {
                rst.status = 602;
                rst.message = uploadErrorTypes['602'];  //图片格式不符合要求
                fn(rst);
              }

            } else {
              rst.status = 601;
              rst.message = uploadErrorTypes['601'];  //上传内容不符合要求
              fn(rst);
            }
          };
          reader.readAsDataURL(file);
        });

      } else {
        fn(rst);
      }
    }
  };

  module.exports = {
    uploadImg: upload.uploadImg
  };
});