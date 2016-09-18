import expressValidator from 'express-validator';
import moment from 'moment';
import config from './config';

export function attachDefaultValidations(req) {
    req.sanitizeQuery('amount').toInt();
    req.sanitizeQuery('term').toInt();
    req.checkQuery('amount', 'Amount should be an integer between 100 and 1000').isInt({ min: 100, max: 1000 })
        .notEmpty().withMessage('Amount cannot be empty');
    req.checkQuery('term', 'Term should be an integer between 10 and 30').isInt({ min: 10, max: 30 })
        .notEmpty().withMessage('Term cannot be empty');
}

export function createOffer(amount, term) {
    const interest = amount * config.interest;
    const totalAmount = amount + interest;
    const dueDate = moment().add(term, 'days').format(config.dateFormat);
    return {
        principalAmount: amount,
        interestAmount: interest,
        totalAmount: totalAmount,
        dueDate: dueDate
    };
}

export function createApplication(amount, term) {
    let application = createOffer(amount, term);
    application.term = term;
    application.created = moment().format(config.dateFormat);
    application.status = 'OPEN';
    return application;
}

export function customValidAmountValidator() {
    return expressValidator({
        customValidators: {
            isValidAmountInDueTime: (value) => {
                const now = moment();
                return (value === config.intervals.amountInterval.max && now.isBetween(now.hour(0), now.hour(6)));
            }
        }
    });
}

export function attachValidAmountValidator(req) {
    req.checkQuery('amount', 'Amount can be max between 00:00 and 06:00').isValidAmountInDueTime();
}
