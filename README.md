# DataQuality-UI

A comprehensive Data Quality Control System frontend built with Next.js, TypeScript, and Tailwind CSS. This application provides a modern, user-friendly interface for statistical data quality analysis and reporting.

## 🚀 Features

### Core Functionality

- **File Upload & Analysis**: Upload CSV/Excel files for quality analysis
- **Project Management**: Create, manage, and track multiple data quality projects
- **Real-time QA Processing**: Advanced quality checks and issue detection
- **Interactive Dashboard**: Comprehensive data visualization and reporting
- **Multi-language Support**: Arabic (RTL) and English interface

### Quality Analysis

- **Indicator-level Quality Scoring**: Detailed quality metrics per indicator
- **Issue Classification**: Critical, Warning, and Info level issues
- **Data Validation**: Missing values, outliers, duplicates detection
- **Audit Trail**: Complete history of data modifications and reviews

### Backend Integration

- **RESTful API Integration**: Full backend connectivity with .NET Core API
- **JWT Authentication**: Secure user authentication and session management
- **Real-time Synchronization**: Automatic sync with backend services
- **Offline Capability**: Local storage fallback when backend is unavailable

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Hooks + Local Storage
- **Authentication**: JWT + Local fallback
- **API Integration**: Fetch API with error handling
- **Icons**: Lucide React
- **Build Tool**: Next.js with Webpack/Turbopack

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, pnpm, or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/MahmodNabwy/DataQuality-UI.git
cd DataQuality-UI
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Run the development server:

```bash
npm run dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Backend Integration

Configure the backend URL in your environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### RTL (Right-to-Left) Support

Full RTL support for Arabic interfaces with proper typography and layout.

## 📊 API Integration

Integrates with .NET Core backend API endpoints for authentication, project management, and file processing.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🔗 Related Projects

- [DataQuality-backend](https://github.com/MahmodNabwy/DataQuality-backend) - .NET Core backend API

---

**Built with ❤️ for statistical data quality analysis**
