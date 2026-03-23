# 🚗 AssamRideConnect: Smart Carpooling and Rental Platform

A comprehensive carpooling and rental platform designed specifically for intra-Assam travel, connecting drivers with passengers to reduce travel costs and promote sustainable transportation.

## 🎯 Project Overview

**Problem Statement:** People travelling solo or duo within Assam often waste fuel and increase travel costs. At the same time, others struggle to find convenient, affordable, safe rides. There is also no unified digital platform for searching rental cars or drivers efficiently.

## ✨ Key Features

### 🚘 Ride Listing Module
- Users can list upcoming rides with route, date, time, available seats, and price split
- Detailed ride information including vehicle details and driver preferences

### 🔍 Ride Search & Booking
- Search rides by source, destination, date, and time
- Request to join rides with instant notifications
- Filter by price, vehicle type, and user ratings

### 🚙 Rental Car/Driver Search
- Find rental cars or registered drivers within Assam
- Verified driver profiles with vehicle information
- Booking system for rental services

### 👤 User Verification & Rating
- KYC verification for enhanced safety
- Rating and review system for ride reliability
- User profile management with trust scores

### 🔔 Smart Notifications
- Real-time ride status updates
- Booking confirmations and alerts
- Driver-passenger communication

## 🛠 Technology Stack

- **Frontend:** React.js with TypeScript
- **Backend:** Node.js with Express
- **Database:** MongoDB
- **Authentication:** Firebase Auth
- **Maps Integration:** Google Maps API
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit

## 🚀 Future Expansion

- Real-time GPS tracking of rides
- In-app payment integration
- AI-based smart ride recommendations
- Integration with Assam tourism and event updates

## 📁 Project Structure

```
RIDE_CONNECT/
├── frontend/          # React.js frontend application
├── backend/           # Node.js backend API
├── docs/             # Project documentation
└── README.md         # This file
```

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB
- Google Maps API key

### Option 1: Quick Start (Recommended)
```bash
# Make sure MongoDB is running first
# macOS: brew services start mongodb-community
# Windows: net start MongoDB
# Linux: sudo systemctl start mongod

# Then run the development script
./start-dev.sh
```

### Option 2: Manual Setup

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

#### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for Assam's transportation needs** 