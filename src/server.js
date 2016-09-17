import { install } from 'source-map-support';
import 'babel-polyfill';
import bodyParser from 'body-parser';
import express from 'express';
import expressValidator from 'express-validator';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import util from 'util';
import xjwt from 'express-jwt';
import config from './config';

install();

export default function loansApiServer(port = 3000, db) {
    const server = express();
    server.use(bodyParser.json());
    server.use(expressValidator());

    server.use('/clients', xjwt({ secret: config.secret }).unless({ method: 'POST', path: '/clients$' }));

    server.post('/login', (req, res) => {
        const email = [req.body].filter((b) => b)
            .filter((b) => b.username && b.password)
            .map((body) => { 
                return { password: body.password, client: db.get('clients').find({ email: req.body.username }).value() };
            })
            .filter((arr) => arr.client)
            .filter((arr) => arr.password === arr.client.password)
            .map((arr) => arr.client.email)
            .pop();

        if (!email) {
            res.status(400).send('Wrong username or password');
            return;
        }
        console.log(`Email received: ${email}`);

        const token = jwt.sign({ 'email': email }, config.secret, { expiresIn: 60*60*5});
        res.status(201).send(token);
    });

    server.use((err, req, res, next) => {
        if (err.name === 'UnauthorizedError') {
            res.status(401).send('Invalid token');
            return;
        }
        next();
    });

    server.get('/clients', (req, res) => {
        if (req.user) {
            const client = db.get('clients').find({ email: req.user.email }).value();
            if (!client) {
                res.status(400);
                return;
            }
            res.status(200).send(client);
            return;
        }
        res.status(400).send();
    });

    server.post('/clients', (req, res) => {
        req.checkBody('name', 'The name cannot be empty').notEmpty();
        req.checkBody('surname', 'The surname cannot be empty').notEmpty();
        req.checkBody('email', 'Invalid email').notEmpty().withMessage('Email is required').isEmail();
        req.checkBody('personalId', 'The personalId cannot be empty').notEmpty()
            .isNumeric().withMessage('Personal ID should contain only numbers')
            .isLength({ min: 11, max: 11 }).withMessage('Personal ID is wrong');
        req.checkBody('password', 'The password should contain both letters and numerals').notEmpty().withMessage('Password is required').isAlphanumeric();
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            res.status(400).send(validationErrors);
            return;
        }

        db.get('clients').push(req.body).value();
        res.status(201).send();
    });

    server.get('/application/constraints', (req, res) => {
        res.status(200).send({
            amountInterval: {
                min: 100,
                max: 1000,
                defaultValue: 100,
                step: 50
            },
            termInterval: {
                min: 10,
                max: 31,
                defaultValue: 10,
                step: 1
            }
        });
    });

    server.get('/application/offer', (req, res) => {
        console.log(`query: ${util.inspect(req.query)}`);
        req.sanitizeQuery('amount').toInt();
        req.sanitizeQuery('term').toInt();
        req.checkQuery('amount', 'Amount should be an integer between 100 and 1000').isInt({ min: 100, max: 1000 });
        req.checkQuery('term', 'Term should be an integer between 10 and 30').isInt({ min: 10, max: 30 });
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            res.status(400).send(validationErrors);
            return;
        }
        const amount = req.query.amount;
        const term = req.query.term;
        const interest = amount * 0.1;
        const totalAmount = amount + interest;
        const dueDate = moment().add(term, 'days').format('YYYY-DD-MM');
        res.status(200).send({
            principalAmount: amount,
            interestAmount: interest,
            totalAmount: totalAmount,
            dueDate: dueDate
        });
    });

    return server.listen(port, () => console.log('JSON server is running.'));
}

