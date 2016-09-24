import { install } from 'source-map-support';
import 'babel-polyfill';
import bodyParser from 'body-parser';
import express from 'express';
import expressValidator from 'express-validator';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import util from 'util';
import xjwt from 'express-jwt';
import { attachDefaultValidations, createApplication, createOffer } from './application';
import { getEmailFromToken } from './authorization';
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
        res.status(200).send(config.intervals);
    });

    server.get('/application/offer', (req, res) => {
        attachDefaultValidations(req);
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            res.status(400).send(validationErrors);
            return;
        }
        const application = createOffer(req.query.amount, req.query.term);
        res.status(200).send(application);
    });

    server.post('/clients/application', (req, res) => {
        attachDefaultValidations(req);
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            res.status(400).send(validationErrors);
            return;
        }
        const application = createApplication(req.query.amount, req.query.term);
        const email = getEmailFromToken(req);
        const client = db.get('clients').find({ email: email });
        const applicationsToday = client.get('applications')
            .filter({ created: moment().format(config.dateFormat) })
            .size()
            .value();
        if (applicationsToday === 3) {
            res.status(400).send([{
                msg: 'Too many applications for one day'
            }]);
            return;
        }
        const applications = client.get('applications', []);
        // make it persist
        applications.last().assign({ status: 'CANCELLED' }).value();
        const updatedApplications = applications.concat(application).value();
        // call value in order to persist changes to database
        client.assign({ 'applications': updatedApplications }).value();

        res.status(201).send(application);
    });

    server.get('/clients/application', (req, res) => {
        const email = getEmailFromToken(req);
        const lastApplication = db.get('clients').find({ email: email})
            .get('applications')
            .last()
            .value();

        if (!lastApplication) {
            res.status(404).send();
        }

        res.status(200).send(lastApplication);
    });

    return server.listen(port, () => console.log('JSON server is running.'));
}

