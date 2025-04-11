# ConfApp - Modern Conference Platform

![ConfApp Screenshot](https://via.placeholder.com/800x450)

A sleek, minimalist web application for hosting virtual conferences with real-time chat and video functionality.

## Features

- **Video Conferencing**: Connect with multiple participants via WebRTC
- **Real-time Chat**: Message all participants seamlessly
- **Responsive Design**: Works on all devices - mobile, tablet, and desktop
- **Modern UI**: Clean, intuitive interface built with React and Tailwind CSS

## Getting Started

### Quick Start (3 steps)

1. **Install dependencies**

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install
```

2. **Build the frontend**

```bash
cd client && npm run build
```

3. **Start the server**

```bash
npm start
```

Then open your browser to http://localhost:3000

## Development Mode

Run the backend and frontend development servers concurrently:

```bash
# In the root directory
npm run dev
```

## Tech Stack

- **Frontend**: React, Tailwind CSS, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Real-time Communication**: WebRTC, Socket.IO

## License

MIT