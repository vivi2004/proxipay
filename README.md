# **Proxipay**

Proxipay is a mobile payment application that enables offline peer-to-peer transactions using Bluetooth Low Energy (BLE). Users can send and receive payments without internet connectivity, with all transactions securely stored locally and synchronized when network access is restored.

Built with **React Native**, **Expo**, **Node.js**, and **MongoDB** for a complete offline-first payment solution.

---

## **Features**

### Core Features
* 🔷 **Offline Bluetooth Payments** - Send and receive money using BLE without internet
* 🔐 **Secure Authentication** - Email verification with OTP-based login system
* 💾 **Local Transaction Storage** - Store transactions offline and sync when online
* 🔑 **MPIN Security** - Secure MPIN for transaction authorization
* 💰 **Wallet Management** - Local wallet balance tracking and management
* 📱 **Clean UI** - Intuitive interface for money transfers and account management

### Security Features
* Ed25519 cryptographic signatures for transaction verification
* JWT-based authentication
* Bcrypt password hashing
* Session nonce for replay attack prevention
* Certificate-based vendor verification

---

## **Tech Stack**

### Frontend (Mobile App)
* **React Native** 0.81.4
* **Expo** ~54.0.0
* **TypeScript** ~5.8.3
* **React Navigation** 7.x - Navigation system
* **Axios** 1.11.0 - HTTP client
* **@noble/ed25519** - Cryptographic signatures
* **@noble/hashes** - Cryptographic hashing
* **AsyncStorage** - Secure local storage

### Backend (API)
* **Node.js** 22.x
* **Express** 5.1.0
* **MongoDB** with Mongoose 8.18.0
* **JWT** - Token-based authentication
* **Bcrypt.js** - Password encryption
* **Nodemailer** - Email OTP delivery
* **CORS** enabled

---

## **Prerequisites**

Before you begin, ensure you have the following installed:

* **Node.js** (version 22.19.0 or higher recommended for backend compatibility)
* **npm** or **yarn**
* **MongoDB** (local installation or MongoDB Atlas account)
* **Expo CLI** (`npm install -g @expo/cli`)
* **Git**
* A mobile device or emulator for testing (iOS/Android)

---

## **Project Structure**

```
proxipay/
├── proxipay-backend/          # Node.js Express API server
│   ├── src/
│   │   ├── index.js          # Server entry point
│   │   ├── models/           # MongoDB models
│   │   │   └── User.js       # User schema
│   │   ├── routes/           # API routes
│   │   │   └── authRoutes.js # Authentication endpoints
│   │   ├── middleware/       # Express middleware
│   │   │   └── auth.middleware.js
│   │   └── lib/              # Database connection
│   │       └── db.js
│   └── package.json
│
├── proxipay-frontend/         # React Native Expo mobile app
│   ├── App.tsx               # Main app component
│   ├── src/
│   │   ├── screens/          # App screens
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignUpScreen.tsx
│   │   │   ├── HomePage.tsx
│   │   │   └── MoneyTransferScreen.tsx
│   │   ├── services/         # Business logic
│   │   │   ├── blePayment.ts        # BLE payment handling
│   │   │   ├── offlineStorage.ts    # Offline data storage
│   │   │   ├── walletStorage.ts     # Wallet management
│   │   │   └── mpinStorage.ts       # MPIN management
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── navigation/       # Navigation types
│   │   └── api.ts           # API client configuration
│   └── package.json
│
└── README.md                 # This file
```

---

## **Installation & Setup**

### 1. Clone the Repository

```bash
git clone https://github.com/vivi2004/proxipay.git
cd proxipay
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd proxipay-backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `proxipay-backend` directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/proxipay
JWT_SECRET=your_jwt_secret_key_here

# Optional: Email configuration for OTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
```

**Important Notes:**
- Replace `your_jwt_secret_key_here` with a strong random string
- For Gmail, you'll need to use an App Password (not your regular password)
- If email credentials are not provided, OTPs will be logged to the console

#### Start MongoDB

Ensure MongoDB is running on your system:

```bash
# For local MongoDB
mongod

# Or use MongoDB Atlas cloud connection string in MONGODB_URI
```

#### Run the Backend Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Frontend Setup

#### Install Dependencies

Open a new terminal window:

```bash
cd proxipay-frontend
npm install
```

#### Configure Environment Variables (Optional)

Create a `.env` file in the `proxipay-frontend` directory if you need to customize the API URL:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

**Note:** The app automatically detects the correct API URL based on your device (see `src/api.ts` for implementation):
- Android Emulator: `http://10.0.2.2:3000/api`
- iOS Simulator: `http://localhost:3000/api`
- Physical Device: Uses your development machine's IP address (e.g., `http://192.168.1.100:3000/api`), extracted from Expo's `hostUri` configuration

