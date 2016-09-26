import { install } from 'source-map-support';
import chai from 'chai';
import moment from 'moment';
import config from '../src/config';
import { isValidAmountInDueTime } from '../src/application';

require('babel-polyfill');

install();

chai.should();

describe('Application logics', () => {
    describe('Application risk validators', () => {
        it('now is shifted', () => {
            const data = +moment('2016-09-24 17:00').toDate();
            moment.now = () => data;
            const now = moment();
            now.format('YYYY-MM-DD HH:mm').should.equal('2016-09-24 17:00');
        });

        it('amount is valid and the time is good', () => {
            const data = +moment('2016-09-24 17:00').toDate();
            moment.now = () => data;
            const isValid = isValidAmountInDueTime(config.intervals.amountInterval.max - 1);
            isValid.should.be.ok;// eslint-disable-line no-unused-expressions
        });

        it('amount validation and time interval check failed', () => {
            const data = +moment('2016-09-25 04:00').toDate();
            moment.now = () => data;
            const isValid = isValidAmountInDueTime(config.intervals.amountInterval.max);
            isValid.should.be.not.ok;// eslint-disable-line no-unused-expressions
        });
    });
});
