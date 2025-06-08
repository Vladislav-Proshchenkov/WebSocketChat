import './css/style.css';
import './css/modal.css';
import Chat from './js/Chat.js';

const root = document.getElementById('root');
const app = new Chat(root);
app.init();