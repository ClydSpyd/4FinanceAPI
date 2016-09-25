import moment from 'moment';
import config from './config';

export default (db) => {
    const model = [];

    model.getClient = (email) => {
        return db.get('clients').find({ email })
            .value();
    };

    model.getLatestApplication = (email) => {
        return db.get('clients').find({ email: email })
            .get('applications')
            .filter({ 'status': 'OPEN' })
            .last()
            .value();
    };

    model.saveClient = (obj) => {
        return db.get('clients').push(obj).value();
    };

    model.getApplicationsTodayCount = (email) => {
        const client = db.get('clients').find({ email: email });
        return client.get('applications')
            .filter({ created: moment().format(config.dateFormat) })
            .size()
            .value();
    };

    model.getApplications = (email) => {
        return db.get('clients').find({ email: email })
            .get('applications')
            .value();
    };

    model.saveApplication = (email, obj) => {
        const client = db.get('clients').find({ email: email });

        const applications = client.get('applications', []);
        // make it persist
        applications.last().assign({ status: 'CANCELLED' }).value();
        const updatedApplications = applications.concat(obj).value();
        // call value in order to persist changes to database
        client.assign({ 'applications': updatedApplications }).value();
    };

    model.updateApplication = (email, obj) => {
        const client = db.get('clients').find({ email: email });

        const applications = client.get('applications', []);
        // make it persist
        applications.last().assign(obj).value();
    };

    model.saveLoan = (email, obj) => {
        const client = db.get('clients').find({ email: email });
        const loans = client.get('loans', []);
        const updated = loans.concat(obj).value();
        client.assign({ 'loans': updated }).value();
    };

    model.listLoans = (email) => {
        const client = db.get('clients').find({ email: email });
        return client.get('loans', []).value();
    };

    model.getLatestLoan = (email) => {
        const client = db.get('clients').find({ email: email });
        return client.get('loans', []).last().value();
    };

    return model;
};
