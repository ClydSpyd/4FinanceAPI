import { install } from 'source-map-support';
import chai from 'chai';
import httpstatus from 'http-status';
import lowdb from 'lowdb';
import moment from 'moment';
import request from 'superagent';
import config from '../src/config';
import loansApiServer from '../src/server';

require('babel-polyfill');

install();

chai.should();
let db;

describe('loans api integration tests', () => {
    before(() => {
        db = lowdb();
        loansApiServer(3000, db);
    });

    beforeEach(() => {
        db.setState(JSON.parse(defaultData));
        moment.now = () => +new Date();
    });

    describe('initial entrypoint', () => {
        it('index', async () => {
            const resp = await getUnauthorized('/').promise;
            resp.status.should.equal(httpstatus.OK);
            resp.body.should.deep.equal(
                {
                    _links: {
                        self: {
                            href: '/'
                        },
                        constraints: {
                            href: '/application/constraints'
                        },
                        offer: {
                            href: '/application/offer'
                        },
                        login: {
                            href: '/login'
                        },
                        client: {
                            href: '/clients'
                        }
                    }
                }
            );
        });
    });

    describe('login a client', () => {
        it('get client data of petras', async () => {
            const key = await login('petras@mail.lt', 'pass').promise;
            key.should.be.ok;// eslint-disable-line no-unused-expressions
            key.status.should.equal(httpstatus.CREATED);

            const clientRes = await getClient(key.text).promise;
            const client = JSON.parse(clientRes.text);
            clientRes.status.should.equal(httpstatus.OK);
            client.id.should.equal(2);
            client.name.should.equal('Petras');
            client.surname.should.equal('Petraitis');
            client.email.should.equal('petras@mail.lt');
        });

        it('get client data of jonas', async () => {
            const key = await login('jonas@mail.lt', 'parole1').promise;
            key.should.be.ok;// eslint-disable-line no-unused-expressions
            key.status.should.equal(httpstatus.CREATED);

            const clientRes = await getClient(key.text).promise;
            const client = JSON.parse(clientRes.text);
            clientRes.status.should.equal(httpstatus.OK);
            client.id.should.equal(1);
            client.name.should.equal('Jonas');
            client.surname.should.equal('Jonaitis');
            client.email.should.equal('jonas@mail.lt');
            client._links.should.deep.equal( // eslint-disable-line no-underscore-dangle
                {
                    self: {
                        href: '/clients'
                    },
                    application: {
                        href: '/clients/application'
                    },
                    loans: {
                        href: '/clients/loans'
                    }
                }
            );
        });

        it('fail authorization', async () => {
            try {
                await login('aaa@aaa.lt', 'password').promise;
            } catch (err) {
                err.message.should.equal('Bad Request');
                err.status.should.equal(400);
                err.response.text.should.equal('Wrong username or password');
            }
        });
    });

    describe('save a client', () => {
        it('save a new client', async () => {
            const key = await
                saveClient('Domas', 'Domaitis', 'pass1', 'domas@mail.lt', '36506501215')
                .promise;
            key.status.should.equal(httpstatus.CREATED);

            const resp = await getAuthorized('domas@mail.lt', 'pass1', '/clients').promise;
            resp.body.should.have.property('name', 'Domas');
            resp.body.should.have.property('surname', 'Domaitis');
        });

        it('invalid client', async () => {
            try {
                await saveClient('asasd').promise;
            } catch (err) {
                err.response.body.should.have.lengthOf(8);
                err.response.body.should.deep.equal([
                        { param: 'surname', msg: 'The surname cannot be empty' },
                        { param: 'email', msg: 'Email is required' },
                        { param: 'email', msg: 'Invalid email' },
                        { param: 'personalId', msg: 'The personalId cannot be empty' },
                        { param: 'personalId', msg: 'Personal ID should contain only numbers' },
                        { param: 'personalId', msg: 'Personal ID is wrong' },
                        { param: 'password', msg: 'Password is required' },
                        { param: 'password',
                            msg: 'The password should contain both letters and numerals' }
                ]);
            }
        });
    });

    describe('application', () => {
        it('get constraints', async () => {
            const resp = await getUnauthorized('/application/constraints').promise;
            resp.status.should.equal(httpstatus.OK);
            resp.body.should.deep.equal({
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
                },
                _links: {
                    self: {
                        href: '/application/constraints'
                    },
                    offer: {
                        href: '/application/offer'
                    }
                }
            });
        });

        it('get offer', async () => {
            const resp = await getUnauthorized('/application/offer?amount=500&term=15').promise;
            resp.status.should.equal(httpstatus.OK);
            resp.body.should.deep.equal({
                principalAmount: 500,
                interestAmount: 50,
                totalAmount: 550,
                dueDate: moment().add(15, 'days').format('YYYY-MM-DD'),
                _links: {
                    self: {
                        href: '/application/offer'
                    },
                    application: {
                        href: '/application'
                    }
                }
            });
        });

        it('invalid query for an offer with no params', async () => {
            try {
                await getUnauthorized('/application/offer').promise;
            } catch (err) {
                err.message.should.equal('Bad Request');
                err.response.body.should.have.lengthOf(4);
                err.response.body.filter((item) =>
                        item.param === 'amount'
                        && item.msg === 'Amount cannot be empty')
                    .should.have.lengthOf(1);
                err.response.body.filter((item) =>
                        item.param === 'term' &&
                        item.msg === 'Term cannot be empty')
                    .should.have.lengthOf(1);
            }
        });

        it('query for an offer with invalid params', async () => {
            try {
                await getUnauthorized('/application/offer?amount=3000&term=50').promise;
            } catch (err) {
                err.message.should.equal('Bad Request');
                err.response.body.should.have.lengthOf(2);
                err.response.body.filter((item) =>
                        item.param === 'amount' &&
                        item.msg === `Amount should be an integer between ${config.intervals.amountInterval.min} and ${config.intervals.amountInterval.max}`) // eslint-disable-line max-len
                    .should.have.lengthOf(1);
                err.response.body.filter((item) =>
                        item.param === 'term' &&
                        item.msg === `Term should be an integer between ${config.intervals.termInterval.min} and ${config.intervals.termInterval.max}`) // eslint-disable-line max-len

                    .should.have.lengthOf(1);
            }
        });

        it('a client should be authorized to be able to apply', async () => {
            try {
                await getUnauthorized('/clients/application?amount=500&term=15').promise;
            } catch (err) {
                err.response.status.should.equal(httpstatus.UNAUTHORIZED);
            }
        });

        it('application is applied for', async () => {
            const key = await login('petras@mail.lt', 'pass').promise;
            key.should.be.ok;// eslint-disable-line no-unused-expressions
            key.status.should.equal(httpstatus.CREATED);

            const resp = await applyForLoan(500, 15, key.text).promise;
            resp.status.should.equal(httpstatus.CREATED);
            resp.body.should.contain.property('principalAmount', 500);
            resp.body.should.contain.property('term', 15);
            resp.body._links.should.deep.equal( // eslint-disable-line no-underscore-dangle
                {
                    self: {
                        href: '/clients/application'
                    },
                    loans: {
                        href: '/clients/loans'
                    }
                }
            );
        });

        it('do not find the latest application', async () => {
            try {
                await getAuthorized('petras@mail.lt', 'pass', '/clients/application').promise;
            } catch (err) {
                err.response.status.should.equal(httpstatus.NOT_FOUND);
            }
        });

        it('get the latest application', async () => {
            const token = await login('petras@mail.lt', 'pass').promise;
            await applyForLoan(500, 15, token.text).promise;

            const applicationResponse =
                await getAuthorized('petras@mail.lt', 'pass', '/clients/application').promise;
            applicationResponse.status.should.equal(httpstatus.OK);
            applicationResponse.body.should.contain.property('principalAmount', 500);
            applicationResponse.body.should.contain.property('term', 15);
            applicationResponse.body._links // eslint-disable-line no-underscore-dangle
                .should.deep.equal(
                {
                    self: {
                        href: '/clients/application'
                    },
                    loans: {
                        href: '/clients/loans'
                    }
                }
            );
        });
    });

    describe('Applications', async () => {
        it('application was applied', async () => {
            const token = await login('petras@mail.lt', 'pass').promise;
            await applyForLoan(500, 15, token.text).promise;
            const resp = await confirmApplication(token.text).promise;
            resp.should.be.ok;// eslint-disable-line no-unused-expressions
            resp.body.should.deep.equal({
                principalAmount: 500,
                interestAmount: 50,
                totalAmount: 550,
                term: 15,
                status: 'OPEN',
                dueDate: moment().add(15, 'days').format(config.dateFormat),
                _links: {
                    self: {
                        href: '/clients/loans/latest'
                    },
                    loans: {
                        href: '/clients/loans'
                    },
                    client: {
                        href: '/clients'
                    }
                }
            });
        });

        it('application was applied for more than three times a day', async () => {
            const token = await login('petras@mail.lt', 'pass').promise;
            token.should.be.ok;// eslint-disable-line no-unused-expressions
            token.status.should.equal(httpstatus.CREATED);

            await applyForLoan(500, 15, token.text).promise;
            await applyForLoan(501, 16, token.text).promise;
            await applyForLoan(502, 17, token.text).promise;
            await applyForLoan(503, 18, token.text).promise;
            try {
                await confirmApplication(token.text).promise;
            } catch (err) {
                err.response.status.should.equal(httpstatus.BAD_REQUEST);
                err.response.body.should.be.lengthOf(1);
                err.response.body.should.deep.equal([{
                    msg: 'Too many applications for one day'
                }]);
            }
        });
    });

    describe('Loans', () => {
        it('list of client loans is empty', async () => {
            const resp = await getAuthorized('petras@mail.lt', 'pass', '/clients/loans').promise;
            resp.body['_embedded'].loans.should.have.lengthOf(0);// eslint-disable-line dot-notation
        });

        it('list client loans', async () => {
            const token = await login('petras@mail.lt', 'pass').promise;
            await applyForLoan(500, 15, token.text).promise;
            await confirmApplication(token.text).promise;

            const resp = await getAuthorized('petras@mail.lt', 'pass', '/clients/loans').promise;
            resp.body['_embedded'].loans.should.have.lengthOf(1);// eslint-disable-line dot-notation
        });

        it('latest client loan', async () => {
            const token = await login('petras@mail.lt', 'pass').promise;
            await applyForLoan(600, 25, token.text).promise;
            await confirmApplication(token.text).promise;

            const resp =
                await getAuthorized('petras@mail.lt', 'pass', '/clients/loans/latest').promise;
            resp.body.should.be.ok;// eslint-disable-line no-unused-expressions
            resp.body.should.deep.equal({
                principalAmount: 600,
                interestAmount: 60,
                totalAmount: 660,
                term: 25,
                status: 'OPEN',
                dueDate: moment().add(25, 'days').format(config.dateFormat)
            });
        });
    });
});

