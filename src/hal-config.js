import _ from 'lodash';

export default {
    '/': {
        links: {
            self: '/',
            constraints: '/application/constraints',
            offer: '/application/offer',
            login: '/login',
            client: '/clients'
        }
    },
    '/application/constraints': {
        links: {
            self: '/application/constraints',
            offer: '/application/offer'
        }
    },
    '/application/offer': {
        links: {
            self: '/application/offer',
            application: '/application'
        }
    },
    '/clients': {
        links: {
            self: '/clients',
            application: '/clients/application',
            loans: '/clients/loans'
        }
    },
    '/clients/application': {
        links: {
            self: '/clients/application',
            loans: '/clients/loans'
        }
    },
    '/clients/loans': (list) => {
        let result;
        if (_.isEmpty(list)) {
            result = [];
        } else {
            const last = _.last(list);
            const modified = _.assign(last, {
                links: {
                    self: '/clients/loans/latest'
                }
            });
            result = _.concat(_.initial(list), modified);
        }

        const resp = {
            links: {
                self: '/clients/loans'
            }
        };
        resp.embeds = {
            loans: result
        };
        return resp;
    },
    '/clients/loans/latest': {
        links: {
            self: '/clients/loans/latest',
            loans: '/clients/loans',
            client: '/clients'
        }
    }
};
