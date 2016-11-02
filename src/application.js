import moment from 'moment';
import config from './config';

export function attachDefaultValidations(req) {
    req.sanitizeQuery('amount').toInt();
    req.sanitizeQuery('term').toInt();
    req.checkQuery('amount', `Amount should be an integer between ${config.intervals.amountInterval.min} and ${config.intervals.amountInterval.max}`) // eslint-disable-line max-len
        .isInt({ min: config.intervals.amountInterval.min,
            max: config.intervals.amountInterval.max })
        .notEmpty().withMessage('Amount cannot be empty');
    req.checkQuery('term', `Term should be an integer between ${config.intervals.termInterval.min} and ${config.intervals.termInterval.max}`) // eslint-disable-line max-len

        .isInt({ min: config.intervals.termInterval.min, max: config.intervals.termInterval.max })
        .notEmpty().withMessage('Term cannot be empty');
}

export function createOffer(amount, term) {
    const interest = amount * config.interest;
    const totalAmount = amount + interest;
    const dueDate = moment().add(term, 'days').format(config.dateFormat);
    return {
        principalAmount: amount,
        interestAmount: interest,
        totalAmount,
        dueDate
    };
}

export function createApplication(amount, term) {
    const application = createOffer(amount, term);
    application.term = term;
    application.created = moment().format(config.dateFormat);
    application.status = 'OPEN';
    return application;
}

export function isValidAmountInDueTime(value) {
    const now = moment();
    const midnight = now.clone().hour(0);
    const six = now.clone().hour(6);
    return !(value === config.intervals.amountInterval.max && now.isBetween(midnight, six));
}

export function isValidApplicationCountForADay(count) {
    return count < config.maxApplicationCountForADay;
}
