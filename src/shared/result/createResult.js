export function createSuccessResult(data) {
    return {
        ok: true,
        data,
        error: null
    };
}

export function createFailureResult(error) {
    return {
        ok: false,
        data: null,
        error
    };
}

