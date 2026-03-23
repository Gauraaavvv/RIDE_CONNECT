# 🚀 Backend Deployment Guide - Render.com

## 📋 Prerequisites
- GitHub account with repository access
- MongoDB Atlas account
- 5 minutes

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### **Step 1: Go to Render.com**
1. Visit https://render.com
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize GitHub access

### **Step 2: Create New Web Service**
1. Click "New +" → "Web Service"
2. Select your GitHub repository
3. Click "Connect"

### **Step 3: Configure Service**
Fill in these exact values:

| Field | Value |
|-------|-------|
| **Name** | `assam-ride-connect-backend` |
| **Region** | `Oregon (us-west-2)` or nearest |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### **Step 4: Add Environment Variables**
Scroll down to "Environment Variables" and add these:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `YOUR_MONGO_URI` |
| `JWT_SECRET` | `YOUR_SECRET` |
| `CORS_ORIGINS` | `https://client-cyan-rho-21.vercel.app` |

**Where to get these values:**

1. **MongoDB URI**:
   - Go to https://cloud.mongodb.com
   - Create cluster → Database Access → Create user
   - Network Access → Add IP: `0.0.0.0/0`
   - Click "Connect" → "Connect your application"
   - Copy the connection string

2. **JWT Secret**:
   - Generate here: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
   - Use 256-bit key
   - Example: `abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

### **Step 5: Deploy**
1. Click "Create Web Service"
2. Wait 2-3 minutes for deployment
3. Copy your backend URL: `https://assam-ride-connect-backend.onrender.com`

---

## ✅ VERIFICATION

### **Check if Backend is Live**
1. Open your backend URL in browser
2. Add `/api/health` at the end
3. Should see: `{"status":"success","message":"Backend is healthy"}`

**Example**: `https://assam-ride-connect-backend.onrender.com/api/health`

### **Test API Endpoints**
```bash
# Test health endpoint
curl https://YOUR_BACKEND_URL.onrender.com/api/health

# Test auth endpoint (should return error for missing token)
curl https://YOUR_BACKEND_URL.onrender.com/api/auth/me
```

---

## 🚨 TROUBLESHOOTING

### **Service Not Starting**
- Check Render logs for errors
- Verify MongoDB URI is correct
- Ensure JWT_SECRET is set

### **CORS Errors**
- Verify CORS_ORIGINS includes your frontend URL
- Check frontend URL matches exactly

### **Database Connection Failed**
- Verify MongoDB cluster is running
- Check IP access (0.0.0.0/0)
- Ensure user has read/write permissions

---

## 📝 NEXT STEPS

After backend is deployed:
1. Copy your backend URL
2. Update frontend environment variables
3. Deploy frontend to Vercel
4. Test complete application

---

## 🎯 QUICK COPY-PASTE VALUES

**Environment Variables (copy these):**
```
NODE_ENV=production
MONGODB_URI=YOUR_MONGO_URI
JWT_SECRET=YOUR_SECRET
CORS_ORIGINS=https://client-cyan-rho-21.vercel.app
```

**Build Settings (copy these):**
```
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

---

**🎉 Your backend will be live at: `https://assam-ride-connect-backend.onrender.com`**
