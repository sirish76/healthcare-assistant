# HealthAssist AI — Healthcare Insurance Assistant

An AI-powered chat portal for healthcare and medical insurance questions, including Medicare, Medicaid, and private insurance. Features doctor search and appointment booking via ZocDoc integration.

**Live:** [doctors.sirish.world](https://doctors.sirish.world)

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Java 17 + Spring Boot 3.2
- **AI:** Anthropic Claude API
- **Doctor Search:** ZocDoc Directory API

## Features

- Chat-style AI assistant for insurance questions (Medicare, Medicaid, private plans)
- Inline doctor search — the AI detects when you need a doctor and shows results in the chat
- Appointment booking with multi-step flow (time selection, patient info, ZocDoc redirect)
- Conversation history with sidebar navigation
- Markdown rendering for rich AI responses
- Mobile-responsive design

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 18+
- npm 9+

## Quick Start (Local Development)

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/healthcare-assistant.git
cd healthcare-assistant
```

### 2. Start the backend

```bash
cd healthcare-assistant-backend
export ANTHROPIC_API_KEY=sk-ant-your-key-here
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`.

### 3. Start the frontend

Open a new terminal:

```bash
cd healthcare-assistant-frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`.

### 4. Open the app

Go to [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
| `ZOCDOC_API_KEY` | No | ZocDoc API key. Without it, the app uses realistic sample doctor data |

## Production Deployment (AWS EC2 + Docker)

### 1. Launch an EC2 instance

- AMI: Amazon Linux 2023 or Ubuntu 22.04
- Instance type: t3.small (minimum 2GB RAM)
- Security group: open ports 22, 80, 443

### 2. Copy code and deploy

```bash
scp -i your-key.pem -r ./* ec2-user@YOUR_EC2_IP:~/app/
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
cd ~/app
cp .env.production .env
nano .env  # set your ANTHROPIC_API_KEY
./deploy.sh
```

### 3. Point your domain

Add an A record in your DNS provider pointing to your EC2 public IP.

### 4. Enable SSL

```bash
./setup-ssl.sh
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a chat message |
| GET | `/api/chat/health` | Health check |
| POST | `/api/doctors/search` | Search for doctors |
| GET | `/api/doctors/{id}/slots` | Get available appointment slots |
| POST | `/api/doctors/book` | Book an appointment |

## Project Structure

```
healthcare-assistant/
├── healthcare-assistant-backend/     # Spring Boot API
│   ├── src/main/java/com/healthassist/
│   │   ├── config/                   # CORS, WebClient configs
│   │   ├── controller/               # REST endpoints
│   │   ├── dto/                      # Request/response objects
│   │   ├── model/                    # Domain models
│   │   └── service/                  # Business logic, API integrations
│   ├── Dockerfile
│   └── pom.xml
├── healthcare-assistant-frontend/    # React SPA
│   ├── src/
│   │   ├── components/               # UI components
│   │   └── services/                 # API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── deploy.sh
└── setup-ssl.sh
```

## License

MIT
