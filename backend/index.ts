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
      include: {
        routesFrom: true,
      }
    });
    res.json(cities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Eroare la citirea din baza de date" });
  }
});

app.listen(PORT, () => {
  console.log(`Serverul de backend ruleaza pe http://localhost:${PORT}`);
});