document.addEventListener('DOMContentLoaded', function() {
  const nicknameModal = document.getElementById('nicknameModal');
  const nicknameInput = document.getElementById('nicknameInput');
  const continueBtn = document.getElementById('continueBtn');
  const errorText = document.getElementById('errorText');
  const chatContainer = document.getElementById('chatContainer');
  const messagesContainer = document.getElementById('messagesContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const userList = document.getElementById('userList');

  let socket;
  let currentUser = null;

  nicknameModal.style.display = 'flex';

  function connectWebSocket() {
      socket = new WebSocket('wss://your-render-app.onrender.com');

      socket.onopen = function() {
          console.log('WebSocket connection established');
      };

      socket.onmessage = function(event) {
          const data = JSON.parse(event.data);
          
          if (Array.isArray(data)) {
              updateUserList(data);
          } else {
              handleIncomingMessage(data);
          }
      };

      socket.onclose = function() {
          console.log('WebSocket connection closed');
          setTimeout(connectWebSocket, 5000);
      };

      socket.onerror = function(error) {
          console.error('WebSocket error:', error);
      };
  }

  continueBtn.addEventListener('click', function() {
      const nickname = nicknameInput.value.trim();
      
      if (!nickname) {
          errorText.textContent = 'Пожалуйста, введите никнейм';
          return;
      }
      
      checkNicknameAvailability(nickname);
  });

  function checkNicknameAvailability(nickname) {
      
      connectWebSocket();
      
      setTimeout(() => {
          currentUser = {
              id: generateUUID(),
              name: nickname
          };
          
          socket.send(JSON.stringify({
              type: "new-user",
              user: currentUser
          }));
          
          nicknameModal.style.display = 'none';
          chatContainer.classList.remove('hidden');
          
          messageInput.focus();
      }, 500);
  }

  function updateUserList(users) {
      userList.innerHTML = '';
      users.forEach(user => {
          const li = document.createElement('li');
          li.textContent = user.name;
          userList.appendChild(li);
      });
  }

  function handleIncomingMessage(message) {
      if (message.type === 'exit') {
          return;
      }
      
      if (message.type === 'send') {
          const isMyMessage = currentUser && message.user.id === currentUser.id;
          addMessageToChat(message, isMyMessage);
      }
  }

  function addMessageToChat(message, isMyMessage) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message');
      messageElement.classList.add(isMyMessage ? 'message-mine' : 'message-theirs');
      
      const senderName = isMyMessage ? 'You' : message.user.name;
      const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const date = new Date().toLocaleDateString();
      
      messageElement.innerHTML = `
          <strong>${senderName}</strong>, ${timestamp} ${date}<br>
          ${message.message}
      `;
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function sendMessage() {
      const messageText = messageInput.value.trim();
      
      if (!messageText || !currentUser) return;
      
      const message = {
          type: "send",
          message: messageText,
          user: currentUser
      };
      
      socket.send(JSON.stringify(message));
      addMessageToChat(message, true);
      messageInput.value = '';
  }

  sendBtn.addEventListener('click', sendMessage);
  
  messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
          sendMessage();
      }
  });

  window.addEventListener('beforeunload', function() {
      if (socket && socket.readyState === WebSocket.OPEN && currentUser) {
          socket.send(JSON.stringify({
              type: "exit",
              user: currentUser
          }));
      }
  });

  function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
  }
});