# 🎭 Mafioso - Mafia/Gangster Browser Game

A World Mini App built with React TypeScript and AWS Serverless architecture. Build your criminal empire from the streets to the penthouse!

## 🎮 Game Features

- **20 Ranks**: Progress from Beggar to Mafioso
- **5 Cities**: Expand your empire across London, Tokyo, New York, Moscow, and Palermo
- **11 Crimes**: Various criminal activities with different risks and rewards
- **Car Collection**: 11 vehicles from Fiat 500 to Ferrari LaFerrari
- **World ID Authentication**: Unique player verification ensuring fair gameplay

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with custom mafia theme
- **Zustand** for state management
- **React Router** for navigation
- **World ID Kit** for authentication

### Backend
- **AWS Lambda** functions (Node.js 18)
- **DynamoDB** for data storage
- **API Gateway** for REST endpoints
- **CloudFront** for frontend distribution
- **SAM (Serverless Application Model)** for infrastructure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured
- SAM CLI installed
- World ID App ID (for production)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm run build
sam local start-api
```

### Deploy to AWS
```bash
# Deploy infrastructure
cd infrastructure
sam deploy --guided

# Build and deploy frontend
cd ../frontend
npm run build
aws s3 sync dist/ s3://your-frontend-bucket/
```

## 🎯 Game Mechanics

### Rank System
Players progress through 20 ranks based on respect earned:
- **Beggar** (0 respect) → **Mafioso** (1T+ respect)
- Higher ranks unlock better crimes and opportunities

### Crime System
- **11 different crimes** with varying difficulty and rewards
- **Success rates** based on player rank, nerve, and RNG
- **Cooldown system** prevents spam
- **Consequences**: Jail time or hospitalization for failures

### Economy
- **Money**: Earned through successful crimes
- **Respect**: Gained through criminal activities, determines rank
- **Nerve**: Required for crimes, regenerates over time

### Travel & Cars
- **5 cities** to explore and operate in
- **Travel costs** and time delays
- **11 vehicles** providing gameplay bonuses

## 🗂️ Project Structure

```
mafioso/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand store
│   │   ├── hooks/          # Custom React hooks
│   │   └── types/          # TypeScript definitions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                  # AWS Lambda functions
│   ├── functions/
│   │   ├── auth/           # Authentication functions
│   │   ├── crimes/         # Crime system functions
│   │   ├── player/         # Player management
│   │   └── combat/         # Future combat system
│   ├── shared/             # Backend utilities
│   └── package.json
├── shared/                   # Shared types and constants
│   ├── types.ts            # TypeScript interfaces
│   └── constants.ts        # Game constants
├── infrastructure/           # AWS SAM templates
│   └── template.yaml       # CloudFormation template
└── README.md
```

## 🔧 Environment Variables

### Frontend (.env)
```bash
VITE_API_ENDPOINT=https://api.mafioso.game
VITE_AWS_REGION=us-east-1
VITE_WORLDCOIN_APP_ID=app_your_world_id
```

### Backend (SAM template)
```bash
JWT_SECRET=your-jwt-secret
WORLD_ID_APP_ID=app_your_world_id
```

## 🛡️ Security Features

- **World ID verification** ensures one account per person
- **JWT authentication** for API security
- **Input validation** on all endpoints
- **Rate limiting** through API Gateway
- **CORS configuration** for frontend access

## 📊 Database Schema

### Players Table
- Primary Key: `worldId`
- Attributes: money, respect, nerve, rank, city, carId, stats, timestamps

### World ID Table
- Primary Key: `nullifierHash`
- Attributes: worldId, proof, verified, timestamp

### Cooldowns Table
- Primary Key: `playerId`, `crimeId`
- TTL enabled for automatic cleanup

### Crime History Table
- Primary Key: `id`
- GSI: `playerId-timestamp`
- TTL enabled for data retention

## 🚀 Deployment

### Development
```bash
# Start local development
npm run dev:frontend
npm run dev:backend
```

### Staging
```bash
sam deploy --config-env staging
```

### Production
```bash
sam deploy --config-env prod
```

## 🎮 Game Balance

The game is designed with carefully balanced mechanics:
- **Progressive difficulty**: Higher crimes require higher ranks
- **Risk vs Reward**: Better payouts come with higher failure rates
- **Time management**: Nerve regeneration and cooldowns add strategy
- **Economic balance**: Costs scale with player progression

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎭 World Mini App

This game is designed as a World Mini App, leveraging World ID for:
- **Unique identity verification**
- **Sybil resistance**
- **Fair gameplay environment**
- **Privacy-preserving authentication**

---

**Start your criminal empire today! 🎯**