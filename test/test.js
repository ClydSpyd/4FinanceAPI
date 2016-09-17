require('babel-polyfill');
import { install } from 'source-map-support';
import chai from 'chai';
import httpstatus from 'http-status';
import lowdb from 'lowdb';
import moment from 'moment';
import request from 'superagent';
import loansApiServer from '../src/server.js';
install();

chai.should();
let db;

describe('loans api', () => {
    before(() => {
        db = lowdb();
        db.setState(defaultData);
        loansApiServer(3000, db);
    });

    describe('login a client', () => {
        it('get client data of petras', async () => {
            let key = await login('petras@mail.lt', 'pass').promise;
            key.should.be.ok;
            key.status.should.equal(httpstatus.CREATED);

            let clientRes = await getClient(key.text).promise;
            const client = JSON.parse(clientRes.text);
            clientRes.status.should.equal(httpstatus.OK);
            client.id.should.equal(2);
            client.name.should.equal('Petras');
            client.surname.should.equal('Petraitis');
            client.email.should.equal('petras@mail.lt');
        });

        it('get client data of jonas', async () => {
            let key = await login('jonas@mail.lt', 'parole1').promise;
            key.should.be.ok;
            key.status.should.equal(httpstatus.CREATED);

            let clientRes = await getClient(key.text).promise;
            const client = JSON.parse(clientRes.text);
            clientRes.status.should.equal(httpstatus.OK);
            client.id.should.equal(1);
            client.name.should.equal('Jonas');
            client.surname.should.equal('Jonaitis');
            client.email.should.equal('jonas@mail.lt');
        });

        it('fail authorization', async () => {
            try {
                await login('aaa@aaa.lt', 'password').promise;
            } catch (err) {
                err.message.should.equal('Bad Request');
            }
        });
    });

    describe('save a client', () => {
        it('save a new client', async () => {
            let key = await saveClient('Domas', 'Domaitis', 'pass1', 'domas@mail.lt', '36506501215').promise;
            key.status.should.equal(httpstatus.CREATED);
            db.get('clients').size().value().should.equal(3);
            const client = db.get('clients').find({ email: 'domas@mail.lt' }).value();
            client.name.should.equal('Domas');
            client.surname.should.equal('Domaitis');
        });

        it('invalid client', async () => {
            try {
                await saveClient('asasd').promise;
            } catch (err) {
                console.log(`Error: ${JSON.stringify(err.response)}`);
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
                dueDate: moment().add(15, 'days').format('YYYY-DD-MM')
            });
        });

        it('invalid query for an offer with no params', async () => {
            try {
                await getUnauthorized('/application/offer').promise;
            } catch (err) {
                err.message.should.equal('Bad Request');
                err.response.body.should.have.lengthOf(4);
                err.response.body.filter((item) => item.param === 'amount' && item.msg === 'Amount cannot be empty')
                    .should.have.lengthOf(1);
                err.response.body.filter((item) => item.param === 'term' && item.msg === 'Term cannot be empty')
                    .should.have.lengthOf(1);
            }
        });

        it('query for an offer with invalid params', async () => {
            try {
                await getUnauthorized('/application/offer?amount=3000&term=50').promise;
            } catch (err) {
                err.message.should.equal('Bad Request');
                err.response.body.should.have.lengthOf(2);
                err.response.body.filter((item) => item.param === 'amount' && item.msg === 'Amount should be an integer between 100 and 1000')
                    .should.have.lengthOf(1);
                err.response.body.filter((item) => item.param === 'term' && item.msg === 'Term should be an integer between 10 and 30')
                    .should.have.lengthOf(1);
            }
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
            .send({ name: name, surname: surname, password: password, email: email, personalId: personalId });
    }
    return {
        promise: getPromise()
    };
}

function login(username, password) {
    async function getPromise() {
        return await request.post('http://localhost:3000/login')
            .set('Accept', 'text/html')
            .send({ username: username, password: password});
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


const defaultData = {
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
};
