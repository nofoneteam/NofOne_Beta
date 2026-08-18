# NoFone - Health Management & AI Chat Application

A full-stack health management platform with integrated AI-powered health chatbot, medical report management, and comprehensive user health tracking.

## Overview

NoFone is a modern health management application that combines user authentication, health profile management, AI-powered health chatbot, medical report handling, and admin capabilities. The application uses a robust backend API with real-time chat capabilities and a responsive Next.js frontend.

## Features

### User Authentication & Management
- Secure user registration and login with email verification
- OTP-based authentication
- Role-based access control (User, Admin)
- Session management
- JWT-based authentication

### Health Tracking
- **Health Profiles**: Manage personal health information and medical history
- **Daily Health Logs**: Track daily health activities, symptoms, and vitals
- **Medical Reports**: Upload, manage, and organize medical reports
- **Report Sharing**: Share medical reports with healthcare providers securely

### AI-Powered Chat
- **Health Chat Agent**: Intelligent chatbot for health-related queries
- **Chat Memory**: Maintain conversation history and context
- **Chat Configuration**: Personalized chat settings
- **Real-time Messaging**: WebSocket-based real-time communication

### Admin Dashboard
- User management and oversight
- System logs and monitoring
- Health data analytics
- Admin controls for report verification

### Additional Features
- **Reminders**: Set and manage health reminders (medications, appointments, etc.)
- **reCAPTCHA Integration**: Enhanced security for user interactions
- **File Upload**: Secure file uploads for medical reports using Cloudinary
- **Rate Limiting**: API rate limiting for security
- **Error Handling**: Comprehensive error management and logging

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Real-time Features**: Redis, Socket.io
- **File Storage**: Cloudinary
- **Security**: JWT, bcrypt, reCAPTCHA

### Frontend
- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: CSS/Tailwind CSS (based on configuration)
- **State Management**: React Context/Hooks
- **API Communication**: Axios/Fetch API

## Project Structure

```
nofone/
├── backend/
│   ├── src/
│   │   ├── app.js                 # Express app configuration
│   │   ├── config/                # Configuration files (Firebase, Cloudinary, Env)
│   │   ├── controllers/           # Route handlers
│   │   ├── middlewares/           # Express middlewares
│   │   ├── models/                # Database models
│   │   ├── routes/                # API routes
│   │   ├── services/              # Business logic
│   │   ├── utils/                 # Utility functions
│   │   ├── validations/           # Input validation schemas
│   │   └── mcp/                   # MCP server setup
│   ├── server.js                  # Server entry point
│   ├── package.json
│   └── serviceAccountKey.json     # Firebase credentials
│
├── frontend/
│   ├── app/                       # Next.js app router
│   ├── components/                # React components
│   ├── lib/                       # Utility libraries
│   ├── types/                     # TypeScript type definitions
│   ├── public/                    # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── eslint.config.mjs
│
├── README.md                      # This file
├── AUTHENTICATION_STATE.md        # Auth configuration guide
└── RECAPTCHA_SETUP.md            # reCAPTCHA setup guide
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Firebase account and project
- Cloudinary account for file uploads
- Redis server (for caching and real-time features)
- Email service provider (SMTP configuration)

### Backend Setup

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update with your Firebase credentials, Cloudinary API keys, etc.

4. **Start the server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:5000` (or configured PORT)

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend/none
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Create `.env.local` file with API endpoints and other configurations

4. **Start development server**
   ```bash
   npm run dev
   ```
   Application runs on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/otp-send` - Send OTP
- `POST /api/auth/otp-verify` - Verify OTP

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/health-profile` - Get health profile
- `PUT /api/user/health-profile` - Update health profile

### Health Logs
- `GET /api/logs` - Get health logs
- `POST /api/logs` - Create health log
- `PUT /api/logs/:id` - Update health log
- `DELETE /api/logs/:id` - Delete health log

### Chat
- `GET /api/chat/history` - Get chat history
- `POST /api/chat/message` - Send message to chat agent
- `GET /api/chat/config` - Get chat configuration
- `PUT /api/chat/config` - Update chat configuration

### Medical Reports
- `GET /api/reports` - Get medical reports
- `POST /api/reports/upload` - Upload medical report
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report
- `GET /api/reports/shared` - Get shared reports

### Reminders
- `GET /api/reminders` - Get reminders
- `POST /api/reminders` - Create reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/logs` - System logs
- `GET /api/admin/analytics` - Health data analytics

## Configuration Files

### AUTHENTICATION_STATE.md
Detailed guide on authentication configuration, including:
- JWT setup
- OTP configuration
- Session management
- Role-based access control

### RECAPTCHA_SETUP.md
Instructions for setting up Google reCAPTCHA integration for enhanced security.

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation
- **reCAPTCHA**: Bot protection on user interactions
- **CORS Configuration**: Cross-origin request handling
- **Error Middleware**: Secure error handling without exposing sensitive info
- **Session Management**: Secure session handling with refresh tokens

## Testing

Various test files are included in the backend:
- `test_validation.js`
- `test_validation2.js` - `test_validation6.js`
- `test-validation.js`

Run tests using:
```bash
npm test
```

## Deployment

### Backend Deployment
The backend can be deployed to:
- AWS EC2 / ECS / Elastic Beanstalk
- Google Cloud Platform
- Azure App Service
- Heroku
- DigitalOcean

### Frontend Deployment
The Next.js frontend can be deployed to:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Azure Static Web Apps

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For support, please contact the development team or open an issue in the repository.

---

## Developer

**Developed by Anubhav Mishra**

GitHub: [@Rheosta561](https://github.com/Rheosta561)

Feel free to reach out for collaboration, feedback, or questions about this project!

---

**Last Updated**: August 2026
