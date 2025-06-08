import ChatAPI from "./api/ChatAPI.js";

export default class Chat {
  constructor(container) {
    this.container = container;
    this.api = new ChatAPI();
    this.websocket = null;
    this.currentUser = null;
    this.lastSentMessageId = null;
    this.users = [];
    
    this.nicknameModal = document.getElementById('nicknameModal');
    this.nicknameInput = document.getElementById('nicknameInput');
    this.continueBtn = document.getElementById('continueBtn');
    this.errorText = document.getElementById('errorText');
    this.chatContainer = document.getElementById('chatContainer');
    this.messagesContainer = document.getElementById('messagesContainer');
    this.messageInput = document.getElementById('messageInput');
    this.userList = document.getElementById('userList');
  }

  init() {
    this.bindToDOM();
    this.registerEvents();
    this.connectWebSocket();
  }

  bindToDOM() {
    this.userList = document.getElementById('userList');
    if (!this.userList) {
      console.error('Элемент userList не найден');
    }
  }

  registerEvents() {
    this.continueBtn.addEventListener('click', () => this.onEnterChatHandler());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
    
    window.addEventListener('beforeunload', () => {
      this.handleDisconnect();
    });
  }

  connectWebSocket() {
    this.websocket = new WebSocket('wss://chat-backend-7jii.onrender.com');

    this.websocket.onopen = () => {
      console.log('WebSocket соединение установлено');
      this.requestUserList();
      if (this.currentUser) {
        this.sendUserJoin();
      }
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Получены данные:', data);
    
        if (Array.isArray(data)) {
          this.users = data;
          this.updateUserList();
        } else if (data.users) {
          this.users = data.users;
          this.updateUserList();
        } else if (data.type === 'user-joined' || data.type === 'user-left') {
          this.requestUserList();
        } else if (data.type === 'send') {
          this.handleIncomingMessage(data);
        }
      } catch (e) {
        console.error('Ошибка парсинга сообщения:', e);
      }
    };

    this.websocket.onclose = () => {
      console.log('WebSocket соединение закрыто');
      setTimeout(() => {
        this.connectWebSocket();
        this.requestUserList();
      }, 5000);
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
    };
  }

  sendUserJoin() {
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: "new-user",
        user: this.currentUser
      }));
    }
  }

  requestUserList() {
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: "get-users"
      }));
    }
  }

  handleDisconnect() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN && this.currentUser) {
      this.websocket.send(JSON.stringify({
        type: "exit",
        user: this.currentUser
      }));
    }
  }

  onEnterChatHandler() {
    const nickname = this.nicknameInput.value.trim();
    
    if (!nickname) {
      this.showError('Пожалуйста, введите никнейм');
      return;
    }
    
    this.checkNicknameAvailability(nickname);
  }

  showError(message) {
    this.errorText.textContent = message;
    setTimeout(() => this.errorText.textContent = '', 3000);
  }

  checkNicknameAvailability(nickname) {
    setTimeout(() => {
      this.currentUser = {
        id: this.generateUUID(),
        name: nickname
      };
      
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.sendUserJoin();
        this.nicknameModal.classList.remove('active');
        this.chatContainer.classList.remove('hidden');
        this.messageInput.focus();
      } else {
        this.showError('Нет соединения с сервером');
      }
    }, 500);
  }

  updateUserList() {
    console.log('Обновление списка пользователей:', this.users);
    console.log('Текущий пользователь:', this.currentUser);
    
    if (!this.userList) {
      console.error('Элемент userList не найден');
      return;
    }
    
    this.userList.innerHTML = '';
    
    if (!this.users || this.users.length === 0) {
      const li = document.createElement('li');
      li.className = 'chat__user';
      li.textContent = 'Нет активных пользователей';
      this.userList.appendChild(li);
      return;
    }
    
    this.users.forEach(user => {
      const li = document.createElement('li');
      li.className = 'chat__user';
      li.textContent = user.name;
      
      if (this.currentUser && user.id === this.currentUser.id) {
        li.textContent += ' (Вы)';
        li.style.fontWeight = 'bold';
        li.style.color = '#2c82e0';
      }
      
      this.userList.appendChild(li);
    });
  }

  handleIncomingMessage(message) {
    if (!message || !message.type) return;
    
    if (message.type === 'send') {
      const isMyMessage = this.currentUser && message.user.id === this.currentUser.id;
      
      if (isMyMessage && this.lastSentMessageId === message.tempId) {
        this.lastSentMessageId = null;
        return;
      }
      
      this.renderMessage(message, isMyMessage);
    }
  }

  sendMessage() {
    const messageText = this.messageInput.value.trim();
    if (!messageText || !this.currentUser) return;
    
    const message = {
      type: "send",
      message: messageText,
      user: this.currentUser,
      tempId: this.generateUUID()
    };
    
    this.lastSentMessageId = message.tempId;
    this.renderMessage(message, true);
    
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      this.showError('Нет соединения с сервером');
    }
    
    this.messageInput.value = '';
  }

  renderMessage(message, isMyMessage) {
    const messageElement = document.createElement('div');
    messageElement.className = `message__container ${isMyMessage ? 'message__container-yourself' : 'message__container-interlocutor'}`;
    
    const senderName = isMyMessage ? 'You' : message.user.name;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString();
    
    messageElement.innerHTML = `
      <div class="message__header">${senderName}, ${time} ${date}</div>
      <div class="message__text">${message.message}</div>
    `;
    
    this.messagesContainer.appendChild(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  generateUUID() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}