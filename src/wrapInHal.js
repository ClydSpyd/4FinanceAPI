import _ from 'lodash';
import halConfig from './hal-config';

export default (req, res, next) => {
    res.wrapInHal = (obj, path) => { // eslint-disable-line no-param-reassign
        path = path || req.path;// eslint-disable-line no-param-reassign

        const config = halConfig[path];
        if (!config) {
            return;
        }

        if (_.isFunction(config)) {
            res.hal(config(obj));
            return;
        }

        if (!obj) {
            res.hal(config);
            return;
        }

        const response = _.merge(config, {
            data: obj
        });
        res.hal(response);
        return;
    };
    next();
};