function getUnauthorized(path) {
    async function getPromise() {
        return await request.get(`http://localhost:3000${path}`)
            .send();
    }
    return {
        promise: getPromise()
    };
}

function saveClient(name, surname, password, email, personalId) {
    async function getPromise() {
        return await request.post('http://localhost:3000/clients')
            .send({ name, surname, password, email, personalId });
    }
    return {
        promise: getPromise()
    };
}

function login(username, password) {
    async function getPromise() {
        return await request.post('http://localhost:3000/login')
            .set('Accept', 'text/html')
            .send({ username, password });
    }
    return {
        promise: getPromise()
    };
}

function getClient(key) {
    async function getPromise() {
        return await request.get('http://localhost:3000/clients')
            .set('Authorization', `Bearer ${key}`);
    }
    return {
        promise: getPromise()
    };
}

function applyForLoan(amount, term, key) {
    async function getPromise() {
        return await request.post(`http://localhost:3000/clients/application?amount=${amount}&term=${term}`)
            .set('Authorization', `Bearer ${key}`);
    }
    return {
        promise: getPromise()
    };
}

function getAuthorized(username, password, path) {
    async function getPromise() {
        const token = await login(username, password).promise;
        return await request.get(`http://localhost:3000${path}`)
            .set('Authorization', `Bearer ${token.text}`);
    }
    return {
        promise: getPromise()
    };
}

function confirmApplication(key) {
    async function getPromise() {
        return await request.put('http://localhost:3000/clients/application')
            .set('Authorization', `Bearer ${key}`);
    }
    return {
        promise: getPromise()
    };
}

const defaultData = `{
    "clients": [
        {
            "id": 1,
            "name": "Jonas",
            "surname": "Jonaitis",
            "personalId": "1",
            "email": "jonas@mail.lt",
            "password": "parole1"
        },
        {
            "id": 2,
            "name": "Petras",
            "surname": "Petraitis",
            "personalId": "2",
            "email": "petras@mail.lt",
            "password": "pass"
        }
    ]
}`;
