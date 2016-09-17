import moment from 'moment';
import config from './config.js';

export function attachDefaultValidations(req) {
    req.sanitizeQuery('amount').toInt();
    req.sanitizeQuery('term').toInt();
    req.checkQuery('amount', 'Amount should be an integer between 100 and 1000').isInt({ min: 100, max: 1000 })
        .notEmpty().withMessage('Amount cannot be empty');
    req.checkQuery('term', 'Term should be an integer between 10 and 30').isInt({ min: 10, max: 30 })
        .notEmpty().withMessage('Term cannot be empty');
}

export function createApplication(amount, term) {
    const interest = amount * config.interest;
    const totalAmount = amount + interest;
    const dueDate = moment().add(term, 'days').format('YYYY-DD-MM');
    return {
        principalAmount: amount,
        interestAmount: interest,
        totalAmount: totalAmount,
        dueDate: dueDate,
        term: term
    };
}
