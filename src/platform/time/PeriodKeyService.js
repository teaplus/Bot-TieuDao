const SUPPORTED_PERIODS = new Set(['DAILY', 'WEEKLY', 'MONTHLY']);

function getLocalDateParts(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value])
    );

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day)
    };
}

function formatDateKey(date) {
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0')
    ].join('-');
}

export default class PeriodKeyService {
    constructor(options = {}) {
        this.timeZone = options.timeZone || 'Asia/Ho_Chi_Minh';
    }

    getKey(periodType, instant = new Date()) {
        if (!SUPPORTED_PERIODS.has(periodType)) {
            throw new Error(`UNSUPPORTED_PERIOD_TYPE:${periodType}`);
        }

        const local = getLocalDateParts(instant, this.timeZone);
        const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));

        if (periodType === 'DAILY') {
            return formatDateKey(localDate);
        }

        if (periodType === 'MONTHLY') {
            return `${local.year}-${String(local.month).padStart(2, '0')}`;
        }

        const mondayOffset = (localDate.getUTCDay() + 6) % 7;
        localDate.setUTCDate(localDate.getUTCDate() - mondayOffset);
        return formatDateKey(localDate);
    }
}
