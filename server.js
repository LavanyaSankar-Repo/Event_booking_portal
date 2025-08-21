import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import client from 'prom-client';

const app = express();
const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.ORIGIN || '*';

// Security & basics
app.use(helmet());
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

// Rate limit
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Monitoring - Prometheus
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 300, 500, 1000, 2000]
});
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    httpRequestDurationMicroseconds.labels(req.method, req.route?.path || req.path, res.statusCode).observe(elapsed);
  });
  next();
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// In-memory data
let events = [
  { id: 'E100', title: 'Tech Conference', description: 'Talks & workshops', date: new Date(Date.now()+86400000).toISOString(), venue: 'Hall A', seatsLeft: 120 },
  { id: 'E101', title: 'Music Night', description: 'Live bands', date: new Date(Date.now()+172800000).toISOString(), venue: 'Open Arena', seatsLeft: 80 }
];
const bookings = [];

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/events', (req, res) => res.json(events));

const bookingSchema = Joi.object({
  eventId: Joi.string().required(),
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required()
});

app.post('/api/bookings', (req, res) => {
  const { error, value } = bookingSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const ev = events.find(e => e.id === value.eventId);
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  if (ev.seatsLeft <= 0) return res.status(409).json({ message: 'Sold out' });
  ev.seatsLeft -= 1;
  const reference = `BK-${Date.now()}`;
  bookings.push({ ...value, reference });
  res.status(201).json({ reference });
});

app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
