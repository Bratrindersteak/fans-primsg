# 搜狐视频APP-粉丝社区V1.4 私信H5页面

> **前端交互说明**
---

- ### 功能
  1. 页面初始化加载私信列表.
     - 旧贴 (contentType: 1, 点击跳转);
     - 文字 (contentType: 2, 完全展示不折行);
     - 图片 (contentType: 3, 点击查看大图);
     - 视频 (contentType: 4, 点击拉起客户端播放视频).
     - 贴子 (contentType: 5, 点击跳转);
    
  2. 页面上拉加载最新十条数据.

  3. 实时交互.
     - 实时消息，过滤无关消息后展示（文字、图片）.
     - 自动回复消息（帖子、文字、图片、视频）.

  4. 发送私信:
     - 文字 (完全展示不折行);
     - 图片 (调起系统相册并显示上传进度).

  5. 兼容旧帖子接口数据格式.
  
  6. 底部菜单两栏切换.
     - 点击跳转.
     - 清空记录.

  7. 私信删除.
     - 聊天记录清空.
     - 单条消息删除.(Defer)
     - 切换状态保留.

  8. 图片展示.
     - 大图缩放.

  9. 页面统计.
     - PV.
     - 对方头像点击跳转事件.
     - 切换菜单按钮点击事件.
     - 发送图片按钮点击事件.
     - 对方用户主页按钮点击跳转事件.
     - 对方商家店铺按钮点击跳转事件.
     - 对方粉丝社区按钮点击跳转事件.
     - 聊天记录清空按钮点击事件.

- ### 展示

  1. 图片
     > 列表展示缩略图，浏览展示原图

  2. icon
     > base64 not sprite
  
- ### 待优化
  - 单条私信删除.

  - 上滑页面手指出界时消息列表悬停. ``` BUG ```
    > This could be iscroll & ios bug
    
  - 手指滑动列表时动能过大. ``` BUG ```
    > This could be iscroll & ios bug
    
  - 双击缩放大图.
