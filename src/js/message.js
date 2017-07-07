this.dolphin = this.dolphin || {};

dolphin.DefaultMessage = function(msg){
	console.log("call default function, please init your 'message' function.")
};

dolphin.Transport = function(config, handle, retry){
	this.config = dolphin.extends(config);
	this.handleMessage = handle;
	this.retryConnect = retry;
};

dolphin.Transport.prototype.connect = function(){
	return false;
};

dolphin.Transport.prototype.reconnect = function(){
	console.log("fire transport close");
	this.retryConnect();
};

dolphin.extends = function(baseObject){
    function F() {}
    F.prototype = baseObject;
    return new F();
};

dolphin.WebSocketTransport = function(baseObject){
	_self = dolphin.extends(baseObject);
	var url = _self.config.url;
	var heartbeatInterval;

	var heartbeat = function(){
		console.log("call heartbeat");
		heartbeatInterval = setInterval(function(){
			console.log("trigger heartbeatInterval");
			_self.ws.send(_self.config.heartbeat());
		}, _self.config.timeout);
	}

	_self.connect = function(){
		
		console.log("connect to " + url);
		
		var ws = new WebSocket(url);
		_self.ws = ws;
		var connect_timeout = setTimeout(function() {
            console.log("Socket connection timeout readyState:%d", ws.readyState);
            ws.close();
        }, _self.config.connect_timeout); 

		ws.onopen = function() {
            if (connect_timeout) clearTimeout(connect_timeout);           
            console.log("WebSocket connect success.");
            ws.send(_self.config.handshake());
        };

        ws.onerror = function (evt) {
            console.log("fire ws.onerror");
        };

        ws.onclose = function() {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (connect_timeout) clearTimeout(connect_timeout);  
            console.log("WebSocket connection close",ws.readyState);
            _self.reconnect();
        };

        ws.onmessage = function(evt) {
            
            if(evt && evt.data){
            	//websocket string deserialize json
            	var msgs = JSON.parse(evt.data);
                var op = _self.handleMessage(msgs);
                if(op == dolphin.Operation.OP_HANDSHAKE_REPLY){
                	//websocket trigger heartbeat interval
                	heartbeat();
                }
                if(dolphin.isOpSuccess(op)){
                	return;
                }
            }
            //error occured 错误消息关闭连接，重连
            ws.close();
                  
        };


	}

	return _self;
};

dolphin.isOpSuccess = function(op){
	if(op == dolphin.Operation.OP_SYSTEM_ERROR || op == dolphin.Operation.OP_DISCONNECT || op == dolphin.Operation.OP_DISCONNECT_REPLY){
		return false;
	}else{
		return true;
	}
}	

dolphin.JsonpPollingTransport = function(baseObject){

	_self = dolphin.extends(baseObject);
	var url = _self.config.url;
	var lastactive = 0;
	_self.active =function(){
		lastactive = (new Date()).valueOf();
	}

	_self.connect = function(){
		console.log("connect to " + url);
		send(_self.config.handshake(), _self.config.connect_timeout);
	};

	var jsonpResulthandling = function(op){
		if(dolphin.isOpSuccess(op)){
			// delayed release of cpu
			setTimeout(heartbeat, _self.config.delay);
		}else{
			// error or disconnect
			 _self.reconnect();
		}
	}

	var heartbeat = function(){
		
		send(_self.config.heartbeat());
	};


	var send = function(params, timeout){

		$.ajax({
         	url: url,
         	timeout: timeout,
         	data:"message="+params,
         	dataType: 'jsonp',
         	callback: "helloworld",
		    callbackParameter: "callback",
         	success:function(data){
         		//jsonp auto deserialize json
             	console.log("call jsonp success");
             	if(data){
             		jsonpResulthandling(_self.handleMessage(data));
             		console.log("jsonp success result");
             	}
             	
        	},
        	error: function(xhr, reason, exception){ 
        		console.log("jsonp error");
        		jsonpResulthandling(dolphin.Operation.OP_SYSTEM_ERROR);
        		
        	}
    	});


	};

	return _self;
};

dolphin.Operation = {
	    OP_SYSTEM_ERROR     : 0,
	    // handshake
	    OP_HANDSHAKE        : 1,
	    OP_HANDSHAKE_REPLY  : 2,
	    // heartbeat
	    OP_PING             : 3,
	    OP_PONG             : 4,
	    // disconnect
	    OP_DISCONNECT       : 5,
	    OP_DISCONNECT_REPLY : 6,
	    // send text message
	    OP_SEND_SMS         : 20,
	    OP_SEND_SMS_REPLY   : 21

};

