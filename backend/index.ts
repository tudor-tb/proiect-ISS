import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/cities', async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      include: { routesFrom: true }
    });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get('/api/player/:id', async (req, res) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: "Player fetch error" });
  }
});

app.post('/api/travel', async (req, res) => {
  const { playerId, toCityId, cost, routeId } = req.body;

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.budget < cost) return res.status(400).json({ error: "Insufficient funds!" });

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) return res.status(404).json({ error: "Route not found" });

    const baseDuration = route.baseDuration;
    const maxVariance = Math.max(0.05, 0.3 - (baseDuration / 1000));
    const variance = (Math.random() * maxVariance * 2) - maxVariance;
    const actualDuration = Math.round(baseDuration * (1 + variance));

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        budget: player.budget - cost,
        currentCityId: toCityId
      }
    });

    res.json({
      success: true,
      player: updatedPlayer,
      actualDuration: actualDuration
    });
  } catch (error) {
    res.status(500).json({ error: "Travel execution error" });
  }
});

app.post('/api/reset', async (req, res) => {
  const { playerId } = req.body;
  try {
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        budget: 1000.0,
        currentCityId: 1
      }
    });
    res.json({ success: true, player: updatedPlayer });
  } catch (error) {
    res.status(500).json({ error: "Reset error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});