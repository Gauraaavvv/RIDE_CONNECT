# 🚀 AssamRideConnect Setup Guide

This guide will help you set up the AssamRideConnect project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB** (v5 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

## Project Structure

```
RIDE_CONNECT/
├── frontend/          # React.js frontend application
├── backend/           # Node.js backend API
├── docs/             # Project documentation
└── README.md         # Main project README
```

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the backend directory:
```bash
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/assam-ride-connect

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Windows
net start MongoDB

# On Linux
sudo systemctl start mongod
```

### 5. Start Backend Server
```bash
npm run dev
```

The backend API will be available at `http://localhost:5000`

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm start
```

The frontend application will be available at `http://localhost:3000`

## Database Setup

### MongoDB Collections
The application will automatically create the following collections:
- `users` - User accounts and profiles
- `rides` - Ride listings and bookings

### Sample Data (Optional)
You can add sample data to test the application:

```javascript
// Connect to MongoDB and run these commands
use assam-ride-connect

// Sample user
db.users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  phone: "9876543210",
  password: "$2a$10$hashedpassword",
  isVerified: true,
  rating: 4.5,
  totalRides: 10
})

// Sample ride
db.rides.insertOne({
  driver: ObjectId("user-id-here"),
  source: "Guwahati",
  destination: "Jorhat",
  date: new Date("2024-01-15"),
  time: "10:00",
  availableSeats: 3,
  pricePerSeat: 500,
  vehicleType: "car",
  vehicleNumber: "AS01AB1234",
  description: "Comfortable ride with AC",
  status: "active"
})
```

## API Testing

### Using Postman or Similar Tools

1. **Register a User**
   ```
   POST http://localhost:5000/api/auth/register
   Content-Type: application/json
   
   {
     "name": "Test User",
     "email": "test@example.com",
     "phone": "9876543210",
     "password": "password123"
   }
   ```

2. **Login**
   ```
   POST http://localhost:5000/api/auth/login
   Content-Type: application/json
   
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```

3. **Get All Rides**
   ```
   GET http://localhost:5000/api/rides
   ```

4. **Create a Ride**
   ```
   POST http://localhost:5000/api/rides
   Content-Type: application/json
   
   {
     "source": "Guwahati",
     "destination": "Jorhat",
     "date": "2024-01-15",
     "time": "10:00",
     "availableSeats": 3,
     "pricePerSeat": 500,
     "vehicleType": "car",
     "vehicleNumber": "AS01AB1234",
     "description": "Comfortable ride with AC"
   }
   ```

## Development Workflow

### Backend Development
1. Make changes to files in `backend/src/`
2. The server will automatically restart (thanks to nodemon)
3. Test API endpoints using Postman or curl

### Frontend Development
1. Make changes to files in `frontend/src/`
2. The development server will automatically reload
3. View changes in your browser

### Database Changes
1. Modify models in `backend/src/models/`
2. Restart the backend server
3. The changes will be applied automatically

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in `.env`
   - Verify MongoDB is accessible on the default port (27017)

2. **Port Already in Use**
   - Change the PORT in `.env` file
   - Kill processes using the port: `lsof -ti:5000 | xargs kill -9`

3. **Module Not Found Errors**
   - Run `npm install` in the respective directory
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`

4. **CORS Errors**
   - Ensure the frontend is running on the correct port
   - Check CORS configuration in `backend/src/app.js`

### Getting Help

- Check the console logs for error messages
- Review the API documentation in `docs/API_DOCUMENTATION.md`
- Ensure all prerequisites are properly installed

## Next Steps

After successful setup:

1. **Explore the Codebase**
   - Review the project structure
   - Understand the data models
   - Familiarize yourself with the API endpoints

2. **Add Features**
   - Implement authentication middleware
   - Add ride booking functionality
   - Integrate Google Maps API
   - Add real-time notifications

3. **Testing**
   - Write unit tests for backend
   - Add integration tests
   - Test the complete user flow

4. **Deployment**
   - Set up production environment
   - Configure environment variables
   - Deploy to cloud platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy Coding! 🚗💨** 