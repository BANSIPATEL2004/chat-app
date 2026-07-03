# 💬 ChatFlow — Real-time Chat App

A full-stack MERN + Socket.io real-time chat application with proper MVC architecture.

## 🏗 Project Structure

```
chat-app/
├── backend/                    # Express.js + Socket.io API
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/           # MVC Controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware
│   │   └── errorHandler.js
│   ├── models/                # Mongoose models
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── Conversation.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── messageRoutes.js
│   ├── socket/
│   │   └── socketManager.js   # Socket.io logic
│   ├── utils/
│   │   ├── jwt.js
│   │   └── response.js
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/                  # React + Vite + Tailwind
    ├── src/
    │   ├── api/               # Axios API layer
    │   ├── components/
    │   │   ├── chat/          # Chat components
    │   │   ├── layout/        # Layout components
    │   │   └── ui/            # Reusable UI
    │   ├── context/           # React contexts
    │   ├── hooks/             # Custom hooks
    │   ├── pages/             # Page components
    │   └── utils/             # Utilities
    ├── .env
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## ✨ Features

- 🔐 **JWT Authentication** — Register, Login, secure routes
- 💬 **Real-time messaging** — Socket.io powered 1-to-1 chat
- 🟢 **Online/Offline status** — Live presence tracking
- ⌨️ **Typing indicators** — Real-time typing events with debouncing
- ✅ **Read receipts** — Single/double checkmarks
- 🗑️ **Delete messages** — Soft delete with socket sync
- 🔍 **User search** — Find users to chat with
- 📋 **Conversation list** — With unread badge counts
- 📱 **Responsive UI** — Mobile-first with sidebar toggle
- 🎨 **Dark theme** — Polished deep-dark UI

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open Browser

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health check:** http://localhost:5000/health

## 🔧 Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```
VITE_SOCKET_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api
```

## 🌐 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/logout | Logout |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/users | Get all users |
| GET | /api/users/search?q= | Search users |
| GET | /api/users/:id | Get user by ID |
| PUT | /api/users/profile | Update profile |

### Messages
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/messages/conversations | Get conversations |
| GET | /api/messages/:userId | Get messages with user |
| POST | /api/messages/send/:receiverId | Send message |
| DELETE | /api/messages/:messageId | Delete message |

## ⚡ Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `typing` | `{ receiverId }` | User started typing |
| `stopTyping` | `{ receiverId }` | User stopped typing |
| `messageRead` | `{ senderId, messageId }` | Acknowledge message read |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `newMessage` | `message` | New message received |
| `userTyping` | `{ senderId, isTyping }` | Typing status |
| `userOnline` | `{ userId, isOnline }` | User presence change |
| `onlineUsers` | `string[]` | All online user IDs |
| `messageDeleted` | `{ messageId }` | Message was deleted |
| `messagesRead` | `{ by }` | Messages marked read |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| State | React Context + Hooks |
| Routing | React Router v6 |
| HTTP | Axios |
| Real-time | Socket.io Client |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io Server |
