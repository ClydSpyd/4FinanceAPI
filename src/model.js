import moment from 'moment';
import config from './config';

const model = (db) => {
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

    return model;
};

export default model;
