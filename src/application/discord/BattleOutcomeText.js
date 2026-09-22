export const BATTLE_DRAW_MESSAGE =
    'Sau một hồi giao tranh, thiên cơ vẫn chưa định, đôi bên bất phân thắng bại.';

export const EXPLORATION_DRAW_MESSAGE =
    'Một hồi giao chiến kịch liệt, sơn lâm mịt mờ, yêu thú quay đầu bỏ đi';

export function formatBattleOutcome(outcome, options = {}) {
    if (outcome === 'VICTORY' || outcome === 'CLEARED' || outcome === 'TEAM_A_WIN') {
        return 'Chiến thắng';
    }
    if (outcome === 'DRAW') {
        return options.drawMessage || BATTLE_DRAW_MESSAGE;
    }
    return 'Thất bại';
}
