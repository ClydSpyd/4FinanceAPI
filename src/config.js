export default {
    secret: 'Anastasija',
    interest: 0.1,
    dateFormat: 'YYYY-MM-DD',
    maxApplicationCountForADay: 3,
    intervals: {
        amountInterval: {
            min: 100,
            max: 1000,
            defaultValue: 100,
            step: 50
        },
        termInterval: {
            min: 10,
            max: 31,
            defaultValue: 10,
            step: 1
        }
    }
};
