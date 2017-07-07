/**
 *
 *   @description: 提示弹框组件
 *   @version    : 1.0.0
 *   @create-date: 2015-10-15
 *
 *   @update-log :
 *   20151015 石棋文 提示弹框组件
 *
 *   @interface  :
 *                  1)显示提示弹框：
 *                      tip.showTip(
 *                          text,    //（必）提示文本内容
 *                          milliSec //（可）milliSec毫秒后自动关闭提示弹框
 *                      );
 *
 *   @example    :
 *                  var tip=require('tip');
 *                  tip.showTip(
 *                      '我是提示内容！',
 *                      3000
 *                  );
 *
 */
svp.define('tip',function(require, exports, module){
    'use strict';

    var $=svp.$||window.$;
    var Tip={
        params:{
          $nodes:{
              $container:$('body')
          },
          classes:{
              tipMask:'tip-mask',
              tipWrapper:'tip-wrapper',
              tipContent:'tip-content'
          },
          clickType:'click',
          isTouch:'ontouchstart' in window
        },
        event:{
            closeTip:function(){
                var self=Tip,params=self.params, $tipMask=params.$nodes.$tipMask;
                if(self.timer){
                    clearTimeout(self.timer);
                    self.timer=null;
                }
                if(params.isTouch){
                    $tipMask.off('touchmove');
                }
                $tipMask.remove();

            },
            preventTouchMove:function(e){
                e.preventDefault();
            }
        },
        initTip:function(text,bindCloseTip){
            var self=this;
            self.renderTip(text);
            self.initEvents(bindCloseTip);
        },
        renderTip:function(text){
            var self=this,params=self.params,classes=params.classes,html='';
            html+='<div class="'+classes.tipMask+'">';
            html+='<div class="'+classes.tipWrapper+'" style="visibility:hidden;">';
            html+='<div class="'+classes.tipContent+'">'+text+'</div>';
            html+='</div>';
            html+='</div>';
            params.$nodes.$container.append(html);
            self.getNodes();
            self.setTipWrapperPosition();
        },
        setTipWrapperPosition:function(){
            var $tipWrapper=this.params.$nodes.$tipWrapper;
            $tipWrapper.css({'visibility':'visible','margin-top':'-'+$tipWrapper.height()/2+'px'});
        },
        getNodes:function(){
            var self=this;
            self.params.$nodes.$tipMask=$('.'+self.params.classes.tipMask);
            self.params.$nodes.$tipWrapper=$('.'+self.params.classes.tipWrapper);
        },
        showTip:function(text,milliSec){
            var self=this;
            milliSec =milliSec||0;
            self.initTip(text,true);
            if(typeof milliSec==='number'&&milliSec>0){
                if(self.timer){
                    clearTimeout(self.timer);
                    self.timer=null;
                }
                self.timer=setTimeout(function(){
                    self.event.closeTip();
                },milliSec);
            }
        },
        initEvents:function(bindCloseTip){
            var self=this,params=self.params,$tipMask=params.$nodes.$tipMask;
            bindCloseTip&&$tipMask.one(params.clickType,self.event.closeTip);
            if(params.isTouch){
                $tipMask.on('touchmove',self.event.preventTouchMove);
            }
        }
    };
    module.exports={
        initTip:function(text,bindCloseTip){
            Tip.initTip(text,!!bindCloseTip);
        },
        showTip:function(text,milliSec){
            Tip.showTip(text,milliSec);
        },
        closeTip:function(){
            Tip.event.closeTip();
        }
    };
});