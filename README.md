# MyStats

<div align="center">

**Your Spotify listening habits, visualized beautifully. 100% free. 100% open source.**

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by Go](https://img.shields.io/badge/Powered%20by-Go-00ADD8?style=flat&logo=go&logoColor=white)](https://golang.org/)

</div>

## ✨ Features

- **Beautiful UI**: Immersive and intuitive interface for exploring your Spotify data
- **Complete Data Visualization**: Deep insights into all aspects of your listening habits
- **Listening History Visualizer**: Powerful analysis of your exported listening history
- **Developer Tools**: Advanced features for developers to extend functionality
- **Milestones**: Track and celebrate your listening achievements

## 🎬 Demo

Check out our landing page to see MyStats in action with a demonstration video.

## 🚀 Tech Stack

MyStats is built with modern technologies:

- **Frontend**: [Next.js](https://nextjs.dev), [TypeScript](https://typescriptlang.org), [ShadCN/UI](https://ui.shadcn.com), [Tailwind CSS](https://tailwindcss.com)
- **Backend**: [Go Lang microservices](https://go.dev)
- **Database**: [PostgreSQL](https://postgresql.org) (with [DrizzleORM](https://orm.drizzle.team)), [Redis](https://redis.com)
- **Infrastructure**: [Vercel](https://vercel.com), [Cloudflare](https://cloudflare.com), [AWS S3](https://aws.amazon.com), [Upstash](https://upstash.com), [Neon.tech](https://neon.tech)
- **Automation**: [Trigger.Dev](https://trigger.dev)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en) (v20 or higher)
- [Go](https://go.dev/dl/) (latest stable version)
- [PNPM](https://pnpm.io/installation) package manager

## 🛠️ Installation

1. Clone the repository
```bash
git clone https://github.com/sklyerx/my-stats.git
cd my-stats
```

2. Install dependencies
```bash
pnpm install
```

3. Configure environment variables
```bash
cp apps/www/.env.example .env
# Edit .env with your configuration
```
```bash
cp apps/microservice/.env.example .env
# Edit .env with your configuration
```

4. Start the frontend
```bash
pnpm dev
```

5. Start the microservice
```bash
cd apps/microservice
go install
go run .
```

## ⚙️ Local Configuration

Add the following to your hosts file:
```
127.0.0.1 stats.skylerx.ir
127.0.0.1 developer.stats.skylerx.ir
127.0.0.1 api.stats.skylerx.ir
```

Location of hosts file:
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- Mac/Linux: `/etc/hosts`

## 🤝 Contributing

Contributions are welcome and encouraged! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License - see the [LICENSE](https://creativecommons.org/licenses/by-nc/4.0/deed.en) for details.

This means you are free to:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:
- Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- NonCommercial — You may not use the material for commercial purposes.

## 🙏 Acknowledgments

- The Spotify API team for providing access to user data
- All contributors who have helped make this project better
- The open-source community for their incredible tools and libraries

---

<div align="center">
  <strong>Made with ❤️ for music lovers everywhere</strong>
</div>