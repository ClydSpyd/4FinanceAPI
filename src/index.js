import lowdb from 'lowdb';
import loansApiServer from './server';

const port = process.env.PORT || 3000;
const db = lowdb();
db.defaults({ clients: [] }).value();

loansApiServer(port, db); 
