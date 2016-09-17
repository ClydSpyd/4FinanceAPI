import lowdb from 'lowdb';
import loansApiServer from './server.js';

loansApiServer(3000, lowdb());