dolphin.MyMessage = function (config) {
	var DEFAULT_CONFIG = {
		channel:"/p/",
	    message: dolphin.DefaultReceive,
	    passport:"",
	    token:"",
	    debug:true,
	    connect_timeout:2000,
	    delay: 1000,
	    router:"http://127.0.0.1:9001/private/api/router.do"
	 }
	this.config = config || {};
	this.config.channel = this.config.channel || DEFAULT_CONFIG.channel;
	this.config.message = this.config.message || DEFAULT_CONFIG.message;
	this.config.passport = this.config.passport || DEFAULT_CONFIG.passport;
	this.config.token = this.config.token || DEFAULT_CONFIG.token;
	this.config.debug = this.config.debug || DEFAULT_CONFIG.debug;
	this.config.delay = this.config.delay || DEFAULT_CONFIG.delay;
	this.config.connect_timeout = this.config.connect_timeout || DEFAULT_CONFIG.connect_timeout;
	this.config.router = this.config.router || DEFAULT_CONFIG.router;

	var self = this;
	var seq = 1;
	var ver = 1;
	var clid = "";
	var current_transport;
	var status = false;
	var channel;

	var retry_timeout;
	var transports = [];
	
	
	this.config.handshake = function(){
		return JSON.stringify({
	                'ver': ver,
	                'op':  dolphin.Operation.OP_HANDSHAKE,
	                'seq': seq ,
	                'ch': channel,
	                'data': {
	                	'passport':self.config.passport,
	                	'token':self.config.token,
	                }
            	});
	};

	this.config.heartbeat = function(){
		return JSON.stringify({
	                'ver': ver,
	                'op': dolphin.Operation.OP_PING,
	                'seq': seq,
	                'ch': channel,
	                'data': {
	                    'clid': clid
	                }
            	});
	}


	this.handle = function(msgs){
		//message type list :
		//OP_SYSTEM_ERROR,OP_HANDSHAKE_REPLY,OP_PONG,OP_SEND_SMS_REPLY,OP_DISCONNECT_REPLY
		var op = dolphin.Operation.OP_SYSTEM_ERROR;
        if(msgs && msgs.length){
            seq++;
            for(i in msgs){
                if(msgs[i] && msgs[i].op > dolphin.Operation.OP_SYSTEM_ERROR && msgs[i].data){
                	var messages = []
                	op = msgs[i].op;
                	switch(msgs[i].op){
                		case dolphin.Operation.OP_HANDSHAKE_REPLY:
                			console.log("receive handshake message");
                			clid = msgs[i].data.clid;
                        	break;
                        case dolphin.Operation.OP_PONG:
                        	console.log("receive pong message");
                     
                        	break;
                        case dolphin.Operation.OP_SEND_SMS_REPLY:
                        	messages.push(msgs[i].data);
                        	break;
                        case dolphin.Operation.OP_DISCONNECT_REPLY:
                        	console.log("receive disconnect message");
                        	break;
                        default:
                        	console.log("ignore op:%d, data:%s", msgs[i].op, msgs[i].data);

                	}

                	var onmessage = self.config.message;
                    if(onmessage && messages.length) {
                    	console.log("receive push message");
                    	onmessage(messages);
                    }
                    
                }else{
                	//receive error message
                    break;
                }

            }
            
        }
        return op;
	};

	
	this.retry = function(){
		if(status){
			console.log(new Date().getTime());
			retry_timeout = setTimeout(self.current_transport.connect, 5000);
		}
		
	};

	var clear = function(){
		seq = 1;
		clid = 0;
		if(retry_timeout) clearTimeout(retry_timeout);
	}

	this.stop = function(){
		//clear
		if(!status){
			return;
		}
		status = false;
		clear();
		
	}


	var router_timeout;
	this.start = function() {
		
		if(status){
			return;
		}
		serverTrans={}
		this.callRouter();
		

	};

	var serverTrans={};

	this.browserTransport = function(){
		//浏览器支持协议逻辑
		return {"websocket":false, "jsonp":true};
	};

	this.getCurrentTransport = function(serverTrans){
		status = true;
		if(serverTrans && serverTrans.num){
			//success
			console.log("get serverTrans success");
			self.current_transport = self.getAllowTransport();
			console.log("start message %s", status);
			self.current_transport.connect();
		}else{
			//fail 
			console.log("get serverTrans fail");

		}
		
	};

	this.getAllowTransport = function(){
		
		var btrans = self.browserTransport();
		if(btrans["websocket"] && serverTrans["websocket"]){
			var config = dolphin.extends(self.config);
			config.url = serverTrans["websocket"].url;
			channel = serverTrans["websocket"].ch;
			config.server = serverTrans["websocket"].server;
			config.timeout = serverTrans["websocket"].timeout;
			config.transport = serverTrans["websocket"].transport;
			transport = new dolphin.Transport(config, self.handle, self.retry);
			transports.push(new dolphin.WebSocketTransport(transport));
		}
		if(btrans["jsonp"] && serverTrans["jsonp"]){
			var config = dolphin.extends(self.config);
			config.url = serverTrans["jsonp"].url;
			channel = serverTrans["jsonp"].ch;
			config.server = serverTrans["jsonp"].server;
			config.timeout = serverTrans["jsonp"].timeout;
			config.transport = serverTrans["jsonp"].transport;
			transport = new dolphin.Transport(config, self.handle, self.retry);
			transports.push(new dolphin.JsonpPollingTransport(transport));
		}
		return transports[0];
	};

	this.callRouter = function(){

		$.ajax({
         	url: self.config.router,
         	timeout: self.config.connect_timeout,
         	data: "passport=" + self.config.passport + "&token=" + self.config.token + "&ch=" + self.config.channel,
         	dataType: 'jsonp',
         	callback: "hello",
		    callbackParameter: "callback",
         	success:function(data){
         		console.log("get router success");
         		if(data && data.length){
         			for(i in data){
         				serverTrans[data[i].transport] = data[i]
         				serverTrans.num = i;
         			}
         			self.getCurrentTransport(serverTrans);
         		}
         	},
        	error: function(xhr, reason, exception){ 
        		console.log("get router failed");
        	}
    	});

	}



};