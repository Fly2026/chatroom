// 使用Node.js和WebSocket实现聊天室服务器
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 存储所有连接的客户端
const clients = new Map();

// 提供静态文件（HTML、CSS、JS）
app.use(express.static(path.join(__dirname, 'public')));

// 根路径返回聊天室页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 处理WebSocket连接
wss.on('connection', (ws) => {
    console.log('新客户端连接');
    
    // 为新连接分配唯一ID
    const clientId = Date.now().toString();
    clients.set(clientId, { ws, username: '匿名用户' });
    
    // 发送当前在线用户数量
    broadcastUserCount();
    
    // 监听客户端消息
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch(message.type) {
                case 'setUsername':
                    // 设置用户名
                    clients.get(clientId).username = message.username;
                    broadcastUserCount();
                    break;
                    
                case 'message':
                    // 广播消息
                    const client = clients.get(clientId);
                    if (client) {
                        broadcast({
                            type: 'message',
                            username: client.username,
                            message: message.message,
                            timestamp: Date.now()
                        });
                    }
                    break;
                    
                case 'typing':
                    // 广播输入状态
                    const typingClient = clients.get(clientId);
                    if (typingClient) {
                        broadcast({
                            type: 'typing',
                            username: typingClient.username,
                            isTyping: message.isTyping
                        }, clientId);
                    }
                    break;
            }
        } catch (error) {
            console.error('消息解析错误:', error);
        }
    });
    
    // 连接关闭时
    ws.on('close', () => {
        console.log('客户端断开连接');
        clients.delete(clientId);
        broadcastUserCount();
    });
    
    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'system',
        message: '欢迎来到聊天室！'
    }));
});

// 广播消息给所有客户端
function broadcast(data, excludeId = null) {
    const message = JSON.stringify(data);
    
    clients.forEach((client, id) => {
        if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
        }
    });
}

// 广播当前在线用户数量
function broadcastUserCount() {
    const count = clients.size;
    broadcast({ type: 'userCount', count });
}

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
