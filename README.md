# FlashTalk 💬
  
**Seamless conversations in real-time**

A modern, full-stack real-time chat application built with React, Node.js, and Socket.IO. ChatFlow provides instant messaging with live user status, message history, and a beautiful, responsive interface.

![Screenshot 2025-06-25 004823](https://github.com/user-attachments/assets/b616088e-9f21-4650-adcc-f2dc9998d020)
![image](https://github.com/user-attachments/assets/27185673-d13e-4024-b63b-a9ba1981b717)


## ✨ Features

- **Real-time messaging** - Instant message delivery with Socket.IO
- **Live user status** - See who's online, offline, or away
- **Message history** - Persistent chat history with MongoDB
- **User authentication** - Secure login and registration system
- **Responsive design** - Works perfectly on desktop, tablet, and mobile
- **Modern UI** - Clean, intuitive interface with smooth animations
- **Typing indicators** - See when someone is typing
- **Message timestamps** - Track when messages were sent
- **Emoji support** - Express yourself with emoji reactions
- **File sharing** - Share images and documents (coming soon)

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chatflow.git
   cd chatflow
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chatflow
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=development
   ```

5. **Start the application**
   
   **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm start
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000` to start chatting!

## 🏗️ Project Structure

```
chatflow/
├── backend/
│   ├── package.json
│   ├── server.js              # Express server & Socket.IO setup
│   ├── models/
│   │   └── Message.js         # MongoDB message schema
│   ├── routes/
│   │   └── messages.js        # API routes for messages
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   └── .env                  # Environment variables
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── index.html        # Main HTML template
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Global app styles
│   │   ├── index.js          # React entry point
│   │   ├── index.css         # Global CSS reset & utilities
│   │   ├── components/
│   │   │   ├── Chat.js       # Main chat interface
│   │   │   ├── MessageList.js # Message display component
│   │   │   ├── MessageInput.js # Message input component
│   │   │   ├── UserList.js   # Online users sidebar
│   │   │   └── LoginForm.js  # User authentication
│   │   └── services/
│   │       └── socket.js     # Socket.IO client setup
└── README.md
```

## 🛠️ Technology Stack

### Frontend
- **React** - Modern UI library
- **Socket.IO Client** - Real-time communication
- **CSS3** - Styling with animations and responsive design
- **HTML5** - Semantic markup

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Messages
- `GET /api/messages` - Get message history
- `POST /api/messages` - Send a new message
- `DELETE /api/messages/:id` - Delete a message

### Socket Events
- `connection` - User connects
- `join_room` - Join a chat room
- `send_message` - Send message to room
- `receive_message` - Receive new message
- `user_typing` - User typing indicator
- `user_online` - User online status
- `disconnect` - User disconnects

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
PORT=5000                                    # Server port
MONGODB_URI=mongodb://localhost:27017/chatflow # Database connection
JWT_SECRET=your-super-secret-jwt-key         # JWT signing secret
NODE_ENV=development                         # Environment mode
CORS_ORIGIN=http://localhost:3000           # Frontend URL
```

### Database Setup

**MongoDB Local:**
```bash
# Install MongoDB
brew install mongodb/brew/mongodb-community

# Start MongoDB
brew services start mongodb-community

# Connect to MongoDB
mongosh
```

**MongoDB Atlas (Cloud):**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## 🎨 Customization

### Themes
Edit `src/index.css` to customize colors and themes:
```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --accent-color: #f093fb;
}
```

### Socket Configuration
Modify `src/services/socket.js` for custom Socket.IO settings:
```javascript
const socketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
};
```

## 🚀 Deployment

### Frontend (Netlify/Vercel)
```bash
cd frontend
npm run build
# Deploy 'build' folder
```

### Backend (Heroku/Railway)
```bash
cd backend
# Add Procfile: web: node server.js
git push heroku main
```

### Full Stack (Docker)
```dockerfile
# Coming soon - Docker configuration
```

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run e2e tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Socket.IO](https://socket.io/) - Real-time communication
- [React](https://reactjs.org/) - UI framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Express.js](https://expressjs.com/) - Backend framework

## 📞 Support

- **Documentation:** [Link to docs]
- **Issues:** [GitHub Issues](https://github.com/yourusername/chatflow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/chatflow/discussions)
- **Email:** support@chatflow.com

## 🔮 Roadmap

- [ ] File sharing and image uploads
- [ ] Voice and video calls
- [ ] Message reactions and replies
- [ ] Private messaging
- [ ] Chat rooms and channels
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Message encryption
- [ ] Bot integration
- [ ] Admin dashboard

---

**Made with ❤️ by [Your Name]**

*Star ⭐ this repository if you found it helpful!*

