import jwt from 'jsonwebtoken';
import config from './config';

export function getEmailFromToken(req) {
    const token = req.get('Authorization').split(' ')[1];
    const decoded = jwt.verify(token, config.secret);
    return decoded.email;
}

export default null;
