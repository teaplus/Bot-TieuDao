function formatMeta(meta) {
    if (!meta) {
        return '';
    }

    return ` ${JSON.stringify(meta)}`;
}

export default class Logger {
    info(message, meta) {
        console.log(`[INFO] ${message}${formatMeta(meta)}`);
    }

    warn(message, meta) {
        console.warn(`[WARN] ${message}${formatMeta(meta)}`);
    }

    error(message, meta) {
        console.error(`[ERROR] ${message}${formatMeta(meta)}`);
    }
}

