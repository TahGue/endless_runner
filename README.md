# Edge of the World - Endless Runner

An endless runner game built with Next.js, featuring dynamic biomes, power-ups, and persistent lore collection using Prisma and SQLite.

## Features

- **Endless Gameplay**: Run through procedurally generated levels with increasing difficulty
- **Multiple Biomes**: Explore Frozen Wastelands, Deep Jungle, Desert of Illusions, Sunken City of Atlantis, and Volcanic Peaks of Ash
- **Power-ups**: Collect special abilities like speed boosts, invincibility, slow-down effects, and revive mechanics
- **Lore Codex**: Discover and collect narrative fragments that persist across sessions
- **Responsive Design**: Optimized for desktop and mobile play
- **Persistent Data**: All discovered lore is saved to a SQLite database via Prisma

## Tech Stack

- **Frontend**: React (Next.js framework)
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Styling**: CSS Modules
- **Deployment**: Ready for Vercel or any Node.js hosting platform

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TahGue/endless_runner.git
   cd endless_runner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Create a `.env` file in the root directory and add:
   ```
   DATABASE_URL="file:./dev.db"
   ```

5. Add audio files (optional but recommended for full experience):
   - Place `jump.wav`, `collect.wav`, and `game_over.wav` in `public/audio/`

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- **Controls**: Press Spacebar or click/tap to jump
- **Objective**: Avoid obstacles, collect power-ups, and discover lore fragments
- **Lore Codex**: View collected lore on the game over screen

## API Endpoints

- `GET /api/lore` - Fetch all discovered lore
- `POST /api/lore` - Save new lore fragment (requires JSON body with title, content, biome)

## Database Schema

The application uses Prisma with the following model:

```prisma
model Lore {
  id           Int      @id @default(autoincrement())
  title        String
  content      String   @unique
  biome        String
  discoveredAt DateTime @default(now())
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original game concept and vanilla JavaScript implementation
- Next.js for the React framework
- Prisma for database management
- SQLite for lightweight data persistence
