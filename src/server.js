import { install } from 'source-map-support';
import 'babel-polyfill';
import bodyParser from 'body-parser';
import express from 'express';
import hal from 'express-hal';
import expressValidator from 'express-validator';
import jwt from 'jsonwebtoken';
import xjwt from 'express-jwt';
// import util from 'util';
import { attachDefaultValidations, createApplication, createOffer,
    isValidAmountInDueTime, isValidApplicationCountForADay } from './application';
import { getEmailFromToken } from './authorization';
import config from './config';
import model from './model';
import wrapInHal from './wrapInHal';

install();

export default function loansApiServer(port = 3000, db) {
    const data = model(db);
    const server = express();
    server.use(bodyParser.json());
    server.use(expressValidator());
    server.use(hal.middleware);
    server.use(wrapInHal);

    server.use('/clients', xjwt({ secret: config.secret })
            .unless({ method: 'POST', path: '/clients$' }));

    server.get('/', (req, res) => {
        res.wrapInHal();
    });

    server.post('/login', (req, res) => {
        const email = [req.body].filter((b) => b)
            .filter((b) => b.username && b.password)
            .map((body) => { // eslint-disable-line arrow-body-style
                return { password: body.password, client: data.getClient(req.body.username) };
            })
            .filter((arr) => arr.client)
            .filter((arr) => arr.password === arr.client.password)
            .map((arr) => arr.client.email)
            .pop();

        if (!email) {
            res.status(400).send('Wrong username or password');
            return;
        }

        const token = jwt.sign({ email }, config.secret, { expiresIn: 60 * 60 * 5 });
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
            const client = data.getClient(req.user.email);
            if (!client) {
                res.status(400);
                return;
            }
            res.wrapInHal(client);
            return;
        }
        res.status(400).send();
    });

    server.post('/clients', (req, res) => {
        req.checkBody('name', 'The name cannot be empty').notEmpty();
        req.checkBody('surname', 'The surname cannot be empty').notEmpty();
        req.checkBody('email', 'Invalid email').notEmpty()
            .withMessage('Email is required').isEmail();
        req.checkBody('personalId', 'The personalId cannot be empty').notEmpty()
            .isNumeric().withMessage('Personal ID should contain only numbers')
            .isLength({ min: 11, max: 11 })
            .withMessage('Personal ID is wrong');
        req.checkBody('password', 'The password should contain both letters and numerals')
            .notEmpty()
            .withMessage('Password is required').isAlphanumeric();
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            res.status(400).send(validationErrors);
            return;
        }

        data.saveClient(req.body);
        res.status(201).send();
    });

    server.get('/application/constraints', (req, res) => {
        res.status(200).wrapInHal(config.intervals);
    });

    server.get('/application/offer', (req, res) => {
        attachDefaultValidations(req);
        const validationErrors = req.validationErrors();
        if (validationErrors) {
            res.status(400).send(validationErrors);
            return;
        }
        const application = createOffer(req.query.amount, req.query.term);
        res.status(200).wrapInHal(application);
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
        data.saveApplication(email, application);

        // res.status(201).send(application);
        res.status(201).wrapInHal(application);
    });

    server.get('/clients/application', (req, res) => {
        const email = getEmailFromToken(req);
        const latestApplication = data.getLatestApplication(email);
        if (!latestApplication) {
            res.status(404).send();
            return;
        }

        res.status(200).wrapInHal(latestApplication);
    });

    server.put('/clients/application', (req, res) => {
        const email = getEmailFromToken(req);
        const latestApplication = data.getLatestApplication(email);
        if (!latestApplication) {
            res.status(404).send();
            return;
        }

        const applicationsToday = data.getApplicationsTodayCount(email);
        if (!isValidApplicationCountForADay(applicationsToday)) {
            data.updateApplication(email, { status: 'REJECTED' });
            res.status(400).send([{
                msg: 'Too many applications for one day'
            }]);
            return;
        }

        if (!isValidAmountInDueTime(latestApplication.principalAmount)) {
            data.updateApplication(email, { status: 'REJECTED' });
            res.status(400).send([{
                msg: 'Max amount between midnight and 6 am not allowed'
            }]);
            return;
        }

        data.updateApplication(email, { status: 'CLOSED' });
        const loan = {
            principalAmount: latestApplication.principalAmount,
            interestAmount: latestApplication.interestAmount,
            totalAmount: latestApplication.totalAmount,
            dueDate: latestApplication.dueDate,
            term: latestApplication.term,
            status: 'OPEN'
        };
        data.saveLoan(email, loan);

        res.status(201).wrapInHal(loan, '/clients/loans/latest');
    });

    server.get('/clients/loans', (req, res) => {
        const email = getEmailFromToken(req);
        const loans = data.listLoans(email);
        res.status(200).wrapInHal(loans);
    });

    server.get('/clients/loans/latest', (req, res) => {
        const email = getEmailFromToken(req);
        const loan = data.getLatestLoan(email);
        if (!loan) {
            res.status(404).send();
            return;
        }

        res.status(200).send(loan);
    });

    return server.listen(port, () => console.log('JSON server is running.'));
}

