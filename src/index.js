const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.get('/api/available-appointments', async (req, res) => {
  try {
    const availableAppointments = await prisma.doctor.findMany({
      include: {
        appointments: {
          where: {
            status: 'available',
          },
        },
      },
      orderBy: [
        {
          avgRating: 'desc',
        },
        {
          appointments: {
            _count: 'asc',
          },
        },
      ],
    });

    res.json(availableAppointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/book-appointment', async (req, res) => {
  const { doctorId, patientId, appointmentDate } = req.body;
  try {
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        appointmentDate,
      },
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rate-doctor', async (req, res) => {
  const { doctorId, patientId, rating, comment } = req.body;
  try {
    const newRating = await prisma.rating.create({
      data: {
        doctorId,
        patientId,
        rating,
        comment,
      },
    });

    // Update doctor's average rating
    const avgRating = await prisma.rating.aggregate({
      where: {
        doctorId,
      },
      _avg: {
        rating: true,
      },
    });

    await prisma.doctor.update({
      where: {
        id: doctorId,
      },
      data: {
        avgRating: avgRating._avg.rating,
      },
    });

    res.json(newRating);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search-doctors', async (req, res) => {
  const { query } = req.query;
  try {
    const doctors = await prisma.doctor.findMany({
      where: {
        OR: [
          {
            specialization: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            specialties: {
              some: {
                specialty: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      include: {
        specialties: true,
      },
      orderBy: {
        avgRating: 'desc',
      },
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
