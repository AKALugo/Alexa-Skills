const moment = require('moment-timezone'); // will help us do all the birthday math

module.exports = {
    createReminderData(timezone, locale, message) {
        timezone = timezone ? timezone : 'Europe/Paris'; // so it works on the simulator, replace with your timezone and remove if testing on a real device
        moment.locale(locale);
        const now = moment().tz(timezone);
        const scheduled = now.startOf('day').add(3, 'days');
        console.log('Reminder schedule: ' + scheduled.format('YYYY-MM-DDTHH:mm:00.000'));

        return {
            requestTime: now.format('YYYY-MM-DDTHH:mm:00.000'),
            trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                scheduledTime: scheduled.format('YYYY-MM-DDTHH:mm:00.000'),
                timeZoneId: timezone,
            },
            alertInfo: {
              spokenInfo: {
                content: [{
                  locale: locale,
                  text: message,
                }],
              },
            },
            pushNotification: {
              status: 'ENABLED',
            }
        }
    }
}