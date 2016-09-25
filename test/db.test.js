require('babel-polyfill');
import { install } from 'source-map-support';
import chai from 'chai';
import lowdb from 'lowdb';
import model from '../src/model';
install();

const should = chai.should();
let db;
let data;

describe('database tests', () => {
    before(() => {
        db = lowdb();
        data = model(db);
    });

    beforeEach(() => {
        db.setState(JSON.parse(defaultData));
    });

    describe('update application', () => {
        it('modify application status', () => {
            data.saveClient(defaultClient);
            
            let latestApplication = data.getLatestApplication('aaa@aaa.lt');
            latestApplication.should.have.property('status', 'OPEN');

            data.updateApplication('aaa@aaa.lt', { status: 'REJECTED' });

            latestApplication = data.getLatestApplication('aaa@aaa.lt');
            should.not.exist(latestApplication);
        });
    });

    describe('loans', () => {
        it('save a loan', () => {
            data.saveClient(defaultClient);
            data.saveLoan('aaa@aaa.lt', { amount: 100, term: 15 });
            console.log(`client: ${JSON.stringify(db.getState())}`);
            data.listLoans('aaa@aaa.lt').should.have.lengthOf(1);
        });
    });
});

const defaultData = '{"clients": []}';
const defaultClient = {
    name: 'aaa',
    email: 'aaa@aaa.lt',
    applications: [
        {
            principalAmount: 100,
            status: 'OPEN'
        }
    ]
};
