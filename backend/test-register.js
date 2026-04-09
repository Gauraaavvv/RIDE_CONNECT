// Test script for register endpoint
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth/register';

const testCases = [
  {
    name: 'Valid new user',
    data: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'password123'
    },
    expectedStatus: 201
  },
  {
    name: 'Duplicate email',
    data: {
      name: 'Test User 2',
      email: 'test@example.com',
      phone: '9876543211',
      password: 'password123'
    },
    expectedStatus: 400
  },
  {
    name: 'Duplicate phone',
    data: {
      name: 'Test User 3',
      email: 'test2@example.com',
      phone: '9876543210',
      password: 'password123'
    },
    expectedStatus: 400
  },
  {
    name: 'Missing name',
    data: {
      email: 'test3@example.com',
      phone: '9876543212',
      password: 'password123'
    },
    expectedStatus: 400
  },
  {
    name: 'Invalid email',
    data: {
      name: 'Test User 4',
      email: 'invalid-email',
      phone: '9876543213',
      password: 'password123'
    },
    expectedStatus: 400
  },
  {
    name: 'Short password',
    data: {
      name: 'Test User 5',
      email: 'test4@example.com',
      phone: '9876543214',
      password: '123'
    },
    expectedStatus: 400
  },
  {
    name: 'Empty payload',
    data: {},
    expectedStatus: 400
  },
  {
    name: 'Null values',
    data: {
      name: null,
      email: null,
      phone: null,
      password: null
    },
    expectedStatus: 400
  }
];

async function runTests() {
  console.log('=== Testing Register Endpoint ===');
  
  for (const testCase of testCases) {
    try {
      console.log(`\nTesting: ${testCase.name}`);
      console.log('Request body:', testCase.data);
      
      const response = await axios.post(API_URL, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on error status
      });
      
      console.log(`Status: ${response.status}`);
      console.log('Response:', response.data);
      
      if (response.status === testCase.expectedStatus) {
        console.log('PASS');
      } else {
        console.log(`FAIL - Expected ${testCase.expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      console.log(`ERROR - ${error.message}`);
      console.log('This indicates a server crash (502)');
    }
  }
  
  console.log('\n=== Test Complete ===');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testCases };
