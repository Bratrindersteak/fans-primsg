/**
 *
 *   @description: confirm对话框组件
 *   @version    : 1.0.0
 *   @create-date: 2016-01-07
 *
 *   @update-log :
 *   20160107 石棋文 confirm对话框组件
 *
 *   @interface  :
 *                  1)显示提示弹框：
 *                      confirm.showConfirm(
 *
 *                      );
 *
 *   @example    :
 *                  var confirm=require('confirm');
 *                  confirm.showConfirm(
 *
 *                  );
 *
 */
svp.define('confirm',function(require, exports, module){
    'use strict';

    var $=svp.$||window.$;
    var Confirm={
        params:{
            $nodes:{
                $container:$('body')
            },
            classes:{
                confirmMask:'confirm-mask',
                confirmBox:'confirm-box',
                confirmContent:'confirm-content',
                confirmBtns:'confirm-btns',
                confirmOkBtn:'confirm-ok-btn',
                confirmCancelBtn:'confirm-cancel-btn',
                zoomIn:'zoomIn'
            },
            clickType:'click',
            isTouch:'ontouchstart' in window
        },
        event:{
            closeConfirm:function(){
                var self=Confirm,params=self.params,$nodes=params.$nodes;
                $nodes.$confirmOkBtn.off(params.clickType);
                $nodes.$confirmCancelBtn.off(params.clickType);
                if(params.isTouch){
                    $nodes.$confirmMask.off('touchmove');
                }
                $nodes.$confirmMask.remove();
            },
            preventTouchMove:function(e){
                e.preventDefault();
            }
        },
        initConfirm:function(opt){
            var self=this;
            self.renderConfirm(opt);
            self.initEvents(opt);
        },
        renderConfirm:function(opt){
            var self=this,params=self.params,classes=params.classes,html='';
            html+='<div class="'+classes.confirmMask+'">';
            html+='<div class="'+classes.confirmBox+'" style="visibility:hidden;">';
            html+='<div class="'+classes.confirmContent+'">'+(opt.content||'')+'</div>';
            html+='<div class="'+classes.confirmBtns+'">';
            html+='<a class="'+classes.confirmOkBtn+'">'+(opt.okBtnText||'确定')+'</a>';
            html+='<a class="'+classes.confirmCancelBtn+'">'+(opt.cancelBtnText||'取消')+'</a>';
            html+='</div>';
            html+='</div>';
            html+='</div>';
            params.$nodes.$container.append(html);
            self.getNodes();
            self.setConfirmWrapperPosition();
        },
        setConfirmWrapperPosition:function(){
            var $confirmBox=this.params.$nodes.$confirmBox;
            $confirmBox.css({'margin-top':'-'+($confirmBox.height()/2+40)+'px','visibility':'visible'}).addClass(this.params.classes.zoomIn);
        },
        getNodes:function(){
            var self=this,params=self.params,$nodes=params.$nodes,classes=params.classes;
            $nodes.$confirmMask=$('.'+classes.confirmMask);
            $nodes.$confirmBox=$('.'+classes.confirmBox);
            $nodes.$confirmOkBtn=$('.'+classes.confirmOkBtn);
            $nodes.$confirmCancelBtn=$('.'+classes.confirmCancelBtn);
        },
        showConfirm:function(opt){
            this.initConfirm(opt);
        },
        initEvents:function(opt){
            var self=this,params=self.params,$nodes=params.$nodes;
            if(params.isTouch){
                $nodes.$confirmMask.on('touchmove',self.event.preventTouchMove);
            }
            $nodes.$confirmOkBtn.on(params.clickType,function(e){
                self.event.closeConfirm();
                opt.onOk&&opt.onOk.call(this,e);
            });
            $nodes.$confirmCancelBtn.on(params.clickType,function(e){
                self.event.closeConfirm();
                opt.onCancel&&opt.onCancel.call(this,e);
            });
        }
    };
    module.exports={
        showConfirm:function(opt){
            Confirm.showConfirm(opt);
        }
    };
});