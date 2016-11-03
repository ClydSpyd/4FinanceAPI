import lowdb from 'lowdb';
import loansApiServer from './server';

const port = process.env.PORT || 3000;

loansApiServer(port, lowdb());
