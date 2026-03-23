# 🚗 AssamRideConnect API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register User
- **POST** `/auth/register`
- **Description**: Register a new user
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "User registered successfully",
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "isVerified": false,
      "rating": 0
    }
  }
  ```

#### Login User
- **POST** `/auth/login`
- **Description**: Login existing user
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response**: Same as register response

### Rides

#### Get All Rides
- **GET** `/rides`
- **Description**: Get all available rides with optional filters
- **Query Parameters**:
  - `source` (optional): Filter by source location
  - `destination` (optional): Filter by destination location
  - `date` (optional): Filter by date (YYYY-MM-DD)
  - `status` (optional): Filter by status (active, completed, cancelled)
- **Response**:
  ```json
  [
    {
      "_id": "ride-id",
      "driver": {
        "_id": "driver-id",
        "name": "John Doe",
        "rating": 4.5,
        "isVerified": true
      },
      "source": "Guwahati",
      "destination": "Jorhat",
      "date": "2024-01-15T00:00:00.000Z",
      "time": "10:00",
      "availableSeats": 3,
      "pricePerSeat": 500,
      "vehicleType": "car",
      "vehicleNumber": "AS01AB1234",
      "description": "Comfortable ride with AC",
      "status": "active",
      "createdAt": "2024-01-10T10:00:00.000Z"
    }
  ]
  ```

#### Get Single Ride
- **GET** `/rides/:id`
- **Description**: Get details of a specific ride
- **Response**: Single ride object with populated driver and passengers

#### Create Ride
- **POST** `/rides`
- **Description**: Create a new ride offer
- **Body**:
  ```json
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

#### Update Ride
- **PUT** `/rides/:id`
- **Description**: Update ride details
- **Body**: Any ride fields to update

#### Delete Ride
- **DELETE** `/rides/:id`
- **Description**: Delete a ride

### Users

#### Get User Profile
- **GET** `/users/profile?userId=<user-id>`
- **Description**: Get user profile information
- **Response**:
  ```json
  {
    "_id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "isVerified": true,
    "rating": 4.5,
    "totalRides": 25,
    "vehicleInfo": {
      "type": "car",
      "number": "AS01AB1234",
      "model": "Swift",
      "color": "White"
    }
  }
  ```

#### Update User Profile
- **PUT** `/users/profile`
- **Description**: Update user profile information
- **Body**: Any user fields to update

#### Get User's Rides
- **GET** `/users/rides?userId=<user-id>`
- **Description**: Get all rides created by a user

## Error Responses

All endpoints return error responses in the following format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Data Models

### User Schema
```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String (required),
  password: String (required),
  isVerified: Boolean (default: false),
  rating: Number (default: 0),
  totalRides: Number (default: 0),
  vehicleInfo: {
    type: String (enum: ['car', 'bike', 'suv', 'van']),
    number: String,
    model: String,
    color: String
  },
  profilePicture: String,
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  }
}
```

### Ride Schema
```javascript
{
  driver: ObjectId (ref: 'User', required),
  source: String (required),
  destination: String (required),
  date: Date (required),
  time: String (required),
  availableSeats: Number (required, min: 1, max: 10),
  pricePerSeat: Number (required, min: 0),
  vehicleType: String (required, enum: ['car', 'bike', 'suv', 'van']),
  vehicleNumber: String (required),
  description: String (max: 500),
  status: String (enum: ['active', 'completed', 'cancelled'], default: 'active'),
  passengers: [{
    user: ObjectId (ref: 'User'),
    status: String (enum: ['pending', 'confirmed', 'cancelled']),
    seats: Number (default: 1),
    requestedAt: Date
  }],
  route: {
    distance: Number,
    duration: Number,
    waypoints: [String]
  },
  preferences: {
    smoking: Boolean (default: false),
    music: Boolean (default: true),
    pets: Boolean (default: false),
    luggage: Boolean (default: true)
  }
}
``` 