# CNC Control System with ESP32 Integration

A professional CNC control and monitoring application built with Next.js, featuring real-time HTTP communication with ESP32 devices for machine status monitoring.

## 🚀 Features

### 🔧 CNC Machine Control

- **Real-time Machine Monitoring** - Live status updates from ESP32-connected machines
- **G-code Designer** - Visual toolpath creation and G-code generation
- **Machine Connection Management** - USB and network machine connectivity
- **Live Progress Tracking** - Real-time machining progress and status

### 📡 HTTP & ESP32 Integration

- **ESP32 Real-time Communication** - Instant machine status updates via HTTP
- **G-code Handshake Protocol** - Line-by-line execution with OK confirmation
- **Multi-machine Support** - CNC Router, Plasma Cutter, Laser Engraver
- **Heartbeat Monitoring** - Automatic offline detection
- **Remote Control** - Send G-code commands to ESP32 devices

### 🎨 Modern UI/UX

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Live machine status with visual indicators
- **Professional Dashboard** - Comprehensive monitoring and control interface
- **Dark/Light Theme Support** - Automatic theme switching

## 🛠 Tech Stack

- **Framework**: Next.js 15.2.4 with React 19
- **Styling**: Tailwind CSS 4 with Radix UI components
- **Communication**: HTTP API for ESP32 communication
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Notifications**: Sonner for toast messages
- **TypeScript**: Full type safety throughout

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- ESP32 development board (optional, for hardware integration)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/RoshanSM-tech/cnc.git
cd cnc
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Configure environment variables**

```bash
# Copy the example environment file
cp .env.local.example .env.local

# Update with your server configuration for ESP32 communication
```

4. **Start the development server**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 🎯 Application Pages

### 🏠 Home Page (`/`)

- **Hero Section** - Professional CNC control software introduction
- **Live Machine Status** - Real-time ESP32 connection monitoring
- **Feature Overview** - Key capabilities and benefits
- **Live Statistics** - 24/7 monitoring, precision accuracy, production metrics

### 🖥 Monitor Page (`/monitor`)

- **G-code Sender** - Line-by-line transmission with handshake protocol
- **ESP32 Simulator** - Test machine connections without hardware
- **Real-time Machine Status** - Live status cards with ESP32 indicators
- **G-code Progress Monitor** - Active job tracking and progress
- **Production Analytics** - Charts and performance metrics

### 🔌 Machines Page (`/machines`)

- **Machine Connection** - USB and network connectivity options
- **Device Management** - Add, configure, and monitor CNC machines
- **Connection Status** - Real-time connection health monitoring

### ✏️ G-code Designer (`/designer/new`)

- **Visual Design Tools** - Intuitive pattern and toolpath creation
- **Template Library** - Pre-built designs for common operations
- **G-code Generation** - Export optimized toolpaths
- **SVG Import** - Convert vector graphics to G-code

## 📡 HTTP & ESP32 Integration

### HTTP API Endpoints

```bash
# Machine Connection
POST /api/machines/connect     # ESP32 online/offline status
POST /api/machines/heartbeat   # Keep-alive messages

# G-code Communication
POST /api/machines/send-gcode   # Line-by-line G-code with handshake
GET  /api/machines/commands     # Get pending commands

# Machine Status
GET  /api/machines/status       # Current machine states
```

### Supported Machines

- **cnc-01** → CNC Router 01
- **plasma-01** → Plasma Cutter 01
- **laser-01** → Laser Engraver 01

### ESP32 Setup

1. **Flash the Arduino code** (`ESP32_CNC_Client.ino`) to your ESP32
2. **Configure WiFi credentials** in the code
3. **Power on the ESP32** - it will automatically appear as "Online" in the web app
4. **Monitor real-time status** - heartbeat, commands, and status updates

For detailed ESP32 setup instructions, see [ESP32_MACHINE_STATUS.md](./ESP32_MACHINE_STATUS.md).

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home page
│   ├── monitor/           # Machine monitoring dashboard
│   ├── machines/          # Machine connection management
│   ├── designer/          # G-code designer
│   └── api/               # API routes (HTTP, machine control)
├── components/            # React components
│   ├── ui/               # Base UI components (Radix UI)
│   ├── GcodeSender.tsx   # G-code communication with handshake
│   ├── ESP32Simulator.tsx # ESP32 testing simulator
│   └── MachineStatusDisplay.tsx # Real-time status cards
├── hooks/                # Custom React hooks
│   └── useMachineStatus.ts # Machine status tracking via HTTP
└── lib/                  # Utility functions
```

### Key Components

#### G-code Sender (`GcodeSender.tsx`)

- Line-by-line G-code transmission
- OK handshake protocol with ESP32/Arduino
- Real-time progress tracking
- Error handling and recovery

#### Machine Status (`useMachineStatus.ts`)

- ESP32 connection monitoring via HTTP
- Automatic offline detection
- Multi-machine support
- Status state management

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint
npm run dev:all      # Start both app and WebSocket server
```

## 🔑 Environment Variables

Create `.env.local` with your server configuration:

```bash
# Enable WebSocket connections (optional for future features)
NEXT_PUBLIC_ENABLE_WEBSOCKET=true

# Server URL for ESP32 HTTP communication
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your GitHub repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy automatically** on every push to main branch

### Docker

```bash
# Build the Docker image
docker build -t cnc-control .

# Run the container
docker run -p 3000:3000 cnc-control
```

### Manual Deployment

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## 📚 Documentation

- **[ESP32 Integration](./ESP32_MACHINE_STATUS.md)** - Hardware setup and Arduino code
- **[G-code Handshake Protocol](./ESP32_CNC_Client_Handshake.ino)** - ESP32 bridge implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/RoshanSM-tech/cnc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RoshanSM-tech/cnc/discussions)
- **Email**: [support@techtitanscnc.com](mailto:support@techtitanscnc.com)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- HTTP API communication for ESP32 integration
- Icons by [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)

---

**Tech Titans CNC** - Professional CNC control software for modern manufacturing 🏭