#### Start the Expo Development Server

```bash
npm start
```

This will open Expo DevTools in your browser. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on your physical device

---

## **Usage**

### First Time Setup

1. **Create an Account**
   - Open the app and tap "Sign Up"
   - Enter your email, username, and password (minimum 6 characters)
   - Check your email for the OTP verification code
   - Enter the OTP to verify your account

2. **Login**
   - Enter your registered email
   - Choose password or OTP login method
   - For OTP login, request an OTP and enter it

3. **Set Up MPIN**
   - After login, set up a 4-6 digit MPIN for transaction security

### Making a Payment

1. **Enable Bluetooth** on your device
2. Navigate to **Money Transfer** screen
3. Select **Send Payment** mode
4. Nearby vendors will appear automatically via BLE
5. Select a vendor from the list
6. Enter the payment amount
7. Confirm with your MPIN
8. The transaction is completed offline and stored locally

### Receiving a Payment

1. Navigate to **Money Transfer** screen
2. Select **Receive Payment** mode
3. Your device will advertise as a vendor via BLE
4. Wait for a payer to connect and send payment
5. View the transaction in your wallet

### Syncing Transactions

When internet connectivity is restored:
- Transactions are automatically synced to the backend
- Wallet balances are updated
- Transaction history is synchronized

---

## **API Endpoints**

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/verify-otp` | Verify email with OTP |
| POST | `/api/auth/send-otp` | Request OTP for login |
| POST | `/api/auth/login` | Login with password or OTP |

#### Request/Response Examples

**Register User**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Login with Password**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Login with OTP**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

---

## **Architecture Overview**

### Offline Payment Flow

1. **Vendor Advertisement**
   - Vendor device broadcasts BLE advertisement with session nonce
   - Advertisement includes vendor ID, public key, and certificate

2. **Payment Creation**
   - Payer selects vendor and enters amount
   - Payer signs transaction with Ed25519 private key
   - Signed payload includes: amount, payer ID, vendor ID, session nonce

3. **BLE Transfer**
   - Signed transaction transmitted via BLE to vendor
   - Vendor verifies signature and certificate
   - Vendor sends acknowledgment back to payer

4. **Local Storage**
   - Both devices store transaction in local storage
   - Transaction marked as "pending sync"

5. **Online Sync**
   - When online, transactions are pushed to backend API
   - Backend validates and records transactions
   - Wallet balances updated on server

### Security Model

- **Ed25519 Signatures**: All transactions cryptographically signed
- **Session Nonces**: Prevent replay attacks
- **Certificate Chain**: Vendor authentication and authorization
- **MPIN Protection**: User authorization for each transaction
- **JWT Tokens**: Secure API authentication

---

## **Development**

### Running Tests

```bash
# Backend tests (if configured)
cd proxipay-backend
npm test

# Frontend tests (if configured)
cd proxipay-frontend
npm test
```

### Building for Production

This project uses Expo ~54.0.0. For production builds, **EAS Build** is the recommended modern approach.

#### Setup EAS Build
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure EAS Build
cd proxipay-frontend
eas build:configure
```

#### Build for Android
```bash
cd proxipay-frontend
eas build --platform android
```

#### Build for iOS
```bash
cd proxipay-frontend
eas build --platform ios
```

For more information, visit the [EAS Build documentation](https://docs.expo.dev/build/introduction/).

---

## **Troubleshooting**

### Common Issues

**Backend won't start:**
- Ensure MongoDB is running
- Check that port 3000 is not in use
- Verify environment variables are set correctly

**Frontend can't connect to backend:**
- Check that backend is running on port 3000
- For Android emulator, ensure using `http://10.0.2.2:3000/api`
- For physical device, ensure both devices are on same network

**Bluetooth not working:**
- Ensure Bluetooth permissions are granted in device settings
- BLE requires physical devices (not available in most emulators)
- Check that Bluetooth is enabled on both devices

**Email OTP not received:**
- Check email credentials in backend `.env` file
- For Gmail, use App Password (2FA must be enabled)
- Check spam folder
- Check console logs for OTP (if email not configured)

---

## **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## **License**

This project is licensed under the MIT License.

---

## **Acknowledgments**

* Built with React Native and Expo for cross-platform mobile development
* Uses noble cryptography libraries for secure transactions
* Inspired by the need for offline payment solutions in areas with limited connectivity

---

## **Contact**

For questions or support, please open an issue on GitHub.

**Project Link:** [https://github.com/vivi2004/proxipay](https://github.com/vivi2004/proxipay)
