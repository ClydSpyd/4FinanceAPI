import lowdb from 'lowdb';
import loansApiServer from './server.js';

const port = process.env.LOANS_API_PORT || 3000;

loansApiServer(port, lowdb());
